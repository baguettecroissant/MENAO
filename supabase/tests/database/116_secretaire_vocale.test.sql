-- Secrétaire vocale (F-75, ADR 0225) : fonctions réservées au rôle service, état du dossier d'après
-- l'adresse du compte (null pour une adresse inconnue ou un compte sans fiche artisan), demande de
-- rappel (ticket rappel_pro, contrôles, limite par téléphone), journal ai_runs. Données fictives
-- (identifiants c116…).
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

insert into auth.users (id, email, is_anonymous, email_confirmed_at, raw_app_meta_data, raw_user_meta_data) values
  ('c1160000-0000-4000-8000-000000000001', 'voix116.artisan@example.test', false, now(), '{"role":"artisan_en_attente"}', '{}'),
  ('c1160000-0000-4000-8000-000000000002', 'voix116.client@example.test', false, now(), '{"role":"particulier"}', '{}');
update public.profiles set first_name = 'Jean' where user_id = 'c1160000-0000-4000-8000-000000000001';

-- Rôles ordinaires : aucun accès.
set local role anon;
select throws_ok($$ select public.voice_dossier_for_email('voix116.artisan@example.test') $$, '42501', null,
  'visiteur : état du dossier refusé');
select throws_ok($$ select public.voice_request_callback('Jean', '+33600001160', 'a@example.test', 'Test') $$,
  '42501', null, 'visiteur : demande de rappel refusée');
reset role;
set local role authenticated;
select throws_ok($$ select public.voice_dossier_for_email('voix116.artisan@example.test') $$, '42501', null,
  'compte connecté : état du dossier refusé');
reset role;

set local role service_role;
select is(public.voice_dossier_for_email(' VOIX116.Artisan@Example.test ') ->> 'statut', 'brouillon',
  'état du dossier : adresse sans tenir compte de la casse ni des espaces');
select is(public.voice_dossier_for_email('voix116.artisan@example.test') ->> 'prenom', 'Jean', 'état du dossier : prénom');
select ok(jsonb_array_length(public.voice_dossier_for_email('voix116.artisan@example.test') -> 'manque_inscription') > 0,
  'état du dossier : étapes manquantes de l''inscription');
select is(public.voice_dossier_for_email('inconnu116@example.test'), null, 'adresse inconnue : rien');
select is(public.voice_dossier_for_email('voix116.client@example.test'), null, 'compte sans fiche artisan : rien');
select is(public.voice_dossier_for_email(''), null, 'adresse vide : rien');

select lives_ok(
  $$ select public.voice_request_callback('Jean', '+33600001160', 'Voix116@Example.test', 'Aide pour l''inscription',
       'demain matin', 'plombier', 'Antibes') $$,
  'demande de rappel enregistrée');
select is(
  (select message from public.tickets where contact_phone = '+33600001160'),
  E'Prénom : Jean\nMotif : Aide pour l''inscription\nMeilleur moment : demain matin\nMétier : plombier\nCommune : Antibes',
  'demande de rappel : motif et moment dans le ticket');
select is((select contact_email from public.tickets where contact_phone = '+33600001160'), 'voix116@example.test',
  'demande de rappel : adresse en minuscules');
select is((select type::text from public.tickets where contact_phone = '+33600001160'), 'rappel_pro', 'ticket rappel_pro');
select lives_ok($$ select public.voice_request_callback('Jean', '+33600001160', 'b116@example.test', 'Encore') $$,
  'seconde demande du même numéro');
select throws_ok($$ select public.voice_request_callback('Jean', '+33600001160', 'c116@example.test', 'Encore') $$,
  '22023', 'Demande déjà enregistrée', 'troisième demande en 24 h refusée');
select throws_ok($$ select public.voice_request_callback('Jean', '0600001161', 'd116@example.test', 'Test') $$,
  '22023', 'Numéro de téléphone invalide', 'numéro hors format international refusé');
select throws_ok($$ select public.voice_request_callback('Jean', '+33600001162', 'pas-une-adresse', 'Test') $$,
  '22023', 'Adresse e-mail invalide', 'adresse invalide refusée');
select throws_ok($$ select public.voice_request_callback('Jean', '+33600001163', 'e116@example.test', '  ') $$,
  '22023', 'Motif obligatoire', 'motif vide refusé');
select lives_ok(
  $$ insert into public.ai_runs (function_name, model, outcome, latency_ms, audio_seconds)
     values ('voice-assistant', 'vapi', 'ok', 0, 95.5) $$,
  'ai_runs : durée d''un appel de la secrétaire acceptée');
reset role;

select * from finish();
rollback;
