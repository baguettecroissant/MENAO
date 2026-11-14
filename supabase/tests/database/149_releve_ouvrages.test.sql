-- Relevé d'un plan de terrain (F-158, ADR 0322) : ouvrages mesurés importés avec les pages et les
-- altitudes, métier hors liste ignoré, corrections de l'artisan (« saisi »), isolement entre
-- entreprises, origine « saisi » gardée dans le DPGF. Données fictives (identifiants e149…).
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

insert into auth.users (id, email, is_anonymous, email_confirmed_at, raw_app_meta_data, raw_user_meta_data) values
  ('e1490000-0000-4000-8000-000000000001', 'terrain149.entreprise@example.test', false, now(), '{"role":"artisan"}', '{}'),
  ('e1490000-0000-4000-8000-000000000002', 'terrain149.autre@example.test', false, now(), '{"role":"artisan"}', '{}');
insert into public.artisans (id, user_id, status, raison_sociale, zone_mode, assujetti_tva) values
  ('e1491000-0000-4000-8000-000000000001', 'e1490000-0000-4000-8000-000000000001', 'valide', 'TERRASSEMENT 149', 'communes', true),
  ('e1491000-0000-4000-8000-000000000002', 'e1490000-0000-4000-8000-000000000002', 'valide', 'AUTRE 149', 'communes', true);
insert into public.subscriptions (artisan_id, plan_code, stripe_customer_id, stripe_subscription_id, status) values
  ('e1491000-0000-4000-8000-000000000001', 'entreprise', 'cus_e149a', 'sub_e149a', 'active'),
  ('e1491000-0000-4000-8000-000000000002', 'entreprise', 'cus_e149b', 'sub_e149b', 'active');

create function pg_temp.connecter(uid uuid) returns void language sql as $$
  select set_config('request.jwt.claims', jsonb_build_object(
    'sub', uid, 'role', 'authenticated', 'aal', 'aal1', 'app_metadata', jsonb_build_object('role', 'artisan')
  )::text, true);
$$;
create function pg_temp.terrain() returns uuid language sql as $$
  select id from public.tenders where name = 'Maison terrain fictif'
$$;

select has_table('public', 'tender_works', 'table des ouvrages mesurés');
select ok((select relrowsecurity from pg_class where oid = 'public.tender_works'::regclass), 'RLS activée sur tender_works');
select is_empty($$ select 1 from pg_policies where tablename = 'tender_works' and cmd <> 'SELECT' $$,
  'aucune écriture directe dans les ouvrages');
select ok(not has_function_privilege('anon', 'public.artisan_save_plan_works(uuid, jsonb)', 'execute'),
  'corrections fermées aux visiteurs');
select ok(not has_function_privilege('anon',
  'public.artisan_import_plan_reading(uuid, jsonb, jsonb, text, jsonb, jsonb, jsonb)', 'execute'),
  'import fermé aux visiteurs');

set local role authenticated;
select pg_temp.connecter('e1490000-0000-4000-8000-000000000001');
select lives_ok($$ select public.artisan_create_plan_tender('Maison terrain fictif',
  '[{"path":"e1491000-0000-4000-8000-000000000001/0b6f3c4e-1d2a-4b5c-8d9e-0f1a2b3c4e01.pdf","name":"Plan_de_masse.pdf"}]'::jsonb,
  array['terrassier', 'paysagiste']) $$, 'création depuis un plan de terrain');

-- ---------- Relevé importé : aucun pièce, des ouvrages ----------
select is(public.artisan_import_plan_reading(
  pg_temp.terrain(), '[]'::jsonb, '{}'::jsonb, '1/200',
  '[{"name":"Terrain","kind":"surface","quantityMilli":812000,"source":"plan","file":1,"page":1},
    {"name":"Plateforme à terrasser","kind":"surface","quantityMilli":186000,"source":"plan","trade":"terrassier","file":1,"page":1},
    {"name":"Décapage de la terre végétale","kind":"volume","quantityMilli":55800,"source":"calcul","detail":"186,00 m² × 0,30 m","trade":"terrassier","file":1,"page":2},
    {"name":"Mur de clôture","kind":"lineaire","quantityMilli":20000,"source":"plan","trade":"macon","file":1,"page":1},
    {"name":"Arbres à planter","kind":"nombre","quantityMilli":6000,"source":"compte","trade":"paysagiste","file":1,"page":1},
    {"name":"Haie à planter","kind":"lineaire","quantityMilli":null,"source":"plan","trade":"paysagiste","file":1,"page":1,"uncertain":true}]'::jsonb,
  '[{"file":1,"page":1,"type":"masse"},{"file":1,"page":2,"type":"coupe_terrain"},{"file":1,"page":3,"type":"inconnu"},{"file":11,"page":1,"type":"masse"}]'::jsonb,
  '[{"name":"Terrain naturel","altitudeMm":102400},{"name":"Plateforme","altitudeMm":101200},{"name":" ","altitudeMm":5},{"name":"Flottant","altitudeMm":1.5}]'::jsonb
), 6, 'relevé : 6 ouvrages, aucune pièce');
select results_eq(
  $$ select name, kind, quantity_milli, source, detail, trade_code, page::integer from public.tender_works order by position $$,
  $$ values ('Terrain'::text, 'surface'::text, 812000::bigint, 'plan'::text, null::text, null::text, 1),
       ('Plateforme à terrasser', 'surface', 186000, 'plan', null, 'terrassier', 1),
       ('Décapage de la terre végétale', 'volume', 55800, 'calcul', '186,00 m² × 0,30 m', 'terrassier', 2),
       ('Mur de clôture', 'lineaire', 20000, 'plan', null, null, 1),
       ('Arbres à planter', 'nombre', 6000, 'compte', null, 'paysagiste', 1),
       ('Haie à planter', 'lineaire', null, 'plan', null, 'paysagiste', 1) $$,
  'ouvrages enregistrés dans l''ordre ; métier hors de l''appel d''offres ignoré');
