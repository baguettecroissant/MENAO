-- Charte qualité de l'artisan (F-14, ADR 0104) : signature pendant l'inscription, une par version,
-- lecture par l'artisan et l'équipe MENAO seulement, envoi du dossier impossible sans elle.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

insert into auth.users (id, email, raw_app_meta_data, raw_user_meta_data) values
  ('c5100000-0000-4000-8000-000000000001', 'charte.a1@example.test', '{}', '{"account_type":"artisan","siret":"00000001800010"}'),
  ('c5100000-0000-4000-8000-000000000002', 'charte.a2@example.test', '{}', '{"account_type":"artisan","siret":"00000002600013"}'),
  ('c5100000-0000-4000-8000-000000000003', 'charte.client@example.test', '{}', '{"first_name":"Camille"}'),
  ('c5100000-0000-4000-8000-000000000004', 'charte.support@example.test', '{"role":"support"}', '{}');

create function pg_temp.connecter(uid uuid, app_role text) returns void language sql as $$
  select set_config('request.jwt.claims', jsonb_build_object(
    'sub', uid, 'role', 'authenticated', 'aal', 'aal1', 'app_metadata', jsonb_build_object('role', app_role)
  )::text, true);
$$;

-- Artisan A1 : signature.
select pg_temp.connecter('c5100000-0000-4000-8000-000000000001', 'artisan_en_attente');
set local role authenticated;

select throws_ok(
  $$ select public.submit_artisan_onboarding() $$, '22023',
  'Étapes incomplètes : entreprise, metiers, zone, charte, documents, profil',
  'envoi du dossier : la charte fait partie des étapes manquantes');
select throws_ok(
  $$ select public.accept_artisan_charter('V4', 25, 'Alex Exemple', 'EXEMPLE', '00000001800010', 'M 10 10 L 200 80', p_engagement_version => 'B1') $$,
  '22023', 'Cette version de la charte n''est plus en vigueur.', 'version périmée refusée');
select throws_ok(
  $$ select public.accept_artisan_charter('V5', 24, 'Alex Exemple', 'EXEMPLE', '00000001800010', 'M 10 10 L 200 80', p_engagement_version => 'B1') $$,
  '22023', 'Toutes les règles de la charte doivent être validées.', 'règles non toutes validées : refus');
select throws_ok(
  $$ select public.accept_artisan_charter('V5', 25, 'Alex Exemple', 'EXEMPLE', '000000018', 'M 10 10 L 200 80', p_engagement_version => 'B1') $$,
  '23514', null, 'SIRET mal formé : refus');
select throws_ok(
  $$ select public.accept_artisan_charter('V5', 25, 'Alex Exemple', 'EXEMPLE', '00000001800010', '<script>', p_engagement_version => 'B1') $$,
  '23514', null, 'tracé de signature invalide : refus');
select lives_ok(
  $$ select public.accept_artisan_charter('V5', 25, ' Alex Exemple ', 'EXEMPLE', '0000 0001 8000 10', 'M 10 10 L 200 80 L 400 40', p_engagement_version => 'B1') $$,
  'signature acceptée');
select lives_ok(
  $$ select public.accept_artisan_charter('V5', 25, 'Alex Exemple', 'EXEMPLE', '00000001800010', 'M 10 10 L 20 20', p_engagement_version => 'B1') $$,
  'seconde signature de la même version : sans effet');
select results_eq(
  $$ select version, rules_count::int, signer_name, siret, signature_path from public.artisan_charter_acceptances $$,
  $$ values ('V5'::text, 25, 'Alex Exemple'::text, '00000001800010'::text, 'M 10 10 L 200 80 L 400 40'::text) $$,
  'artisan : voit sa signature (une seule, nom et SIRET normalisés)');
select throws_ok(
  $$ insert into public.artisan_charter_acceptances (artisan_id, version, rules_count, signer_name, company, siret, signature_path)
     select id, 'V6', 25, 'X', 'Y', '00000001800010', 'M 1 1 L 2 2' from public.artisans $$,
  '42501', null, 'artisan : pas d''écriture directe');
select throws_ok(
  $$ update public.artisan_charter_acceptances set signer_name = 'Autre' $$, '42501', null,
  'artisan : pas de modification');
select throws_ok(
  $$ delete from public.artisan_charter_acceptances $$, '42501', null,
  'artisan : pas de suppression');
reset role;

-- Artisan A2 : ne voit pas la signature de A1.
select pg_temp.connecter('c5100000-0000-4000-8000-000000000002', 'artisan_en_attente');
set local role authenticated;
select is((select count(*)::int from public.artisan_charter_acceptances), 0, 'autre artisan : aucune signature visible');
reset role;

-- Particulier : rien de visible, pas de signature possible.
select pg_temp.connecter('c5100000-0000-4000-8000-000000000003', 'particulier');
set local role authenticated;
select is((select count(*)::int from public.artisan_charter_acceptances), 0, 'particulier : aucune signature visible');
select throws_ok(
  $$ select public.accept_artisan_charter('V5', 25, 'Camille', 'X', '00000001800010', 'M 10 10 L 200 80', p_engagement_version => 'B1') $$,
  '42501', null, 'particulier : pas de signature');
reset role;

-- Équipe MENAO : lecture.
select pg_temp.connecter('c5100000-0000-4000-8000-000000000004', 'support');
set local role authenticated;
select is((select count(*)::int from public.artisan_charter_acceptances a join public.artisans ar on ar.id = a.artisan_id
  where ar.user_id = 'c5100000-0000-4000-8000-000000000001'), 1, 'support : voit les signatures');
reset role;

-- Visiteur : aucun accès.
set local role anon;
select throws_ok($$ select count(*) from public.artisan_charter_acceptances $$, '42501', null, 'visiteur : pas de lecture');
reset role;

select * from finish();
rollback;
