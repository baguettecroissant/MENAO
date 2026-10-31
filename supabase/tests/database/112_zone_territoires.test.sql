-- Zone par territoire (F-68, ADR 0213) : référentiels en lecture publique, territoires lisibles par
-- leur artisan et l'équipe seulement, choix contrôlé, couverture et classement (proximité d'abord).
-- Données fictives (adresses zt112.*, Nice 06088 ; Toulon 83137 ; Lyon 69123).
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

insert into auth.users (id, email, is_anonymous, email_confirmed_at, raw_app_meta_data, raw_user_meta_data) values
  ('e1120000-0000-4000-8000-000000000001', 'zt112.client@example.test', false, now(), '{"role":"particulier"}', '{}');
insert into auth.users (id, email, is_anonymous, email_confirmed_at, raw_app_meta_data, raw_user_meta_data)
select ('e1120000-0000-4000-8000-00000000001' || n)::uuid, 'zt112.a' || n || '@example.test', false, now(),
  '{"role":"artisan"}', '{}'
from generate_series(1, 6) n;

create function pg_temp.connecter(uid uuid, app_role text) returns void language sql as $$
  select set_config('request.jwt.claims', jsonb_build_object(
    'sub', uid, 'role', 'authenticated', 'app_metadata', jsonb_build_object('role', app_role)
  )::text, true);
$$;
create function pg_temp.artisan(n int) returns uuid language sql as $$
  select ('e1121000-0000-4000-8000-00000000000' || n)::uuid
$$;

-- Tous basés à Lyon, loin de Nice : seul le territoire peut les rendre visibles à Nice.
-- 1 : département 06 + 83. 2 : région PACA. 3 : France. 4 : département 69 seulement.
-- 5 : rayon de 10 km à Nice (proximité). 6 : sans territoire enregistré.
insert into public.artisans (id, user_id, status, raison_sociale, zone_mode, radius_km, base_location, connect_charges_enabled)
select pg_temp.artisan(n), ('e1120000-0000-4000-8000-00000000001' || n)::uuid, 'valide', 'TERRITOIRE ' || n,
  (array['departements', 'regions', 'france', 'departements', 'rayon', 'departements'])[n]::public.zone_mode,
  case when n = 5 then 10 end,
  extensions.st_setsrid(extensions.st_makepoint(
    case when n = 5 then 7.27 else 4.83 end, case when n = 5 then 43.70 else 45.76 end), 4326)::extensions.geography,
  true
from generate_series(1, 6) n;
insert into public.artisan_territories (artisan_id, departement_code) values
  (pg_temp.artisan(1), '06'), (pg_temp.artisan(1), '83'), (pg_temp.artisan(4), '69');
insert into public.artisan_territories (artisan_id, region_code) values (pg_temp.artisan(2), '93');
insert into public.artisan_trades (artisan_id, trade_code) select pg_temp.artisan(n), 'electricien' from generate_series(1, 6) n;
insert into public.subscriptions (artisan_id, plan_code, stripe_customer_id, stripe_subscription_id, status, trial_end)
select pg_temp.artisan(n), 'base', 'cus_z112_' || n, 'sub_z112_' || n, 'trialing', now() + interval '30 days'
from generate_series(1, 6) n;
insert into public.projects (id, user_id, status, description, trade_code, ville_code_insee, ville_nom, ville_location,
  budget, criteria_validated_at) values
  ('e1122000-0000-4000-8000-000000000001', 'e1120000-0000-4000-8000-000000000001', 'criteres_valides',
   'Tableau électrique à changer', 'electricien', '06088', 'Nice',
   extensions.st_setsrid(extensions.st_makepoint(7.26, 43.70), 4326)::extensions.geography, '1000_5000', now());

create function pg_temp.rang(n int) returns bigint language sql as $$
  select r.pos from (
    select m.artisan_id, row_number() over () as pos
    from public.match_artisans('e1122000-0000-4000-8000-000000000001', 20) m
  ) r where r.artisan_id = pg_temp.artisan(n)
$$;

-- ---------- Référentiels ----------
select is((select count(*)::int from public.departements), 101, '101 départements');
select is((select count(*)::int from public.regions), 18, '18 régions');
select is((select region_code from public.departements where code = '06'), '93', 'le 06 est en PACA');
select is((select region_code from public.departements where code = '2A'), '94', 'Corse-du-Sud');
select is(app.departement_insee('06088'), '06', 'département métropolitain');
select is(app.departement_insee('2A004'), '2A', 'département corse');
select is(app.departement_insee('97411'), '974', 'département d''outre-mer');

set local role anon;
select is((select count(*)::int from public.departements), 101, 'référentiel lisible par un visiteur');
select throws_ok($$ insert into public.regions (code, nom) values ('99', 'Non') $$, '42501', null,
  'référentiel fermé en écriture');
select throws_ok($$ select id from public.artisan_territories $$, '42501', null,
  'territoires fermés aux visiteurs');
reset role;

-- ---------- Accès aux territoires ----------
select pg_temp.connecter('e1120000-0000-4000-8000-000000000011', 'artisan');
set local role authenticated;
select is((select count(*)::int from public.artisan_territories), 2, 'l''artisan lit ses territoires');
select throws_ok(
  $$ insert into public.artisan_territories (artisan_id, departement_code) values ('e1121000-0000-4000-8000-000000000001', '13') $$,
  '42501', null, 'écriture directe refusée');
