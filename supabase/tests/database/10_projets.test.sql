-- F-05 à F-07 : projets (session anonyme acceptée), critères, photos, journal IA.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

insert into auth.users (id, email, is_anonymous, raw_app_meta_data, raw_user_meta_data) values
  ('e1e1e1e1-0000-4000-8000-000000000001', null, true, '{}', '{}'),
  ('e2e2e2e2-0000-4000-8000-000000000002', 'projet.b@example.test', false, '{}', '{}'),
  ('e3e3e3e3-0000-4000-8000-000000000003', 'projet.adm@example.test', false, '{"role":"admin"}', '{}');

create function pg_temp.connecter(uid uuid, app_role text, aal text default 'aal1') returns void language sql as $$
  select set_config('request.jwt.claims', jsonb_build_object(
    'sub', uid, 'role', 'authenticated', 'aal', aal, 'app_metadata', jsonb_build_object('role', app_role)
  )::text, true);
$$;

select is(
  (select role::text from public.profiles where user_id = 'e1e1e1e1-0000-4000-8000-000000000001'),
  'particulier', 'une session anonyme reçoit un profil particulier');

-- Projets créés par l'Edge Function (service_role), écrits ici hors RLS.
insert into public.projects (id, user_id, description, trade_code) values
  ('f1f1f1f1-0000-4000-8000-000000000001', 'e1e1e1e1-0000-4000-8000-000000000001', 'Fuite sous l''évier', 'plombier'),
  ('f2f2f2f2-0000-4000-8000-000000000002', 'e2e2e2e2-0000-4000-8000-000000000002', 'Peinture du salon', 'peintre');
insert into public.project_photos (project_id, storage_path) values
  ('f1f1f1f1-0000-4000-8000-000000000001', 'f1f1f1f1-0000-4000-8000-000000000001/a.jpg'),
  ('f2f2f2f2-0000-4000-8000-000000000002', 'f2f2f2f2-0000-4000-8000-000000000002/b.jpg');
insert into storage.objects (bucket_id, name) values
  ('project-photos', 'f1f1f1f1-0000-4000-8000-000000000001/a.jpg'),
  ('project-photos', 'f2f2f2f2-0000-4000-8000-000000000002/b.jpg');
insert into public.ai_runs (project_id, function_name, model, outcome, latency_ms) values
  ('f1f1f1f1-0000-4000-8000-000000000001', 'analyze-need', 'modele-test', 'ok', 1200);

select results_eq(
  $$ select id, public from storage.buckets where id = 'project-photos' $$,
  $$ values ('project-photos'::text, false) $$,
  'photos de projet : espace privé');

-- ---------- Visiteur anonyme (propriétaire du projet F1) ----------
select pg_temp.connecter('e1e1e1e1-0000-4000-8000-000000000001', 'particulier');
set local role authenticated;

select ok((select count(*) from public.rooms) >= 20, 'référentiel des pièces lisible');
select results_eq($$ select id from public.projects $$,
  $$ values ('f1f1f1f1-0000-4000-8000-000000000001'::uuid) $$, 'ne voit que son projet');
select is((select count(*)::int from public.project_photos), 1, 'ne voit que ses photos');
select is((select count(*)::int from storage.objects where bucket_id = 'project-photos'), 1,
  'ne lit que les fichiers de son projet');
select is((select count(*)::int from public.ai_runs), 0, 'journal IA invisible');

select throws_ok(
  $$ insert into public.projects (user_id, description) values (auth.uid(), 'x') $$,
  '42501', null, 'création directe refusée (Edge Function uniquement)');
update public.projects set trade_code = 'macon' where id = 'f1f1f1f1-0000-4000-8000-000000000001';
select is((select trade_code from public.projects where id = 'f1f1f1f1-0000-4000-8000-000000000001'),
  'plombier', 'modification directe sans effet');
select throws_ok(
  $$ insert into storage.objects (bucket_id, name) values ('project-photos', 'f1f1f1f1-0000-4000-8000-000000000001/c.jpg') $$,
  '42501', null, 'écriture directe dans les photos de projet refusée');

select lives_ok(
  $$ select public.save_project_criteria('f1f1f1f1-0000-4000-8000-000000000001', 'plombier', 'appartement',
       array['cuisine', 'cuisine'], array['recherche-fuite'], 'moins_10', '06088', 'Nice', '06000',
       '1 Rue de l''Exemple 06000 Nice', 7.26, 43.70, 'date', current_date + 7) $$,
  'enregistrement de critères valides');
select results_eq(
  $$ select room_codes, work_type_codes, ville_nom, date_mode::text, location is not null
     from public.projects where id = 'f1f1f1f1-0000-4000-8000-000000000001' $$,
  $$ values (array['cuisine'], array['recherche-fuite'], 'Nice'::text, 'date'::text, true) $$,
  'critères enregistrés, pièces dédoublonnées, adresse géocodée');

