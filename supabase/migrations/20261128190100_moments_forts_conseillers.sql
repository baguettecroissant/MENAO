-- F-196 (lot 85, ADR 0396) : les moments forts des conseillers.
--
-- - Prime créée (validation, abonnement) : notification « +110 € » et célébration une fois.
-- - Artisans à relancer : fin d'essai proche, dossier bloqué, lien préparé pas ouvert ; délais
--   réglables par l'équipe ; « me le rappeler dans 2 jours » ; une notification par sujet et par
--   semaine au plus.
-- - Notifications sur le téléphone (web push depuis l'icône d'accueil) : abonnements du navigateur,
--   envoyés par la file push existante (notify), désactivables type par type.
-- - Le conseiller voit le portable et le prénom de ses inscrits (décidé le 28/11/2026, phrase
--   ajoutée à la politique de confidentialité ; TODO(legal)).

-- ---------------------------------------------------------------------------------------------
-- Catégories des nouvelles notifications (préférences d'e-mail, OPTIONAL_NOTIFICATIONS)
-- ---------------------------------------------------------------------------------------------
create or replace function app.notification_category(p_type public.notification_type)
returns text
language sql
immutable
set search_path = ''
as $$
  select case p_type
    when 'chantier_nouveautes' then 'activite'
    when 'nouveaux_messages' then 'activite'
    when 'recommandation_partenaire' then 'activite'
    when 'avis_reponse' then 'activite'
    when 'filleul_valide' then 'activite'
    when 'synthese_mois' then 'activite'
    when 'conseiller_prime' then 'activite'
    when 'rdv_rappel' then 'rappels'
    when 'avis_relance' then 'rappels'
    when 'levee_relance' then 'rappels'
    when 'acompte_relance' then 'rappels'
    when 'planning_relance' then 'rappels'
    when 'inscription_relance' then 'rappels'
    when 'parrainage_suggestion' then 'rappels'
    when 'devis_relance' then 'rappels'
    when 'demarrage_rappel' then 'rappels'
    when 'activation_relance' then 'rappels'
    when 'finalisation_relance' then 'rappels'
    when 'conseiller_semaine' then 'rappels'
    when 'conseiller_relance' then 'rappels'
    when 'conseiller_fin_essai' then 'rappels'
    when 'conseiller_lien' then 'rappels'
    else 'transactionnel'
  end
$$;
revoke execute on function app.notification_category(public.notification_type) from public, anon, authenticated;

-- ---------------------------------------------------------------------------------------------
-- Notifications sur le téléphone (web push)
-- ---------------------------------------------------------------------------------------------
create table public.web_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  endpoint text not null unique check (endpoint ~ '^https://' and char_length(endpoint) <= 1000),
  p256dh text not null check (char_length(p256dh) between 20 and 200),
  auth text not null check (char_length(auth) between 8 and 100),
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);
create index web_push_subscriptions_user_idx on public.web_push_subscriptions (user_id);

alter table public.web_push_subscriptions enable row level security;
revoke all on public.web_push_subscriptions from anon, authenticated;
grant select on public.web_push_subscriptions to authenticated;
create policy "web_push_subscriptions : lecture par son compte"
  on public.web_push_subscriptions for select to authenticated
  using (user_id = (select auth.uid()));

