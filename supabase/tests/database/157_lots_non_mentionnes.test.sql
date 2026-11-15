-- Lots que les plans ne mentionnent pas (F-159, lot 6, ADR 0333) : décochés par défaut, gardés
-- comme proposés, recochés par l'artisan. Données fictives (identifiants e157…).
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

insert into auth.users (id, email, is_anonymous, email_confirmed_at, raw_app_meta_data, raw_user_meta_data) values
  ('e1570000-0000-4000-8000-000000000001', 'lots157.entreprise@example.test', false, now(), '{"role":"artisan"}', '{}');
insert into public.artisans (id, user_id, status, raison_sociale, zone_mode, assujetti_tva) values
  ('e1571000-0000-4000-8000-000000000001', 'e1570000-0000-4000-8000-000000000001', 'valide', 'LOTS 157', 'communes', true);
insert into public.subscriptions (artisan_id, plan_code, stripe_customer_id, stripe_subscription_id, status) values
  ('e1571000-0000-4000-8000-000000000001', 'entreprise', 'cus_e157a', 'sub_e157a', 'active');

create function pg_temp.ao() returns uuid language sql as
  $$ select id from public.tenders where name = 'Maison 157' $$;

set local role authenticated;
select set_config('request.jwt.claims', jsonb_build_object(
  'sub', 'e1570000-0000-4000-8000-000000000001', 'role', 'authenticated', 'aal', 'aal1',
  'app_metadata', jsonb_build_object('role', 'artisan'))::text, true);

select lives_ok($$ select public.artisan_create_plan_tender('Maison 157',
  '[{"path":"e1571000-0000-4000-8000-000000000001/0b6f3c4e-1d2a-4b5c-8d9e-0f1a2b3c5701.jpg","name":"plan.jpg"}]'::jsonb,
  array['carreleur', 'climaticien', 'electricien']) $$, 'création');
select is(public.artisan_import_plan_reading(pg_temp.ao(),
  '[{"name":"Salon","areaCm2":171000,"source":"plan"}]'::jsonb, '{}'::jsonb), 1, 'relevé');
select is(public.artisan_import_plan_notes(pg_temp.ao(),
  '[{"name":"Cloison BA13","kind":"surface","source":"plan","trade":"plaquiste","room":"Salon"}]'::jsonb,
  array['climaticien', 'electricien']), 1, 'ouvrage écrit ajouté');
select is((select plan_trades from public.tenders where id = pg_temp.ao()),
  array['carreleur', 'plaquiste'], 'lots non mentionnés décochés, lot du plan ajouté');
select is((select plan_lots_idle from public.tenders where id = pg_temp.ao()),
  array['climaticien', 'electricien'], 'lots décochés gardés comme proposés');

select lives_ok($$ select public.artisan_set_plan_trades(pg_temp.ao(),
  array['carreleur', 'plaquiste', 'electricien']) $$, 'lot recoché');
select is((select plan_lots_idle from public.tenders where id = pg_temp.ao()),
  array['climaticien'], 'le lot recoché quitte les proposés');
select lives_ok($$ select public.artisan_set_plan_trades(pg_temp.ao(), array['plaquiste']) $$,
  'lots décochés');
select is((select plan_lots_idle from public.tenders where id = pg_temp.ao()),
  array['carreleur', 'climaticien', 'electricien'], 'un lot décoché reste proposé');

-- Tous les lots seraient décochés : les lots choisis restent.
select lives_ok($$ select public.artisan_create_plan_tender('Maison 157 bis',
  '[{"path":"e1571000-0000-4000-8000-000000000001/0b6f3c4e-1d2a-4b5c-8d9e-0f1a2b3c5702.jpg","name":"plan.jpg"}]'::jsonb,
  array['climaticien']) $$, 'création bis');
select is(public.artisan_import_plan_notes((select id from public.tenders where name = 'Maison 157 bis'),
  '[]'::jsonb, array['climaticien']), 0, 'aucun ouvrage');
select is((select plan_trades from public.tenders where name = 'Maison 157 bis'),
  array['climaticien'], 'au moins un lot reste coché');

select * from finish();
rollback;
