-- F-54 et F-58 (lot 5a, ADR 0051) : paiements des chantiers et abonnements des artisans en lecture
-- seule pour le back-office (revenu mensuel récurrent, résiliations, impayés), et suivi des
-- notifications Stripe et DocuSeal en échec. Réservé aux admins en session aal2 (app.is_admin).
-- MENAO n'encaisse rien sur les chantiers (CLAUDE.md règle 12) : ces écrans ne font que lire.

-- ---------------------------------------------------------------------------
-- Abonnements : date de fin effective (ended_at de Stripe), pour dater les résiliations.
-- ---------------------------------------------------------------------------
alter table public.subscriptions add column ended_at timestamptz;
-- Abonnements déjà résiliés : à défaut de la date de Stripe, leur dernière mise à jour.
update public.subscriptions set ended_at = updated_at where status = 'canceled';

-- ---------------------------------------------------------------------------
-- Notifications des services (Stripe, DocuSeal) : un échec de traitement reste visible, avec un
-- code d'erreur technique seulement (aucune donnée personnelle, CLAUDE.md règle 11).
-- ---------------------------------------------------------------------------
alter table public.webhook_events
  add column failed_at timestamptz,
  add column failures integer not null default 0 check (failures >= 0),
  add column last_error text check (char_length(last_error) <= 200);
create index webhook_events_suivi_idx on public.webhook_events (received_at desc)
  where processed_at is null or failures > 0;

-- Échec de traitement d'une notification, enregistré par les Edge Functions (service_role).
create function public.record_webhook_failure(p_event_id text, p_error text)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.webhook_events
  set failed_at = now(), failures = failures + 1, last_error = left(nullif(btrim(p_error), ''), 200)
  where id = p_event_id
$$;
revoke execute on function public.record_webhook_failure(text, text) from public, anon, authenticated;
grant execute on function public.record_webhook_failure(text, text) to service_role;

-- État d'une notification : traitée ; rétablie (traitée après un échec) ; en échec ; bloquée (ni
-- traitée ni en échec un quart d'heure après sa réception : traitement interrompu) ; en cours.
create function app.webhook_event_state(p_processed_at timestamptz, p_failures integer, p_received_at timestamptz)
returns text
language sql
stable
set search_path = ''
as $$
  select case
    when p_processed_at is not null and p_failures > 0 then 'retablie'
    when p_processed_at is not null then 'traitee'
    when p_failures > 0 then 'en_echec'
    when p_received_at < now() - interval '15 minutes' then 'bloquee'
    else 'en_cours'
  end
$$;
revoke execute on function app.webhook_event_state(timestamptz, integer, timestamptz) from public, anon, authenticated;

