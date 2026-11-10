-- Rendez-vous avec le commercial du secteur pris par Manon (F-76, ADR 0226) : commercial du
-- secteur (début de code postal le plus long, commerciaux actifs seulement), rendez-vous déjà
-- pris, réservation et ses contrôles, notification du commercial (sans coordonnées), lecture par
-- le seul commercial concerné, annulation, fonctions réservées au rôle service. Données fictives
-- (identifiants c117…).
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

insert into auth.users (id, email, is_anonymous, email_confirmed_at, raw_app_meta_data, raw_user_meta_data) values
  ('c1170000-0000-4000-8000-000000000001', 'rdv117.alice@example.test', false, now(), '{"role":"commercial"}', '{}'),
  ('c1170000-0000-4000-8000-000000000002', 'rdv117.bruno@example.test', false, now(), '{"role":"commercial"}', '{}'),
  ('c1170000-0000-4000-8000-000000000003', 'rdv117.chloe@example.test', false, now(), '{"role":"commercial"}', '{}');
update public.profiles set first_name = 'Bruno' where user_id = 'c1170000-0000-4000-8000-000000000002';

insert into public.commercials (id, user_id, code, nom, status, zone_codes_postaux) values
  ('c1171000-0000-4000-8000-000000000001', 'c1170000-0000-4000-8000-000000000001', 'alice-117', 'Alice Exemple', 'actif', '{99}'),
  ('c1171000-0000-4000-8000-000000000002', 'c1170000-0000-4000-8000-000000000002', 'bruno-117', 'Bruno Exemple', 'actif', '{9960}'),
  ('c1171000-0000-4000-8000-000000000003', 'c1170000-0000-4000-8000-000000000003', 'chloe-117', 'Chloé Exemple', 'suspendu', '{99600}');

-- Créneaux du lundi prochain, heure de Paris : expression écrite en entier dans chaque appel
-- (les fonctions temporaires ne sont pas visibles des autres rôles).
create function pg_temp.connecter(uid uuid, app_role text) returns void language sql as $$
  select set_config('request.jwt.claims', jsonb_build_object(
    'sub', uid, 'role', 'authenticated', 'aal', 'aal2', 'app_metadata', jsonb_build_object('role', app_role)
  )::text, true);
$$;

-- Rôles ordinaires : aucune fonction de Manon.
set local role authenticated;
select throws_ok($$ select * from public.voice_commercial_for_postcode('99600') $$, '42501', null,
  'compte connecté : commercial du secteur refusé');
select throws_ok(
  $$ select public.voice_book_commercial_appointment('c1171000-0000-4000-8000-000000000002', now(), 'appel',
       'Jean', '+33600001170', 'a@example.test', 'Ville', 'Motif') $$,
  '42501', null, 'compte connecté : réservation refusée');
reset role;

set local role service_role;
select is((select prenom from public.voice_commercial_for_postcode('99600')), 'Bruno',
  'secteur : le début de code postal le plus long l''emporte, commerciale suspendue ignorée');
select is((select commercial_id from public.voice_commercial_for_postcode('99100')),
  'c1171000-0000-4000-8000-000000000001'::uuid, 'secteur : zone plus large');
select is((select count(*)::int from public.voice_commercial_for_postcode('75001')), 0, 'secteur non couvert : personne');
select is((select count(*)::int from public.voice_commercial_for_postcode('abc')), 0, 'code postal invalide : personne');
reset role;

-- Bruno a déjà un rendez-vous de prospection lundi à 16 h.
insert into public.prospects (id, siret, denomination, departement) values
  ('c1173000-0000-4000-8000-000000000001', '00000117100014', 'PROSPECT C117', '99');
insert into public.prospect_follows (prospect_id, commercial_id, status, next_action_at) values
  ('c1173000-0000-4000-8000-000000000001', 'c1171000-0000-4000-8000-000000000002', 'rdv_pris', (((date_trunc('week', now() at time zone 'Europe/Paris') + interval '7 days')::date + time '16:00') at time zone 'Europe/Paris'));

set local role service_role;
select is(
  cardinality(public.voice_commercial_busy('c1171000-0000-4000-8000-000000000002', now(), now() + interval '15 days')),
  1, 'rendez-vous déjà pris : suivi des prospects');

select lives_ok(
  $$ select public.voice_book_commercial_appointment('c1171000-0000-4000-8000-000000000002', (((date_trunc('week', now() at time zone 'Europe/Paris') + interval '7 days')::date + time '10:00') at time zone 'Europe/Paris'),
       'appel', 'Jean', '+33600001170', 'Jean117@Example.test', 'Ville Exemple', 'Inscription accompagnée',
       '99600', null, 'plombier') $$,
  'rendez-vous réservé');
select is(
  (select email from public.commercial_appointments where phone = '+33600001170'), 'jean117@example.test',
  'adresse en minuscules');
select is(
  (select count(*)::int from public.notifications where user_id = 'c1170000-0000-4000-8000-000000000002' and type = 'rdv_commercial'),
  1, 'commercial prévenu');
select ok(
  not exists (select 1 from public.notifications where user_id = 'c1170000-0000-4000-8000-000000000002'
    and (data ? 'telephone' or data ? 'email')),
  'notification sans téléphone ni e-mail');

select throws_ok(
  $$ select public.voice_book_commercial_appointment('c1171000-0000-4000-8000-000000000002', (((date_trunc('week', now() at time zone 'Europe/Paris') + interval '7 days')::date + time '10:30') at time zone 'Europe/Paris'),
       'appel', 'Marc', '+33600001171', 'marc117@example.test', 'Ville', 'Motif') $$,
  '22023', 'Créneau déjà pris', 'moins d''une heure après un autre rendez-vous : refusé');