reset role;
select pg_temp.connecter('e1120000-0000-4000-8000-000000000012', 'artisan');
set local role authenticated;
select is((select count(*)::int from public.artisan_territories where artisan_id = pg_temp.artisan(1)), 0,
  'les territoires d''un autre artisan restent invisibles');
reset role;

-- ---------- Couverture et classement ----------
select pg_temp.connecter('e1120000-0000-4000-8000-000000000001', 'particulier');
set local role authenticated;
select ok(pg_temp.rang(1) is not null, 'département choisi : proposé');
select ok(pg_temp.rang(2) is not null, 'région choisie : proposé');
select ok(pg_temp.rang(3) is not null, 'France entière : proposé');
select is(pg_temp.rang(4), null, 'autre département : pas proposé');
select is(pg_temp.rang(6), null, 'sans territoire enregistré : pas proposé');
select ok(pg_temp.rang(5) < pg_temp.rang(2) and pg_temp.rang(5) < pg_temp.rang(3),
  'rayon avant région et France');
select ok(pg_temp.rang(1) < pg_temp.rang(2) and pg_temp.rang(1) < pg_temp.rang(3),
  'département avant région et France');
select is((select m.hors_zone from public.match_artisans('e1122000-0000-4000-8000-000000000001', 20) m
           where m.artisan_id = pg_temp.artisan(3)), false, 'France entière : dans la zone');
select is((select m.zone_communes from public.match_artisans('e1122000-0000-4000-8000-000000000001', 20) m
           where m.artisan_id = pg_temp.artisan(1)),
  array['Alpes-Maritimes (06)', 'Var (83)'], 'départements affichés');
select is((select m.zone_communes from public.match_artisans('e1122000-0000-4000-8000-000000000001', 20) m
           where m.artisan_id = pg_temp.artisan(3)), array['France entière'], 'France affichée');
reset role;

-- ---------- Choix de la zone ----------
select pg_temp.connecter('e1120000-0000-4000-8000-000000000016', 'artisan');
set local role authenticated;
select throws_ok($$ select public.set_artisan_zone('departements', p_territoires => '{}') $$,
  '22023', 'Territoire invalide.', 'au moins un département');
select throws_ok($$ select public.set_artisan_zone('departements', p_territoires => '{06,99}') $$,
  '22023', 'Territoire invalide.', 'département inconnu refusé');
select throws_ok($$ select public.set_artisan_zone('regions', p_territoires => '{2A}') $$,
  '22023', 'Territoire invalide.', 'code de département refusé pour une région');
select lives_ok($$ select public.set_artisan_zone('departements', p_territoires => '{06,83,83}') $$,
  'départements enregistrés, adresse de départ gardée');
select is((select count(*)::int from public.artisan_territories), 2, 'doublon ignoré');
select lives_ok($$ select public.set_artisan_zone('regions', p_territoires => '{93}') $$, 'région enregistrée');
select results_eq(
  $$ select region_code, departement_code from public.artisan_territories $$,
  $$ values ('93'::text, null::text) $$, 'la région remplace les départements');
select lives_ok($$ select public.set_artisan_zone('france') $$, 'France enregistrée');
select is_empty($$ select id from public.artisan_territories $$, 'aucun territoire pour la France');
select lives_ok($$ select public.set_artisan_zone('rayon', p_radius_km => 30) $$, 'retour au rayon');
reset role;
select results_eq(
  $$ select zone_mode::text, radius_km::int from public.artisans where id = 'e1121000-0000-4000-8000-000000000006' $$,
  $$ values ('rayon'::text, 30) $$, 'mode et rayon à jour');
select is((select count(*)::int from public.artisan_territories where artisan_id = pg_temp.artisan(6)), 0,
  'le rayon efface les territoires');

-- Sans adresse de départ, le territoire reste refusé.
update public.artisans set zone_mode = null, radius_km = null, base_location = null, base_label = null
where id = pg_temp.artisan(6);
set local role authenticated;
select throws_ok($$ select public.set_artisan_zone('france') $$, '22023', 'Adresse de base requise.',
  'adresse de départ requise');
reset role;

-- ---------- Étape « zone » du dossier ----------
update public.artisans set zone_mode = 'departements',
  base_location = extensions.st_setsrid(extensions.st_makepoint(7.26, 43.70), 4326)::extensions.geography
where id = pg_temp.artisan(6);
select ok('zone' = any (app.onboarding_missing_steps(pg_temp.artisan(6))), 'département sans territoire : zone à faire');
update public.artisans set zone_mode = 'france' where id = pg_temp.artisan(6);
select ok(not 'zone' = any (app.onboarding_missing_steps(pg_temp.artisan(6))), 'France avec adresse : zone faite');

-- ---------- Inscription ----------
select lives_ok($$ select app.apply_signup_territories('e1121000-0000-4000-8000-000000000006',
  '{"mode":"regions","base_label":"Nice","base_citycode":"06088","lon":7.26,"lat":43.70,"territoires":["93","84","00"]}') $$,
  'inscription avec des régions');
select is((select count(*)::int from public.artisan_territories where artisan_id = pg_temp.artisan(6)), 2,
  'code inconnu écarté à l''inscription');
select is((select zone_mode::text from public.artisans where id = pg_temp.artisan(6)), 'regions', 'mode enregistré');

select * from finish();
rollback;
