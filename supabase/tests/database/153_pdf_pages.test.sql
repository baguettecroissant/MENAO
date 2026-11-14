-- Pages de PDF rendues en images (F-159, lot 4, ADR 0328) : pages rattachées à un PDF, chemins
-- vérifiés, ignorées pour une photo, rendues à la suppression ; une mesure tracée garde sa page.
-- Données fictives (identifiants e153…).
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

insert into auth.users (id, email, is_anonymous, email_confirmed_at, raw_app_meta_data, raw_user_meta_data) values
  ('e1530000-0000-4000-8000-000000000001', 'pages153.entreprise@example.test', false, now(), '{"role":"artisan"}', '{}');
insert into public.artisans (id, user_id, status, raison_sociale, zone_mode, assujetti_tva) values
  ('e1531000-0000-4000-8000-000000000001', 'e1530000-0000-4000-8000-000000000001', 'valide', 'PAGES 153', 'communes', true);
insert into public.subscriptions (artisan_id, plan_code, stripe_customer_id, stripe_subscription_id, status) values
  ('e1531000-0000-4000-8000-000000000001', 'entreprise', 'cus_e153a', 'sub_e153a', 'active');

create function pg_temp.connecter(uid uuid) returns void language sql as $$
  select set_config('request.jwt.claims', jsonb_build_object(
    'sub', uid, 'role', 'authenticated', 'aal', 'aal1', 'app_metadata', jsonb_build_object('role', 'artisan')
  )::text, true);
$$;
create function pg_temp.chemin(n text, ext text default 'jpg') returns text language sql as $$
  select 'e1531000-0000-4000-8000-000000000001/0b6f3c4e-1d2a-4b5c-8d9e-0f1a2b3c53' || n || '.' || ext
$$;
create function pg_temp.pg(n text, page integer) returns jsonb language sql as $$
  select jsonb_build_object('path', pg_temp.chemin(n), 'page', page)
$$;
create function pg_temp.ao() returns uuid language sql as $$
  select id from public.tenders where name = 'Maison 153'
$$;

select ok(not has_function_privilege('anon', 'app.plan_pdf_pages(jsonb, uuid)', 'execute'), 'aide fermée aux visiteurs');

set local role authenticated;
select pg_temp.connecter('e1530000-0000-4000-8000-000000000001');

select lives_ok($$ select public.artisan_create_plan_tender('Maison 153', jsonb_build_array(
  jsonb_build_object('path', pg_temp.chemin('01', 'pdf'), 'name', 'plans.pdf',
    'pages', jsonb_build_array(pg_temp.pg('02', 1), pg_temp.pg('03', 2))),
  jsonb_build_object('path', pg_temp.chemin('04'), 'name', 'photo.jpg',
    'pages', jsonb_build_array(pg_temp.pg('05', 1)))
), array['carreleur']) $$, 'création avec des pages');
select is((select plan_files -> 0 -> 'pages' from public.tenders where id = pg_temp.ao()),
  jsonb_build_array(pg_temp.pg('02', 1), pg_temp.pg('03', 2)), 'PDF : pages gardées');
select is((select plan_files -> 1 -> 'pages' from public.tenders where id = pg_temp.ao()), '[]'::jsonb,
  'photo : pages ignorées');

select throws_ok($$ select public.artisan_create_plan_tender('Intrus', jsonb_build_array(
  jsonb_build_object('path', pg_temp.chemin('11', 'pdf'), 'pages', jsonb_build_array(jsonb_build_object(
    'path', 'e1531000-0000-4000-8000-000000000009/0b6f3c4e-1d2a-4b5c-8d9e-0f1a2b3c5312.jpg', 'page', 1)))),
  array['carreleur']) $$, '22023', 'Fichier invalide.', 'page dans le dossier d''une autre entreprise : refusée');
select throws_ok($$ select public.artisan_create_plan_tender('Doublon', jsonb_build_array(
  jsonb_build_object('path', pg_temp.chemin('21', 'pdf'),
    'pages', jsonb_build_array(pg_temp.pg('22', 1), pg_temp.pg('22', 2)))),
  array['carreleur']) $$, '22023', 'Fichier invalide.', 'même image pour deux pages : refusée');
select throws_ok($$ select public.artisan_create_plan_tender('Trop', jsonb_build_array(
  jsonb_build_object('path', pg_temp.chemin('31', 'pdf'), 'pages', (
    select jsonb_agg(pg_temp.pg((40 + i)::text, i)) from generate_series(1, 13) i))),
  array['carreleur']) $$, '22023', 'Fichier invalide.', 'plus de douze pages : refusé');

-- ---------- Mesure tracée sur la page 2 du PDF ----------
select is(public.artisan_add_plan_measures(pg_temp.ao(), '[
  {"kind":"surface","name":"Salon","file":1,"page":2,"points":"500,100 900,100 900,500 500,500","areaCm2":172400,"perimeterMm":16620},
  {"kind":"comptage","name":"Prises","file":1,"points":"10,10 20,20","quantityMilli":2000}]'::jsonb), 2, 'mesures ajoutées');
select is((select page::integer from public.tender_rooms where name = 'Salon'), 2, 'pièce : page gardée');
select is((select page::integer from public.tender_works where name = 'Prises'), 1, 'ouvrage : page 1 par défaut');
select is((select plan_marks -> 0 ->> 'page' from public.tenders where id = pg_temp.ao()), '2', 'tracé : page gardée');
select throws_ok($$ select public.artisan_add_plan_measures(pg_temp.ao(),
  '[{"kind":"comptage","name":"X","file":1,"page":0,"points":"1,1","quantityMilli":1000}]'::jsonb) $$,
  '22023', 'Mesures invalides.', 'page nulle refusée');

select is(public.artisan_delete_tender(pg_temp.ao()),
  array[pg_temp.chemin('01', 'pdf'), pg_temp.chemin('02'), pg_temp.chemin('03'), pg_temp.chemin('04')],
  'suppression : PDF, pages et photo rendus');

select * from finish();
rollback;