select throws_ok(
  $$ select public.voice_book_commercial_appointment('c1171000-0000-4000-8000-000000000002', (((date_trunc('week', now() at time zone 'Europe/Paris') + interval '7 days')::date + time '15:30') at time zone 'Europe/Paris'),
       'appel', 'Marc', '+33600001171', 'marc117@example.test', 'Ville', 'Motif') $$,
  '22023', 'Créneau déjà pris', 'près d''un rendez-vous du suivi : refusé');
select lives_ok(
  $$ select public.voice_book_commercial_appointment('c1171000-0000-4000-8000-000000000002', (((date_trunc('week', now() at time zone 'Europe/Paris') + interval '7 days')::date + time '11:00') at time zone 'Europe/Paris'),
       'visite', 'Marc', '+33600001171', 'marc117@example.test', 'Ville', 'Démo', null, '1 rue Exemple') $$,
  'visite avec adresse, une heure après : réservée');
select throws_ok(
  $$ select public.voice_book_commercial_appointment('c1171000-0000-4000-8000-000000000002', (((date_trunc('week', now() at time zone 'Europe/Paris') + interval '7 days')::date + time '14:00') at time zone 'Europe/Paris'),
       'visite', 'Léo', '+33600001172', 'leo117@example.test', 'Ville', 'Démo') $$,
  '22023', 'Adresse obligatoire pour une visite', 'visite sans adresse refusée');
select throws_ok(
  $$ select public.voice_book_commercial_appointment('c1171000-0000-4000-8000-000000000002', (((date_trunc('week', now() at time zone 'Europe/Paris') + interval '7 days')::date + time '13:00') at time zone 'Europe/Paris'),
       'appel', 'Léo', '+33600001172', 'leo117@example.test', 'Ville', 'Motif') $$,
  '22023', 'Créneau invalide', 'pause de midi refusée');
select throws_ok(
  $$ select public.voice_book_commercial_appointment('c1171000-0000-4000-8000-000000000002', (((date_trunc('week', now() at time zone 'Europe/Paris') + interval '7 days')::date + time '10:15') at time zone 'Europe/Paris'),
       'appel', 'Léo', '+33600001172', 'leo117@example.test', 'Ville', 'Motif') $$,
  '22023', 'Créneau invalide', 'début hors demi-heure refusé');
select throws_ok(
  $$ select public.voice_book_commercial_appointment('c1171000-0000-4000-8000-000000000002', (((date_trunc('week', now() at time zone 'Europe/Paris') + interval '7 days')::date + time '10:00') at time zone 'Europe/Paris') - interval '2 days',
       'appel', 'Léo', '+33600001172', 'leo117@example.test', 'Ville', 'Motif') $$,
  '22023', 'Créneau invalide', 'samedi refusé');
select throws_ok(
  $$ select public.voice_book_commercial_appointment('c1171000-0000-4000-8000-000000000003', (((date_trunc('week', now() at time zone 'Europe/Paris') + interval '7 days')::date + time '17:00') at time zone 'Europe/Paris'),
       'appel', 'Léo', '+33600001172', 'leo117@example.test', 'Ville', 'Motif') $$,
  '22023', 'Conseiller indisponible', 'commerciale suspendue refusée');
reset role;

-- Lecture et annulation par le commercial.
select pg_temp.connecter('c1170000-0000-4000-8000-000000000002', 'commercial');
set local role authenticated;
select is((select count(*)::int from public.commercial_appointments), 2, 'Bruno : ses rendez-vous');
select lives_ok(
  $$ select public.commercial_cancel_appointment((select id from public.commercial_appointments where phone = '+33600001170')) $$,
  'Bruno annule un rendez-vous');
select is((select status from public.commercial_appointments where phone = '+33600001170'), 'annule', 'rendez-vous annulé');
select throws_ok(
  $$ select public.commercial_cancel_appointment((select id from public.commercial_appointments where phone = '+33600001170')) $$,
  '22023', 'Rendez-vous introuvable.', 'déjà annulé : refusé');
select throws_ok(
  $$ insert into public.commercial_appointments (commercial_id, starts_at, kind, first_name, phone, email, city, reason)
     values ('c1171000-0000-4000-8000-000000000002', now(), 'appel', 'X', '+33600000000', 'x@example.test', 'V', 'M') $$,
  '42501', null, 'aucune écriture directe');
reset role;

select pg_temp.connecter('c1170000-0000-4000-8000-000000000001', 'commercial');
set local role authenticated;
select is((select count(*)::int from public.commercial_appointments), 0, 'Alice : aucun rendez-vous de Bruno');
select throws_ok(
  $$ select public.commercial_cancel_appointment('c1179999-0000-4000-8000-000000000000') $$,
  '22023', 'Rendez-vous introuvable.', 'rendez-vous d''un autre ou inconnu : refusé');
reset role;

-- Créneau libéré par l'annulation : de nouveau réservable.
set local role service_role;
select lives_ok(
  $$ select public.voice_book_commercial_appointment('c1171000-0000-4000-8000-000000000002', (((date_trunc('week', now() at time zone 'Europe/Paris') + interval '7 days')::date + time '10:00') at time zone 'Europe/Paris'),
       'appel', 'Nina', '+33600001173', 'nina117@example.test', 'Ville', 'Motif') $$,
  'créneau annulé : de nouveau libre');
reset role;

select * from finish();
rollback;
