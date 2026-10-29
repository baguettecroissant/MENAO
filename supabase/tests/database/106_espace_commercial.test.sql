-- Espace commercial (F-65, ADR 0205) : rôle jamais obtenu par l'inscription, fiches réservées aux
-- admins (double authentification), code unique dans l'espace des liens /p/<code>, attribution des
-- inscriptions d'artisans au commercial actif, et lecture par le commercial de ses seuls inscrits.
-- Données fictives.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

insert into auth.users (id, email, is_anonymous, email_confirmed_at, raw_app_meta_data, raw_user_meta_data) values
  ('c1060000-0000-4000-8000-000000000001', 'com106.admin@example.test', false, now(), '{"role":"admin"}', '{}'),
  ('c1060000-0000-4000-8000-000000000002', 'com106.julien@example.test', false, now(), '{"role":"commercial"}', '{}'),
  ('c1060000-0000-4000-8000-000000000003', 'com106.sami@example.test', false, now(), '{"role":"commercial"}', '{}'),
  ('c1060000-0000-4000-8000-000000000004', 'com106.artisan1@example.test', false, now(), '{"role":"artisan"}', '{}'),
  ('c1060000-0000-4000-8000-000000000005', 'com106.artisan2@example.test', false, now(), '{"role":"artisan"}', '{}'),
  ('c1060000-0000-4000-8000-000000000006', 'com106.client@example.test', false, now(), '{"role":"particulier"}', '{}');
insert into public.artisans (id, user_id, siret, raison_sociale) values
  ('c1061000-0000-4000-8000-000000000001', 'c1060000-0000-4000-8000-000000000004', '00000106000003', 'MACONNERIE EXEMPLE'),
  ('c1061000-0000-4000-8000-000000000002', 'c1060000-0000-4000-8000-000000000005', '00000106000102', 'TERRASSEMENT EXEMPLE');

create function pg_temp.connecter(uid uuid, app_role text, aal text default 'aal2') returns void language sql as $$
  select set_config('request.jwt.claims', jsonb_build_object(
    'sub', uid, 'role', 'authenticated', 'aal', aal, 'app_metadata', jsonb_build_object('role', app_role)
  )::text, true);
$$;

-- ---------- Le rôle commercial ne s'obtient jamais par l'inscription ----------
insert into auth.users (id, email, is_anonymous, email_confirmed_at, raw_app_meta_data, raw_user_meta_data) values
  ('c1060000-0000-4000-8000-000000000009', 'com106.inscrit@example.test', false, now(), '{}',
   '{"account_type":"commercial","role":"commercial"}');
select is(
  (select raw_app_meta_data ->> 'role' from auth.users where id = 'c1060000-0000-4000-8000-000000000009'),
  'particulier', 'inscription demandant le rôle commercial : simple particulier');

-- ---------- Réservé aux admins (session aal2) ----------
select pg_temp.connecter('c1060000-0000-4000-8000-000000000002', 'commercial');
set local role authenticated;
select throws_ok($$ select * from public.admin_commercials() $$, '42501', null, 'commercial : liste impossible');
select throws_ok(
  $$ select public.admin_register_commercial('c1060000-0000-4000-8000-000000000002', 'Julien', 'julien-06') $$,
  '42501', null, 'commercial : création de sa propre fiche impossible');
reset role;

select pg_temp.connecter('c1060000-0000-4000-8000-000000000001', 'admin', 'aal1');
set local role authenticated;
select throws_ok($$ select * from public.admin_commercials() $$, '42501', null,
  'admin sans double authentification : impossible');
reset role;

-- ---------- Création par un admin ----------
select pg_temp.connecter('c1060000-0000-4000-8000-000000000001', 'admin');
set local role authenticated;
select ok(public.admin_commercial_code_available(' Julien-06 '), 'code libre, normalisé');
select ok(not public.admin_commercial_code_available('julien_06'), 'code mal formé refusé');
select throws_ok(
  $$ select public.admin_register_commercial('c1060000-0000-4000-8000-000000000006', 'Client', 'client-06') $$,
  '22023', 'Compte commercial introuvable.', 'compte sans le rôle commercial : refusé');
select lives_ok(
  $$ select public.admin_register_commercial('c1060000-0000-4000-8000-000000000002', 'Julien Exemple', 'Julien-06') $$,
  'fiche du commercial créée');
select lives_ok(
  $$ select public.admin_register_commercial('c1060000-0000-4000-8000-000000000003', 'Sami Exemple', 'sami-06') $$,
  'seconde fiche créée');
select throws_ok(
  $$ select public.admin_register_commercial('c1060000-0000-4000-8000-000000000003', 'Sami Exemple', 'julien-06') $$,
  '22023', 'Ce code est déjà utilisé.', 'code déjà pris par un commercial');
select ok(not public.admin_commercial_code_available('julien-06'), 'code pris : indisponible');
select throws_ok(
  $$ select public.admin_save_partner('julien-06', 'Agence Exemple', '73282932000074',
       'com106.agence@example.test', 'actif') $$,
  '22023', 'Ce code est déjà utilisé.', 'un partenaire ne peut pas prendre le code d''un commercial');
reset role;

