-- « Recommander un partenaire » (ADR 0174) : partenaires proposés à l'artisan d'une demande (son
-- parrain ou ses filleuls, dans la zone, pour ce projet ou un autre métier du chantier),
-- recommandation et notification du particulier, lecture par chaque rôle, suivi quand le
-- particulier contacte le partenaire ; match_artisans reste réservé au particulier. Données
-- fictives (Nice).
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

insert into auth.users (id, email, is_anonymous, email_confirmed_at, raw_app_meta_data, raw_user_meta_data) values
  ('e9300000-0000-4000-8000-000000000001', 'reco93.client@example.test', false, now(), '{"role":"particulier"}', '{}');
insert into auth.users (id, email, is_anonymous, email_confirmed_at, raw_app_meta_data, raw_user_meta_data)
select ('e9300000-0000-4000-8000-00000000001' || n)::uuid, 'reco93.a' || n || '@example.test', false, now(),
  '{"role":"artisan"}', '{}'
from generate_series(1, 4) n;

create function pg_temp.connecter(uid uuid, app_role text) returns void language sql as $$
  select set_config('request.jwt.claims', jsonb_build_object(
    'sub', uid, 'role', 'authenticated', 'app_metadata', jsonb_build_object('role', app_role)
  )::text, true);
$$;
create function pg_temp.artisan(n int) returns uuid language sql as $$
  select ('e9310000-0000-4000-8000-00000000000' || n)::uuid
$$;
create function pg_temp.user_artisan(n int) returns uuid language sql as $$
  select ('e9300000-0000-4000-8000-00000000001' || n)::uuid
$$;
create function pg_temp.lot() returns uuid language sql as $$
  select id from public.projects where parent_project_id = 'e9320000-0000-4000-8000-000000000001' and trade_code = 'carreleur'
$$;

-- 1 : plombier qui reçoit la demande ; 2 : carreleur, son filleul ; 3 : plombier, son filleul ;
-- 4 : carreleur, parrainage annulé (plus partenaire). Rayon de 10 km autour de Nice.
insert into public.artisans (id, user_id, status, raison_sociale, zone_mode, radius_km, base_location, connect_charges_enabled)
select pg_temp.artisan(n), pg_temp.user_artisan(n), 'valide',
  case n when 1 then 'PLOMBERIE UN' when 2 then 'CARRELAGE DEUX' when 3 then 'PLOMBERIE TROIS' else 'CARRELAGE QUATRE' end,
  'rayon', 10, extensions.st_setsrid(extensions.st_makepoint(7.27, 43.70), 4326)::extensions.geography, true
from generate_series(1, 4) n;
insert into public.artisan_trades (artisan_id, trade_code)
select pg_temp.artisan(n), case when n in (1, 3) then 'plombier' else 'carreleur' end from generate_series(1, 4) n;
insert into public.subscriptions (artisan_id, plan_code, stripe_customer_id, stripe_subscription_id, status, trial_end)
select pg_temp.artisan(n), 'base', 'cus_e93_' || n, 'sub_e93_' || n, 'trialing', now() + interval '30 days'
from generate_series(1, 4) n;
insert into public.artisan_referrals (referrer_artisan_id, referred_artisan_id, status, cancel_reason) values
  (pg_temp.artisan(1), pg_temp.artisan(2), 'en_attente', null),
  (pg_temp.artisan(1), pg_temp.artisan(3), 'en_attente', null),
  (pg_temp.artisan(1), pg_temp.artisan(4), 'annule', 'Parrainage annulé (test)');
insert into public.projects (id, user_id, description, summary, trade_code, ville_code_insee, ville_nom, ville_location,
  room_codes, budget) values
  ('e9320000-0000-4000-8000-000000000001', 'e9300000-0000-4000-8000-000000000001',
   'Refaire entièrement la salle de bains', 'Rénovation de salle de bains', 'plombier', '06088', 'Nice',
   extensions.st_setsrid(extensions.st_makepoint(7.26, 43.70), 4326)::extensions.geography,
   '{salle-de-bain}', '5000_15000');

select pg_temp.connecter('e9300000-0000-4000-8000-000000000001', 'particulier');
set local role authenticated;
select public.set_project_lot_trades('e9320000-0000-4000-8000-000000000001', array['carreleur']);
select public.validate_project_criteria('e9320000-0000-4000-8000-000000000001');
reset role;
-- Identifiant du lot retenu ici : l'artisan ne lit pas les projets du particulier (RLS).
create temp table lot93 as select pg_temp.lot() as id;
grant select on lot93 to authenticated;
create or replace function pg_temp.lot() returns uuid language sql as $$ select id from lot93 $$;
insert into public.requests (id, project_id, artisan_id, particulier_id, contact_phone) values
  ('e9330000-0000-4000-8000-000000000001', 'e9320000-0000-4000-8000-000000000001', pg_temp.artisan(1),
   'e9300000-0000-4000-8000-000000000001', '+33612345678');

