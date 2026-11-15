-- Revêtements lus sur le plan (F-159, lot 6, PR B, ADR 0331) : notes gardées avec la pièce,
-- revêtements pré-remplis, sols existants conservés. Données fictives (identifiants e156…).
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

insert into auth.users (id, email, is_anonymous, email_confirmed_at, raw_app_meta_data, raw_user_meta_data) values
  ('e1560000-0000-4000-8000-000000000001', 'sols156.entreprise@example.test', false, now(), '{"role":"artisan"}', '{}'),
  ('e1560000-0000-4000-8000-000000000002', 'sols156.autre@example.test', false, now(), '{"role":"artisan"}', '{}');
insert into public.artisans (id, user_id, status, raison_sociale, zone_mode, assujetti_tva) values
  ('e1561000-0000-4000-8000-000000000001', 'e1560000-0000-4000-8000-000000000001', 'valide', 'SOLS 156', 'communes', true),
  ('e1561000-0000-4000-8000-000000000002', 'e1560000-0000-4000-8000-000000000002', 'valide', 'AUTRE 156', 'communes', true);
insert into public.subscriptions (artisan_id, plan_code, stripe_customer_id, stripe_subscription_id, status) values
  ('e1561000-0000-4000-8000-000000000001', 'entreprise', 'cus_e156a', 'sub_e156a', 'active'),
  ('e1561000-0000-4000-8000-000000000002', 'entreprise', 'cus_e156b', 'sub_e156b', 'active');

create function pg_temp.ao() returns uuid language sql as
  $$ select id from public.tenders where name = 'Maison 156' $$;

set local role authenticated;
select set_config('request.jwt.claims', jsonb_build_object(
  'sub', 'e1560000-0000-4000-8000-000000000001', 'role', 'authenticated', 'aal', 'aal1',
  'app_metadata', jsonb_build_object('role', 'artisan'))::text, true);

select lives_ok($$ select public.artisan_create_plan_tender('Maison 156',
  '[{"path":"e1561000-0000-4000-8000-000000000001/0b6f3c4e-1d2a-4b5c-8d9e-0f1a2b3c5601.jpg","name":"sols.jpg"}]'::jsonb,
  array['carreleur']) $$, 'création');
select is(public.artisan_import_plan_reading(pg_temp.ao(),
  '[{"name":"Salon","areaCm2":171000,"source":"plan"},
    {"name":"WC","areaCm2":14800,"source":"plan"},
    {"name":"Dégagement","source":"plan"}]'::jsonb, '{}'::jsonb), 3, 'relevé : 3 pièces');

select is(public.artisan_import_plan_finishes(pg_temp.ao(),
  '[{"position":1,"floorNote":"parquet existant à poncer et huiler","floor":"parquet_poncer"},
    {"position":2,"floorNote":"tomette existante à nettoyer","wallsNote":"faïence ht 120 cm","floor":"existant_nettoyer","walls":"faience","tileHeightMm":1200},
    {"position":9,"floorNote":"pièce absente","floor":"carrelage"}]'::jsonb),
  2, 'notes et revêtements lus posés sur les pièces du relevé');
select results_eq(
  $$ select name, floor, walls, tile_height_mm, floor_note, walls_note from public.tender_rooms
     where tender_id = pg_temp.ao() order by position $$,
  $$ values ('Salon'::text, 'parquet_poncer'::text, null::text, null::integer,
         'parquet existant à poncer et huiler'::text, null::text),
       ('WC', 'existant_nettoyer', 'faience', 1200, 'tomette existante à nettoyer', 'faïence ht 120 cm'),
       ('Dégagement', null, null, null, null, null) $$,
  'revêtements lus, note gardée, pièce sans note intacte');
select throws_ok($$ select public.artisan_import_plan_finishes(pg_temp.ao(),
  '[{"position":1,"floor":"moquette"}]'::jsonb) $$, '22023', null, 'sol inconnu refusé');
select throws_ok($$ select public.artisan_import_plan_finishes(pg_temp.ao(),
  '[{"position":1,"walls":"faience","tileHeightMm":50}]'::jsonb) $$, '22023', null,
  'hauteur de faïence hors bornes refusée');

-- L'artisan choisit : un sol existant conservé est accepté.
select lives_ok($$ select public.artisan_save_plan_finishes(pg_temp.ao(), (
  select jsonb_agg(jsonb_build_object('id', id, 'floor', 'existant_nettoyer', 'walls', 'peinture',
    'ceiling', 'peinture'))
  from public.tender_rooms where tender_id = pg_temp.ao() and name = 'Dégagement')) $$,
  'revêtements choisis');
-- Le relevé corrigé garde les notes.
select lives_ok($$ select public.artisan_save_plan_rooms(pg_temp.ao(), (
  select jsonb_agg(jsonb_build_object('id', id, 'name', name,
    'areaCm2', case when name = 'Salon' then 180000 else area_cm2 end) order by position)
  from public.tender_rooms where tender_id = pg_temp.ao()), '{}'::jsonb) $$, 'relevé corrigé');
select results_eq(
  $$ select name, floor, floor_note from public.tender_rooms
     where tender_id = pg_temp.ao() order by position $$,
  $$ values ('Salon'::text, 'parquet_poncer'::text, 'parquet existant à poncer et huiler'::text),
       ('WC', 'existant_nettoyer', 'tomette existante à nettoyer'),
       ('Dégagement', 'existant_nettoyer', null) $$,
  'notes et revêtements gardés après correction du relevé');

-- Une autre entreprise ne peut rien poser sur ces pièces.
select set_config('request.jwt.claims', jsonb_build_object(
  'sub', 'e1560000-0000-4000-8000-000000000002', 'role', 'authenticated', 'aal', 'aal1',
  'app_metadata', jsonb_build_object('role', 'artisan'))::text, true);
select throws_ok($$ select public.artisan_import_plan_finishes(
  (select id from public.tenders where name = 'Maison 156'), '[]'::jsonb) $$, '22023', null,
  'revêtements refusés à une autre entreprise');

select * from finish();
rollback;
