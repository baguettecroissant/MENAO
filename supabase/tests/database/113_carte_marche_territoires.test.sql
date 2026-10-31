-- Carte du marché et zones (ADR 0214) : la couverture d'une commune compte tous les modes de zone,
-- seulement les artisans validés du métier, et isole les zones région et France. Données fictives
-- (adresses cm113.*, métier fictif pour rester à l'écart du seed ; Toulon 83137, Lyon 69123).
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

insert into public.trades (code, label) values ('metier-113', 'Métier fictif 113');

insert into auth.users (id, email, is_anonymous, email_confirmed_at, raw_app_meta_data, raw_user_meta_data) values
  ('e1130000-0000-4000-8000-000000000001', 'cm113.admin@example.test', false, now(), '{"role":"admin"}', '{}'),
  ('e1130000-0000-4000-8000-000000000002', 'cm113.client@example.test', false, now(), '{"role":"particulier"}', '{}');
insert into auth.users (id, email, is_anonymous, email_confirmed_at, raw_app_meta_data, raw_user_meta_data)
select ('e1130000-0000-4000-8000-00000000001' || n)::uuid, 'cm113.a' || n || '@example.test', false, now(),
  '{"role":"artisan"}', '{}'
from generate_series(0, 8) n;

create function pg_temp.artisan(n int) returns uuid language sql as $$
  select ('e1131000-0000-4000-8000-00000000000' || n)::uuid
$$;
create function pg_temp.connecter(uid uuid, app_role text, aal text default 'aal2') returns void language sql as $$
  select set_config('request.jwt.claims', jsonb_build_object(
    'sub', uid, 'role', 'authenticated', 'aal', aal, 'app_metadata', jsonb_build_object('role', app_role)
  )::text, true);
$$;

-- Tous du métier fictif, sauf 8. Autour de Toulon :
-- 0 : rayon de 20 km à Toulon. 1 : rayon de 5 km à Nice (trop loin). 2 : communes, Toulon.
-- 3 : département 83. 4 : région PACA. 5 : France. 6 : département 06 (autre département).
-- 7 : France, suspendu. 8 : France, autre métier.
insert into public.artisans (id, user_id, status, nom_commercial, zone_mode, radius_km, base_location)
select pg_temp.artisan(n), ('e1130000-0000-4000-8000-00000000001' || n)::uuid,
  case when n = 7 then 'suspendu' else 'valide' end::public.artisan_status, 'ZONE ' || n,
  (array['rayon', 'rayon', 'communes', 'departements', 'regions', 'france', 'departements', 'france', 'france'])[n + 1]::public.zone_mode,
  case n when 0 then 20 when 1 then 5 end,
  extensions.st_setsrid(extensions.st_makepoint(
    case when n = 0 then 5.93 else 7.26 end, case when n = 0 then 43.12 else 43.70 end), 4326)::extensions.geography
from generate_series(0, 8) n;
insert into public.artisan_trades (artisan_id, trade_code)
select pg_temp.artisan(n), case when n = 8 then 'electricien' else 'metier-113' end from generate_series(0, 8) n;
insert into public.artisan_zones (artisan_id, code_insee, nom) values (pg_temp.artisan(2), '83137', 'Toulon');
insert into public.artisan_territories (artisan_id, departement_code) values
  (pg_temp.artisan(3), '83'), (pg_temp.artisan(6), '06');
insert into public.artisan_territories (artisan_id, region_code) values (pg_temp.artisan(4), '93');

insert into public.projects (user_id, description, status, trade_code, ville_code_insee, ville_nom, ville_location) values
  ('e1130000-0000-4000-8000-000000000002', 'Recherche fictive', 'criteres_valides', 'metier-113', '83137', 'Toulon',
   extensions.st_setsrid(extensions.st_makepoint(5.93, 43.12), 4326)::extensions.geography),
  ('e1130000-0000-4000-8000-000000000002', 'Recherche fictive', 'criteres_valides', 'metier-113', '69123', 'Lyon',
   extensions.st_setsrid(extensions.st_makepoint(4.83, 45.76), 4326)::extensions.geography);

select pg_temp.connecter('e1130000-0000-4000-8000-000000000001', 'admin');
set local role authenticated;

select is(
  (select (d ->> 'couverture') || '/' || (d ->> 'couverture_large')
   from json_array_elements(public.admin_market(90) -> 'demande') d
   where d ->> 'code_insee' = '83137' and d ->> 'metier' = 'metier-113'),
  '5/2',
  'Toulon : rayon, commune, département, région et France comptés, dont 2 larges'
);
select is(
  (select (d ->> 'couverture') || '/' || (d ->> 'couverture_large')
   from json_array_elements(public.admin_market(90) -> 'demande') d
   where d ->> 'code_insee' = '69123' and d ->> 'metier' = 'metier-113'),
  '1/1',
  'Lyon : seule la France couvre, ni la région PACA ni les rayons'
);
select is(
  (select a ->> 'zone_labels' from json_array_elements(public.admin_market(90) -> 'artisans') a
   where a ->> 'id' = 'e1131000-0000-4000-8000-000000000000'),
  '[]',
  'rayon : pas de libellé, le rayon suffit'
);
select is(
  (select a ->> 'zone_labels' from json_array_elements(public.admin_market(90) -> 'artisans') a
   where a ->> 'id' = 'e1131000-0000-4000-8000-000000000002'),
  '["Toulon"]',
  'communes : leurs noms'
);
select is(
  (select a ->> 'zone_labels' from json_array_elements(public.admin_market(90) -> 'artisans') a
   where a ->> 'id' = 'e1131000-0000-4000-8000-000000000003'),
  '["Var (83)"]',
  'département : nom et numéro'
);
select is(
  (select a ->> 'zone_labels' from json_array_elements(public.admin_market(90) -> 'artisans') a
   where a ->> 'id' = 'e1131000-0000-4000-8000-000000000005'),
  '["France entière"]',
  'France : libellé'
);
reset role;

select * from finish();
rollback;
