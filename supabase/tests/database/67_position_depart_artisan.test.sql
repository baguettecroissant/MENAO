-- Aperçu de la zone sur l'écran « Zone » (ADR 0127) : l'artisan relit les coordonnées de sa propre
-- adresse de départ, jamais celles d'un autre ; aucune ligne pour une zone en communes ; fonction
-- fermée aux visiteurs. Données fictives.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

insert into auth.users (id, email, is_anonymous, raw_app_meta_data, raw_user_meta_data) values
  ('c6700000-0000-4000-8000-000000000001', 'zone67.rayon@example.test', false, '{"role":"artisan"}', '{}'),
  ('c6700000-0000-4000-8000-000000000002', 'zone67.communes@example.test', false, '{"role":"artisan"}', '{}'),
  ('c6700000-0000-4000-8000-000000000003', 'zone67.particulier@example.test', false, '{}', '{}');
insert into public.artisans (id, user_id, status, raison_sociale, zone_mode, base_label, base_code_insee,
  base_location, radius_km) values
  ('c6710000-0000-4000-8000-000000000001', 'c6700000-0000-4000-8000-000000000001', 'brouillon', 'RAYON EXEMPLE',
   'rayon', '1 Rue de l''Exemple 31000 Toulouse', '31555', 'SRID=4326;POINT(1.444 43.604)', 30),
  ('c6710000-0000-4000-8000-000000000002', 'c6700000-0000-4000-8000-000000000002', 'brouillon', 'COMMUNES EXEMPLE',
   'communes', null, null, null, null);

create function pg_temp.connecter(uid uuid, app_role text) returns void language sql as $$
  select set_config('request.jwt.claims', jsonb_build_object(
    'sub', uid, 'role', 'authenticated', 'app_metadata', jsonb_build_object('role', app_role)
  )::text, true);
$$;

set local role authenticated;

select pg_temp.connecter('c6700000-0000-4000-8000-000000000001', 'artisan');
select results_eq(
  $$ select round(lon::numeric, 3), round(lat::numeric, 3) from public.my_artisan_base_point() $$,
  $$ values (1.444::numeric, 43.604::numeric) $$,
  'zone en rayon : l''artisan relit les coordonnées de son adresse de départ');

select pg_temp.connecter('c6700000-0000-4000-8000-000000000002', 'artisan');
select is_empty($$ select * from public.my_artisan_base_point() $$,
  'zone en communes : aucune coordonnée');

select pg_temp.connecter('c6700000-0000-4000-8000-000000000003', 'particulier');
select is_empty($$ select * from public.my_artisan_base_point() $$,
  'particulier : aucune coordonnée, pas même celles d''un artisan');

reset role;
set local role anon;
select throws_ok($$ select * from public.my_artisan_base_point() $$,
  '42501', null, 'visiteur : fonction inaccessible');
reset role;

select * from finish();
rollback;
