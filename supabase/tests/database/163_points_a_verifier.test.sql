-- Points à vérifier (F-159, lot 56, ADR 0343) : une pièce, un ouvrage et un type de symbole validés,
-- valeur gardée ; refus pour un autre compte et pour une clé ou une valeur invalide. Données
-- fictives (identifiants e163…).
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

insert into auth.users (id, email, is_anonymous, email_confirmed_at, raw_app_meta_data, raw_user_meta_data) values
  ('e1630000-0000-4000-8000-000000000001', 'verif163.entreprise@example.test', false, now(), '{"role":"artisan"}', '{}'),
  ('e1630000-0000-4000-8000-000000000002', 'verif163.autre@example.test', false, now(), '{"role":"artisan"}', '{}');
insert into public.artisans (id, user_id, status, raison_sociale, zone_mode, assujetti_tva) values
  ('e1631000-0000-4000-8000-000000000001', 'e1630000-0000-4000-8000-000000000001', 'valide', 'VERIF 163', 'communes', true),
  ('e1631000-0000-4000-8000-000000000002', 'e1630000-0000-4000-8000-000000000002', 'valide', 'AUTRE 163', 'communes', true);
insert into public.subscriptions (artisan_id, plan_code, stripe_customer_id, stripe_subscription_id, status) values
  ('e1631000-0000-4000-8000-000000000001', 'entreprise', 'cus_e163a', 'sub_e163a', 'active'),
  ('e1631000-0000-4000-8000-000000000002', 'entreprise', 'cus_e163b', 'sub_e163b', 'active');

create function pg_temp.ao() returns uuid language sql as
  $$ select id from public.tenders where name = 'Maison 163' $$;
create function pg_temp.piece() returns uuid language sql as
  $$ select id from public.tender_rooms where tender_id = pg_temp.ao() and name = 'WC' $$;
create function pg_temp.ouvrage() returns uuid language sql as
  $$ select id from public.tender_works where tender_id = pg_temp.ao() and name = 'Cloison BA13' $$;
create function pg_temp.connecter(uid uuid) returns void language sql as $$
  select set_config('request.jwt.claims', jsonb_build_object(
    'sub', uid, 'role', 'authenticated', 'aal', 'aal1',
    'app_metadata', jsonb_build_object('role', 'artisan'))::text, true);
$$;

set local role authenticated;
select pg_temp.connecter('e1630000-0000-4000-8000-000000000001');
select lives_ok($$ select public.artisan_create_plan_tender('Maison 163',
  '[{"path":"e1631000-0000-4000-8000-000000000001/0b6f3c4e-1d2a-4b5c-8d9e-0f1a2b3c6301.jpg","name":"plan.jpg"}]'::jsonb,
  array['plaquiste']) $$, 'création');
select is(public.artisan_import_plan_reading(pg_temp.ao(),
  '[{"name":"WC","areaCm2":17000,"heightMm":2500,"source":"photo","uncertain":true}]'::jsonb, '{}'::jsonb, null,
  '[{"name":"Cloison BA13","kind":"surface","quantityMilli":null,"source":"plan","trade":"plaquiste"}]'::jsonb),
  2, 'relevé : une pièce lue sur une photo et un ouvrage sans quantité');
select is(public.artisan_import_plan_symbols(pg_temp.ao(),
  '[{"type":"interrupteur","x":10,"y":10,"file":1,"page":1,"doubt":true},
    {"type":"prise","x":40,"y":10,"file":1,"page":1,"doubt":true}]'::jsonb), 2, 'symboles douteux');

-- Pièce : surface et hauteur validées, devenues celles de l'artisan.
select lives_ok($$ select public.artisan_check_plan_point(pg_temp.ao(), 'piece:wc', pg_temp.piece(), 18000, 2600) $$,
  'pièce validée');
select results_eq(
  $$ select area_cm2, height_mm, source, uncertain from public.tender_rooms where id = pg_temp.piece() $$,
  $$ values (18000, 2600, 'saisi'::text, false) $$,
  'surface et hauteur corrigées, « saisi »');

-- Ouvrage : longueur tracée × hauteur, quantité validée.
select lives_ok($$ select public.artisan_check_plan_point(pg_temp.ao(), 'ouvrage:cloison ba13|', pg_temp.ouvrage(), 9234) $$,
  'ouvrage validé');
select results_eq(
  $$ select quantity_milli, source from public.tender_works where id = pg_temp.ouvrage() $$,
  $$ values (9234::bigint, 'saisi'::text) $$,
  'quantité enregistrée, « saisi »');

-- Symbole : les groupes douteux du type sont levés, les autres types gardent les leurs.
select lives_ok($$ select public.artisan_check_plan_point(pg_temp.ao(), 'symbole:interrupteur') $$,
  'type de symbole validé');
select results_eq(
  $$ select s ->> 'type', (s ->> 'doubt')::boolean from public.tenders,
       jsonb_array_elements(plan_symbols) s where id = pg_temp.ao() order by 1 $$,
  $$ values ('interrupteur'::text, false), ('prise', true) $$,
  'doute levé sur les interrupteurs seulement');
select is((select plan_checks from public.tenders where id = pg_temp.ao()),
  '{"piece:wc": 18000, "ouvrage:cloison ba13|": 9234, "symbole:interrupteur": null}'::jsonb,
  'valeurs validées gardées');

select throws_ok($$ select public.artisan_check_plan_point(pg_temp.ao(), 'autre:wc', pg_temp.piece(), 1) $$,
  '22023', null, 'clé inconnue refusée');
select throws_ok($$ select public.artisan_check_plan_point(pg_temp.ao(), 'piece:wc', pg_temp.piece(), 0) $$,
  '22023', null, 'surface nulle refusée');
select throws_ok($$ select public.artisan_check_plan_point(pg_temp.ao(), 'piece:wc', pg_temp.ouvrage(), 18000) $$,
  '22023', null, 'pièce d''un autre type refusée');

-- Un autre compte ne valide rien.
select pg_temp.connecter('e1630000-0000-4000-8000-000000000002');
select throws_ok($$ select public.artisan_check_plan_point(
  (select id from public.tenders where name = 'Maison 163'), 'symbole:prise') $$,
  null, null, 'autre entreprise : refusé');
reset role;
select is((select (s ->> 'doubt')::boolean from public.tenders, jsonb_array_elements(plan_symbols) s
  where name = 'Maison 163' and s ->> 'type' = 'prise'), true, 'prises toujours douteuses');

set local role anon;
select throws_ok($$ select public.artisan_check_plan_point(gen_random_uuid(), 'symbole:prise') $$,
  '42501', null, 'visiteur : refusé');
reset role;

select * from finish();
rollback;
