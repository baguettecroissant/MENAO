-- F-58 : vue d'ensemble du back-office (ADR 0045). Chiffres clés et fil d'activité de toute la
-- plateforme, en lecture seule, réservés aux admins (session aal2, app.is_admin). Le fil ne
-- nomme pas les particuliers : métier et ville pour leurs recherches et leurs demandes.

-- ---------------------------------------------------------------------------
-- Chiffres clés : un seul appel pour la page d'accueil du back-office.
-- ---------------------------------------------------------------------------
create function public.admin_overview()
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
    'abonnements', (
      select jsonb_build_object(
        'actifs', count(*) filter (where s.status = 'active'),
        'essais', count(*) filter (where s.status = 'trialing'),
        'impayes', count(*) filter (where s.status in ('past_due', 'unpaid')),
        'resilies_30j', count(*) filter (where s.status = 'canceled' and s.updated_at >= v_30)
      )
      from public.subscriptions s
    ),
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
        'litiges', count(*) filter (where t.status <> 'resolu' and t.type = 'litige')
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
    )
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Fil d'activité : les derniers événements de toute la plateforme, du plus récent au plus ancien.
-- ---------------------------------------------------------------------------
create function public.admin_activity(p_limit integer default 40)
returns table (occurred_at timestamptz, kind text, details jsonb)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_limit integer := least(greatest(coalesce(p_limit, 40), 1), 100);
begin
  if not app.is_admin() then
    raise exception 'Réservé à l''équipe MENAO' using errcode = '42501';
  end if;

  return query
  select f.happened, f.what, f.data
  from (
    (select p.created_at as happened, 'recherche'::text as what,
        jsonb_build_object('metier', tr.label, 'ville', p.ville_nom) as data
      from public.projects p
      left join public.trades tr on tr.code = p.trade_code
      order by p.created_at desc limit v_limit)
    union all
    (select r.created_at, 'demande_envoyee', jsonb_build_object(
        'artisan_id', r.artisan_id, 'artisan', coalesce(a.nom_commercial, a.raison_sociale),
        'metier', tr.label, 'ville', p.ville_nom)
      from public.requests r
      join public.artisans a on a.id = r.artisan_id
      join public.projects p on p.id = r.project_id
      left join public.trades tr on tr.code = p.trade_code
      order by r.created_at desc limit v_limit)
    union all
    (select r.responded_at,
        case when r.status = 'acceptee' then 'demande_acceptee' else 'demande_refusee' end,
        jsonb_build_object(
          'artisan_id', r.artisan_id, 'artisan', coalesce(a.nom_commercial, a.raison_sociale),
          'ville', p.ville_nom, 'motif', r.refusal_reason)
      from public.requests r
      join public.artisans a on a.id = r.artisan_id
      join public.projects p on p.id = r.project_id
      where r.responded_at is not null and r.status in ('acceptee', 'refusee')
      order by r.responded_at desc limit v_limit)
    union all
    (select r.expires_at, 'demande_expiree', jsonb_build_object(
        'artisan_id', r.artisan_id, 'artisan', coalesce(a.nom_commercial, a.raison_sociale),
        'ville', p.ville_nom)
      from public.requests r
      join public.artisans a on a.id = r.artisan_id
      join public.projects p on p.id = r.project_id
      where r.status = 'expiree'
      order by r.expires_at desc limit v_limit)
    union all
    (select r.cancelled_at, 'demande_annulee', jsonb_build_object(
        'artisan_id', r.artisan_id, 'artisan', coalesce(a.nom_commercial, a.raison_sociale),
        'ville', p.ville_nom)
      from public.requests r
      join public.artisans a on a.id = r.artisan_id
      join public.projects p on p.id = r.project_id
      where r.cancelled_at is not null
      order by r.cancelled_at desc limit v_limit)
    union all
    (select e.created_at, 'chantier', jsonb_build_object(
        'evenement', e.event, 'titre', c.title, 'artisan_id', c.artisan_id,
        'artisan', coalesce(a.nom_commercial, a.raison_sociale), 'ville', c.ville_nom)
      from public.chantier_events e
      join public.chantiers c on c.id = e.chantier_id
      join public.artisans a on a.id = c.artisan_id
      order by e.created_at desc limit v_limit)
    union all
    (select a.submitted_at, 'dossier_envoye', jsonb_build_object(
        'artisan_id', a.id, 'entreprise', coalesce(a.nom_commercial, a.raison_sociale))
      from public.artisans a
      where a.submitted_at is not null
      order by a.submitted_at desc limit v_limit)
    union all
    (select ar.created_at, 'dossier_decision', jsonb_build_object(
        'artisan_id', a.id, 'entreprise', coalesce(a.nom_commercial, a.raison_sociale),
        'decision', ar.decision)
      from public.artisan_reviews ar
      join public.artisans a on a.id = ar.artisan_id
      order by ar.created_at desc limit v_limit)
    union all
    -- Les litiges apparaissent par l'événement du chantier (litige_ouvert).
    (select tk.created_at, 'ticket', jsonb_build_object('ticket_id', tk.id, 'type', tk.type)
      from public.tickets tk
      where tk.type <> 'litige'
      order by tk.created_at desc limit v_limit)
    union all
    (select rv.created_at, 'avis', jsonb_build_object(
        'artisan_id', rv.artisan_id, 'artisan', coalesce(a.nom_commercial, a.raison_sociale),
        'note', rv.score)
      from public.reviews rv
      join public.artisans a on a.id = rv.artisan_id
      order by rv.created_at desc limit v_limit)
    union all
    (select s.created_at, 'abonnement', jsonb_build_object(
        'artisan_id', s.artisan_id, 'entreprise', coalesce(a.nom_commercial, a.raison_sociale),
        'formule', s.plan_code)
      from public.subscriptions s
      join public.artisans a on a.id = s.artisan_id
      order by s.created_at desc limit v_limit)
  ) f
  order by f.happened desc
  limit v_limit;
end;
$$;

revoke execute on function public.admin_overview() from public, anon;
revoke execute on function public.admin_activity(integer) from public, anon;
grant execute on function public.admin_overview() to authenticated;
grant execute on function public.admin_activity(integer) to authenticated;

-- ---------------------------------------------------------------------------
-- Vue d'ensemble en direct (ADR 0045) : le back-office suit ces tables par Supabase Realtime et
-- se met à jour à chaque changement. Chaque abonné ne reçoit que les lignes que la RLS lui permet
-- de lire (politiques du staff pour l'équipe, ses propres lignes pour un utilisateur).
-- ---------------------------------------------------------------------------
alter publication supabase_realtime add table
  public.projects, public.requests, public.chantier_events, public.tickets, public.artisans;