-- ---------- Partenaires proposés à l'artisan ----------
select pg_temp.connecter(pg_temp.user_artisan(1), 'artisan');
set local role authenticated;
select results_eq(
  $$ select trade_label, same_project, display_name, recommended
     from public.partner_recommendation_options('e9330000-0000-4000-8000-000000000001') $$,
  $$ values ('Plombier', true, 'PLOMBERIE TROIS', false), ('Carreleur', false, 'CARRELAGE DEUX', false) $$,
  'son filleul plombier à sa place, son filleul carreleur pour l''autre métier ; parrainage annulé exclu');
select throws_ok($$ select * from public.match_artisans('e9320000-0000-4000-8000-000000000001') $$,
  '42501', 'Projet introuvable', 'l''artisan ne voit pas la liste des artisans du projet');
reset role;

select pg_temp.connecter(pg_temp.user_artisan(4), 'artisan');
set local role authenticated;
select throws_ok($$ select * from public.partner_recommendation_options('e9330000-0000-4000-8000-000000000001') $$,
  '42501', 'Demande introuvable', 'un autre artisan ne voit pas les options');
reset role;
select pg_temp.connecter('e9300000-0000-4000-8000-000000000001', 'particulier');
set local role authenticated;
select throws_ok($$ select * from public.partner_recommendation_options('e9330000-0000-4000-8000-000000000001') $$,
  '42501', 'Demande introuvable', 'le particulier ne recommande pas');
select ok((select count(*) from public.match_artisans('e9320000-0000-4000-8000-000000000001', 20)) >= 2,
  'le particulier voit toujours ses artisans');
reset role;

-- ---------- Recommandation ----------
select pg_temp.connecter(pg_temp.user_artisan(1), 'artisan');
set local role authenticated;
select lives_ok(format('select public.recommend_partner(%L, %L, %L)',
  'e9330000-0000-4000-8000-000000000001', pg_temp.lot(), pg_temp.artisan(2)),
  'le plombier recommande sa carreleuse pour le lot carrelage');
select throws_ok(format('select public.recommend_partner(%L, %L, %L)',
  'e9330000-0000-4000-8000-000000000001', pg_temp.lot(), pg_temp.artisan(2)),
  '22023', 'Ce partenaire ne peut pas être recommandé pour ce chantier', 'une seule fois');
select throws_ok(format('select public.recommend_partner(%L, %L, %L)',
  'e9330000-0000-4000-8000-000000000001', pg_temp.lot(), pg_temp.artisan(4)),
  '22023', 'Ce partenaire ne peut pas être recommandé pour ce chantier', 'pas un partenaire');
select lives_ok($$ select public.recommend_partner('e9330000-0000-4000-8000-000000000001',
  'e9320000-0000-4000-8000-000000000001', 'e9310000-0000-4000-8000-000000000003') $$,
  'un partenaire du même métier, à sa place');
select is((select count(*)::int from public.partner_recommendations), 2, 'l''artisan voit ses recommandations');
reset role;

select results_eq(
  $$ select data ->> 'artisan', data ->> 'partenaire', data ->> 'metier' from public.notifications
     where user_id = 'e9300000-0000-4000-8000-000000000001' and type = 'recommandation_partenaire' $$,
  $$ values ('PLOMBERIE UN', 'CARRELAGE DEUX', 'Carreleur') $$,
  'le particulier est prévenu une fois pour les deux recommandations rapprochées');

-- ---------- Lecture par rôle ----------
select pg_temp.connecter('e9300000-0000-4000-8000-000000000001', 'particulier');
set local role authenticated;
select is((select count(*)::int from public.partner_recommendations), 2, 'le particulier voit les recommandations');
reset role;
select pg_temp.connecter(pg_temp.user_artisan(2), 'artisan');
set local role authenticated;
select is((select count(*)::int from public.partner_recommendations), 0,
  'le partenaire ne voit rien avant d''être contacté');
reset role;

-- ---------- Le particulier contacte la carreleuse ----------
insert into public.requests (project_id, artisan_id, particulier_id, contact_phone) values
  (pg_temp.lot(), pg_temp.artisan(2), 'e9300000-0000-4000-8000-000000000001', '+33612345678');
select is((select status from public.partner_recommendations where to_artisan_id = pg_temp.artisan(2)), 'envoyee',
  'recommandation suivie');
select pg_temp.connecter(pg_temp.user_artisan(1), 'artisan');
set local role authenticated;
select is((select count(*)::int from public.partner_recommendation_options('e9330000-0000-4000-8000-000000000001')
  where display_name = 'CARRELAGE DEUX'), 0, 'partenaire déjà contacté : plus proposé');
reset role;

select * from finish();
rollback;
