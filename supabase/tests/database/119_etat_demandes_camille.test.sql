-- « Où en est ma demande ? » (F-79, ADR 0229) : état des demandes d'un particulier lu par adresse
-- e-mail, réservé au rôle service ; rien pour une adresse inconnue, un compte artisan ou une
-- session anonyme ; réponse de chaque artisan ; demande préparée au téléphone encore à vérifier,
-- même sans compte. Données fictives (identifiants c119…).
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

insert into auth.users (id, email, is_anonymous, email_confirmed_at, raw_app_meta_data, raw_user_meta_data) values
  ('c1190000-0000-4000-8000-000000000001', 'etat119.lea@example.test', false, now(), '{"role":"particulier"}', '{}'),
  ('c1190000-0000-4000-8000-000000000002', 'etat119.artisan@example.test', false, now(), '{"role":"artisan"}', '{}'),
  ('c1190000-0000-4000-8000-000000000003', 'etat119.marc@example.test', false, now(), '{"role":"artisan"}', '{}'),
  ('c1190000-0000-4000-8000-000000000004', null, true, null, '{}', '{}');
update public.profiles set first_name = 'Léa' where user_id = 'c1190000-0000-4000-8000-000000000001';
update public.profiles set first_name = 'Bruno' where user_id = 'c1190000-0000-4000-8000-000000000002';

insert into public.artisans (id, user_id, status, raison_sociale, nom_commercial, zone_mode) values
  ('c1191000-0000-4000-8000-000000000001', 'c1190000-0000-4000-8000-000000000002', 'valide', 'PLOMB 119', null, 'communes'),
  ('c1191000-0000-4000-8000-000000000002', 'c1190000-0000-4000-8000-000000000003', 'valide', 'MARC 119', 'Marc Plomberie', 'communes');

insert into public.projects (id, user_id, description, summary, trade_code, ville_code_insee, ville_nom) values
  ('c1192000-0000-4000-8000-000000000001', 'c1190000-0000-4000-8000-000000000001', 'Fuite', 'Réparer une fuite sous l''évier', 'plombier', '06004', 'Antibes'),
  ('c1192000-0000-4000-8000-000000000002', 'c1190000-0000-4000-8000-000000000004', 'Peinture', 'Repeindre un salon', null, null, null);

insert into public.requests (project_id, artisan_id, particulier_id, contact_phone, status, refusal_reason) values
  ('c1192000-0000-4000-8000-000000000001', 'c1191000-0000-4000-8000-000000000001', 'c1190000-0000-4000-8000-000000000001', '+33600001190', 'acceptee', null),
  ('c1192000-0000-4000-8000-000000000001', 'c1191000-0000-4000-8000-000000000002', 'c1190000-0000-4000-8000-000000000001', '+33600001190', 'refusee', 'planning_complet');

-- Rôles ordinaires : refusé.
set local role authenticated;
select throws_ok($$ select public.voice_requests_for_email('etat119.lea@example.test') $$, '42501', null,
  'compte connecté : refusé');
reset role;
set local role anon;
select throws_ok($$ select public.voice_requests_for_email('etat119.lea@example.test') $$, '42501', null,
  'visiteur : refusé');
reset role;

set local role service_role;
select is(public.voice_requests_for_email('inconnu119@example.test'), null, 'adresse inconnue : rien');
select is(public.voice_requests_for_email(''), null, 'adresse vide : rien');
select is(public.voice_requests_for_email('etat119.artisan@example.test'), null, 'compte artisan : rien');

select is(public.voice_requests_for_email(' Etat119.Lea@Example.test ') ->> 'prenom', 'Léa',
  'prénom du compte, adresse sans casse ni espaces');
select is((public.voice_requests_for_email('etat119.lea@example.test') ->> 'compte')::boolean, true, 'compte trouvé');
select is(jsonb_array_length(public.voice_requests_for_email('etat119.lea@example.test') -> 'projets'), 1,
  'un projet envoyé');
select is(
  public.voice_requests_for_email('etat119.lea@example.test') -> 'projets' -> 0 ->> 'resume',
  'Réparer une fuite sous l''évier', 'résumé du projet');
select is(
  public.voice_requests_for_email('etat119.lea@example.test') -> 'projets' -> 0 -> 'artisans',
  '[{"nom": "Bruno", "statut": "acceptee"}, {"nom": "Marc Plomberie", "statut": "refusee"}]'::jsonb,
  'réponse de chaque artisan, prénom ou nom commercial');
select is((public.voice_requests_for_email('etat119.lea@example.test') ->> 'demandes_a_verifier')::int, 0,
  'aucune demande préparée en attente');

-- Demande préparée au téléphone pour une adresse sans compte.
select lives_ok(
  $$ select public.voice_prepare_work_request('c1192000-0000-4000-8000-000000000002', 'Nina', 'nina119@example.test', '+33600001191') $$,
  'demande préparée au téléphone');
select is(
  public.voice_requests_for_email('nina119@example.test'),
  '{"prenom": "Nina", "compte": false, "projets": [], "demandes_a_verifier": 1}'::jsonb,
  'sans compte : la demande préparée qui attend sa vérification');
reset role;

-- Lien expiré : plus rien.
update public.project_transfers set expires_at = now() - interval '1 minute'
where project_id = 'c1192000-0000-4000-8000-000000000002';
set local role service_role;
select is(public.voice_requests_for_email('nina119@example.test'), null, 'lien expiré : rien');
reset role;

select * from finish();
rollback;