-- Abonnement du navigateur : un appareil, un compte à la fois (repris par le dernier connecté).
create function public.register_web_push(p_endpoint text, p_p256dh text, p_auth text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
begin
  if v_user is null or coalesce((select (auth.jwt() ->> 'is_anonymous')::boolean), false) then
    raise exception 'Connexion requise.' using errcode = '42501';
  end if;
  if p_endpoint is null or p_endpoint !~ '^https://' or char_length(p_endpoint) > 1000
     or char_length(coalesce(p_p256dh, '')) not between 20 and 200
     or char_length(coalesce(p_auth, '')) not between 8 and 100 then
    raise exception 'Abonnement invalide.' using errcode = '22023';
  end if;
  insert into public.web_push_subscriptions (user_id, endpoint, p256dh, auth)
  values (v_user, p_endpoint, p_p256dh, p_auth)
  on conflict (endpoint) do update set user_id = excluded.user_id, p256dh = excluded.p256dh,
    auth = excluded.auth, last_seen_at = now();
end;
$$;
revoke execute on function public.register_web_push(text, text, text) from public, anon;
grant execute on function public.register_web_push(text, text, text) to authenticated;

create function public.unregister_web_push(p_endpoint text)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.web_push_subscriptions s
  where s.endpoint = p_endpoint and s.user_id = (select auth.uid());
$$;
revoke execute on function public.unregister_web_push(text) from public, anon;
grant execute on function public.unregister_web_push(text) to authenticated;

-- Abonnements refusés par le service push (navigateur désinstallé, autorisation retirée).
create function public.forget_web_push(p_endpoints text[])
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.web_push_subscriptions s where s.endpoint = any (p_endpoints);
$$;
revoke execute on function public.forget_web_push(text[]) from public, anon, authenticated;
grant execute on function public.forget_web_push(text[]) to service_role;

-- Préférence d'un type de notification sur le téléphone (vraie par défaut).
create function public.set_push_preference(p_type text, p_on boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
begin
  if v_user is null then
    raise exception 'Connexion requise.' using errcode = '42501';
  end if;
  if p_type is null or p_type not in ('conseiller_prime', 'conseiller_relance', 'conseiller_fin_essai', 'conseiller_lien')
     or p_on is null then
    raise exception 'Préférence inconnue.' using errcode = '22023';
  end if;
  update public.profiles p
  set notification_preferences = jsonb_set(
    case when jsonb_typeof(p.notification_preferences -> 'push') = 'object'
      then p.notification_preferences
      else p.notification_preferences || '{"push": {}}'::jsonb end,
    array['push', p_type], to_jsonb(p_on))
  where p.user_id = v_user;
end;
$$;
revoke execute on function public.set_push_preference(text, boolean) from public, anon;
grant execute on function public.set_push_preference(text, boolean) to authenticated;

-- Une notification part en push si le compte a l'application (Expo) ou un navigateur abonné ;
-- mêmes exclusions qu'avant (règle 10, messages groupés : 20261120160100_engagement_abonnement).
create or replace function app.notifications_push_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.channel = 'email'
     and new.type not in (
       'abonnement_impaye', 'mois_offert', 'nouveaux_messages', 'activation_relance',
       'essai_fin_proche', 'abonnement_reconduction', 'abonnement_arret'
     )
     and (exists (select 1 from public.push_tokens t where t.user_id = new.user_id)
       or exists (select 1 from public.web_push_subscriptions w where w.user_id = new.user_id)) then
    new.push_status := 'a_envoyer';
  end if;
  return new;
end;
$$;

-- Lot de pushes à envoyer : jetons Expo et abonnements web du destinataire. Ignorées : déjà lues,
-- de plus d'un jour, compte sans appareil, ou type désactivé par le destinataire.
drop function public.claim_push_notifications(int);
create function public.claim_push_notifications(p_limit int default 50)
returns table (
  id uuid,
  type public.notification_type,
  data jsonb,
  tokens text[],
  web jsonb
)
language sql
security definer
set search_path = ''
as $$
  with skipped as (
    update public.notifications n
    set push_status = 'ignoree', updated_at = now()
    where n.push_status = 'a_envoyer'
      and (n.read_at is not null
           or n.created_at < now() - interval '1 day'
           or (not exists (select 1 from public.push_tokens t where t.user_id = n.user_id)
               and not exists (select 1 from public.web_push_subscriptions w where w.user_id = n.user_id))
           or exists (
             select 1 from public.profiles pr
             where pr.user_id = n.user_id
               and (pr.notification_preferences #>> array['push', n.type::text]) = 'false'
           ))
    returning n.id
  ),
  picked as (
    select n.id from public.notifications n
    where n.push_attempts < 3
      and n.read_at is null
      and n.created_at >= now() - interval '1 day'
      and ((n.push_status = 'a_envoyer')
           or (n.push_status = 'en_cours' and n.push_locked_at < now() - interval '10 minutes'))
      and (exists (select 1 from public.push_tokens t where t.user_id = n.user_id)
        or exists (select 1 from public.web_push_subscriptions w where w.user_id = n.user_id))
      and n.id not in (select s.id from skipped s)
    order by n.created_at, n.id
    limit least(greatest(coalesce(p_limit, 50), 1), 100)
    for update skip locked
  ),
  claimed as (
    update public.notifications n
    set push_status = 'en_cours', push_attempts = n.push_attempts + 1, push_locked_at = now()
    from picked
    where n.id = picked.id
    returning n.id, n.user_id, n.type, n.data
  )
  select c.id, c.type, c.data,
    array(
      select t.token from public.push_tokens t
      where t.user_id = c.user_id
      order by t.last_seen_at desc, t.id
    ),
    coalesce((
      select jsonb_agg(jsonb_build_object('endpoint', w.endpoint, 'p256dh', w.p256dh, 'auth', w.auth)
        order by w.last_seen_at desc)
      from public.web_push_subscriptions w where w.user_id = c.user_id
    ), '[]'::jsonb)
  from claimed c
$$;
revoke execute on function public.claim_push_notifications(int) from public, anon, authenticated;
grant execute on function public.claim_push_notifications(int) to service_role;

-- « Bien démarrer » : l'étape des notifications est faite dès qu'un téléphone est abonné.
create or replace function app.commercial_onboarding_json(p_commercial uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'contrat_depose_le', o.contrat_depose_le,
    'contrat_signe_le', o.contrat_signe_le,
    'contrat', o.contrat_path is not null,
    'rsac_numero', o.rsac_numero,
    'rsac_greffe', o.rsac_greffe,
    'urssaf_deposee_le', o.urssaf_deposee_le,
    'rib_depose_le', o.rib_depose_le,
    'ecran_installe_le', o.ecran_installe_le,
    'badge_vu_le', o.badge_vu_le,
    'rappels', coalesce((pr.notification_preferences #>> '{email,rappels}')::boolean, true),
    'push', exists (select 1 from public.web_push_subscriptions w where w.user_id = c.user_id),
    'modules', coalesce((
      select jsonb_object_agg(r.module, r.score)
      from public.commercial_formation_results r where r.commercial_id = c.id
    ), '{}'::jsonb),
    'meilleur_entrainement', (
      select max(t.score) from public.commercial_trainings t where t.commercial_id = c.id
    ),
    'premier_prospect', exists (
      select 1 from public.prospect_briefs b
      join public.prospect_follows f on f.prospect_id = b.prospect_id
      where f.commercial_id = c.id
    )
  )
  from public.commercials c
  left join public.commercial_onboarding o on o.commercial_id = c.id
  left join public.profiles pr on pr.user_id = c.user_id
  where c.id = p_commercial
$$;

-- ---------------------------------------------------------------------------------------------
-- Primes : notification et célébration
-- ---------------------------------------------------------------------------------------------
alter table public.commercial_bonuses add column celebrated_at timestamptz;

-- Montant attendu d'une prime : celui de la vérification s'il est connu, sinon celui des réglages.
create function app.commercial_bonus_expected_cents(p_bonus public.commercial_bonuses)
returns int
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(p_bonus.amount_cents,
    case p_bonus.kind
      when 'validation' then (select s.prime_validation_centimes from public.commercial_bonus_settings s)
      else app.commercial_subscription_bonus_cents(
        (select sub.plan_code from public.subscriptions sub where sub.artisan_id = p_bonus.artisan_id))
    end)
$$;
revoke execute on function app.commercial_bonus_expected_cents(public.commercial_bonuses) from public, anon, authenticated;

create function app.notify_commercial_bonus()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid;
  v_name text;
begin
  select c.user_id into v_user from public.commercials c where c.id = new.commercial_id and c.status = 'actif';
  if v_user is null then
    return null;
  end if;
  select coalesce(a.nom_commercial, a.raison_sociale) into v_name from public.artisans a where a.id = new.artisan_id;
  perform app.notify(v_user, 'conseiller_prime', jsonb_build_object(
    'kind', new.kind,
    'entreprise', v_name,
    'montant_centimes', app.commercial_bonus_expected_cents(new)
  ));
  return null;
end;
$$;
revoke execute on function app.notify_commercial_bonus() from public, anon, authenticated;
create trigger commercial_bonuses_notify after insert on public.commercial_bonuses
  for each row execute function app.notify_commercial_bonus();

-- Prochaine prime à célébrer (des 14 derniers jours, la plus ancienne), avec le total du mois.
create function public.commercial_next_celebration()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_me uuid := app.my_commercial_id();
  v_month timestamptz := date_trunc('month', now() at time zone 'Europe/Paris') at time zone 'Europe/Paris';
begin
  if v_me is null then
    return null;
  end if;
  return (
    select jsonb_build_object(
      'id', b.id,
      'kind', b.kind,
      'entreprise', coalesce(a.nom_commercial, a.raison_sociale),
      'montant_centimes', app.commercial_bonus_expected_cents(b),
      'mois_centimes', (
        select coalesce(sum(app.commercial_bonus_expected_cents(x)), 0)
        from public.commercial_bonuses x
        where x.commercial_id = v_me and x.status <> 'annulee' and x.created_at >= v_month
      ),
      'valides_semaine', (
        select count(*) from public.commercial_bonuses x
        where x.commercial_id = v_me and x.kind = 'validation' and x.status <> 'annulee'
          and x.created_at >= date_trunc('week', now() at time zone 'Europe/Paris') at time zone 'Europe/Paris'
      )
    )
    from public.commercial_bonuses b
    left join public.artisans a on a.id = b.artisan_id
    where b.commercial_id = v_me and b.celebrated_at is null and b.status <> 'annulee'
      and b.created_at >= now() - interval '14 days'
    order by b.created_at, b.id
    limit 1
  );
end;
$$;
revoke execute on function public.commercial_next_celebration() from public, anon;
grant execute on function public.commercial_next_celebration() to authenticated;

create function public.commercial_mark_celebrated(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := app.my_commercial_id();
begin
  if v_me is null then
    raise exception 'Réservé aux commerciaux' using errcode = '42501';
  end if;
  update public.commercial_bonuses b set celebrated_at = coalesce(b.celebrated_at, now())
  where b.id = p_id and b.commercial_id = v_me;
end;
$$;
revoke execute on function public.commercial_mark_celebrated(uuid) from public, anon;
grant execute on function public.commercial_mark_celebrated(uuid) to authenticated;

-- ---------------------------------------------------------------------------------------------
-- Artisans à relancer
-- ---------------------------------------------------------------------------------------------
create table public.commercial_alert_settings (
  id boolean primary key default true check (id),
  bloque_jours int not null default 3 check (bloque_jours between 1 and 30),
  fin_essai_jours int not null default 7 check (fin_essai_jours between 1 and 30),
  lien_jours int not null default 2 check (lien_jours between 1 and 6),
  updated_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now()
);
create index commercial_alert_settings_updated_by_idx on public.commercial_alert_settings (updated_by);
create trigger commercial_alert_settings_set_updated_at before update on public.commercial_alert_settings
  for each row execute function app.set_updated_at();
insert into public.commercial_alert_settings (id) values (true);

alter table public.commercial_alert_settings enable row level security;
revoke all on public.commercial_alert_settings from anon, authenticated;
grant select on public.commercial_alert_settings to authenticated;
create policy "commercial_alert_settings : lecture par un admin"
  on public.commercial_alert_settings for select to authenticated
  using ((select app.is_admin()));

create table public.commercial_alert_snoozes (
  commercial_id uuid not null references public.commercials (id) on delete cascade,
  subject text not null check (char_length(subject) <= 100),
  until timestamptz not null,
  primary key (commercial_id, subject)
);
create table public.commercial_alerts_sent (
  commercial_id uuid not null references public.commercials (id) on delete cascade,
  subject text not null check (char_length(subject) <= 100),
  sent_at timestamptz not null default now(),
  primary key (commercial_id, subject)
);
alter table public.commercial_alert_snoozes enable row level security;
alter table public.commercial_alerts_sent enable row level security;
revoke all on public.commercial_alert_snoozes, public.commercial_alerts_sent from anon, authenticated;
grant select on public.commercial_alert_snoozes, public.commercial_alerts_sent to authenticated;
create policy "commercial_alert_snoozes : lecture par le conseiller"
  on public.commercial_alert_snoozes for select to authenticated
  using (commercial_id = (select app.my_commercial_id()));
create policy "commercial_alerts_sent : lecture par le conseiller"
  on public.commercial_alerts_sent for select to authenticated
  using (commercial_id = (select app.my_commercial_id()));

-- Ce qu'un conseiller a à faire pour ses artisans, à un instant donné (hors rappels reportés).
create function app.commercial_alerts_for(p_commercial uuid, p_now timestamptz default now())
returns table (
  kind text,
  subject text,
  artisan_id uuid,
  prepared_id uuid,
  entreprise text,
  first_name text,
  phone text,
  at timestamptz,
  steps text[]
)
language sql
stable
security definer
set search_path = ''
as $$
  with s as (
    select coalesce(x.bloque_jours, 3) as bloque, coalesce(x.fin_essai_jours, 7) as fin_essai,
      coalesce(x.lien_jours, 2) as lien
    from (select 1) one left join public.commercial_alert_settings x on true
  ),
  mine as (
    select a.id, a.user_id, a.status, a.updated_at, coalesce(a.nom_commercial, a.raison_sociale) as nom
    from public.commercial_attributions ca
    join public.artisans a on a.id = ca.artisan_id
    where ca.commercial_id = p_commercial
  ),
  alerts as (
    select 'fin_essai'::text as kind, 'fin_essai:' || m.id::text as subject, m.id as artisan_id,
      null::uuid as prepared_id, m.nom as entreprise, m.user_id, null::text as pphone,
      null::text as pfirst, sub.trial_end as at, '{}'::text[] as steps
    from mine m
    join public.subscriptions sub on sub.artisan_id = m.id
    cross join s
    where sub.status = 'trialing' and sub.trial_end > p_now
      and sub.trial_end <= p_now + make_interval(days => s.fin_essai)
    union all
    select 'bloque', 'bloque:' || m.id::text, m.id, null, m.nom, m.user_id, null, null, m.updated_at,
      case when m.status = 'brouillon' then app.onboarding_missing_steps(m.id)
        else app.activation_missing_steps(m.id) end
    from mine m
    cross join s
    where m.updated_at < p_now - make_interval(days => s.bloque)
      and ((m.status = 'brouillon' and cardinality(app.onboarding_missing_steps(m.id)) > 0)
        or (m.status = 'valide' and not app.artisan_is_visible(m.id)
          and cardinality(app.activation_missing_steps(m.id)) > 0))
    union all
    select 'lien', 'lien:' || ps.id::text, null, ps.id, coalesce(ps.company_name, ps.siret), null,
      ps.phone, ps.first_name, ps.created_at, '{}'::text[]
    from public.prepared_signups ps
    cross join s
    where ps.commercial_id = p_commercial and ps.opened_at is null and ps.converted_at is null
      and ps.expires_at > p_now and ps.created_at < p_now - make_interval(days => s.lien)
  )
  select al.kind, al.subject, al.artisan_id, al.prepared_id, al.entreprise,
    coalesce(al.pfirst, pr.first_name), coalesce(al.pphone, pr.phone), al.at, al.steps
  from alerts al
  left join public.profiles pr on pr.user_id = al.user_id
  where not exists (
    select 1 from public.commercial_alert_snoozes z
    where z.commercial_id = p_commercial and z.subject = al.subject and z.until > p_now
  )
$$;
revoke execute on function app.commercial_alerts_for(uuid, timestamptz) from public, anon, authenticated;

-- « Vos artisans » du conseiller connecté (portable et prénom compris, décidé le 28/11/2026).
create function public.commercial_artisan_alerts()
returns table (
  kind text,
  subject text,
  artisan_id uuid,
  prepared_id uuid,
  entreprise text,
  first_name text,
  phone text,
  at timestamptz,
  steps text[]
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_me uuid := app.my_commercial_id();
begin
  if v_me is null then
    raise exception 'Réservé aux commerciaux' using errcode = '42501';
  end if;
  return query select * from app.commercial_alerts_for(v_me, now());
end;
$$;
revoke execute on function public.commercial_artisan_alerts() from public, anon;
grant execute on function public.commercial_artisan_alerts() to authenticated;

-- « Me le rappeler dans 2 jours ».
create function public.commercial_snooze_alert(p_subject text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := app.my_commercial_id();
begin
  if v_me is null then
    raise exception 'Réservé aux commerciaux' using errcode = '42501';
  end if;
  if p_subject is null or p_subject !~ '^(fin_essai|bloque|lien):[0-9a-f-]{36}$' then
    raise exception 'Rappel inconnu.' using errcode = '22023';
  end if;
  insert into public.commercial_alert_snoozes (commercial_id, subject, until)
  values (v_me, p_subject, now() + interval '2 days')
  on conflict (commercial_id, subject) do update set until = excluded.until;
end;
$$;
revoke execute on function public.commercial_snooze_alert(text) from public, anon;
grant execute on function public.commercial_snooze_alert(text) to authenticated;

-- Chaque matin : une notification par sujet et par semaine au plus. p_now : pour les tests.
create function app.send_commercial_alerts(p_now timestamptz default now())
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_sent integer := 0;
  v_row record;
begin
  delete from public.commercial_alert_snoozes z where z.until <= p_now;
  for v_row in
    select c.id as commercial_id, c.user_id, al.*
    from public.commercials c
    cross join lateral app.commercial_alerts_for(c.id, p_now) al
    where c.status = 'actif' and c.user_id is not null
      and not exists (
        select 1 from public.commercial_alerts_sent x
        where x.commercial_id = c.id and x.subject = al.subject and x.sent_at > p_now - interval '7 days'
      )
  loop
    perform app.notify(v_row.user_id,
      case v_row.kind
        when 'fin_essai' then 'conseiller_fin_essai'::public.notification_type
        when 'bloque' then 'conseiller_relance'::public.notification_type
        else 'conseiller_lien'::public.notification_type
      end,
      jsonb_build_object(
        'entreprise', v_row.entreprise,
        'etapes', to_jsonb(v_row.steps),
        'date', v_row.at,
        'jours', case v_row.kind
          when 'fin_essai' then greatest(0, ceil(extract(epoch from v_row.at - p_now) / 86400))::int
          else greatest(0, floor(extract(epoch from p_now - v_row.at) / 86400))::int
        end
      ));
    insert into public.commercial_alerts_sent (commercial_id, subject, sent_at)
    values (v_row.commercial_id, v_row.subject, p_now)
    on conflict (commercial_id, subject) do update set sent_at = excluded.sent_at;
    v_sent := v_sent + 1;
  end loop;
  delete from public.commercial_alerts_sent x where x.sent_at < p_now - interval '60 days';
  return v_sent;
end;
$$;
revoke execute on function app.send_commercial_alerts(timestamptz) from public, anon, authenticated;

select cron.schedule('menao-alertes-conseillers', '0 7 * * *', 'select app.send_commercial_alerts()');

-- Back-office : délais des alertes.
create function public.admin_save_commercial_alert_settings(
  p_bloque_jours int,
  p_fin_essai_jours int,
  p_lien_jours int
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform app.require_admin();
  if p_bloque_jours is null or p_bloque_jours not between 1 and 30
     or p_fin_essai_jours is null or p_fin_essai_jours not between 1 and 30
     or p_lien_jours is null or p_lien_jours not between 1 and 6 then
    raise exception 'Délais invalides.' using errcode = '22023';
  end if;
  update public.commercial_alert_settings set bloque_jours = p_bloque_jours,
    fin_essai_jours = p_fin_essai_jours, lien_jours = p_lien_jours, updated_by = (select auth.uid())
  where id;
  perform app.audit('commercial.alertes', 'commercial_alert_settings', null, jsonb_build_object(
    'bloque_jours', p_bloque_jours, 'fin_essai_jours', p_fin_essai_jours, 'lien_jours', p_lien_jours));
end;
$$;
revoke execute on function public.admin_save_commercial_alert_settings(int, int, int) from public, anon;
grant execute on function public.admin_save_commercial_alert_settings(int, int, int) to authenticated;
