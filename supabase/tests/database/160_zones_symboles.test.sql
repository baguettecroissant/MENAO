-- Zones agrandies des plans (F-159, lot 7, PR A2, ADR 0338) : gardées avec le plan, vérifiées,
-- rendues à la suppression. Données fictives (identifiants e160…).
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

insert into auth.users (id, email, is_anonymous, email_confirmed_at, raw_app_meta_data, raw_user_meta_data) values
  ('e1600000-0000-4000-8000-000000000001', 'zones160.entreprise@example.test', false, now(), '{"role":"artisan"}', '{}');
insert into public.artisans (id, user_id, status, raison_sociale, zone_mode, assujetti_tva) values
  ('e1601000-0000-4000-8000-000000000001', 'e1600000-0000-4000-8000-000000000001', 'valide', 'ZONES 160', 'communes', true);
insert into public.subscriptions (artisan_id, plan_code, stripe_customer_id, stripe_subscription_id, status) values
  ('e1601000-0000-4000-8000-000000000001', 'entreprise', 'cus_e160a', 'sub_e160a', 'active');

set local role authenticated;
select set_config('request.jwt.claims', jsonb_build_object(
  'sub', 'e1600000-0000-4000-8000-000000000001', 'role', 'authenticated', 'aal', 'aal1',
  'app_metadata', jsonb_build_object('role', 'artisan'))::text, true);

select lives_ok($$ select public.artisan_create_plan_tender('Maison 160', jsonb_build_array(jsonb_build_object(
  'path', 'e1601000-0000-4000-8000-000000000001/0b6f3c4e-1d2a-4b5c-8d9e-0f1a2b3c6001.jpg',
  'name', 'electricite.jpg',
  'symbolZones', jsonb_build_array(
    jsonb_build_object('path', 'e1601000-0000-4000-8000-000000000001/0b6f3c4e-1d2a-4b5c-8d9e-0f1a2b3c6002.jpg',
      'page', 1, 'x', 0, 'y', 0, 'w', 1100, 'h', 825),
    jsonb_build_object('path', 'e1601000-0000-4000-8000-000000000001/0b6f3c4e-1d2a-4b5c-8d9e-0f1a2b3c6003.jpg',
      'page', 1, 'x', 900, 'y', 675, 'w', 1100, 'h', 825)))),
  array['electricien']) $$, 'création avec zones');
select is((select plan_files -> 0 -> 'symbolZones' -> 1 from public.tenders where name = 'Maison 160'),
  '{"path":"e1601000-0000-4000-8000-000000000001/0b6f3c4e-1d2a-4b5c-8d9e-0f1a2b3c6003.jpg","page":1,"x":900,"y":675,"w":1100,"h":825}'::jsonb,
  'zone gardée avec son rectangle');

select throws_ok($$ select public.artisan_create_plan_tender('Intrus 160', jsonb_build_array(jsonb_build_object(
  'path', 'e1601000-0000-4000-8000-000000000001/0b6f3c4e-1d2a-4b5c-8d9e-0f1a2b3c6004.jpg',
  'name', 'plan.jpg',
  'symbolZones', jsonb_build_array(jsonb_build_object(
    'path', 'e1609999-0000-4000-8000-000000000001/0b6f3c4e-1d2a-4b5c-8d9e-0f1a2b3c6005.jpg',
    'page', 1, 'x', 0, 'y', 0, 'w', 10, 'h', 10)))),
  array['electricien']) $$, '22023', null, 'zone hors du dossier de l''entreprise refusée');
select throws_ok($$ select public.artisan_create_plan_tender('Doublon 160', jsonb_build_array(jsonb_build_object(
  'path', 'e1601000-0000-4000-8000-000000000001/0b6f3c4e-1d2a-4b5c-8d9e-0f1a2b3c6006.jpg',
  'name', 'plan.jpg',
  'symbolZones', jsonb_build_array(jsonb_build_object(
    'path', 'e1601000-0000-4000-8000-000000000001/0b6f3c4e-1d2a-4b5c-8d9e-0f1a2b3c6006.jpg',
    'page', 1, 'x', 0, 'y', 0, 'w', 10, 'h', 10)))),
  array['electricien']) $$, '22023', null, 'un même fichier ne sert qu''une fois');

select is(public.artisan_delete_tender((select id from public.tenders where name = 'Maison 160')),
  array['e1601000-0000-4000-8000-000000000001/0b6f3c4e-1d2a-4b5c-8d9e-0f1a2b3c6001.jpg',
    'e1601000-0000-4000-8000-000000000001/0b6f3c4e-1d2a-4b5c-8d9e-0f1a2b3c6002.jpg',
    'e1601000-0000-4000-8000-000000000001/0b6f3c4e-1d2a-4b5c-8d9e-0f1a2b3c6003.jpg'],
  'suppression : les zones sont rendues avec le plan');

select * from finish();
rollback;