select is((select plan_pages from public.tenders where id = pg_temp.terrain()),
  '[{"file":1,"page":1,"type":"masse"},{"file":1,"page":2,"type":"coupe_terrain"}]'::jsonb,
  'types de pages connus gardés');
select is((select plan_levels from public.tenders where id = pg_temp.terrain()),
  '[{"name":"Terrain naturel","altitudeMm":102400},{"name":"Plateforme","altitudeMm":101200}]'::jsonb,
  'altitudes entières gardées');
select is_empty($$ select 1 from public.tender_rooms $$, 'aucune pièce');

select throws_ok($$ select public.artisan_import_plan_reading(pg_temp.terrain(), '[]'::jsonb, '{}'::jsonb, null,
  '[{"name":"Sans mesure","kind":"poids","quantityMilli":1000}]'::jsonb) $$,
  '22023', 'Chaque ouvrage doit avoir un nom et une mesure.', 'mesure inconnue refusée');
select throws_ok($$ select public.artisan_import_plan_reading(pg_temp.terrain(), '[]'::jsonb, '{}'::jsonb, null,
  '[{"name":"Arbres","kind":"nombre","quantityMilli":2500}]'::jsonb) $$,
  '22023', 'Quantité invalide.', 'nombre non entier refusé');
select is((select count(*)::integer from public.tender_works), 6, 'import refusé : relevé intact');

-- ---------- Corrections de l'artisan ----------
select lives_ok($$ select public.artisan_save_plan_works(pg_temp.terrain(), jsonb_build_array(
  (select jsonb_build_object('id', id, 'name', 'Plateforme', 'kind', kind, 'quantityMilli', quantity_milli, 'trade', 'paysagiste')
     from public.tender_works where name = 'Plateforme à terrasser'),
  (select jsonb_build_object('id', id, 'name', name, 'kind', kind, 'quantityMilli', 60000, 'trade', trade_code)
     from public.tender_works where name like 'Décapage%'),
  (select jsonb_build_object('id', id, 'name', name, 'kind', kind, 'quantityMilli', 48000, 'trade', trade_code)
     from public.tender_works where name = 'Haie à planter'),
  jsonb_build_object('name', 'Enrochement', 'kind', 'lineaire', 'quantityMilli', 12500, 'trade', 'terrassier')
)) $$, 'ouvrages corrigés');
select results_eq(
  $$ select name, quantity_milli, source, detail, trade_code, uncertain from public.tender_works order by position $$,
  $$ values ('Plateforme'::text, 186000::bigint, 'plan'::text, null::text, 'paysagiste'::text, false),
       ('Décapage de la terre végétale', 60000, 'saisi', null, 'terrassier', false),
       ('Haie à planter', 48000, 'saisi', null, 'paysagiste', false),
       ('Enrochement', 12500, 'saisi', null, 'terrassier', false) $$,
  'nom et lot changés sans perdre l''origine ; quantité changée ou ouvrage ajouté « saisi » ; ouvrages retirés supprimés');
select throws_ok($$ select public.artisan_save_plan_works(pg_temp.terrain(), '[{"name":" ","kind":"surface"}]'::jsonb) $$,
  '22023', 'Chaque ouvrage doit avoir un nom et une mesure.', 'ouvrage sans nom refusé');

-- ---------- DPGF : origine « saisi » gardée ----------
select is(public.artisan_import_plan_lines(pg_temp.terrain(),
  '[{"kind":"titre","lot":"LOT 01 TERRASSIER","code":"LOT 01","designation":"TERRASSIER"},
    {"kind":"poste","lot":"LOT 01 TERRASSIER","code":"1.1","designation":"Décapage de la terre végétale","unit":"m3","unitLabel":"m³","quantityMilli":60000,"source":"saisi","detail":"Valeur saisie dans le relevé."},
    {"kind":"poste","lot":"LOT 01 TERRASSIER","code":"1.2","designation":"Enrochement","unit":"ml","unitLabel":"ml","quantityMilli":12500,"source":"inconnue"}]'::jsonb),
  3, 'lignes du DPGF créées');
select results_eq(
  $$ select quantity_source from public.tender_lines where kind = 'poste' order by position $$,
  $$ values ('saisi'::text), ('manque') $$, 'origine « saisi » gardée, origine inconnue « manque »');

-- ---------- Autre entreprise ----------
select pg_temp.connecter('e1490000-0000-4000-8000-000000000002');
select is_empty($$ select 1 from public.tender_works $$, 'autre entreprise : aucun ouvrage visible');
select throws_ok($$ select public.artisan_save_plan_works(
  (select id from public.tenders where name = 'Maison terrain fictif'), '[]'::jsonb) $$,
  '22023', 'Appel d''offres introuvable.', 'autre entreprise : ouvrages non modifiables');
select throws_ok($$ insert into public.tender_works (tender_id, position, name, kind, source)
  values ('00000000-0000-4000-8000-000000000000', 1, 'Intrus', 'surface', 'saisi') $$, '42501', null,
  'écriture directe refusée');

-- ---------- Suppression ----------
select pg_temp.connecter('e1490000-0000-4000-8000-000000000001');
select lives_ok($$ select public.artisan_delete_tender(pg_temp.terrain()) $$, 'suppression');
select is_empty($$ select 1 from public.tender_works $$, 'ouvrages supprimés avec l''appel d''offres');

select * from finish();
rollback;
