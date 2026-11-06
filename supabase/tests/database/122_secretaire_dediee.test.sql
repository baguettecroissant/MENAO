-- Secrétaire dédiée de l'artisan (F-83, ADR 0232) : contexte de l'appel, réglages par l'artisan,
-- rendez-vous qui bloque le créneau (refusé s'il chevauche ou si l'artisan ne prend pas de
-- rendez-vous), messages, notification sans numéro, lecture par l'artisan seul, fonctions
-- réservées au rôle service. Données fictives (identifiants c122…).
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

insert into auth.users (id, email, is_anonymous, email_confirmed_at, raw_app_meta_data, raw_user_meta_data) values
  ('c1220000-0000-4000-8000-000000000001', 'secretaire122.paul@example.test', false, now(), '{"role":"artisan"}', '{}'),
  ('c1220000-0000-4000-8000-000000000002', 'secretaire122.autre@example.test', false, now(), '{"role":"artisan"}', '{}');
insert into public.artisans (id, user_id, status, raison_sociale, nom_commercial, zone_mode) values
  ('c1221000-0000-4000-8000-000000000001', 'c1220000-0000-4000-8000-000000000001', 'valide', 'PAUL SARL 122', 'Plomberie Paul', 'communes'),
  ('c1221000-0000-4000-8000-000000000002', 'c1220000-0000-4000-8000-000000000002', 'valide', 'AUTRE 122', null, 'communes');
insert into public.artisan_zones (artisan_id, code_insee, nom) values
  ('c1221000-0000-4000-8000-000000000001', '06004', 'Antibes'),
  ('c1221000-0000-4000-8000-000000000001', '06029', 'Cannes');
insert into public.artisan_hours (artisan_id, weekday, start_time, end_time) values
  ('c1221000-0000-4000-8000-000000000001', 1, '08:00', '12:00');
insert into public.subscriptions (artisan_id, plan_code, stripe_customer_id, stripe_subscription_id, status) values
  ('c1221000-0000-4000-8000-000000000001', 'premium', 'cus_c122', 'sub_c122', 'active');

-- ---------- Contexte de l'appel ----------
set local role service_role;
select is(public.voice_secretary_context('c1221000-0000-4000-8000-000000000001') ->> 'entreprise', 'Plomberie Paul',
  'nom commercial annoncé par défaut');
select is(public.voice_secretary_context('c1221000-0000-4000-8000-000000000001') ->> 'zone', 'Antibes, Cannes',
  'zone : ses communes');
select is(jsonb_array_length(public.voice_secretary_context('c1221000-0000-4000-8000-000000000001') -> 'horaires'), 1,
  'ses horaires');
select is((public.voice_secretary_context('c1221000-0000-4000-8000-000000000001') -> 'droits' -> 'agents' ->> 'secretaire')::boolean,
  true, 'droits de sa formule');
reset role;

-- ---------- Réglages par l'artisan ----------
set local role authenticated;
select set_config('request.jwt.claims', jsonb_build_object('sub', 'c1220000-0000-4000-8000-000000000001',
  'role', 'authenticated', 'aal', 'aal1', 'app_metadata', jsonb_build_object('role', 'artisan'))::text, true);
select throws_ok($$ select public.voice_secretary_context('c1221000-0000-4000-8000-000000000001') $$, '42501', null,
  'artisan : contexte de l''appel réservé au serveur');
select throws_ok($$ select public.save_secretary_settings('Paul', true, 45, null) $$, '22023', null,
  'durée de rendez-vous invalide');
select lives_ok($$ select public.save_secretary_settings('Paul Dépannage', true, 90, 'Pas de dépannage le dimanche') $$,
  'réglages enregistrés');
reset role;
set local role service_role;
select is(public.voice_secretary_context('c1221000-0000-4000-8000-000000000001') ->> 'entreprise', 'Paul Dépannage',
  'nom annoncé choisi par l''artisan');
select is((public.voice_secretary_context('c1221000-0000-4000-8000-000000000001') ->> 'duree_visite')::int, 90,
  'durée d''un rendez-vous');

-- ---------- Rendez-vous et messages ----------
select throws_ok(
  $$ select public.voice_secretary_record('c1221000-0000-4000-8000-000000000001', 'appel-c122-1', 'rendez_vous',
       'Léa Martin', '+33600001220', 'Fuite sous l''évier', 'Antibes', false, now() + interval '30 minutes') $$,
  '22023', 'Créneau invalide.', 'rendez-vous trop proche : refusé');
