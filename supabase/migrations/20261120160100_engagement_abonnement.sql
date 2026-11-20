-- Engagement d'un an de l'abonnement artisan (F-184, ADR 0383, décisions du 20 novembre 2026) :
-- essai de 60 jours à partir de la mise en ligne de la fiche, puis 12 mois fermes à compter du
-- premier paiement, reconduits tacitement ; arrêt au plus tard 3 mois avant l'échéance, depuis
-- l'espace MENAO ; aucune sortie en cours de période. Les abonnements souscrits avant gardent leurs
-- conditions (engagement_version nulle).

-- ---------- Abonnements ----------
alter table public.subscriptions
  add column engagement_version text
    check (engagement_version is null or char_length(engagement_version) between 1 and 40),
  add column essai_demarre_le timestamptz,
  add column cancel_at timestamptz,
  add column arret_demande_le timestamptz,
  add column arret_effet_le date,
  add column motif_arret text
    check (motif_arret is null or motif_arret in ('demandes', 'prix', 'activite', 'autre'));

comment on column public.subscriptions.engagement_version is
  'Version de la case d''engagement d''un an acceptée (ADR 0383) ; nulle pour un abonnement souscrit avant.';
comment on column public.subscriptions.essai_demarre_le is
  'Mise en ligne de la fiche : début de l''essai de 60 jours (abonnements engagés seulement).';
comment on column public.subscriptions.cancel_at is
  'Fin programmée chez Stripe à une date précise (arrêt à l''échéance).';
comment on column public.subscriptions.arret_effet_le is
  'Dernier jour couvert par l''abonnement après une demande d''arrêt.';

