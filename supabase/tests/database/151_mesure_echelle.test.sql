-- Mesure à l'échelle (F-159, lot 2, ADR 0326) : tracés enregistrés, pièces sans surface estimées,
-- pièce déjà mesurée jamais remplacée, origine « estime » gardée puis « saisi » à la correction,
-- isolement entre entreprises. Données fictives (identifiants e151…).
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

insert into auth.users (id, email, is_anonymous, email_confirmed_at, raw_app_meta_data, raw_user_meta_data) values
  ('e1510000-0000-4000-8000-000000000001', 'echelle151.entreprise@example.test', false, now(), '{"role":"artisan"}', '{}'),
  ('e1510000-0000-4000-8000-000000000002', 'echelle151.autre@example.test', false, now(), '{"role":"artisan"}', '{}');
insert into public.artisans (id, user_id, status, raison_sociale, zone_mode, assujetti_tva) values
  ('e1511000-0000-4000-8000-000000000001', 'e1510000-0000-4000-8000-000000000001', 'valide', 'ECHELLE 151', 'communes', true),
  ('e1511000-0000-4000-8000-000000000002', 'e1510000-0000-4000-8000-000000000002', 'valide', 'AUTRE 151', 'communes', true);
insert into public.subscriptions (artisan_id, plan_code, stripe_customer_id, stripe_subscription_id, status) values
  ('e1511000-0000-4000-8000-000000000001', 'entreprise', 'cus_e151a', 'sub_e151a', 'active'),
  ('e1511000-0000-4000-8000-000000000002', 'entreprise', 'cus_e151b', 'sub_e151b', 'active');

create function pg_temp.connecter(uid uuid) returns void language sql as $$
  select set_config('request.jwt.claims', jsonb_build_object(
    'sub', uid, 'role', 'authenticated', 'aal', 'aal1', 'app_metadata', jsonb_build_object('role', 'artisan')
  )::text, true);
$$;
create function pg_temp.ao() returns uuid language sql as $$
  select id from public.tenders where name = 'Maison 151'
$$;
create function pg_temp.traces() returns jsonb language sql as $$
  select '[{"file":1,"width":2000,"height":1500,"umPerPx":7824,"spreadBp":83,
    "anchors":[{"x1":208,"y1":360,"x2":668,"y2":360,"mm":3590}],
    "rooms":[{"name":"salon","contour":"1165,685 1675,685 1675,1238 1165,1238","areaCm2":172600,"perimeterMm":16630},
             {"name":"chambre 1","contour":"208,264 668,264 668,670 208,670","areaCm2":115300,"perimeterMm":13550}]}]'::jsonb
$$;

select ok(not has_function_privilege('anon', 'public.artisan_import_plan_traces(uuid, jsonb, jsonb)', 'execute'),
  'tracés fermés aux visiteurs');

set local role authenticated;
select pg_temp.connecter('e1510000-0000-4000-8000-000000000001');
select lives_ok($$ select public.artisan_create_plan_tender('Maison 151',
  '[{"path":"e1511000-0000-4000-8000-000000000001/0b6f3c4e-1d2a-4b5c-8d9e-0f1a2b3c5101.jpg","name":"sols.jpg"}]'::jsonb,
  array['carreleur']) $$, 'création');
select is(public.artisan_import_plan_reading(pg_temp.ao(),
  '[{"name":"chambre 1","areaCm2":113803,"perimeterMm":13520,"heightMm":2700,"source":"photo","file":1,"page":1},
    {"name":"salon","heightMm":2700,"source":"photo","file":1,"page":1,"uncertain":true},
    {"name":"entrée","heightMm":2700,"source":"photo","file":1,"page":1}]'::jsonb, '{}'::jsonb), 3, 'relevé : 3 pièces');

-- ---------- Tracés et estimations ----------
select is(public.artisan_import_plan_traces(pg_temp.ao(), pg_temp.traces(),
  '[{"position":1,"areaCm2":115300,"perimeterMm":13550},{"position":2,"areaCm2":172600,"perimeterMm":16630}]'::jsonb),
  1, 'une seule pièce estimée : celle qui n''avait pas de surface');
select results_eq(
  $$ select name, area_cm2, perimeter_mm, source, uncertain from public.tender_rooms order by position $$,
  $$ values ('chambre 1'::text, 113803, 13520, 'photo'::text, false),
       ('salon', 172600, 16630, 'estime', false),
       ('entrée', null, null, 'photo', false) $$,
  'pièce mesurée intacte, pièce sans surface estimée, pièce non tracée vide');
select is((select plan_traces -> 0 ->> 'umPerPx' from public.tenders where id = pg_temp.ao()), '7824', 'tracé gardé');

select throws_ok($$ select public.artisan_import_plan_traces(pg_temp.ao(), '{}'::jsonb) $$, '22023',
  'Tracés invalides.', 'tracés mal formés refusés');
select throws_ok($$ select public.artisan_import_plan_traces(pg_temp.ao(),
  '[{"file":1,"width":2000,"height":1500,"umPerPx":0,"rooms":[]}]'::jsonb) $$, '22023',
  'Tracés invalides.', 'échelle nulle refusée');
select throws_ok($$ select public.artisan_import_plan_traces(pg_temp.ao(), '[]'::jsonb,
  '[{"position":1,"areaCm2":-4,"perimeterMm":10}]'::jsonb) $$, '22023',
  'Estimations invalides.', 'surface négative refusée');

-- ---------- Correction : « saisi » ; sans changement : « estime » gardé ----------
select lives_ok($$ select public.artisan_save_plan_rooms(pg_temp.ao(), (
  select jsonb_agg(jsonb_build_object('id', id, 'level', level, 'name', name,
    'areaCm2', case when name = 'entrée' then 66000 else area_cm2 end,
    'perimeterMm', perimeter_mm, 'heightMm', height_mm, 'wet', wet, 'habitable', habitable) order by position)
  from public.tender_rooms), '{}'::jsonb) $$, 'relevé enregistré');
select results_eq(
  $$ select name, source from public.tender_rooms order by position $$,
  $$ values ('chambre 1'::text, 'photo'::text), ('salon', 'estime'), ('entrée', 'saisi') $$,
  'estimation gardée, correction « saisi »');

-- ---------- DPGF : origine « estime » ----------
select is(public.artisan_import_plan_lines(pg_temp.ao(),
  '[{"kind":"titre","lot":"LOT 01 CARRELEUR","code":"LOT 01","designation":"CARRELEUR"},
    {"kind":"poste","lot":"LOT 01 CARRELEUR","code":"1.1","designation":"Carrelage de sol","unit":"m2","unitLabel":"m²","quantityMilli":28640,"source":"estime","detail":"chambre 1 11,38 + salon 17,26"}]'::jsonb),
  2, 'lignes du DPGF');
select is((select quantity_source from public.tender_lines where kind = 'poste'), 'estime', 'origine « estime » gardée');

-- ---------- Autre entreprise ----------
select pg_temp.connecter('e1510000-0000-4000-8000-000000000002');
select throws_ok($$ select public.artisan_import_plan_traces(
  (select id from public.tenders where name = 'Maison 151'), '[]'::jsonb) $$,
  '22023', 'Appel d''offres introuvable.', 'autre entreprise : tracés refusés');

select * from finish();
rollback;
