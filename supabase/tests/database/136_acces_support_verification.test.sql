-- Accès de l'équipe par rôle (F-135, ADR 0286) : le support consulte les listes et fiches sans rien
-- modifier ; le rôle « Vérification » lit les artisans et décide des dossiers, sans voir les
-- demandes, les chantiers, les particuliers ni le journal ; double authentification exigée.
-- Données fictives (adresses acces136.*).
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

insert into auth.users (id, email, is_anonymous, email_confirmed_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data) values
  ('e1360000-0000-4000-8000-000000000001', 'acces136.admin@example.test', false, now(), now(), '{"role":"admin"}', '{}'),
  ('e1360000-0000-4000-8000-000000000002', 'acces136.support@example.test', false, now(), now(), '{"role":"support"}', '{}'),
  ('e1360000-0000-4000-8000-000000000003', 'acces136.verif@example.test', false, now(), now(), '{"role":"verification"}', '{}'),
  ('e1360000-0000-4000-8000-000000000004', 'acces136.client@example.test', false, now(), now(), '{"role":"particulier"}', '{}'),
  ('e1360000-0000-4000-8000-000000000005', 'acces136.artisan@example.test', false, now(), now(), '{"role":"artisan"}', '{}'),
  ('e1360000-0000-4000-8000-000000000006', 'acces136.artisan2@example.test', false, now(), now(), '{"role":"artisan"}', '{}');

insert into public.artisans (id, user_id, status, zone_mode, base_location, radius_km, nom_commercial) values
  ('e1361000-0000-4000-8000-000000000001', 'e1360000-0000-4000-8000-000000000005', 'valide', 'rayon',
   extensions.st_setsrid(extensions.st_makepoint(7.26, 43.70), 4326)::extensions.geography, 20,
   'Plomberie Fictive 136'),
  ('e1361000-0000-4000-8000-000000000002', 'e1360000-0000-4000-8000-000000000006', 'brouillon', 'rayon',
   extensions.st_setsrid(extensions.st_makepoint(7.26, 43.70), 4326)::extensions.geography, 20,
   'Peinture Fictive 136');
-- Renouvellement d'assurance en attente de vérification.
insert into public.artisan_documents (artisan_id, type, storage_path, mime_type, size_bytes, date_fin)
values ('e1361000-0000-4000-8000-000000000001', 'decennale', 'e1361000/dec136.pdf', 'application/pdf', 100, current_date + 400);
insert into public.projects (id, user_id, description, status, trade_code, ville_code_insee, ville_nom, ville_location) values
  ('e1362000-0000-4000-8000-000000000001', 'e1360000-0000-4000-8000-000000000004', 'Fuite fictive 136',
   'criteres_valides', 'plombier', '98001', 'Villefictive',
   extensions.st_setsrid(extensions.st_makepoint(7.10, 43.60), 4326)::extensions.geography);

create function pg_temp.connecter(uid uuid, app_role text, aal text default 'aal2') returns void language sql as $$
  select set_config('request.jwt.claims', jsonb_build_object(
    'sub', uid, 'role', 'authenticated', 'aal', aal, 'app_metadata', jsonb_build_object('role', app_role)
  )::text, true);
$$;

select has_function('app', 'is_verifier', 'aide app.is_verifier');
select ok('verification' = any (enum_range(null::public.app_role)::text[]), 'rôle « verification »');

-- ---------- Alerte « dossier à vérifier » : admins et rôle Vérification, pas le support ----------
update public.artisans set status = 'en_verification', submitted_at = now()
where id = 'e1361000-0000-4000-8000-000000000002';
select is(
  (select count(*)::int from public.notifications
   where type = 'equipe_dossier_a_verifier' and data ->> 'artisan_id' = 'e1361000-0000-4000-8000-000000000002'
     and user_id in ('e1360000-0000-4000-8000-000000000001', 'e1360000-0000-4000-8000-000000000003')),
  2, 'dossier à vérifier : admin et vérification prévenus');
select is_empty(
  $$ select 1 from public.notifications
     where type = 'equipe_dossier_a_verifier' and user_id = 'e1360000-0000-4000-8000-000000000002' $$,
  'dossier à vérifier : pas le support');

set local role authenticated;

-- ---------- Vérification sans double authentification : rien ----------
select pg_temp.connecter('e1360000-0000-4000-8000-000000000003', 'verification', 'aal1');
select is_empty($$ select 1 from public.artisans where nom_commercial like '%Fictive 136' $$,
  'vérification sans double authentification : aucun artisan');
select throws_ok(
  $$ select public.admin_review_document((select id from public.artisan_documents where storage_path = 'e1361000/dec136.pdf'), 'valide') $$,
  '42501', null, 'vérification sans double authentification : décision refusée');

-- ---------- Vérification en double authentification ----------
select pg_temp.connecter('e1360000-0000-4000-8000-000000000003', 'verification');
select is((select count(*)::int from public.artisans where nom_commercial like '%Fictive 136'), 2,
  'vérification : lit les artisans');