select lives_ok(
  $$ select public.save_project_criteria('f1f1f1f1-0000-4000-8000-000000000001', 'plombier', 'appartement',
       array['cuisine'], array['recherche-fuite'], 'moins_10', '06088', 'Nice', '06000',
       '1 Rue de l''Exemple 06000 Nice', null, null, 'date', current_date + 7) $$,
  'adresse inchangée : enregistrement sans nouvelles coordonnées');
select ok((select location is not null from public.projects where id = 'f1f1f1f1-0000-4000-8000-000000000001'),
  'coordonnées de l''adresse conservées');

select throws_ok(
  $$ select public.save_project_criteria('f1f1f1f1-0000-4000-8000-000000000001', 'astronaute', null,
       null, null, null, null, null, null, null, null, null, 'inconnue', null) $$,
  '22023', 'Métier inconnu', 'métier hors référentiel refusé');
select throws_ok(
  $$ select public.save_project_criteria('f1f1f1f1-0000-4000-8000-000000000001', 'plombier', null,
       null, array['carrelage-sol'], null, null, null, null, null, null, null, 'inconnue', null) $$,
  '22023', 'Travaux incompatibles avec le métier', 'travaux d''un autre métier refusés');
select throws_ok(
  $$ select public.save_project_criteria('f1f1f1f1-0000-4000-8000-000000000001', 'plombier', null,
       array['donjon'], null, null, null, null, null, null, null, null, 'inconnue', null) $$,
  '22023', 'Pièce inconnue', 'pièce hors référentiel refusée');
select throws_ok(
  $$ select public.save_project_criteria('f1f1f1f1-0000-4000-8000-000000000001', 'plombier', null,
       null, null, null, null, null, null, null, null, null, 'date', current_date - 1) $$,
  '22023', 'La date de début ne peut pas être passée', 'date passée refusée');
select throws_ok(
  $$ select public.save_project_criteria('f1f1f1f1-0000-4000-8000-000000000001', 'plombier', null,
       null, null, null, '06088', 'Nice', '06000', '1 Rue de l''Exemple', null, null, 'inconnue', null) $$,
  '22023', 'Adresse non géocodée', 'adresse sans coordonnées refusée');
select throws_ok(
  $$ select public.save_project_criteria('f2f2f2f2-0000-4000-8000-000000000002', 'peintre', null,
       null, null, null, null, null, null, null, null, null, 'inconnue', null) $$,
  '42501', null, 'projet d''un autre utilisateur non modifiable');

select lives_ok($$ select public.validate_project_criteria('f1f1f1f1-0000-4000-8000-000000000001') $$,
  'validation avec métier et ville');
select is((select status::text from public.projects where id = 'f1f1f1f1-0000-4000-8000-000000000001'),
  'criteres_valides', 'projet prêt pour la recherche');
select lives_ok(
  $$ select public.save_project_criteria('f1f1f1f1-0000-4000-8000-000000000001', 'plombier', null,
       null, null, null, null, null, null, null, null, null, 'des_que_possible', null) $$,
  'critères encore modifiables');
select is((select status::text from public.projects where id = 'f1f1f1f1-0000-4000-8000-000000000001'),
  'brouillon', 'une modification demande une nouvelle validation');
select throws_ok($$ select public.validate_project_criteria('f1f1f1f1-0000-4000-8000-000000000001') $$,
  '22023', 'Métier et ville obligatoires', 'ville obligatoire pour lancer la recherche');

select lives_ok(
  $$ delete from public.project_photos where project_id = 'f1f1f1f1-0000-4000-8000-000000000001' $$,
  'suppression de ses photos');
delete from public.project_photos where project_id = 'f2f2f2f2-0000-4000-8000-000000000002';
reset role;
select is((select count(*)::int from public.project_photos), 1, 'photos des autres intactes');

-- ---------- Admin (aal2) ----------
select pg_temp.connecter('e3e3e3e3-0000-4000-8000-000000000003', 'admin', 'aal2');
set local role authenticated;
select is((select count(*)::int from public.ai_runs), 1, 'journal IA lisible par un admin');
select is((select count(*)::int from public.projects), 2, 'projets lisibles par l''équipe');

-- ---------- Sans session ----------
reset role;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
set local role anon;
select ok((select count(*) from public.rooms) >= 20, 'pièces lisibles sans session');
select is((select count(*)::int from public.projects), 0, 'aucun projet visible sans session');
select throws_ok(
  $$ select public.validate_project_criteria('f1f1f1f1-0000-4000-8000-000000000001') $$,
  '42501', null, 'fonctions de projet réservées aux sessions');

select * from finish();
rollback;
