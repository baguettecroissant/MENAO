-- Portes et appareils comptés sur les plans (F-159, lot 7, ADR 0339) : ils remplissent les comptes
-- vides du relevé sans remplacer un compte lu. Données fictives (identifiants e161…).
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

insert into auth.users (id, email, is_anonymous, email_confirmed_at, raw_app_meta_data, raw_user_meta_data) values
  ('e1610000-0000-4000-8000-000000000001', 'appareils161.entreprise@example.test', false, now(), '{"role":"artisan"}', '{}');
insert into public.artisans (id, user_id, status, raison_sociale, zone_mode, assujetti_tva) values
  ('e1611000-0000-4000-8000-000000000001', 'e1610000-0000-4000-8000-000000000001', 'valide', 'APPAREILS 161', 'communes', true);
insert into public.subscriptions (artisan_id, plan_code, stripe_customer_id, stripe_subscription_id, status) values
  ('e1611000-0000-4000-8000-000000000001', 'entreprise', 'cus_e161a', 'sub_e161a', 'active');

create function pg_temp.ao() returns uuid language sql as
  $$ select id from public.tenders where name = 'Maison 161' $$;

set local role authenticated;
select set_config('request.jwt.claims', jsonb_build_object(
  'sub', 'e1610000-0000-4000-8000-000000000001', 'role', 'authenticated', 'aal', 'aal1',
  'app_metadata', jsonb_build_object('role', 'artisan'))::text, true);

select lives_ok($$ select public.artisan_create_plan_tender('Maison 161',
  '[{"path":"e1611000-0000-4000-8000-000000000001/0b6f3c4e-1d2a-4b5c-8d9e-0f1a2b3c6101.jpg","name":"cloisons.jpg"}]'::jsonb,
  array['menuisier']) $$, 'création');
select is(public.artisan_import_plan_reading(pg_temp.ao(),
  '[{"name":"Salon","areaCm2":171000,"source":"plan"}]'::jsonb,
  '{"portes":null,"fenetres":11,"wc":null}'::jsonb), 1, 'relevé : fenêtres lues, portes et WC vides');

select is(public.artisan_import_plan_symbols(pg_temp.ao(), '[]'::jsonb, '[]'::jsonb,
  '{"portes":7,"fenetres":8,"wc":1,"douches":1,"baignoires":0,"licornes":3}'::jsonb), 0, 'comptes envoyés');
select is((select plan_counts from public.tenders where id = pg_temp.ao()),
  '{"portes":7,"fenetres":11,"wc":1,"lavabos":null,"douches":1,"baignoires":null,"eviers":null,"escaliers":null}'::jsonb,
  'cases vides remplies, compte lu gardé, zéro et clé inconnue ignorés');

select * from finish();
rollback;
