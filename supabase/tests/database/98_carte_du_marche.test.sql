-- Carte du marché (ADR 0181) : un administrateur voit les artisans placés et la demande par
-- commune et par métier ; personne d'autre. Données fictives.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

insert into auth.users (id, email, is_anonymous, email_confirmed_at, raw_app_meta_data, raw_user_meta_data) values
  ('e9800000-0000-4000-8000-000000000001', 'carte98.admin@example.test', false, now(), '{"role":"admin"}', '{}'),
  ('e9800000-0000-4000-8000-000000000002', 'carte98.artisan@example.test', false, now(), '{"role":"artisan"}', '{}'),
  ('e9800000-0000-4000-8000-000000000003', 'carte98.client@example.test', false, now(), '{}', '{}');

insert into public.artisans (id, user_id, status, siret, zone_mode, base_location, radius_km, nom_commercial) values
  ('e9810000-0000-4000-8000-000000000001', 'e9800000-0000-4000-8000-000000000002', 'valide',
   '00000980000013', 'rayon',
   extensions.st_setsrid(extensions.st_makepoint(7.26, 43.70), 4326)::extensions.geography, 20,
   'Plomberie Fictive 98');
insert into public.artisan_trades (artisan_id, trade_code) values
  ('e9810000-0000-4000-8000-000000000001', 'plombier');

insert into public.projects (id, user_id, description, status, trade_code, ville_code_insee, ville_nom, ville_location) values
  ('e9820000-0000-4000-8000-000000000001', 'e9800000-0000-4000-8000-000000000003', 'Fuite fictive', 'criteres_valides', 'plombier', '98001', 'Villefictive',
   extensions.st_setsrid(extensions.st_makepoint(7.10, 43.60), 4326)::extensions.geography),
  ('e9820000-0000-4000-8000-000000000002', 'e9800000-0000-4000-8000-000000000003', 'Fuite fictive 2', 'brouillon', 'plombier', '98001', 'Villefictive', null);

create function pg_temp.connecter(uid uuid, app_role text, aal text default 'aal2') returns void language sql as $$
  select set_config('request.jwt.claims', jsonb_build_object(
    'sub', uid, 'role', 'authenticated', 'aal', aal, 'app_metadata', jsonb_build_object('role', app_role)
  )::text, true);
$$;

select pg_temp.connecter('e9800000-0000-4000-8000-000000000001', 'admin');
set local role authenticated;
select is(
  (select a ->> 'nom' from json_array_elements(public.admin_market(90) -> 'artisans') a
   where a ->> 'id' = 'e9810000-0000-4000-8000-000000000001'),
  'Plomberie Fictive 98',
  'admin : artisan présent sur la carte'
);
select is(
  (select round((a ->> 'lon')::numeric, 2) from json_array_elements(public.admin_market(90) -> 'artisans') a
   where a ->> 'id' = 'e9810000-0000-4000-8000-000000000001'),
  7.26,
  'admin : artisan placé à son adresse de base'
);
select is(
  (select (d ->> 'recherches')::int || '/' || (d ->> 'resultats') || '/' || (d ->> 'demandes')
   from json_array_elements(public.admin_market(90) -> 'demande') d where d ->> 'code_insee' = '98001'),
  '2/1/0',
  'admin : recherches, résultats et demandes par commune et par métier'
);
select is(
  (select round((d ->> 'lon')::numeric, 2) from json_array_elements(public.admin_market(90) -> 'demande') d
   where d ->> 'code_insee' = '98001'),
  7.10,
  'admin : commune placée par la position enregistrée avec la recherche'
);
reset role;

select pg_temp.connecter('e9800000-0000-4000-8000-000000000002', 'artisan');
set local role authenticated;
select throws_ok($$ select public.admin_market(90) $$, '42501', null, 'artisan : refusé');
reset role;

select pg_temp.connecter('e9800000-0000-4000-8000-000000000003', 'particulier');
set local role authenticated;
select throws_ok($$ select public.admin_market(90) $$, '42501', null, 'particulier : refusé');
reset role;

set local role anon;
select throws_ok($$ select public.admin_market(90) $$, '42501', null, 'visiteur : refusé');
reset role;

select * from finish();
rollback;