create function public.admin_webhook_events(
  p_filter text default 'echecs',
  p_limit integer default 50,
  p_offset integer default 0
)
returns table (
  event_id text, source text, type text, received_at timestamptz, processed_at timestamptz,
  failed_at timestamptz, failures integer, last_error text, etat text, total bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
begin
  if not app.is_admin() then
    raise exception 'Réservé à l''équipe MENAO' using errcode = '42501';
  end if;
  return query
  select w.id, w.source, w.type, w.received_at, w.processed_at, w.failed_at, w.failures,
    w.last_error, w.etat, count(*) over ()
  from (
    select e.*, app.webhook_event_state(e.processed_at, e.failures, e.received_at) as etat
    from public.webhook_events e
  ) w
  where case coalesce(p_filter, 'echecs')
      when 'echecs' then w.etat in ('en_echec', 'bloquee')
      when 'retablies' then w.etat = 'retablie'
      when 'toutes' then true
      else false
    end
  order by coalesce(w.failed_at, w.received_at) desc
  limit least(greatest(coalesce(p_limit, 50), 1), 100)
  offset greatest(coalesce(p_offset, 0), 0);
end;
$$;

-- Nombre de notifications par filtre, pour les pastilles de la liste.
create function public.admin_webhook_counts()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not app.is_admin() then
    raise exception 'Réservé à l''équipe MENAO' using errcode = '42501';
  end if;
  return (
    select jsonb_build_object(
      'echecs', count(*) filter (where w.etat in ('en_echec', 'bloquee')),
      'retablies', count(*) filter (where w.etat = 'retablie'),
      'toutes', count(*)
    )
    from (
      select app.webhook_event_state(e.processed_at, e.failures, e.received_at) as etat
      from public.webhook_events e
    ) w
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Paiements des chantiers (F-54), versés par les clients sur le compte Stripe de l'artisan.
--   payes ; en_cours : paiement commencé, pas encore confirmé ; echoues ; annules.
-- ---------------------------------------------------------------------------
create function app.admin_payment_rows()
returns table (
  payment_id uuid, created_at timestamptz, paid_at timestamptz, kind text, amount_cents bigint,
  status text, chantier_id uuid, chantier text, artisan_id uuid, artisan text, client text,
  email text, devis text
)
language sql
stable
security definer
set search_path = ''
as $$
  select pa.id, pa.created_at, pa.paid_at, pa.kind::text, pa.amount_cents, pa.status::text,
    pa.chantier_id, c.title, pa.artisan_id, coalesce(a.nom_commercial, a.raison_sociale),
    nullif(btrim(concat_ws(' ', pr.first_name, pr.last_name)), ''), u.email::text, q.numero
  from public.payments pa
  join public.chantiers c on c.id = pa.chantier_id
  join public.artisans a on a.id = pa.artisan_id
  left join public.quotes q on q.id = pa.quote_id
  left join public.profiles pr on pr.user_id = c.particulier_id
  left join auth.users u on u.id = c.particulier_id
$$;
revoke execute on function app.admin_payment_rows() from public, anon, authenticated;

create function public.admin_payments(
  p_filter text default 'tous',
  p_query text default null,
  p_limit integer default 50,
  p_offset integer default 0
)
returns table (
  payment_id uuid, created_at timestamptz, paid_at timestamptz, kind text, amount_cents bigint,
  status text, chantier_id uuid, chantier text, artisan_id uuid, artisan text, client text,
  devis text, total bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_like text := app.admin_like(p_query);
begin
  if not app.is_admin() then
    raise exception 'Réservé à l''équipe MENAO' using errcode = '42501';
  end if;
  return query
  select r.payment_id, r.created_at, r.paid_at, r.kind, r.amount_cents, r.status, r.chantier_id,
    r.chantier, r.artisan_id, r.artisan, r.client, r.devis, count(*) over ()
  from app.admin_payment_rows() r
  where (
      coalesce(p_filter, 'tous') = 'tous'
      or (p_filter = 'payes' and r.status = 'paye')
      or (p_filter = 'en_cours' and r.status in ('en_attente', 'en_cours'))
      or (p_filter = 'echoues' and r.status = 'echoue')
      or (p_filter = 'annules' and r.status = 'annule')
    )
    and (
      v_like is null
      or r.chantier ilike v_like or r.artisan ilike v_like or r.client ilike v_like
      or r.email ilike v_like or r.devis ilike v_like
    )
  order by coalesce(r.paid_at, r.created_at) desc
  limit least(greatest(coalesce(p_limit, 50), 1), 100)
  offset greatest(coalesce(p_offset, 0), 0);
end;
$$;

-- Nombre de paiements par filtre, pour les pastilles de la liste (même recherche).
create function public.admin_payment_counts(p_query text default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_like text := app.admin_like(p_query);
begin
  if not app.is_admin() then
    raise exception 'Réservé à l''équipe MENAO' using errcode = '42501';
  end if;
  return (
    select jsonb_build_object(
      'tous', count(*),
      'payes', count(*) filter (where r.status = 'paye'),
      'en_cours', count(*) filter (where r.status in ('en_attente', 'en_cours')),
      'echoues', count(*) filter (where r.status = 'echoue'),
      'annules', count(*) filter (where r.status = 'annule')
    )
    from app.admin_payment_rows() r
    where v_like is null
      or r.chantier ilike v_like or r.artisan ilike v_like or r.client ilike v_like
      or r.email ilike v_like or r.devis ilike v_like
  );
end;
$$;

-- Chiffres de la page des paiements : versés aux artisans (30 jours et depuis le début), en cours,
-- échoués sur 7 jours.
create function public.admin_payment_summary()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_30 timestamptz := now() - interval '30 days';
  v_7 timestamptz := now() - interval '7 days';
begin
  if not app.is_admin() then
    raise exception 'Réservé à l''équipe MENAO' using errcode = '42501';
  end if;
  return (
    select jsonb_build_object(
      'payes_30j', count(*) filter (where pa.status = 'paye' and pa.paid_at >= v_30),
      'payes_30j_cents', coalesce(
        sum(pa.amount_cents) filter (where pa.status = 'paye' and pa.paid_at >= v_30), 0
      ),
      'payes_cents', coalesce(sum(pa.amount_cents) filter (where pa.status = 'paye'), 0),
      'en_cours', count(*) filter (where pa.status in ('en_attente', 'en_cours')),
      'en_cours_cents', coalesce(
        sum(pa.amount_cents) filter (where pa.status in ('en_attente', 'en_cours')), 0
      ),
      'echoues_7j', count(*) filter (where pa.status = 'echoue' and pa.updated_at >= v_7)
    )
    from public.payments pa
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Abonnements des artisans (F-58) : une ligne par artisan, avec sa formule et sa situation.
--   impayes : paiement en échec (Stripe relance) ou impayé définitif ; fin_programmee :
--   résiliation demandée pour la fin de la période ; actifs ; essais ; resilies ; autres
--   (paiement initial non finalisé, en pause).
-- ---------------------------------------------------------------------------
create function app.admin_subscription_rows()
returns table (
  artisan_id uuid, artisan text, siret text, email text, formule text, prix_cents integer,
  status text, situation text, current_period_end timestamptz, trial_end timestamptz,
  cancel_at_period_end boolean, ended_at timestamptz, created_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select s.artisan_id, coalesce(a.nom_commercial, a.raison_sociale), a.siret, u.email::text,
    p.nom, p.prix_mensuel_ht_centimes, s.status,
    case
      when s.status in ('past_due', 'unpaid') then 'impayes'
      when s.status in ('active', 'trialing') and s.cancel_at_period_end then 'fin_programmee'
      when s.status = 'active' then 'actifs'
      when s.status = 'trialing' then 'essais'
      when s.status = 'canceled' then 'resilies'
      else 'autres'
    end,
    s.current_period_end, s.trial_end, s.cancel_at_period_end, s.ended_at, s.created_at
  from public.subscriptions s
  join public.artisans a on a.id = s.artisan_id
  left join public.plans p on p.code = s.plan_code
  left join auth.users u on u.id = a.user_id
$$;
revoke execute on function app.admin_subscription_rows() from public, anon, authenticated;

create function public.admin_subscriptions(
  p_filter text default 'tous',
  p_query text default null,
  p_limit integer default 50,
  p_offset integer default 0
)
returns table (
  artisan_id uuid, artisan text, siret text, formule text, prix_cents integer, status text,
  situation text, current_period_end timestamptz, trial_end timestamptz,
  cancel_at_period_end boolean, ended_at timestamptz, created_at timestamptz, total bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_like text := app.admin_like(p_query);
begin
  if not app.is_admin() then
    raise exception 'Réservé à l''équipe MENAO' using errcode = '42501';
  end if;
  return query
  select r.artisan_id, r.artisan, r.siret, r.formule, r.prix_cents, r.status, r.situation,
    r.current_period_end, r.trial_end, r.cancel_at_period_end, r.ended_at, r.created_at,
    count(*) over ()
  from app.admin_subscription_rows() r
  where (coalesce(p_filter, 'tous') = 'tous' or r.situation = p_filter)
    and (
      v_like is null
      or r.artisan ilike v_like or r.siret ilike v_like or r.email ilike v_like
      or r.formule ilike v_like
    )
  order by r.created_at desc
  limit least(greatest(coalesce(p_limit, 50), 1), 100)
  offset greatest(coalesce(p_offset, 0), 0);
end;
$$;

-- Nombre d'abonnements par situation, pour les pastilles de la liste (même recherche).
create function public.admin_subscription_counts(p_query text default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_like text := app.admin_like(p_query);
begin
  if not app.is_admin() then
    raise exception 'Réservé à l''équipe MENAO' using errcode = '42501';
  end if;
  return (
    select jsonb_build_object(
      'tous', count(*),
      'actifs', count(*) filter (where r.situation = 'actifs'),
      'essais', count(*) filter (where r.situation = 'essais'),
      'impayes', count(*) filter (where r.situation = 'impayes'),
      'fin_programmee', count(*) filter (where r.situation = 'fin_programmee'),
      'resilies', count(*) filter (where r.situation = 'resilies')
    )
    from app.admin_subscription_rows() r
    where v_like is null
      or r.artisan ilike v_like or r.siret ilike v_like or r.email ilike v_like
      or r.formule ilike v_like
  );
end;
$$;

-- Synthèse des abonnements, partagée par la vue d'ensemble et la page des abonnements.
--   Revenu mensuel récurrent : abonnements payants (actifs, ou impayés que Stripe relance encore),
--   au tarif HT de leur formule, hors remises et coupons.
--   Désabonnement : abonnements en cours il y a 30 jours et résiliés depuis (perdus_30j), rapportés
--   aux abonnements en cours il y a 30 jours (calcul du taux : packages/core, churnRate).
create function app.subscription_summary()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'actifs', count(*) filter (where s.status = 'active'),
    'essais', count(*) filter (where s.status = 'trialing'),
    'impayes', count(*) filter (where s.status in ('past_due', 'unpaid')),
    'resilies_30j', count(*) filter (
      where s.status = 'canceled' and s.ended_at >= now() - interval '30 days'
    ),
    'payants', count(*) filter (where s.status in ('active', 'past_due')),
    'mrr_cents', coalesce(
      sum(p.prix_mensuel_ht_centimes) filter (where s.status in ('active', 'past_due')), 0
    ),
    'essais_cents', coalesce(
      sum(p.prix_mensuel_ht_centimes) filter (where s.status = 'trialing' and not s.cancel_at_period_end), 0
    ),
    'impayes_cents', coalesce(
      sum(p.prix_mensuel_ht_centimes) filter (where s.status in ('past_due', 'unpaid')), 0
    ),
    'fin_programmee', count(*) filter (
      where s.cancel_at_period_end and s.status in ('active', 'trialing')
    ),
    'en_cours_30j', count(*) filter (
      where s.created_at < now() - interval '30 days'
        and s.status not in ('incomplete', 'incomplete_expired')
        and (s.ended_at is null or s.ended_at >= now() - interval '30 days')
    ),
    'perdus_30j', count(*) filter (
      where s.created_at < now() - interval '30 days'
        and s.status = 'canceled' and s.ended_at >= now() - interval '30 days'
    ),
    'sans_formule', count(*) filter (where p.code is null and s.status in ('active', 'past_due'))
  )
  from public.subscriptions s
  left join public.plans p on p.code = s.plan_code
$$;
revoke execute on function app.subscription_summary() from public, anon, authenticated;

create function public.admin_subscription_summary()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not app.is_admin() then
    raise exception 'Réservé à l''équipe MENAO' using errcode = '42501';
  end if;
  return app.subscription_summary() || jsonb_build_object('formules', (
    select coalesce(jsonb_agg(to_jsonb(f) - 'ordre' order by f.ordre), '[]'::jsonb)
    from (
      select p.code, p.nom, p.prix_mensuel_ht_centimes as prix_cents, p.ordre,
        count(s.id) filter (where s.status in ('active', 'past_due')) as payants,
        count(s.id) filter (where s.status = 'trialing') as essais,
        coalesce(sum(p.prix_mensuel_ht_centimes) filter (where s.status in ('active', 'past_due')), 0)
          as mrr_cents
      from public.plans p
      left join public.subscriptions s on s.plan_code = p.code
      group by p.id
    ) f
  ));
end;
$$;

-- ---------------------------------------------------------------------------
-- Vue d'ensemble (ADR 0045) : synthèse des abonnements (revenu mensuel récurrent, résiliations
-- datées par Stripe) et notifications des services en échec.
-- ---------------------------------------------------------------------------
create or replace function public.admin_overview()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := now();
  -- « Aujourd'hui » des compteurs : depuis minuit, heure de Paris.
  v_today_date date := (now() at time zone 'Europe/Paris')::date;
  v_today timestamptz := (now() at time zone 'Europe/Paris')::date::timestamp at time zone 'Europe/Paris';
  v_30 timestamptz := now() - interval '30 days';
  v_7 timestamptz := now() - interval '7 days';
begin
  if not app.is_admin() then
    raise exception 'Réservé à l''équipe MENAO' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'artisans', (
      select jsonb_build_object(
        'en_verification', count(*) filter (where a.status = 'en_verification'),
        'plus_ancien_dossier', min(a.submitted_at) filter (where a.status = 'en_verification'),
        'valides', count(*) filter (where a.status = 'valide'),
        'visibles', count(*) filter (where a.status = 'valide' and app.artisan_is_visible(a.id)),
        'suspendus', count(*) filter (where a.status = 'suspendu'),
        'inscrits_30j', count(*) filter (where a.created_at >= v_30)
      )
      from public.artisans a
    ),
    'abonnements', app.subscription_summary(),
    'recherches', (
      select jsonb_build_object(
        'aujourdhui', count(*) filter (where p.created_at >= v_today),
        'j30', count(*) filter (where p.created_at >= v_30),
        'envoyees_30j', count(*) filter (where p.created_at >= v_30 and p.status = 'demande_envoyee'),
        'non_envoyees_7j', count(*) filter (
          where p.created_at >= v_7 and p.status in ('brouillon', 'criteres_valides')
        )
      )
      from public.projects p
    ),
    'demandes', (
      select jsonb_build_object(
        'aujourdhui', count(*) filter (where r.created_at >= v_today),
        'j7', count(*) filter (where r.created_at >= v_7),
        'j30', count(*) filter (where r.created_at >= v_30),
        'en_attente', count(*) filter (where r.status = 'envoyee' and r.expires_at > v_now),
        'expirent_12h', count(*) filter (
          where r.status = 'envoyee' and r.expires_at > v_now and r.expires_at <= v_now + interval '12 hours'
        ),
        'acceptees_30j', count(*) filter (where r.status = 'acceptee' and r.created_at >= v_30),
        'refusees_30j', count(*) filter (where r.status = 'refusee' and r.created_at >= v_30),
        'expirees_30j', count(*) filter (where r.status = 'expiree' and r.created_at >= v_30)
      )
      from public.requests r
    ),
    'devis', (
      select jsonb_build_object(
        'envoyes_30j', count(*) filter (where q.sent_at >= v_30),
        'signes_30j', count(*) filter (where q.signed_at >= v_30),
        'signes_30j_cents', coalesce(sum(q.total_ttc_cents) filter (where q.signed_at >= v_30), 0)
      )
      from public.quotes q
    ),
    'chantiers', (
      select coalesce(jsonb_object_agg(s.status, s.n), '{}'::jsonb)
      from (select c.status, count(*) as n from public.chantiers c group by c.status) s
    ),
    -- Paiements des clients aux artisans, sur leurs comptes Stripe : MENAO n'encaisse rien.
    'paiements', (
      select jsonb_build_object(
        'payes_30j', count(*) filter (where pa.status = 'paye' and pa.paid_at >= v_30),
        'payes_30j_cents', coalesce(
          sum(pa.amount_cents) filter (where pa.status = 'paye' and pa.paid_at >= v_30), 0
        ),
        'echoues_7j', count(*) filter (where pa.status = 'echoue' and pa.updated_at >= v_7)
      )
      from public.payments pa
    ),
    'avis', (
      select jsonb_build_object(
        'publies_30j', count(*) filter (where rv.status = 'publie' and rv.created_at >= v_30),
        'note_moyenne', round(avg(rv.score) filter (where rv.status = 'publie'))
      )
      from public.reviews rv
    ),
    'tickets', (
      select jsonb_build_object(
        'ouverts', count(*) filter (where t.status <> 'resolu'),
        'en_retard', count(*) filter (where t.status <> 'resolu' and t.due_at < v_now),
        'litiges', count(*) filter (where t.status <> 'resolu' and t.type = 'litige'),
        -- Demandes de suppression du compte (RGPD, réponse sous un mois ; ADR 0039, 0048).
        'suppressions', count(*) filter (where t.status <> 'resolu' and t.type = 'suppression_compte'),
        'suppression_echeance', min(t.due_at) filter (
          where t.status <> 'resolu' and t.type = 'suppression_compte'
        )
      )
      from public.tickets t
    ),
    -- F-51 : renouvellements déposés à vérifier, assurances d'artisans actifs proches de l'échéance.
    'documents', (
      select jsonb_build_object(
        'renouvellements', count(*) filter (where d.status = 'en_attente'),
        'assurances_7j', count(*) filter (
          where d.status = 'valide' and d.type in ('decennale', 'rc_pro')
            and d.date_fin <= v_today_date + 7
            and not exists (
              select 1 from public.artisan_documents n
              where n.artisan_id = d.artisan_id and n.type = d.type and n.status = 'en_attente'
            )
        )
      )
      from public.artisan_documents d
      join public.artisans a on a.id = d.artisan_id
      where a.status in ('valide', 'suspendu')
    ),
    -- Notifications Stripe ou DocuSeal non traitées : les données concernées peuvent être en retard.
    'notifications', (
      select jsonb_build_object('echecs', count(*))
      from public.webhook_events w
      where w.processed_at is null
        and app.webhook_event_state(w.processed_at, w.failures, w.received_at) in ('en_echec', 'bloquee')
    )
  );
end;
$$;

revoke execute on function public.admin_webhook_events(text, integer, integer) from public, anon;
revoke execute on function public.admin_webhook_counts() from public, anon;
revoke execute on function public.admin_payments(text, text, integer, integer) from public, anon;
revoke execute on function public.admin_payment_counts(text) from public, anon;
revoke execute on function public.admin_payment_summary() from public, anon;
revoke execute on function public.admin_subscriptions(text, text, integer, integer) from public, anon;
revoke execute on function public.admin_subscription_counts(text) from public, anon;
revoke execute on function public.admin_subscription_summary() from public, anon;
grant execute on function public.admin_webhook_events(text, integer, integer) to authenticated;
grant execute on function public.admin_webhook_counts() to authenticated;
grant execute on function public.admin_payments(text, text, integer, integer) to authenticated;
grant execute on function public.admin_payment_counts(text) to authenticated;
grant execute on function public.admin_payment_summary() to authenticated;
grant execute on function public.admin_subscriptions(text, text, integer, integer) to authenticated;
grant execute on function public.admin_subscription_counts(text) to authenticated;
grant execute on function public.admin_subscription_summary() to authenticated;
