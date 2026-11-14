-- Lecture haute définition des photos de plans (F-159, ADR 0325) : zones rattachées à une photo,
-- chemins vérifiés (dossier de l'entreprise, JPEG, sans doublon), ignorées pour un PDF, rendues à
-- la suppression. Données fictives (identifiants e150…).
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

insert into auth.users (id, email, is_anonymous, email_confirmed_at, raw_app_meta_data, raw_user_meta_data) values
  ('e1500000-0000-4000-8000-000000000001', 'zones150.entreprise@example.test', false, now(), '{"role":"artisan"}', '{}');
insert into public.artisans (id, user_id, status, raison_sociale, zone_mode, assujetti_tva) values
  ('e1501000-0000-4000-8000-000000000001', 'e1500000-0000-4000-8000-000000000001', 'valide', 'ZONES 150', 'communes', true);
insert into public.subscriptions (artisan_id, plan_code, stripe_customer_id, stripe_subscription_id, status) values
  ('e1501000-0000-4000-8000-000000000001', 'entreprise', 'cus_e150a', 'sub_e150a', 'active');

create function pg_temp.connecter(uid uuid) returns void language sql as $$
  select set_config('request.jwt.claims', jsonb_build_object(
    'sub', uid, 'role', 'authenticated', 'aal', 'aal1', 'app_metadata', jsonb_build_object('role', 'artisan')
  )::text, true);
$$;
create function pg_temp.chemin(n text, ext text default 'jpg') returns text language sql as $$
  select 'e1501000-0000-4000-8000-000000000001/0b6f3c4e-1d2a-4b5c-8d9e-0f1a2b3c50' || n || '.' || ext
$$;
create function pg_temp.zone(n text, col integer, ligne integer) returns jsonb language sql as $$
  select jsonb_build_object('path', pg_temp.chemin(n), 'col', col, 'row', ligne, 'cols', 2, 'rows', 1)
$$;

select ok(not has_function_privilege('anon', 'app.plan_tiles(jsonb, uuid)', 'execute'), 'aide fermée aux visiteurs');

set local role authenticated;
select pg_temp.connecter('e1500000-0000-4000-8000-000000000001');

select lives_ok($$ select public.artisan_create_plan_tender('Maison 150', jsonb_build_array(
  jsonb_build_object('path', pg_temp.chemin('01'), 'name', 'rdc.jpg',
    'tiles', jsonb_build_array(pg_temp.zone('02', 1, 1), pg_temp.zone('03', 2, 1))),
  jsonb_build_object('path', pg_temp.chemin('04', 'pdf'), 'name', 'coupes.pdf',
    'tiles', jsonb_build_array(pg_temp.zone('05', 1, 1))),
  jsonb_build_object('path', pg_temp.chemin('06'), 'name', 'etage.jpg')
), array['carreleur']) $$, 'création avec des zones');
select is((select jsonb_array_length(plan_files -> 0 -> 'tiles') from public.tenders where name = 'Maison 150'), 2,
  'photo : deux zones gardées');
select is((select plan_files -> 0 -> 'tiles' -> 1 from public.tenders where name = 'Maison 150'),
  jsonb_build_object('path', pg_temp.chemin('03'), 'col', 2, 'row', 1, 'cols', 2, 'rows', 1),
  'zone remise en forme');
select is((select plan_files -> 1 -> 'tiles' from public.tenders where name = 'Maison 150'), '[]'::jsonb,
  'PDF : zones ignorées');
select is((select plan_files -> 2 -> 'tiles' from public.tenders where name = 'Maison 150'), '[]'::jsonb,
  'photo sans zones : liste vide');

select throws_ok($$ select public.artisan_create_plan_tender('Intrus', jsonb_build_array(
  jsonb_build_object('path', pg_temp.chemin('11'), 'tiles', jsonb_build_array(jsonb_build_object(
    'path', 'e1501000-0000-4000-8000-000000000009/0b6f3c4e-1d2a-4b5c-8d9e-0f1a2b3c5012.jpg',
    'col', 1, 'row', 1, 'cols', 2, 'rows', 1)))), array['carreleur']) $$,
  '22023', 'Fichier invalide.', 'zone dans le dossier d''une autre entreprise : refusée');
select throws_ok($$ select public.artisan_create_plan_tender('Doublon', jsonb_build_array(
  jsonb_build_object('path', pg_temp.chemin('21'), 'tiles', jsonb_build_array(pg_temp.zone('21', 1, 1)))),
  array['carreleur']) $$, '22023', 'Fichier invalide.', 'zone qui reprend le fichier du plan : refusée');
select throws_ok($$ select public.artisan_create_plan_tender('Grille', jsonb_build_array(
  jsonb_build_object('path', pg_temp.chemin('31'), 'tiles', jsonb_build_array(jsonb_build_object(
    'path', pg_temp.chemin('32'), 'col', 9, 'row', 1, 'cols', 2, 'rows', 1)))), array['carreleur']) $$,
  '22023', 'Fichier invalide.', 'grille invraisemblable : refusée');
select throws_ok($$ select public.artisan_create_plan_tender('Trop', jsonb_build_array(
  jsonb_build_object('path', pg_temp.chemin('41'), 'tiles', (
    select jsonb_agg(pg_temp.zone((50 + i)::text, 1, 1)) from generate_series(1, 7) i))),
  array['carreleur']) $$, '22023', 'Fichier invalide.', 'plus de six zones : refusé');

select is(public.artisan_delete_tender((select id from public.tenders where name = 'Maison 150')),
  array[pg_temp.chemin('01'), pg_temp.chemin('02'), pg_temp.chemin('03'), pg_temp.chemin('04', 'pdf'), pg_temp.chemin('06')],
  'suppression : plans et zones rendus');

select * from finish();
rollback;