select is(
  (select count(*)::int from public.audit_logs where action = 'commercial.cree'), 2,
  'créations journalisées');

-- ---------- Attribution des inscriptions ----------
select lives_ok(
  $$ select app.apply_artisan_signup('c1061000-0000-4000-8000-000000000001', '{"partner_code": " Julien-06 "}'::jsonb) $$,
  'inscription avec le code d''un commercial');
select is(
  (select c.code from public.commercial_attributions ca join public.commercials c on c.id = ca.commercial_id
   where ca.artisan_id = 'c1061000-0000-4000-8000-000000000001'),
  'julien-06', 'artisan rattaché au commercial');
select lives_ok(
  $$ select app.apply_artisan_signup('c1061000-0000-4000-8000-000000000001', '{"partner_code": "sami-06"}'::jsonb) $$,
  'second code reçu : sans erreur');
select is(
  (select c.code from public.commercial_attributions ca join public.commercials c on c.id = ca.commercial_id
   where ca.artisan_id = 'c1061000-0000-4000-8000-000000000001'),
  'julien-06', 'le premier code reçu l''emporte');

select pg_temp.connecter('c1060000-0000-4000-8000-000000000001', 'admin');
set local role authenticated;
select lives_ok(
  $$ select public.admin_set_commercial_status(
       (select id from public.commercials where code = 'sami-06'), 'suspendu') $$,
  'commercial suspendu');
reset role;
select lives_ok(
  $$ select app.apply_artisan_signup('c1061000-0000-4000-8000-000000000002', '{"partner_code": "sami-06"}'::jsonb) $$,
  'code d''un commercial suspendu : sans erreur');
select is_empty(
  $$ select 1 from public.commercial_attributions where artisan_id = 'c1061000-0000-4000-8000-000000000002' $$,
  'commercial suspendu : aucune attribution');

-- ---------- Ce que voit chacun ----------
select pg_temp.connecter('c1060000-0000-4000-8000-000000000002', 'commercial');
set local role authenticated;
select results_eq(
  $$ select code from public.commercials $$, $$ values ('julien-06'::text) $$,
  'commercial : sa seule fiche');
select ok((public.grade_scale() -> 'levels') is not null, 'commercial : barème du grade pour la démo');
select results_eq(
  $$ select raison_sociale, status::text from public.my_commercial_signups() $$,
  $$ values ('MACONNERIE EXEMPLE'::text, 'brouillon'::text) $$,
  'commercial : ses inscrits, nom de l''entreprise et étape');
select is(
  (select count(*)::int from public.commercial_attributions), 1, 'commercial : ses seules attributions');
select is_empty($$ select 1 from public.artisans $$, 'commercial : aucune fiche artisan en direct');
select throws_ok(
  $$ select public.admin_set_commercial_status(
       (select id from public.commercials where code = 'julien-06'), 'actif') $$,
  '42501', null, 'commercial : changement de statut impossible');
reset role;

select pg_temp.connecter('c1060000-0000-4000-8000-000000000002', 'particulier');
set local role authenticated;
select is_empty($$ select * from public.my_commercial_signups() $$,
  'jeton sans le rôle commercial : aucun inscrit');
reset role;

select pg_temp.connecter('c1060000-0000-4000-8000-000000000003', 'commercial');
set local role authenticated;
select is_empty($$ select * from public.my_commercial_signups() $$, 'commercial suspendu : aucun inscrit');
select results_eq(
  $$ select status::text from public.commercials $$, $$ values ('suspendu'::text) $$,
  'commercial suspendu : voit sa fiche (accès suspendu affiché)');
reset role;

select pg_temp.connecter('c1060000-0000-4000-8000-000000000004', 'artisan');
set local role authenticated;
select throws_ok($$ select public.grade_scale() $$, '42501', null, 'artisan : barème réservé aux commerciaux');
select throws_ok($$ select public.auth_email_exists('com106.julien@example.test') $$, '42501', null,
  'navigateur : existence d''un compte jamais révélée');
select is_empty($$ select 1 from public.commercials $$, 'artisan : aucune fiche de commercial');
select is_empty($$ select 1 from public.commercial_attributions $$, 'artisan : aucune attribution');
reset role;

set local role anon;
select throws_ok($$ select 1 from public.commercials $$, '42501', null, 'visiteur : aucun accès');
select throws_ok($$ select * from public.my_commercial_signups() $$, '42501', null,
  'visiteur : fonction inaccessible');
reset role;

select pg_temp.connecter('c1060000-0000-4000-8000-000000000001', 'admin');
set local role authenticated;
select results_eq(
  $$ select code, status::text, email, signups, validated from public.admin_commercials()
     where email like 'com106.%' order by code $$,
  $$ values ('julien-06'::text, 'actif'::text, 'com106.julien@example.test'::text, 1, 0),
            ('sami-06'::text, 'suspendu'::text, 'com106.sami@example.test'::text, 0, 0) $$,
  'admin : commerciaux, statut et inscrits');
reset role;

set local role service_role;
select ok(public.auth_email_exists(' COM106.Julien@example.test '), 'clé serveur : compte existant repéré, casse ignorée');
select ok(not public.auth_email_exists('inconnu106@example.test'), 'clé serveur : adresse libre');
reset role;

select * from finish();
rollback;
