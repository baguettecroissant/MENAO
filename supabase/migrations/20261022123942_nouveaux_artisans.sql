-- Nouveaux artisans (lot 5 du plan V1.1, ADR 0160, d'après « Mettre en avant les nouveaux
-- artisans ») : le filet de sécurité de l'artisan qui n'est pas choisi. Être choisi, c'est voir un
-- client signer son devis (un chantier vient toujours d'une demande MENAO). Mêmes valeurs dans
-- packages/core/src/new-artisans.ts.
-- - Alerte du back-office : un artisan jamais choisi qui a reçu au moins 6 demandes en 30 jours ;
--   un ticket « Accompagnement » invite l'équipe à l'appeler (profil, photos, prix, délai d'envoi
--   des devis). Tâche quotidienne ; pas de nouvelle alerte pendant 30 jours.
-- - Mois offert de démarrage : aucun devis signé pendant les 2 premiers mois payants. Même
--   mécanisme que le parrainage : crédit posé par stripe-webhook avec le coupon existant, sur la
--   facture qui suit celle où il est accordé.
-- - Indicateur « premier chantier sous 60 jours » de la vue d'ensemble.

-- ---------------------------------------------------------------------------
-- Mois offerts : origine (parrainage ou démarrage)
-- ---------------------------------------------------------------------------
create type public.free_month_reason as enum ('parrainage', 'demarrage');
alter table public.artisan_free_months
  add column reason public.free_month_reason not null default 'parrainage';
-- Un seul mois offert de démarrage par artisan.
create unique index artisan_free_months_un_demarrage on public.artisan_free_months (artisan_id)
  where reason = 'demarrage';

-- Appelé par stripe-webhook (clé serveur) à chaque facture d'abonnement payée, même à 0 €, avant
-- la pose des mois offerts. Accordé à la première facture qui suit les 2 premiers mois payants
-- (2 jours de marge, au plus tard 4 mois après le premier paiement) si aucun devis n'a été signé
-- pendant ces 2 mois. p_now : instant de référence (tests).
create function public.grant_starter_month(p_stripe_subscription_id text, p_now timestamptz default now())
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_artisan uuid;
  v_first timestamptz;
  -- 2 : STARTER_MONTH_PAID_MONTHS (@menao/core).
  v_end timestamptz;
begin
  select s.artisan_id, s.first_paid_at into v_artisan, v_first
  from public.subscriptions s
  where s.stripe_subscription_id = p_stripe_subscription_id;
  if v_first is null then
    return false;
  end if;
  v_end := v_first + interval '2 months';
  if p_now < v_end - interval '2 days' or p_now >= v_first + interval '4 months' then
    return false;
  end if;
  if exists (
    select 1 from public.quotes q
    where q.artisan_id = v_artisan and q.signed_at >= v_first and q.signed_at < least(v_end, p_now)
  ) then
    return false;
  end if;
  insert into public.artisan_free_months (artisan_id, reason) values (v_artisan, 'demarrage')
  on conflict (artisan_id) where reason = 'demarrage' do nothing;
  return found;
end;
$$;
revoke execute on function public.grant_starter_month(text, timestamptz) from public, anon, authenticated;
grant execute on function public.grant_starter_month(text, timestamptz) to service_role;

-- Bilans du parrainage : ses seuls mois offerts.
create or replace function public.my_referral()
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_artisan uuid := app.my_artisan_id();
  v_code text;
begin
  if v_artisan is null or not exists (
    select 1 from public.artisans where id = v_artisan and status = 'valide'
  ) then
    return null;
  end if;
  select code into v_code from public.artisan_referral_codes where artisan_id = v_artisan;
  if v_code is null then
    insert into public.artisan_referral_codes (artisan_id, code)
    values (v_artisan, app.new_referral_code())
    on conflict (artisan_id) do nothing;
    select code into v_code from public.artisan_referral_codes where artisan_id = v_artisan;
  end if;
  return json_build_object(
    'code', v_code,
    'joined', (select count(*) from public.artisan_referrals
               where referrer_artisan_id = v_artisan and status <> 'annule'),
    'rewarded', (select count(*) from public.artisan_referrals
                 where referrer_artisan_id = v_artisan and status = 'recompense'),
    'months_earned', (select count(*) from public.artisan_free_months
                      where artisan_id = v_artisan and reason = 'parrainage'),
    'months_this_year', app.referrer_months_this_year(v_artisan)
  );
end;
$$;

create or replace function public.admin_referral_summary()
returns json
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform app.require_admin();
  return json_build_object(
    'en_attente', (select count(*) from public.artisan_referrals where status = 'en_attente'),
    'recompense', (select count(*) from public.artisan_referrals where status = 'recompense'),
    'annule', (select count(*) from public.artisan_referrals where status = 'annule'),
    'mois_poses', (select count(*) from public.artisan_free_months
                   where status = 'applique' and reason = 'parrainage'),
    'mois_en_attente', (select count(*) from public.artisan_free_months
                        where status = 'a_appliquer' and reason = 'parrainage'),
    'cadeaux_a_choisir', (select count(*) from public.artisan_welcome_gifts where chosen_at is null),
    'cadeaux_a_envoyer', (select count(*) from public.artisan_welcome_gifts w
                          left join public.tickets t on t.id = w.ticket_id
                          where w.chosen_at is not null and t.status is distinct from 'resolu')
  );
end;
$$;

create or replace function public.admin_artisan_referral(p_artisan_id uuid)
returns json
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform app.require_admin();
  return json_build_object(
    'code', (select c.code from public.artisan_referral_codes c where c.artisan_id = p_artisan_id),
    'parrain', (
      select json_build_object('id', r.referrer_artisan_id, 'nom', app.artisan_label(r.referrer_artisan_id),
        'status', r.status, 'created_at', r.created_at)
      from public.artisan_referrals r where r.referred_artisan_id = p_artisan_id
    ),
    'filleuls', coalesce((
      select json_agg(json_build_object('id', r.referred_artisan_id, 'nom', app.artisan_label(r.referred_artisan_id),
        'status', r.status, 'created_at', r.created_at) order by r.created_at desc)
      from public.artisan_referrals r where r.referrer_artisan_id = p_artisan_id
    ), '[]'::json),
    'mois_poses', (select count(*) from public.artisan_free_months g
                   where g.artisan_id = p_artisan_id and g.status = 'applique' and g.reason = 'parrainage'),
    'mois_en_attente', (select count(*) from public.artisan_free_months g
                        where g.artisan_id = p_artisan_id and g.status = 'a_appliquer' and g.reason = 'parrainage'),
    'mois_annee', app.referrer_months_this_year(p_artisan_id),
    'cadeau', (
      select json_build_object('status', app.welcome_gift_status(w.chosen_at, t.status),
        'item', w.item, 'size', w.size, 'ticket_id', w.ticket_id)
      from public.artisan_welcome_gifts w
      left join public.tickets t on t.id = w.ticket_id
      where w.artisan_id = p_artisan_id
    )
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Alerte « 6 demandes en 30 jours sans être choisi »
-- ---------------------------------------------------------------------------
-- Un ticket ouvert au plus par artisan.
create unique index tickets_un_accompagnement_ouvert on public.tickets (user_id)
  where type = 'accompagnement' and status <> 'resolu';

-- Tâche pg_cron quotidienne. Artisan validé, aucun devis signé depuis son inscription, au moins
-- 6 demandes transmises (hors demandes retenues pour vérification) sur 30 jours, aucun ticket
-- « Accompagnement » ouvert ni créé depuis 30 jours. L'équipe est alertée par le ticket, comme pour
-- tout nouveau ticket. p_now : instant de référence (tests).
create function app.flag_new_artisans_to_support(p_now timestamptz default now())
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  r record;
  v_count integer := 0;
begin
  for r in
    select a.id, a.user_id, lower(u.email) as email, pr.phone, app.artisan_label(a.id) as nom,
      count(q.id)::int as demandes,
      count(q.id) filter (where q.status = 'acceptee')::int as acceptees,
      count(q.id) filter (where q.status = 'expiree')::int as expirees,
      (select count(*) from public.quotes d
       where d.artisan_id = a.id and d.sent_at >= p_now - interval '30 days')::int as devis
    from public.artisans a
    join auth.users u on u.id = a.user_id
    left join public.profiles pr on pr.user_id = a.user_id
    -- 6 et 30 : SUPPORT_ALERT_REQUESTS, SUPPORT_ALERT_DAYS (@menao/core).
    join public.requests q on q.artisan_id = a.id
      and q.created_at >= p_now - interval '30 days' and q.created_at <= p_now
      and q.status <> 'a_verifier'
    where a.status = 'valide'
      and u.email is not null
      and not exists (select 1 from public.quotes d where d.artisan_id = a.id and d.signed_at is not null)
      and not exists (
        select 1 from public.tickets t
        where t.type = 'accompagnement' and t.user_id = a.user_id
          and (t.status <> 'resolu' or t.created_at > p_now - interval '30 days')
      )
    group by a.id, a.user_id, u.email, pr.phone
    having count(q.id) >= 6
  loop
    -- Échéance de deux jours : appeler l'artisan tant que les demandes sont récentes.
    insert into public.tickets (type, user_id, contact_email, subject, message, due_at)
    values ('accompagnement', r.user_id, r.email,
      left(format('Accompagnement : %s', r.nom), 150),
      left(format(
        '%s demandes reçues en 30 jours (%s acceptées, %s sans réponse), %s devis envoyés, aucun devis signé depuis l''inscription. '
        'L''appeler pour l''aider : profil, photos, prix, délai d''envoi des devis.%s',
        r.demandes, r.acceptees, r.expirees, r.devis,
        coalesce(E'\nTéléphone : ' || r.phone, '')), 2000),
      p_now + interval '2 days');
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;
revoke execute on function app.flag_new_artisans_to_support(timestamptz) from public, anon, authenticated;
select cron.schedule('menao-accompagnement-artisans', '30 7 * * *', 'select app.flag_new_artisans_to_support()');

-- ---------------------------------------------------------------------------
-- Vue d'ensemble : nouveaux artisans
-- ---------------------------------------------------------------------------
-- Premier chantier sous 60 jours : artisans validés (première validation du dossier) il y a 60 à
-- 150 jours, et ceux d'entre eux dont un devis a été signé dans les 60 jours ; tickets
-- « Accompagnement » ouverts ; mois offerts de démarrage accordés.
create function public.admin_new_artisans()
returns json
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform app.require_admin();
  return (
    with cohort as (
      -- 60 et 90 : FIRST_CHANTIER_DAYS, FIRST_CHANTIER_COHORT_DAYS (@menao/core).
      select r.artisan_id, min(r.created_at) as valide_le
      from public.artisan_reviews r
      where r.decision = 'valide'
      group by r.artisan_id
      having min(r.created_at) >= now() - interval '150 days'
        and min(r.created_at) < now() - interval '60 days'
    )
    select json_build_object(
      'cohorte', (select count(*) from cohort),
      'premier_chantier', (
        select count(*) from cohort c
        where exists (
          select 1 from public.quotes q
          where q.artisan_id = c.artisan_id and q.signed_at >= c.valide_le
            and q.signed_at < c.valide_le + interval '60 days'
        )
      ),
      'a_accompagner', (select count(*) from public.tickets t
                        where t.type = 'accompagnement' and t.status <> 'resolu'),
      'echeance', (select min(t.due_at) from public.tickets t
                   where t.type = 'accompagnement' and t.status <> 'resolu'),
      'mois_demarrage', (select count(*) from public.artisan_free_months g where g.reason = 'demarrage')
    )
  );
end;
$$;
revoke execute on function public.admin_new_artisans() from public, anon;
grant execute on function public.admin_new_artisans() to authenticated;
