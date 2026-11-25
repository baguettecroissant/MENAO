-- Codes d'essai de l'inscription artisan (F-192, ADR 0392).
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

create function pg_temp.connecter(uid uuid, app_role text, niveau text default 'aal1') returns void language sql as $$
  select set_config('request.jwt.claims', jsonb_build_object(
    'sub', uid, 'role', 'authenticated', 'aal', niveau, 'app_metadata', jsonb_build_object('role', app_role)
  )::text, true);
$$;

insert into auth.users (id, email, is_anonymous, email_confirmed_at, raw_app_meta_data, raw_user_meta_data) values
  ('c1820000-0000-4000-8000-000000000001', 'essai182.admin@example.test', false, now(), '{"role":"admin"}', '{}'),
  ('c1820000-0000-4000-8000-000000000002', 'essai182.artisan@example.test', false, now(), '{"role":"artisan"}', '{}'),
  ('c1820000-0000-4000-8000-000000000003', 'essai182.vrai@example.test', false, now(), '{"role":"artisan"}', '{}');

insert into public.artisans (id, user_id, status, siret, zone_mode) values
  ('c1830000-0000-4000-8000-000000000002', 'c1820000-0000-4000-8000-000000000002', 'brouillon', '00000018200006', 'communes'),
  ('c1830000-0000-4000-8000-000000000003', 'c1820000-0000-4000-8000-000000000003', 'brouillon', '00000018200014', 'communes');

-- ---------- Création des codes : admins en double authentification seulement ----------
select pg_temp.connecter('c1820000-0000-4000-8000-000000000002', 'artisan_en_attente');
set local role authenticated;
select throws_ok($$ select public.admin_create_test_code('essai-182', 7, 2) $$, '42501', null,
  'un artisan ne crée pas de code');
select is((select count(*)::int from public.test_codes), 0, 'un artisan ne lit pas les codes');
reset role;

select pg_temp.connecter('c1820000-0000-4000-8000-000000000001', 'admin', 'aal1');
set local role authenticated;
select throws_ok($$ select public.admin_create_test_code('essai-182', 7, 2) $$, '42501', null,
  'admin sans double authentification : refusé');
reset role;

select pg_temp.connecter('c1820000-0000-4000-8000-000000000001', 'admin', 'aal2');
set local role authenticated;
select lives_ok($$ select public.admin_create_test_code('Essai-182', 7, 1) $$, 'admin : code créé');
select is((select code from public.test_codes), 'essai-182', 'code enregistré en minuscules');
select throws_ok($$ select public.admin_create_test_code('essai-182', 7, 1) $$, '23505', null,
  'un code déjà pris est refusé');
select throws_ok($$ select public.admin_create_test_code('a', 7, 1) $$, '22023', null,
  'un code trop court est refusé');
reset role;

-- ---------- Inscription avec le code ----------
select app.apply_artisan_signup('c1830000-0000-4000-8000-000000000002', '{"partner_code": "essai-182"}');
select ok((select compte_essai and masque_public from public.artisans
  where id = 'c1830000-0000-4000-8000-000000000002'), 'compte d''essai, masqué des clients');
select ok((select siret like '999%' and app.is_valid_siret(siret) from public.artisans
  where id = 'c1830000-0000-4000-8000-000000000002'), 'SIRET d''essai à la place du SIRET saisi');
select is((select uses from public.test_codes where code = 'essai-182'), 1, 'utilisation comptée');

-- Code épuisé : l'inscription suivante est un compte normal.
select app.apply_artisan_signup('c1830000-0000-4000-8000-000000000003', '{"partner_code": "essai-182"}');
select ok(not (select compte_essai from public.artisans where id = 'c1830000-0000-4000-8000-000000000003'),
  'code épuisé : compte normal');
select ok(not exists (select 1 from app.launch_artisans() where artisan_id = 'c1830000-0000-4000-8000-000000000002'),
  'hors chiffres de lancement');

-- ---------- Remplissage : comptes d'essai seulement ----------
select pg_temp.connecter('c1820000-0000-4000-8000-000000000003', 'artisan_en_attente');
set local role authenticated;
select throws_ok($$ select public.fill_test_onboarding(array['profil']) $$, '42501', null,
  'un compte normal ne se remplit pas');
reset role;

select pg_temp.connecter('c1820000-0000-4000-8000-000000000002', 'artisan_en_attente');
set local role authenticated;
select throws_ok($$ select public.fill_test_onboarding(array['inconnue']) $$, '22023', null,
  'étape inconnue refusée');
select lives_ok($$ select public.fill_test_onboarding(
  array['entreprise', 'metiers', 'zone', 'charte', 'identite', 'profil', 'attestations']) $$,
  'toutes les étapes remplies');
reset role;
select is(app.onboarding_missing_steps('c1830000-0000-4000-8000-000000000002'), '{}'::text[],
  'plus aucune étape manquante');
select is((select count(*)::int from public.artisan_documents
  where artisan_id = 'c1830000-0000-4000-8000-000000000002' and source = 'essai'), 5,
  'cinq documents d''exemple');

select pg_temp.connecter('c1820000-0000-4000-8000-000000000002', 'artisan_en_attente');
set local role authenticated;
select lives_ok($$ select public.clear_test_attestations() $$, 'attestations d''exemple retirées');
select lives_ok($$ select public.fill_test_onboarding(array['attestations']) $$, 'puis remplies de nouveau');

-- ---------- Envoi : validé tout de suite ----------
select lives_ok($$ select public.submit_artisan_onboarding() $$, 'dossier envoyé');
reset role;
select is((select status::text from public.artisans where id = 'c1830000-0000-4000-8000-000000000002'),
  'valide', 'compte d''essai validé automatiquement');
select is((select raw_app_meta_data ->> 'role' from auth.users where id = 'c1820000-0000-4000-8000-000000000002'),
  'artisan', 'rôle artisan');
select is((select count(*)::int from public.artisan_documents
  where artisan_id = 'c1830000-0000-4000-8000-000000000002' and status = 'valide'), 5,
  'documents validés');
select ok(not app.artisan_is_visible('c1830000-0000-4000-8000-000000000002'), 'jamais visible des clients');

-- ---------- Back-office : liste et suppression ----------
select pg_temp.connecter('c1820000-0000-4000-8000-000000000003', 'artisan_en_attente');
set local role authenticated;
select throws_ok($$ select public.admin_delete_test_account('c1830000-0000-4000-8000-000000000002') $$,
  '42501', null, 'un artisan ne supprime pas de compte');
reset role;

select pg_temp.connecter('c1820000-0000-4000-8000-000000000001', 'admin', 'aal2');
set local role authenticated;
select is((select count(*)::int from public.admin_test_accounts()), 1, 'un compte d''essai listé');
select throws_ok($$ select public.admin_delete_test_account('c1830000-0000-4000-8000-000000000003') $$,
  '22023', null, 'un compte normal ne se supprime pas ici');
select lives_ok($$ select public.admin_delete_test_account('c1830000-0000-4000-8000-000000000002') $$,
  'compte d''essai supprimé');
select lives_ok($$ select public.admin_disable_test_code((select id from public.test_codes where code = 'essai-182')) $$,
  'code désactivé');
reset role;
select ok(not exists (select 1 from auth.users where id = 'c1820000-0000-4000-8000-000000000002'),
  'utilisateur effacé');
select ok(not exists (select 1 from public.artisans where id = 'c1830000-0000-4000-8000-000000000002'),
  'fiche effacée');

select * from finish();
rollback;
