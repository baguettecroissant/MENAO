-- Relances de l'inscription (F-70, ADR 0219), en complément de l'ADR 0112.
-- 1. Dossier en brouillon (inscription_relance) : les relances repartent de zéro après une
--    demande de compléments de l'équipe (cycle compté depuis la décision) ; identités sur liste
--    noire exclues ; étapes manquantes jointes au message.
-- 2. Artisan validé mais pas visible (activation_relance) : paiements Stripe non activés ou
--    formule non choisie ; trois relances au plus après la validation. E-mail seulement (choix
--    de la formule sur le web, CLAUDE.md règle 10).
-- 3. Compte Google ou Apple jamais finalisé (finalisation_relance) : deux relances au plus.
-- 4. Back-office : inscriptions bloquées (étape, ancienneté, relances). Espace commercial :
--    étapes manquantes de ses inscrits.

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
    else 'transactionnel'
  end
$$;
revoke execute on function app.notification_category(public.notification_type) from public, anon, authenticated;

-- La relance d'activation parle de la formule payante : jamais en push (application, règle 10).
create or replace function app.notifications_push_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.channel = 'email'
     and new.type not in ('abonnement_impaye', 'mois_offert', 'nouveaux_messages', 'activation_relance')
     and exists (select 1 from public.push_tokens t where t.user_id = new.user_id) then
    new.push_status := 'a_envoyer';
  end if;
  return new;
end;
$$;

-- Début du cycle de relance d'un dossier : création de la fiche, ou dernière demande de
-- compléments de l'équipe.
create function app.signup_cycle_start(p_artisan_id uuid)
returns timestamptz
language sql
stable
set search_path = ''
as $$
  select greatest(
    a.created_at,
    (select max(r.created_at) from public.artisan_reviews r
     where r.artisan_id = a.id and r.decision = 'complement')
  )
  from public.artisans a where a.id = p_artisan_id
$$;
revoke execute on function app.signup_cycle_start(uuid) from public, anon, authenticated;

-- Ce qui manque à un artisan validé pour être visible : paiements, formule.
create function app.activation_missing_steps(p_artisan_id uuid)
returns text[]
language sql
stable
set search_path = ''
as $$
  select array_remove(array[
    case when not a.connect_charges_enabled then 'paiements' end,
    case when not app.artisan_subscription_active(a.id) then 'formule' end
  ], null)
  from public.artisans a where a.id = p_artisan_id
$$;
revoke execute on function app.activation_missing_steps(uuid) from public, anon, authenticated;

-- Relances n°1 à J+1, n°2 à J+3, n°3 à J+7 du début du cycle (écarts minimaux de 2 puis 4 jours).
create or replace function app.remind_signup(p_now timestamptz default now())
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  r record;
  v_offsets interval[] := array[interval '1 day', interval '3 days', interval '7 days'];
  v_gaps interval[] := array[interval '0', interval '2 days', interval '4 days'];
  v_count integer := 0;
  v_missing text[];
begin
  for r in
    select c.id, c.user_id, c.refusal_reason, c.cycle_start,
           count(n.id)::int as sent, max(n.created_at) as last_sent
    from (
      select a.id, a.user_id, a.refusal_reason, app.signup_cycle_start(a.id) as cycle_start
      from public.artisans a
      join auth.users u on u.id = a.user_id
      where a.status = 'brouillon'
        and u.email_confirmed_at is not null
        and not app.identity_blocked(a.id)
    ) c
    left join public.notifications n
      on n.user_id = c.user_id and n.type = 'inscription_relance' and n.created_at >= c.cycle_start
    group by c.id, c.user_id, c.refusal_reason, c.cycle_start
  loop
    continue when r.sent >= 3;
    continue when r.cycle_start > p_now - v_offsets[r.sent + 1];
    continue when r.last_sent is not null and r.last_sent > p_now - v_gaps[r.sent + 1];
    v_missing := app.onboarding_missing_steps(r.id);
    perform app.notify(r.user_id, 'inscription_relance', jsonb_build_object(
      'etape', r.sent + 1,
      'pret', cardinality(v_missing) = 0,
      'complement', r.refusal_reason is not null,
      'manque', to_jsonb(v_missing)
    ));
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;
revoke execute on function app.remind_signup(timestamptz) from public, anon, authenticated;

-- Artisan validé, pas encore visible : J+1, J+3, J+7 après la dernière validation.
create function app.remind_activation(p_now timestamptz default now())
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  r record;
  v_offsets interval[] := array[interval '1 day', interval '3 days', interval '7 days'];
  v_gaps interval[] := array[interval '0', interval '2 days', interval '4 days'];
  v_count integer := 0;
  v_missing text[];
