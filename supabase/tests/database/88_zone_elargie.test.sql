-- Zone élargie (ADR 0165) : match_artisans renvoie, après les artisans de la zone, ceux dont la
-- zone s'arrête à 20 km au plus du chantier (hors_zone), les plus proches d'abord ; le budget
-- minimum s'applique aussi ; la demande envoyée à l'un d'eux est notée hors zone pour l'artisan.
-- Données fictives (Nice, longitude 7,26 ; 0,0124° de longitude ≈ 1 km à cette latitude).
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

insert into auth.users (id, email, is_anonymous, email_confirmed_at, raw_app_meta_data, raw_user_meta_data) values
  ('e8800000-0000-4000-8000-000000000001', 'lot88.client@example.test', false, now(), '{"role":"particulier"}', '{}');
insert into auth.users (id, email, is_anonymous, email_confirmed_at, raw_app_meta_data, raw_user_meta_data)
select ('e8800000-0000-4000-8000-00000000001' || n)::uuid, 'lot88.a' || n || '@example.test', false, now(),
  '{"role":"artisan"}', '{}'
from generate_series(1, 5) n;

create function pg_temp.connecter(uid uuid, app_role text) returns void language sql as $$
  select set_config('request.jwt.claims', jsonb_build_object(
    'sub', uid, 'role', 'authenticated', 'app_metadata', jsonb_build_object('role', app_role)
  )::text, true);
$$;
create function pg_temp.artisan(n int) returns uuid language sql as $$
  select ('e8810000-0000-4000-8000-00000000000' || n)::uuid
$$;

-- 1 : rayon de 10 km, base à Nice (dans la zone). 2 : rayon de 10 km, base à 25 km (zone élargie).
-- 3 : rayon de 10 km, base à 60 km (trop loin). 4 : communes sans Nice, base à 12 km (zone élargie).
-- 5 : comme 4, mais budget minimum de 50 000 €.
insert into public.artisans (id, user_id, status, raison_sociale, zone_mode, radius_km, base_location, connect_charges_enabled)
select pg_temp.artisan(n), ('e8800000-0000-4000-8000-00000000001' || n)::uuid, 'valide', 'ZONE ' || n,
  case when n >= 4 then 'communes' else 'rayon' end::public.zone_mode,
  case when n >= 4 then null else 10 end,
  extensions.st_setsrid(extensions.st_makepoint(
    7.26 + case n when 1 then 0.02 when 2 then 0.31 when 3 then 0.75 else 0.15 end, 43.70), 4326)::extensions.geography,
  true
from generate_series(1, 5) n;
insert into public.artisan_zones (artisan_id, code_insee, nom)
select pg_temp.artisan(n), '06004', 'Antibes' from generate_series(4, 5) n;
update public.artisans set budget_minimum = 'plus_50000' where id = pg_temp.artisan(5);
insert into public.artisan_trades (artisan_id, trade_code) select pg_temp.artisan(n), 'electricien' from generate_series(1, 5) n;
insert into public.subscriptions (artisan_id, plan_code, stripe_customer_id, stripe_subscription_id, status, trial_end)
select pg_temp.artisan(n), 'base', 'cus_l88_' || n, 'sub_l88_' || n, 'trialing', now() + interval '30 days'
from generate_series(1, 5) n;
insert into public.projects (id, user_id, status, description, trade_code, ville_code_insee, ville_nom, ville_location,
  budget, criteria_validated_at) values
  ('e8820000-0000-4000-8000-000000000001', 'e8800000-0000-4000-8000-000000000001', 'criteres_valides',
   'Tableau électrique à changer', 'electricien', '06088', 'Nice',
   extensions.st_setsrid(extensions.st_makepoint(7.26, 43.70), 4326)::extensions.geography, '1000_5000', now());

create function pg_temp.rang(n int) returns bigint language sql as $$
  select r.pos from (
    select m.artisan_id, row_number() over () as pos
    from public.match_artisans('e8820000-0000-4000-8000-000000000001', 20) m
  ) r where r.artisan_id = pg_temp.artisan(n)
$$;
create function pg_temp.hors_zone(n int) returns boolean language sql as $$
  select m.hors_zone from public.match_artisans('e8820000-0000-4000-8000-000000000001', 20) m
  where m.artisan_id = pg_temp.artisan(n)
$$;

-- ---------- Recherche ----------
select pg_temp.connecter('e8800000-0000-4000-8000-000000000001', 'particulier');
set local role authenticated;
select is(pg_temp.hors_zone(1), false, 'artisan de la zone');
select is(pg_temp.hors_zone(2), true, 'rayon de 10 km, base à 25 km : zone élargie');
select is(pg_temp.hors_zone(4), true, 'communes voisines, base à 12 km : zone élargie');
select is(pg_temp.rang(3), null, 'base à 60 km : trop loin');
select is(pg_temp.rang(5), null, 'zone élargie : le budget minimum s''applique aussi');
select ok(pg_temp.rang(1) < pg_temp.rang(4) and pg_temp.rang(4) < pg_temp.rang(2),
  'la zone d''abord, puis les plus proches');
select ok(
  (select m.distance_km between 24 and 26 from public.match_artisans('e8820000-0000-4000-8000-000000000001', 20) m
   where m.artisan_id = pg_temp.artisan(2)),
  'distance du chantier affichée');

-- ---------- Envoi ----------
select is(public.send_project_requests('e8820000-0000-4000-8000-000000000001',
  array[pg_temp.artisan(1), pg_temp.artisan(2)], null, '+33612345678', 'des_que_possible', null, null), 2,
  'demandes envoyées à un artisan de la zone et à un de la zone élargie');
reset role;
select results_eq(
  $$ select artisan_id, hors_zone from public.requests
     where project_id = 'e8820000-0000-4000-8000-000000000001' order by hors_zone $$,
  $$ values (pg_temp.artisan(1), false), (pg_temp.artisan(2), true) $$,
  'demande notée hors zone');

select pg_temp.connecter('e8800000-0000-4000-8000-000000000012', 'artisan');
set local role authenticated;
select is(
  (public.artisan_request_detail(
    (select id from public.requests where artisan_id = pg_temp.artisan(2))) ->> 'hors_zone'),
  'true', 'l''artisan voit que la demande est hors de sa zone');
reset role;

select * from finish();
rollback;
