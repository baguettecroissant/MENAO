-- Symboles comptés sur les plans (F-159, lot 7, ADR 0336) : symboles et convention gardés, une
-- nouvelle lecture remplace l'ancienne, origine « compte » gardée au DPGF. Données fictives
-- (identifiants e158…).
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

insert into auth.users (id, email, is_anonymous, email_confirmed_at, raw_app_meta_data, raw_user_meta_data) values
  ('e1580000-0000-4000-8000-000000000001', 'symboles158.entreprise@example.test', false, now(), '{"role":"artisan"}', '{}'),
  ('e1580000-0000-4000-8000-000000000002', 'symboles158.autre@example.test', false, now(), '{"role":"artisan"}', '{}');
insert into public.artisans (id, user_id, status, raison_sociale, zone_mode, assujetti_tva) values
  ('e1581000-0000-4000-8000-000000000001', 'e1580000-0000-4000-8000-000000000001', 'valide', 'SYMBOLES 158', 'communes', true),
  ('e1581000-0000-4000-8000-000000000002', 'e1580000-0000-4000-8000-000000000002', 'valide', 'AUTRE 158', 'communes', true);
insert into public.subscriptions (artisan_id, plan_code, stripe_customer_id, stripe_subscription_id, status) values
  ('e1581000-0000-4000-8000-000000000001', 'entreprise', 'cus_e158a', 'sub_e158a', 'active'),
  ('e1581000-0000-4000-8000-000000000002', 'entreprise', 'cus_e158b', 'sub_e158b', 'active');

create function pg_temp.ao() returns uuid language sql as
  $$ select id from public.tenders where name = 'Maison 158' $$;

set local role authenticated;
select set_config('request.jwt.claims', jsonb_build_object(
  'sub', 'e1580000-0000-4000-8000-000000000001', 'role', 'authenticated', 'aal', 'aal1',
  'app_metadata', jsonb_build_object('role', 'artisan'))::text, true);

select lives_ok($$ select public.artisan_create_plan_tender('Maison 158',
  '[{"path":"e1581000-0000-4000-8000-000000000001/0b6f3c4e-1d2a-4b5c-8d9e-0f1a2b3c5801.jpg","name":"electricite.jpg"}]'::jsonb,
  array['electricien']) $$, 'création');

select is(public.artisan_import_plan_symbols(pg_temp.ao(),
  '[{"file":1,"page":1,"type":"prise","x":120.4,"y":300,"room":" Salon ","doubt":false},
    {"file":1,"page":1,"type":"interrupteur","x":730,"y":940,"room":null,"doubt":true},
    {"file":1,"page":1,"type":"licorne","x":1,"y":1},
    {"file":11,"page":1,"type":"spot","x":1,"y":1},
    {"file":1,"page":1,"type":"spot","x":-5,"y":1}]'::jsonb,
  '[{"file":1,"page":1,"lines":["demi-cercle rouge = prise",""," petit cercle orange = spot "]}]'::jsonb),
  2, 'symboles valides gardés');
select is((select plan_symbols from public.tenders where id = pg_temp.ao()),
  '[{"file":1,"page":1,"type":"prise","x":120,"y":300,"room":"Salon","doubt":false},
    {"file":1,"page":1,"type":"interrupteur","x":730,"y":940,"room":null,"doubt":true}]'::jsonb,
  'position entière, pièce nettoyée, doute gardé');
select is((select plan_symbol_legend from public.tenders where id = pg_temp.ao()),
  '[{"file":1,"page":1,"lines":["demi-cercle rouge = prise","petit cercle orange = spot"]}]'::jsonb,
  'convention gardée sans ligne vide');

select is(public.artisan_import_plan_symbols(pg_temp.ao(), '[]'::jsonb), 0, 'nouvelle lecture sans symbole');
select is((select jsonb_array_length(plan_symbols) from public.tenders where id = pg_temp.ao()), 0,
  'les anciens symboles sont effacés');
select throws_ok($$ select public.artisan_import_plan_symbols(pg_temp.ao(), '{}'::jsonb) $$, '22023',
  null, 'symboles invalides refusés');

select is(public.artisan_import_plan_lines(pg_temp.ao(),
  '[{"kind":"titre","lot":"LOT 01 ÉLECTRICIEN","code":"LOT 01","designation":"ÉLECTRICIEN"},
    {"kind":"poste","lot":"LOT 01 ÉLECTRICIEN","code":"1.1","designation":"Prises de courant 16 A","unit":"u","unitLabel":"u","quantityMilli":28000,"source":"compte","detail":"Compté sur le plan"},
    {"kind":"poste","lot":"LOT 01 ÉLECTRICIEN","code":"1.2","designation":"Interrupteurs","unit":"u","unitLabel":"u","quantityMilli":14000,"source":"compte_verif"}]'::jsonb),
  3, 'lignes du DPGF');
select results_eq(
  $$ select quantity_source from public.tender_lines where kind = 'poste' order by position $$,
  $$ values ('compte'::text), ('compte_verif') $$, 'origines « compte » gardées');

select set_config('request.jwt.claims', jsonb_build_object(
  'sub', 'e1580000-0000-4000-8000-000000000002', 'role', 'authenticated', 'aal', 'aal1',
  'app_metadata', jsonb_build_object('role', 'artisan'))::text, true);
select throws_ok($$ select public.artisan_import_plan_symbols(
  (select id from public.tenders where name = 'Maison 158'), '[]'::jsonb) $$, '22023', null,
  'symboles refusés à une autre entreprise');

select * from finish();
rollback;