begin
  for r in
    select c.id, c.user_id, c.validated_at, count(n.id)::int as sent, max(n.created_at) as last_sent
    from (
      select a.id, a.user_id,
             (select max(rv.created_at) from public.artisan_reviews rv
              where rv.artisan_id = a.id and rv.decision = 'valide') as validated_at
      from public.artisans a
      where a.status = 'valide'
        and not app.artisan_is_visible(a.id)
        and not app.identity_blocked(a.id)
    ) c
    left join public.notifications n
      on n.user_id = c.user_id and n.type = 'activation_relance' and n.created_at >= c.validated_at
    where c.validated_at is not null
    group by c.id, c.user_id, c.validated_at
  loop
    continue when r.sent >= 3;
    continue when r.validated_at > p_now - v_offsets[r.sent + 1];
    continue when r.last_sent is not null and r.last_sent > p_now - v_gaps[r.sent + 1];
    v_missing := app.activation_missing_steps(r.id);
    continue when cardinality(v_missing) = 0;
    perform app.notify(r.user_id, 'activation_relance', jsonb_build_object(
      'etape', r.sent + 1,
      'manque', to_jsonb(v_missing)
    ));
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;
revoke execute on function app.remind_activation(timestamptz) from public, anon, authenticated;

-- Compte Google ou Apple jamais finalisé (signup_pending) : J+1 puis J+4.
create function app.remind_finalization(p_now timestamptz default now())
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  r record;
  v_offsets interval[] := array[interval '1 day', interval '4 days'];
  v_count integer := 0;
begin
  for r in
    select u.id, u.created_at, count(n.id)::int as sent
    from auth.users u
    left join public.notifications n on n.user_id = u.id and n.type = 'finalisation_relance'
    where coalesce((u.raw_app_meta_data ->> 'signup_pending')::boolean, false)
      and u.email_confirmed_at is not null
      and u.deleted_at is null
      and u.created_at > p_now - interval '30 days'
    group by u.id, u.created_at
  loop
    continue when r.sent >= 2;
    continue when r.created_at > p_now - v_offsets[r.sent + 1];
    perform app.notify(r.id, 'finalisation_relance', jsonb_build_object('etape', r.sent + 1));
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;
revoke execute on function app.remind_finalization(timestamptz) from public, anon, authenticated;

-- Chaque jour à 8 h 10 UTC, après la relance des dossiers (8 h).
select cron.schedule('menao-relance-activation', '10 8 * * *', 'select app.remind_activation()');
select cron.schedule('menao-relance-finalisation', '20 8 * * *', 'select app.remind_finalization()');

-- Back-office : inscriptions bloquées (dossier en brouillon, ou validé mais pas visible), avec
-- les étapes manquantes, le début de l'attente et les relances envoyées depuis.
create function public.admin_stalled_signups()
returns table (
  artisan_id uuid,
  entreprise text,
  etat text,
  manque text[],
  depuis timestamptz,
  relances integer,
  derniere_relance timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not app.is_staff() then
    raise exception 'Réservé à l''équipe MENAO' using errcode = '42501';
  end if;
  return query
  select s.id, s.entreprise, s.etat, s.manque, s.depuis,
         (select count(*)::int from public.notifications n
          where n.user_id = s.user_id and n.type = s.relance and n.created_at >= s.depuis),
         (select max(n.created_at) from public.notifications n
          where n.user_id = s.user_id and n.type = s.relance and n.created_at >= s.depuis)
  from (
    select a.id, a.user_id, coalesce(a.nom_commercial, a.raison_sociale) as entreprise,
           case when a.refusal_reason is not null then 'complement' else 'dossier' end as etat,
           app.onboarding_missing_steps(a.id) as manque,
           app.signup_cycle_start(a.id) as depuis,
           'inscription_relance'::public.notification_type as relance
    from public.artisans a
    where a.status = 'brouillon'
    union all
    select a.id, a.user_id, coalesce(a.nom_commercial, a.raison_sociale), 'activation',
           app.activation_missing_steps(a.id),
           coalesce((select max(rv.created_at) from public.artisan_reviews rv
                     where rv.artisan_id = a.id and rv.decision = 'valide'), a.created_at),
           'activation_relance'::public.notification_type
    from public.artisans a
    where a.status = 'valide' and not app.artisan_is_visible(a.id)
  ) s
  order by s.depuis
  limit 500;
end;
$$;
revoke execute on function public.admin_stalled_signups() from public, anon;
grant execute on function public.admin_stalled_signups() to authenticated;

-- Espace commercial : étapes manquantes de chaque inscrit (dossier, puis paiements et formule).
drop function public.my_commercial_signups();
create function public.my_commercial_signups()
returns table (
  raison_sociale text,
  status public.artisan_status,
  signed_up_at timestamptz,
  manque text[]
)
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(a.nom_commercial, a.raison_sociale), a.status, ca.created_at,
         case
           when a.status = 'brouillon' then app.onboarding_missing_steps(a.id)
           when a.status = 'valide' and not app.artisan_is_visible(a.id)
             then app.activation_missing_steps(a.id)
           else '{}'::text[]
         end
  from public.commercial_attributions ca
  join public.artisans a on a.id = ca.artisan_id
  where ca.commercial_id = app.my_commercial_id()
  order by ca.created_at desc
  limit 500
$$;
revoke execute on function public.my_commercial_signups() from public, anon;
grant execute on function public.my_commercial_signups() to authenticated;