select is((select count(*)::int from public.artisan_documents where storage_path = 'e1361000/dec136.pdf'), 1,
  'vérification : lit les documents');
select is((select count(*)::int from public.profiles where user_id = 'e1360000-0000-4000-8000-000000000005'), 1,
  'vérification : lit le profil du dirigeant');
select is((select count(*)::int from public.profiles where user_id = 'e1360000-0000-4000-8000-000000000001'), 1,
  'vérification : lit le profil d''un membre de l''équipe (auteur des décisions)');
select is_empty($$ select 1 from public.profiles where user_id = 'e1360000-0000-4000-8000-000000000004' $$,
  'vérification : pas le profil d''un particulier');
select is_empty($$ select 1 from public.projects where id = 'e1362000-0000-4000-8000-000000000001' $$,
  'vérification : pas les demandes');
select throws_ok('select * from public.admin_projects()', '42501', null, 'vérification : liste des demandes refusée');
select throws_ok('select * from public.admin_people()', '42501', null, 'vérification : liste des comptes refusée');
select results_eq(
  $$ select distinct kind from public.admin_search('Fictive 136') $$,
  $$ values ('artisan'::text) $$,
  'vérification : la recherche ne rend que des artisans');
select is_empty($$ select 1 from public.admin_search('acces136') $$,
  'vérification : la recherche ne trouve pas les personnes');
select lives_ok(
  $$ select public.admin_review_document((select id from public.artisan_documents where storage_path = 'e1361000/dec136.pdf'), 'valide') $$,
  'vérification : valide un renouvellement');
select lives_ok(
  $$ select public.admin_decide_artisan('e1361000-0000-4000-8000-000000000002', 'complement', 'Kbis illisible (fictif).') $$,
  'vérification : décide d''un dossier');
select throws_ok(
  $$ select public.admin_suspend_artisan('e1361000-0000-4000-8000-000000000001', 'Motif fictif') $$,
  '42501', null, 'vérification : retirer des recherches reste aux admins');
select throws_ok('select * from public.admin_staff_members()', '42501', null, 'vérification : équipe refusée');
select is_empty($$ select 1 from public.audit_logs $$, 'vérification : pas le journal d''audit');

-- ---------- Support : consultation sans action ----------
select pg_temp.connecter('e1360000-0000-4000-8000-000000000002', 'support');
select is(
  (select count(*)::int from public.admin_projects() where project_id = 'e1362000-0000-4000-8000-000000000001'),
  1, 'support : liste des demandes');
select lives_ok('select * from public.admin_project_counts()', 'support : compteurs des demandes');
select lives_ok('select * from public.admin_chantiers()', 'support : liste des chantiers');
select ok(
  exists (select 1 from public.admin_people() where user_id = 'e1360000-0000-4000-8000-000000000004'),
  'support : liste des comptes');
select ok(
  public.admin_user_account('e1360000-0000-4000-8000-000000000004') ->> 'email' = 'acces136.client@example.test',
  'support : compte d''une personne');
select ok(
  exists (select 1 from public.admin_search('acces136') where kind = 'personne'),
  'support : recherche sur les personnes');
select lives_ok($$ select public.admin_artisan_activity('e1361000-0000-4000-8000-000000000001') $$,
  'support : activité d''un artisan');
select lives_ok($$ select public.admin_artisan_menao_score('e1361000-0000-4000-8000-000000000001') $$,
  'support : score MENAO');
select is_empty($$ select 1 from public.artisan_documents where artisan_id = 'e1361000-0000-4000-8000-000000000001' $$,
  'support : pas les documents des artisans');
select throws_ok(
  $$ select public.admin_decide_artisan('e1361000-0000-4000-8000-000000000002', 'valide', null) $$,
  '42501', null, 'support : pas de décision');
select throws_ok(
  $$ select public.admin_verify_certification(gen_random_uuid(), true) $$,
  '42501', null, 'support : pas de vérification de certification');
select throws_ok('select public.admin_draw_spot_checks()', '42501', null, 'support : pas de tirage des contrôles');

-- ---------- Admin : trois accès dans l'équipe ----------
select pg_temp.connecter('e1360000-0000-4000-8000-000000000001', 'admin');
select is(
  (select role::text from public.admin_staff_members() where user_id = 'e1360000-0000-4000-8000-000000000003'),
  'verification', 'équipe : membre « Vérification » listé');
select lives_ok(
  $$ select public.admin_set_staff_role('e1360000-0000-4000-8000-000000000002', 'verification') $$,
  'support passé en Vérification');
select ok(
  exists (select 1 from public.admin_people('equipe') where user_id = 'e1360000-0000-4000-8000-000000000003'),
  'filtre « Équipe » des comptes : rôle Vérification compris');
reset role;
select is((select raw_app_meta_data ->> 'role' from auth.users where id = 'e1360000-0000-4000-8000-000000000002'),
  'verification', 'rôle posé dans app_metadata');

select * from finish();
rollback;