select lives_ok(
  $$ select public.voice_secretary_record('c1221000-0000-4000-8000-000000000001', 'appel-c122-1', 'rendez_vous',
       'Léa Martin', '+33600001220', 'Fuite sous l''évier', 'Antibes', false,
       date_trunc('hour', now()) + interval '2 days') $$,
  'rendez-vous pris');
select is(
  (select count(*)::int from public.artisan_blocked_slots
   where artisan_id = 'c1221000-0000-4000-8000-000000000001'
     and ends_at - starts_at = interval '90 minutes' and label like 'RDV pris par votre secrétaire%'),
  1, 'créneau bloqué dans l''agenda, durée réglée');
select throws_ok(
  $$ select public.voice_secretary_record('c1221000-0000-4000-8000-000000000001', 'appel-c122-1', 'rendez_vous',
       'Léa Martin', '+33600001220', 'Autre chose', null, false, date_trunc('hour', now()) + interval '3 days') $$,
  '22023', 'Un rendez-vous est déjà pris pendant cet appel.', 'un seul rendez-vous par appel');
select throws_ok(
  $$ select public.voice_secretary_record('c1221000-0000-4000-8000-000000000001', 'appel-c122-2', 'rendez_vous',
       'Marc Durand', '+33600001221', 'Chauffe-eau', null, false,
       date_trunc('hour', now()) + interval '2 days' + interval '1 hour') $$,
  '22023', 'Créneau déjà pris.', 'créneau qui chevauche : refusé');
select throws_ok(
  $$ select public.voice_secretary_record('c1221000-0000-4000-8000-000000000001', 'appel-c122-2', 'message',
       'Marc Durand', '0600001221', 'Chauffe-eau', null, false, null) $$,
  '22023', 'Numéro de téléphone invalide.', 'numéro mal écrit : refusé');
select lives_ok(
  $$ select public.voice_secretary_record('c1221000-0000-4000-8000-000000000001', 'appel-c122-2', 'message',
       'Marc Durand', '+33600001221', 'Plus d''eau chaude', 'Cannes', true, null) $$,
  'message urgent transmis');
reset role;

select is(
  (select count(*)::int from public.notifications
   where user_id = 'c1220000-0000-4000-8000-000000000001' and type = 'secretaire_message'),
  2, 'artisan prévenu à chaque fois');
select ok(
  not exists (select 1 from public.notifications where type = 'secretaire_message'
    and (data::text like '%+336%' or data::text like '%Martin%' or data::text like '%Durand%')),
  'notification sans numéro ni nom de famille');

-- L'artisan ne prend plus de rendez-vous par sa secrétaire.
set local role authenticated;
select set_config('request.jwt.claims', jsonb_build_object('sub', 'c1220000-0000-4000-8000-000000000001',
  'role', 'authenticated', 'aal', 'aal1', 'app_metadata', jsonb_build_object('role', 'artisan'))::text, true);
select lives_ok($$ select public.save_secretary_settings(null, false, 60, null) $$, 'rendez-vous désactivés');
select is((select count(*)::int from public.secretary_messages), 2, 'artisan : ses messages lisibles');
select lives_ok(
  $$ select public.secretary_message_done((select id from public.secretary_messages where kind = 'message'), true) $$,
  'message marqué traité');
select ok((select done_at is not null from public.secretary_messages where kind = 'message'), 'traité');
reset role;
set local role service_role;
select throws_ok(
  $$ select public.voice_secretary_record('c1221000-0000-4000-8000-000000000001', 'appel-c122-3', 'rendez_vous',
       'Nina Petit', '+33600001222', 'Devis', null, false, date_trunc('hour', now()) + interval '5 days') $$,
  '22023', 'L''artisan ne prend pas de rendez-vous par sa secrétaire.', 'rendez-vous désactivés : refusé');
reset role;

-- Un autre artisan ne voit rien et ne peut rien modifier.
set local role authenticated;
select set_config('request.jwt.claims', jsonb_build_object('sub', 'c1220000-0000-4000-8000-000000000002',
  'role', 'authenticated', 'aal', 'aal1', 'app_metadata', jsonb_build_object('role', 'artisan'))::text, true);
select is((select count(*)::int from public.secretary_messages), 0, 'autre artisan : aucun message');
select is((select count(*)::int from public.secretary_settings), 0, 'autre artisan : aucun réglage');
select throws_ok(
  $$ select public.secretary_message_done('00000000-0000-4000-8000-000000000000', true) $$, '42501', null,
  'autre artisan : rien à marquer');
reset role;

select * from finish();
rollback;
