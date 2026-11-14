-- Totaux partiels (F-159, lot 5, ADR 0329) : l'origine « partiel » est gardée dans le DPGF.
-- Données fictives (identifiants e154…).
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

insert into auth.users (id, email, is_anonymous, email_confirmed_at, raw_app_meta_data, raw_user_meta_data) values
  ('e1540000-0000-4000-8000-000000000001', 'partiel154.entreprise@example.test', false, now(), '{"role":"artisan"}', '{}');
insert into public.artisans (id, user_id, status, raison_sociale, zone_mode, assujetti_tva) values
  ('e1541000-0000-4000-8000-000000000001', 'e1540000-0000-4000-8000-000000000001', 'valide', 'PARTIEL 154', 'communes', true);
insert into public.subscriptions (artisan_id, plan_code, stripe_customer_id, stripe_subscription_id, status) values
  ('e1541000-0000-4000-8000-000000000001', 'entreprise', 'cus_e154a', 'sub_e154a', 'active');

set local role authenticated;
select set_config('request.jwt.claims', jsonb_build_object(
  'sub', 'e1540000-0000-4000-8000-000000000001', 'role', 'authenticated', 'aal', 'aal1',
  'app_metadata', jsonb_build_object('role', 'artisan'))::text, true);

select lives_ok($$ select public.artisan_create_plan_tender('Maison 154',
  '[{"path":"e1541000-0000-4000-8000-000000000001/0b6f3c4e-1d2a-4b5c-8d9e-0f1a2b3c5401.pdf","name":"plans.pdf"}]'::jsonb,
  array['carreleur']) $$, 'création');
select is(public.artisan_import_plan_lines((select id from public.tenders where name = 'Maison 154'),
  '[{"kind":"titre","lot":"LOT 01 CARRELEUR","code":"LOT 01","designation":"CARRELEUR"},
    {"kind":"poste","lot":"LOT 01 CARRELEUR","code":"1.1","designation":"Carrelage de sol","unit":"m2","unitLabel":"m²","quantityMilli":70500,"source":"partiel","detail":"Séjour 20 = 20 m² · sans Dgt : la surface à compléter."},
    {"kind":"poste","lot":"LOT 01 CARRELEUR","code":"1.2","designation":"Seuils","unit":"u","unitLabel":"u","quantityMilli":null,"source":"inconnue"}]'::jsonb),
  3, 'lignes du DPGF');
select results_eq(
  $$ select quantity_source from public.tender_lines where kind = 'poste' order by position $$,
  $$ values ('partiel'::text), ('manque') $$, 'origine « partiel » gardée, origine inconnue « manque »');

select * from finish();
rollback;