-- ---------- Preuve d'acceptation de l'engagement (CGV, article 6) ----------
-- Journal en ajout seul, écrit par la fonction billing-checkout (rôle service) au moment où
-- l'artisan valide la case, avant la page de paiement : date, heure, texte exact et version.
create table public.subscription_term_acceptances (
  id uuid primary key default gen_random_uuid(),
  artisan_id uuid not null references public.artisans (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  version text not null check (char_length(version) between 1 and 40),
  texte text not null check (char_length(texte) between 1 and 1000),
  cgv_version text not null check (char_length(cgv_version) between 1 and 50),
  plan_code text references public.plans (code),
  periodicite text not null check (periodicite in ('mensuel', 'annuel')),
  accepted_at timestamptz not null default now()
);
create index subscription_term_acceptances_artisan_idx
  on public.subscription_term_acceptances (artisan_id, accepted_at desc);

alter table public.subscription_term_acceptances enable row level security;
revoke all on table public.subscription_term_acceptances from anon, authenticated;
grant select on table public.subscription_term_acceptances to authenticated;
create policy "engagements d'abonnement : lecture par l'artisan et l'équipe d'administration"
  on public.subscription_term_acceptances for select to authenticated
  using (artisan_id = (select app.my_artisan_id()) or (select app.is_admin()));

-- ---------- Dates de l'engagement (même calcul que packages/core/src/subscription-term.ts) ----------
-- Période de 12 mois qui contient p_today, comptée depuis le premier paiement ; date limite
-- d'arrêt 3 mois avant l'échéance (veille comprise) ; rappel 30 jours avant cette date limite.
create function app.subscription_term_dates(p_first date, p_today date)
returns table (debut date, echeance date, date_limite date, rappel date)
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_n int := 0;
begin
  while (p_first + make_interval(months => 12 * (v_n + 1)))::date <= p_today loop
    v_n := v_n + 1;
  end loop;
  debut := (p_first + make_interval(months => 12 * v_n))::date;
  echeance := (p_first + make_interval(months => 12 * (v_n + 1)))::date;
  date_limite := (echeance - interval '3 months')::date - 1;
  rappel := date_limite - 30;
  return next;
end;
$$;
revoke execute on function app.subscription_term_dates(date, date) from public, anon, authenticated;

-- ---------- Confirmation de la demande d'arrêt (CGV, article 8) ----------
create function app.subscriptions_notify_stop()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid;
begin
  select a.user_id into v_user from public.artisans a where a.id = new.artisan_id;
  if v_user is not null then
    perform app.notify(v_user, 'abonnement_arret', jsonb_build_object(
      'subscription_id', new.id,
      'fin', new.arret_effet_le,
      'essai', new.status = 'trialing'
    ));
  end if;
  return new;
end;
$$;
revoke execute on function app.subscriptions_notify_stop() from public, anon, authenticated;
create trigger subscriptions_notify_stop
  after update of arret_demande_le on public.subscriptions
  for each row
  when (old.arret_demande_le is null and new.arret_demande_le is not null)
  execute function app.subscriptions_notify_stop();

-- ---------- Rappels de fin d'essai et de reconduction ----------
-- Fin d'essai : 7 jours puis la veille du premier paiement. Reconduction : à partir de 30 jours
-- avant la date limite d'arrêt, une fois par échéance. Rattrapage si un passage a été manqué.
create function app.remind_subscription_term(p_now timestamptz default now())
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_today date := (p_now at time zone 'Europe/Paris')::date;
  r record;
  v_first date;
  v_days int;
  v_step int;
  v_amount int;
  v_dates record;
begin
  for r in
    select s.id, s.trial_end, s.periodicite, a.user_id, p.nom, p.prix_mensuel_ht_centimes
    from public.subscriptions s
    join public.artisans a on a.id = s.artisan_id
    left join public.plans p on p.code = s.plan_code
    where s.status = 'trialing'
      and s.engagement_version is not null
      and s.essai_demarre_le is not null
      and s.trial_end is not null
      and s.arret_demande_le is null
      and not s.cancel_at_period_end
      and s.cancel_at is null
  loop
    v_first := (r.trial_end at time zone 'Europe/Paris')::date;
    v_days := v_first - v_today;
    v_step := case when v_days between 0 and 1 then 1 when v_days between 2 and 7 then 7 end;
    continue when v_step is null;
    continue when exists (
      select 1 from public.notifications n
      where n.type = 'essai_fin_proche'
        and n.data->>'subscription_id' = r.id::text
        and n.data->>'etape' = v_step::text
    );
    v_amount := case when r.periodicite = 'annuel'
      then r.prix_mensuel_ht_centimes * 10 else r.prix_mensuel_ht_centimes end;
    perform app.notify(r.user_id, 'essai_fin_proche', jsonb_build_object(
      'subscription_id', r.id,
      'etape', v_step,
      'formule', r.nom,
      'periodicite', r.periodicite,
      'montant_centimes', v_amount,
      'premier_paiement', v_first,
      'fin_engagement', (v_first + interval '12 months')::date - 1
    ));
  end loop;

  for r in
    select s.id, s.trial_end, s.periodicite, a.user_id, p.nom, p.prix_mensuel_ht_centimes
    from public.subscriptions s
    join public.artisans a on a.id = s.artisan_id
    left join public.plans p on p.code = s.plan_code
    where s.status in ('active', 'past_due')
      and s.engagement_version is not null
      and s.trial_end is not null
      and s.arret_demande_le is null
      and not s.cancel_at_period_end
      and s.cancel_at is null
  loop
    v_first := (r.trial_end at time zone 'Europe/Paris')::date;
    select * into v_dates from app.subscription_term_dates(v_first, v_today);
    continue when v_today < v_dates.rappel or v_today > v_dates.date_limite;
    continue when exists (
      select 1 from public.notifications n
      where n.type = 'abonnement_reconduction'
        and n.data->>'subscription_id' = r.id::text
        and n.data->>'echeance' = v_dates.echeance::text
    );
    v_amount := case when r.periodicite = 'annuel'
      then r.prix_mensuel_ht_centimes * 10 else r.prix_mensuel_ht_centimes end;
    perform app.notify(r.user_id, 'abonnement_reconduction', jsonb_build_object(
      'subscription_id', r.id,
      'formule', r.nom,
      'periodicite', r.periodicite,
      'montant_centimes', v_amount,
      'echeance', v_dates.echeance,
      'date_limite', v_dates.date_limite
    ));
  end loop;
end;
$$;
revoke execute on function app.remind_subscription_term(timestamptz) from public, anon, authenticated;
select cron.schedule('menao-rappels-engagement', '15 8 * * *', 'select app.remind_subscription_term()');

-- ---------- Démarrage de l'essai à la mise en ligne ----------
-- Abonnements engagés en essai dont la fiche vient de devenir visible (dossier validé, paiements
-- et formule actifs) : la fonction billing-go-live fixe la fin d'essai chez Stripe à 60 jours.
create function public.subscription_trial_start_candidates(p_limit int default 50)
returns table (artisan_id uuid, stripe_subscription_id text, subscription_id uuid)
language sql
stable
security definer
set search_path = ''
as $$
  select s.artisan_id, s.stripe_subscription_id, s.id
  from public.subscriptions s
  where s.status = 'trialing'
    and s.engagement_version is not null
    and s.essai_demarre_le is null
    and s.arret_demande_le is null
    and app.artisan_is_visible(s.artisan_id)
  order by s.created_at
  limit greatest(1, least(coalesce(p_limit, 50), 200))
$$;
revoke execute on function public.subscription_trial_start_candidates(int) from public, anon, authenticated;
grant execute on function public.subscription_trial_start_candidates(int) to service_role;

-- Appel de billing-go-live, à côté de notify (même adresse de base, même secret), seulement s'il y
-- a une fiche à démarrer.
create function app.dispatch_trial_starts()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_url text;
  v_secret text;
begin
  if not exists (select 1 from public.subscription_trial_start_candidates(1)) then
    return;
  end if;
  select decrypted_secret into v_url from vault.decrypted_secrets where name = 'menao_notify_url';
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'menao_notify_secret';
  if v_url is null or v_secret is null or v_url !~ '/notify/?$' then
    return;
  end if;
  perform net.http_post(
    url := regexp_replace(v_url, '/notify/?$', '/billing-go-live'),
    body := '{}'::jsonb,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-menao-secret', v_secret),
    timeout_milliseconds := 30000
  );
end;
$$;
revoke execute on function app.dispatch_trial_starts() from public, anon, authenticated;
select cron.schedule('menao-debut-essai', '*/5 * * * *', 'select app.dispatch_trial_starts()');

-- ---------- Jamais en push ----------
-- Les rappels d'engagement parlent de prix et de prélèvements de l'abonnement : e-mail seulement,
-- comme l'impayé (application, règle 10).
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
     and exists (select 1 from public.push_tokens t where t.user_id = new.user_id) then
    new.push_status := 'a_envoyer';
  end if;
  return new;
end;
$$;
