-- Demande de travaux par téléphone (F-77, ADR 0227) : demande préparée par Camille (rôle service
-- seulement, projet d'une session anonyme), aperçu par le porteur du jeton, coordonnées jamais
-- lisibles directement, limite par numéro, rattachement au compte du particulier par
-- claim_project et effacement des coordonnées dictées. Données fictives (identifiants c118…).
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

insert into auth.users (id, email, is_anonymous, email_confirmed_at, raw_app_meta_data, raw_user_meta_data) values
  ('c1180000-0000-4000-8000-000000000001', null, true, null, '{}', '{}'),
  ('c1180000-0000-4000-8000-000000000002', 'tel118.lea@example.test', false, now(), '{"role":"particulier"}', '{}'),
  ('c1180000-0000-4000-8000-000000000003', null, true, null, '{}', '{}');

insert into public.projects (id, user_id, description, summary, trade_code, ville_code_insee, ville_nom) values
  ('c1181000-0000-4000-8000-000000000001', 'c1180000-0000-4000-8000-000000000001', 'Fuite sous l''évier', 'Réparer une fuite sous l''évier', 'plombier', '06088', 'Nice'),
  ('c1181000-0000-4000-8000-000000000002', 'c1180000-0000-4000-8000-000000000002', 'Projet d''un compte', null, 'plombier', '06088', 'Nice');
insert into public.projects (id, user_id, description)
select ('c1181000-0000-4000-8000-00000000001' || n)::uuid, 'c1180000-0000-4000-8000-000000000003', 'Projet ' || n
from generate_series(0, 3) n;

-- Rôles ordinaires : préparation refusée, table illisible.
set local role authenticated;
select throws_ok(
  $$ select public.voice_prepare_work_request('c1181000-0000-4000-8000-000000000001', 'Léa', 'lea@example.test', '+33600001180') $$,
  '42501', null, 'compte connecté : préparation refusée');
select throws_ok($$ select * from public.voice_work_requests $$, '42501', null,
  'compte connecté : coordonnées dictées illisibles');
reset role;
set local role anon;
select throws_ok(
  $$ select public.voice_prepare_work_request('c1181000-0000-4000-8000-000000000001', 'Léa', 'lea@example.test', '+33600001180') $$,
  '42501', null, 'visiteur : préparation refusée');
reset role;

set local role service_role;
select throws_ok(
  $$ select public.voice_prepare_work_request('c1181000-0000-4000-8000-000000000002', 'Léa', 'lea@example.test', '+33600001180') $$,
  '42501', 'Projet introuvable', 'projet d''un vrai compte : refusé');
-- Jeton gardé dans un réglage de la transaction, lisible par tous les rôles.
select set_config('test.jeton118', public.voice_prepare_work_request(
  'c1181000-0000-4000-8000-000000000001', ' Léa ', 'Lea118@Example.test', '+33600001180'), true);
select matches(current_setting('test.jeton118'), '^[0-9a-f]{64}$', 'jeton de 64 caractères hexadécimaux');
select ok(
  (select expires_at > now() + interval '6 days' from public.project_transfers
   where project_id = 'c1181000-0000-4000-8000-000000000001'),
  'lien valable 7 jours');
select is(
  (select first_name || ' ' || email from public.voice_work_requests where project_id = 'c1181000-0000-4000-8000-000000000001'),
  'Léa lea118@example.test', 'prénom nettoyé, adresse en minuscules');

-- Limite : 3 demandes par numéro et par jour.
select lives_ok(
  $$ select public.voice_prepare_work_request('c1181000-0000-4000-8000-000000000010', 'Marc', 'marc@example.test', '+33600001181') $$,
  'première demande du numéro');
select lives_ok(
  $$ select public.voice_prepare_work_request('c1181000-0000-4000-8000-000000000011', 'Marc', 'marc@example.test', '+33600001181') $$,
  'deuxième demande du numéro');
select lives_ok(
  $$ select public.voice_prepare_work_request('c1181000-0000-4000-8000-000000000012', 'Marc', 'marc@example.test', '+33600001181') $$,
  'troisième demande du numéro');
select throws_ok(
  $$ select public.voice_prepare_work_request('c1181000-0000-4000-8000-000000000013', 'Marc', 'marc@example.test', '+33600001181') $$,
  '22023', 'Trop de demandes pour ce numéro aujourd''hui', 'quatrième demande du numéro : refusée');
reset role;

-- Aperçu : seulement avec le bon jeton.
set local role anon;
select is(
  (select first_name || ' · ' || summary || ' · ' || ville_nom || ' · ' || phone
   from public.voice_work_request_preview(current_setting('test.jeton118'))),
  'Léa · Réparer une fuite sous l''évier · Nice · +33600001180', 'aperçu avec le jeton');
select is((select count(*)::int from public.voice_work_request_preview(repeat('0', 64))), 0,
  'jeton inconnu : rien');
select is((select count(*)::int from public.voice_work_request_preview(null)), 0, 'sans jeton : rien');
reset role;

-- Le particulier se connecte : le projet passe à son compte, les coordonnées dictées sont effacées.
set local role authenticated;
select set_config('request.jwt.claims', jsonb_build_object(
  'sub', 'c1180000-0000-4000-8000-000000000002', 'role', 'authenticated',
  'app_metadata', jsonb_build_object('role', 'particulier'))::text, true);
select is(public.claim_project(current_setting('test.jeton118')), 'c1181000-0000-4000-8000-000000000001'::uuid,
  'lien utilisé : projet rattaché');
select is((select count(*)::int from public.voice_work_request_preview(current_setting('test.jeton118'))), 0,
  'lien utilisé : plus d''aperçu');
reset role;

select is(
  (select user_id from public.projects where id = 'c1181000-0000-4000-8000-000000000001'),
  'c1180000-0000-4000-8000-000000000002'::uuid, 'projet au compte du particulier');
select is(
  (select count(*)::int from public.voice_work_requests where project_id = 'c1181000-0000-4000-8000-000000000001'),
  0, 'coordonnées dictées effacées');

-- Lien expiré : coordonnées effacées à la préparation suivante.
update public.project_transfers set expires_at = now() - interval '1 minute'
where project_id = 'c1181000-0000-4000-8000-000000000010';
set local role service_role;
select lives_ok(
  $$ select public.voice_prepare_work_request('c1181000-0000-4000-8000-000000000013', 'Marc', 'marc@example.test', '+33600001182') $$,
  'autre numéro : préparée');
reset role;
select is(
  (select count(*)::int from public.voice_work_requests where project_id = 'c1181000-0000-4000-8000-000000000010'),
  0, 'lien expiré : coordonnées effacées');

select * from finish();
rollback;
