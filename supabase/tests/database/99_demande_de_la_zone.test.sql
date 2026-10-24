-- Demande de la zone (ADR 0182) : l'artisan compte les recherches de ses métiers dans sa zone
-- des 30 derniers jours ; rien pour un autre compte. Données fictives.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

insert into auth.users (id, email, is_anonymous, email_confirmed_at, raw_app_meta_data, raw_user_meta_data) values
  ('e9900000-0000-4000-8000-000000000001', 'zone99.artisan@example.test', false, now(), '{"role":"artisan_en_attente"}', '{}'),
  ('e9900000-0000-4000-8000-000000000002', 'zone99.client@example.test', false, now(), '{}', '{}');

insert into public.artisans (id, user_id, status, siret, zone_mode, base_location, radius_km) values
  ('e9910000-0000-4000-8000-000000000001', 'e9900000-0000-4000-8000-000000000001', 'brouillon',
   '00000990000017', 'rayon',
   extensions.st_setsrid(extensions.st_makepoint(7.26, 43.70), 4326)::extensions.geography, 15);
insert into public.artisan_trades (artisan_id, trade_code) values
  ('e9910000-0000-4000-8000-000000000001', 'plombier'),
  ('e9910000-0000-4000-8000-000000000001', 'chauffagiste');

-- Dans la zone : 2 plombier, 1 chauffagiste ; hors métier, hors zone, trop ancienne : non comptées.
insert into public.projects (user_id, description, trade_code, ville_code_insee, ville_nom, ville_location, created_at)
select 'e9900000-0000-4000-8000-000000000002', 'Recherche fictive', v.metier, '06088', 'Nice',
  extensions.st_setsrid(extensions.st_makepoint(v.lon, 43.70), 4326)::extensions.geography,
  now() - make_interval(days => v.jours)
from (values
  ('plombier', 7.27, 2), ('plombier', 7.25, 10), ('chauffagiste', 7.26, 5),
  ('peintre', 7.26, 3), ('plombier', 6.90, 4), ('plombier', 7.26, 45)
) as v(metier, lon, jours);

create function pg_temp.connecter(uid uuid) returns void language sql as $$
  select set_config('request.jwt.claims', jsonb_build_object('sub', uid, 'role', 'authenticated')::text, true);
$$;

select pg_temp.connecter('e9900000-0000-4000-8000-000000000001');
set local role authenticated;
select is((public.my_zone_demand() ->> 'recherches')::int, 3, 'artisan : recherches de ses métiers dans sa zone, 30 jours');
select is(
  (public.my_zone_demand() -> 'metiers')::jsonb,
  '[{"metier": "plombier", "recherches": 2}, {"metier": "chauffagiste", "recherches": 1}]'::jsonb,
  'artisan : détail par métier, du plus cherché au moins cherché'
);
reset role;

select pg_temp.connecter('e9900000-0000-4000-8000-000000000002');
set local role authenticated;
select is((public.my_zone_demand() ->> 'recherches')::int, 0, 'autre compte : rien');
reset role;

set local role anon;
select throws_ok($$ select public.my_zone_demand() $$, '42501', null, 'visiteur : refusé');
reset role;

select * from finish();
rollback;
