-- Ouvrages écrits sur les plans (F-159, lot 6, ADR 0330) : pièce, dépose, origine « unite », lots
-- ajoutés d'après les plans, lots cochés par l'artisan. Données fictives (identifiants e155…).
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

insert into auth.users (id, email, is_anonymous, email_confirmed_at, raw_app_meta_data, raw_user_meta_data) values
  ('e1550000-0000-4000-8000-000000000001', 'notes155.entreprise@example.test', false, now(), '{"role":"artisan"}', '{}'),
  ('e1550000-0000-4000-8000-000000000002', 'notes155.autre@example.test', false, now(), '{"role":"artisan"}', '{}');
insert into public.artisans (id, user_id, status, raison_sociale, zone_mode, assujetti_tva) values
  ('e1551000-0000-4000-8000-000000000001', 'e1550000-0000-4000-8000-000000000001', 'valide', 'NOTES 155', 'communes', true),
  ('e1551000-0000-4000-8000-000000000002', 'e1550000-0000-4000-8000-000000000002', 'valide', 'AUTRE 155', 'communes', true);
insert into public.subscriptions (artisan_id, plan_code, stripe_customer_id, stripe_subscription_id, status) values
  ('e1551000-0000-4000-8000-000000000001', 'entreprise', 'cus_e155a', 'sub_e155a', 'active'),
  ('e1551000-0000-4000-8000-000000000002', 'entreprise', 'cus_e155b', 'sub_e155b', 'active');

create function pg_temp.ao() returns uuid language sql as
  $$ select id from public.tenders where name = 'Maison 155' $$;

set local role authenticated;
select set_config('request.jwt.claims', jsonb_build_object(
  'sub', 'e1550000-0000-4000-8000-000000000001', 'role', 'authenticated', 'aal', 'aal1',
  'app_metadata', jsonb_build_object('role', 'artisan'))::text, true);

select lives_ok($$ select public.artisan_create_plan_tender('Maison 155',
  '[{"path":"e1551000-0000-4000-8000-000000000001/0b6f3c4e-1d2a-4b5c-8d9e-0f1a2b3c5501.jpg","name":"cloisons.jpg"}]'::jsonb,
  array['plaquiste']) $$, 'création');
select is(public.artisan_import_plan_reading(pg_temp.ao(),
  '[{"name":"Salon","areaCm2":171000,"source":"plan"}]'::jsonb, '{}'::jsonb, null,
  '[{"name":"Terrasse","kind":"surface","quantityMilli":12000,"source":"plan","trade":"plaquiste"}]'::jsonb),
  2, 'relevé : une pièce et un ouvrage mesuré');

select is(public.artisan_import_plan_notes(pg_temp.ao(),
  '[{"name":"Faux plafond suspendu BA13","kind":"surface","quantityMilli":17100,"source":"calcul","detail":"Surface de la pièce : Salon","trade":"plaquiste","file":1,"page":1,"room":"Salon"},
    {"name":"Baignoire à déposer","kind":"nombre","quantityMilli":1000,"source":"unite","trade":"plombier","file":1,"page":1,"room":"Salle d''eau","removal":true},
    {"name":"F-01 · Fenêtre OF · 167 × 208 cm","kind":"nombre","quantityMilli":1000,"source":"unite","trade":"menuisier","file":1,"page":1},
    {"name":"Cloison BA13","kind":"surface","quantityMilli":null,"source":"plan","trade":"astronaute","room":"Salon"}]'::jsonb),
  4, 'ouvrages écrits ajoutés');
select results_eq(
  $$ select position::integer, source, trade_code, room, removal from public.tender_works
     where tender_id = pg_temp.ao() order by position $$,
  $$ values (1, 'plan'::text, 'plaquiste'::text, null::text, false),
       (2, 'calcul', 'plaquiste', 'Salon', false),
       (3, 'unite', 'plombier', 'Salle d''eau', true),
       (4, 'unite', 'menuisier', null, false),
       (5, 'plan', null, 'Salon', false) $$,
  'ouvrages à la suite du relevé, avec pièce, dépose et origine ; métier inconnu ignoré');
select is((select plan_trades from public.tenders where id = pg_temp.ao()),
  array['plaquiste', 'demolition', 'menuisier'],
  'lots : celui choisi, puis la démolition et les métiers des ouvrages écrits');
select is((select detail from public.tender_works where tender_id = pg_temp.ao() and position = 2),
  'Surface de la pièce : Salon', 'calcul gardé');

-- L'artisan décoche un lot : l'ouvrage garde son métier à l'enregistrement suivant.
select lives_ok($$ select public.artisan_set_plan_trades(pg_temp.ao(), array['plaquiste', 'demolition']) $$,
  'lots cochés');
select throws_ok($$ select public.artisan_set_plan_trades(pg_temp.ao(), array[]::text[]) $$, '22023',
  null, 'au moins un lot');
select throws_ok($$ select public.artisan_set_plan_trades(pg_temp.ao(), array['astronaute']) $$, '22023',
  null, 'lot inconnu refusé');
select lives_ok($$ select public.artisan_save_plan_works(pg_temp.ao(), (
  select jsonb_agg(jsonb_build_object('id', id, 'name', name, 'kind', kind,
    'quantityMilli', case when position = 2 then 18000 else quantity_milli end,
    'trade', trade_code) order by position)
  from public.tender_works where tender_id = pg_temp.ao())) $$, 'ouvrages corrigés');
select results_eq(
  $$ select source, trade_code, room, removal from public.tender_works
     where tender_id = pg_temp.ao() and position in (2, 3, 4) order by position $$,
  $$ values ('saisi'::text, 'plaquiste'::text, 'Salon'::text, false),
       ('unite', 'plombier', 'Salle d''eau', true),
       ('unite', 'menuisier', null, false) $$,
  'quantité corrigée « saisi » ; pièce, dépose et métier d''un lot décoché gardés');

-- Une autre entreprise ne voit ni ne modifie ces ouvrages.
select set_config('request.jwt.claims', jsonb_build_object(
  'sub', 'e1550000-0000-4000-8000-000000000002', 'role', 'authenticated', 'aal', 'aal1',
  'app_metadata', jsonb_build_object('role', 'artisan'))::text, true);
select is((select count(*)::integer from public.tender_works), 0, 'ouvrages invisibles pour une autre entreprise');
select throws_ok($$ select public.artisan_import_plan_notes(
  (select id from public.tenders where name = 'Maison 155'), '[]'::jsonb) $$, '22023',
  null, 'ajout refusé à une autre entreprise');
select throws_ok($$ select public.artisan_set_plan_trades(
  'e1559999-0000-4000-8000-000000000001'::uuid, array['plaquiste']) $$, '22023',
  null, 'lots refusés à une autre entreprise');

select * from finish();
rollback;
