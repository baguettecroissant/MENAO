-- Recrutement des conseillers MENAO (F-183, lot 77, ADR 0380) : candidature et réservation sans
-- compte, places limitées, e-mails aux candidats (sans compte), rappels, annulation, suivi réservé
-- aux administrateurs (aal2), conservation de 2 ans. Données fictives (example.test, 06 fictifs).
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

insert into auth.users (id, email, is_anonymous, email_confirmed_at, raw_app_meta_data, raw_user_meta_data) values
  ('e1750000-0000-4000-8000-000000000001', 'recrut175.admin@example.test', false, now(), '{"role":"admin"}', '{}'),
  ('e1750000-0000-4000-8000-000000000002', 'recrut175.commercial@example.test', false, now(), '{"role":"commercial"}', '{}'),
  ('e1750000-0000-4000-8000-000000000003', 'recrut175.support@example.test', false, now(), '{"role":"support"}', '{}');

create function pg_temp.connecter(uid uuid, app_role text, aal text default 'aal2') returns void language sql as $$
  select set_config('request.jwt.claims', jsonb_build_object(
    'sub', uid, 'role', 'authenticated', 'aal', aal, 'app_metadata', jsonb_build_object('role', app_role)
  )::text, true);
$$;

-- Jetons et réunions notés par le test (les tables sont fermées aux rôles connectés).
create temp table jetons (nom text primary key, jeton uuid);
create temp table reunions (nom text primary key, id uuid);
grant select, insert on jetons, reunions to anon, authenticated;

-- Candidature comme le navigateur (lot 79, ADR 0382) : session anonyme et CV rangé dans le dossier
-- de ce compte.
create function pg_temp.candidater(nom text, email text, phone text) returns uuid language plpgsql as $$
declare
  uid uuid := gen_random_uuid();
  cv text := uid || '/' || gen_random_uuid() || '.pdf';
  jeton uuid;
begin
  insert into auth.users (id, is_anonymous, raw_app_meta_data, raw_user_meta_data)
    values (uid, true, '{}', '{}');
  insert into storage.objects (bucket_id, name) values ('candidate-cvs', cv);
  perform set_config('request.jwt.claims',
    jsonb_build_object('sub', uid, 'role', 'authenticated', 'is_anonymous', true)::text, true);
  jeton := public.apply_as_commercial(initcap(nom), 'Exemple', email, phone, 'Nice',
    'auto_entrepreneur', true, 'plus_2_ans', 'temps_partiel', 'linkedin', null, true, cv, null);
  insert into jetons values (nom, jeton);
  return jeton;
end;
$$;

-- Barème public : lisible sans compte.
set local role anon;
select lives_ok($$ select * from public.commercial_bonus_rates() $$, 'visiteur : barème lisible');

-- Sans session (ni anonyme ni connectée) : la candidature passe par le navigateur (lot 79).
select throws_ok($$ select public.apply_as_commercial('Paul', 'Exemple', 'paul175@example.test', '+33600000004',
  'Nice', 'auto_entrepreneur', true, 'aucune', 'temps_plein', 'facebook', null, true, null) $$,
  '42501', null, 'visiteur sans session : refusé');
select throws_ok($$ select count(*) from public.commercial_candidates $$, '42501', null,
  'visiteur : table des candidats fermée');
reset role;

-- Candidatures (session anonyme du navigateur, CV déposé).
select isnt(pg_temp.candidater('julie', 'julie175@example.test', '+33600000001'), null,
  'candidature reçue, jeton renvoyé');
select pg_temp.candidater('karim', 'karim175@example.test', '+33600000002');
select pg_temp.candidater('lea', 'lea175@example.test', '+33600000003');
select throws_ok($$ select pg_temp.candidater('julie2', 'JULIE175@example.test', '+33600000009') $$,
  '22023', null, 'même e-mail sous 90 jours : refusé');
select throws_ok($$ select pg_temp.candidater('autre', 'autre175@example.test', '+33600000001') $$,
  '22023', null, 'même téléphone sous 90 jours : refusé');
select throws_ok($$ select public.apply_as_commercial('Paul', 'Exemple', 'pas-un-email', '+33600000004',
  'Nice', 'auto_entrepreneur', true, 'aucune', 'temps_plein', 'facebook', null, true, null) $$,
  '22023', null, 'e-mail invalide : refusé');
select throws_ok($$ select public.apply_as_commercial('Paul', 'Exemple', 'paul175@example.test', '+33600000004',
  'Nice', 'auto_entrepreneur', true, 'aucune', 'temps_plein', 'tiktok', null, true, null) $$,
  '22023', null, 'provenance inconnue : refusée');
select throws_ok($$ select public.apply_as_commercial('Paul', 'Exemple', 'paul175@example.test', '+33600000004',
  'Nice', 'auto_entrepreneur', true, 'aucune', 'temps_plein', 'facebook', null, false, null) $$,
  '22023', null, 'sans accord : refusé');

-- Réunions : créées par un administrateur (aal2) seulement.
select pg_temp.connecter('e1750000-0000-4000-8000-000000000002', 'commercial');
set local role authenticated;
select throws_ok($$ insert into public.recruitment_meetings (starts_at, meet_url)
  values (now() + interval '3 days', 'https://meet.google.com/abc-defg-hij') $$,
  '42501', null, 'commercial : ne crée pas de réunion');
reset role;
select pg_temp.connecter('e1750000-0000-4000-8000-000000000001', 'admin', 'aal1');
set local role authenticated;
select throws_ok($$ insert into public.recruitment_meetings (starts_at, meet_url)
  values (now() + interval '3 days', 'https://meet.google.com/abc-defg-hij') $$,
  '42501', null, 'admin sans double authentification : refusé');
reset role;
select pg_temp.connecter('e1750000-0000-4000-8000-000000000001', 'admin');
set local role authenticated;
with x as (insert into public.recruitment_meetings (starts_at, capacity, meet_url, created_by)
    values (now() + interval '3 days', 2, 'https://meet.google.com/abc-defg-hij',
      'e1750000-0000-4000-8000-000000000001') returning id)
  insert into reunions select 'jeudi', id from x;
with x as (insert into public.recruitment_meetings (starts_at, meet_url)
    values (now() + interval '1 hour', 'https://meet.google.com/abc-defg-hij') returning id)
  insert into reunions select 'bientot', id from x;
select throws_ok($$ insert into public.recruitment_meetings (starts_at, meet_url)
  values (now() + interval '3 days', 'http://meet.google.com/abc') $$,
  '23514', null, 'lien de visio en http : refusé');
reset role;

set local role anon;
select is((select array_agg(remaining) from public.recruitment_open_meetings()), array[2],
  'visiteur : seule la réunion à plus de 2 heures est proposée, avec ses places');
select is((select count(*)::int from public.recruitment_open_meetings() where id = (select id from reunions where nom = 'bientot')),
  0, 'réunion dans une heure : plus proposée');

-- Réservations : deux places, la troisième est refusée.
select lives_ok($$ select * from public.recruitment_book_meeting(
  (select jeton from jetons where nom = 'julie'), (select id from reunions where nom = 'jeudi')) $$,
  'julie réserve');
select lives_ok($$ select * from public.recruitment_book_meeting(
  (select jeton from jetons where nom = 'julie'), (select id from reunions where nom = 'jeudi')) $$,
  'julie réserve deux fois la même réunion : sans effet');
select lives_ok($$ select * from public.recruitment_book_meeting(
  (select jeton from jetons where nom = 'karim'), (select id from reunions where nom = 'jeudi')) $$,
  'karim réserve la dernière place');
select throws_ok($$ select * from public.recruitment_book_meeting(
  (select jeton from jetons where nom = 'lea'), (select id from reunions where nom = 'jeudi')) $$,
  '22023', null, 'réunion complète : refusée');
select throws_ok($$ select * from public.recruitment_book_meeting(
  (select jeton from jetons where nom = 'lea'), (select id from reunions where nom = 'bientot')) $$,
  '22023', null, 'réunion trop proche : refusée');
select throws_ok($$ select * from public.recruitment_book_meeting(gen_random_uuid(),
  (select id from reunions where nom = 'jeudi')) $$, '22023', null, 'jeton inconnu : refusé');
select is((select count(*)::int from public.recruitment_open_meetings()), 0,
  'réunion complète : plus proposée');
select is((select stage from public.recruitment_candidate((select jeton from jetons where nom = 'julie'))),
  'reunion_prevue', 'julie retrouve sa réservation avec son lien');
select lives_ok($$ select public.recruitment_request_callback((select jeton from jetons where nom = 'lea')) $$,
  'léa demande à être rappelée');
reset role;

select is((select count(*)::int from public.notifications n
  join public.commercial_candidates c on c.id = n.candidate_id
  where n.type = 'recrutement_reunion' and c.email like '%175@example.test'),
  2, 'un e-mail de confirmation par réservation, pas pour la réservation répétée');
select is((select data ->> 'lien' from public.notifications n
  join public.commercial_candidates c on c.id = n.candidate_id
  where n.type = 'recrutement_reunion' and c.email = 'julie175@example.test'),
  'https://meet.google.com/abc-defg-hij', 'le lien de visio est dans l''e-mail');
select is((select stage || ',' || callback_requested from public.commercial_candidates
  where email = 'lea175@example.test'), 'a_appeler,true', 'léa : à appeler');
select throws_ok($$ insert into public.notifications (candidate_id, type, channel, data)
  values ((select id from public.commercial_candidates where email = 'lea175@example.test'),
    'recrutement_reponse', 'sms', '{}') $$, '23514', null, 'candidat : e-mail seulement');

-- L'envoi trouve l'adresse et le prénom du candidat.
select is((select distinct first_name from public.claim_notifications(100) where email = 'julie175@example.test'),
  'Julie', 'envoi : adresse et prénom du candidat');

-- Rappels : la veille, puis une heure avant, une seule fois chacun.
select is(app.remind_recruitment_meetings(now() + interval '1 day 23 hours'), 0, 'trop tôt : aucun rappel');
select is(app.remind_recruitment_meetings(now() + interval '2 days 1 hour'), 2, 'la veille : deux rappels');
select is(app.remind_recruitment_meetings(now() + interval '2 days 2 hours'), 0, 'rappel de la veille envoyé une fois');
select is(app.remind_recruitment_meetings(now() + interval '2 days 23 hours 30 minutes'), 2,
  'une heure avant : deux rappels');
select is(app.remind_recruitment_meetings(now() + interval '3 days 1 minute'), 0, 'réunion commencée : plus rien');

-- Suivi : administrateurs (aal2) seulement.
select pg_temp.connecter('e1750000-0000-4000-8000-000000000002', 'commercial');
set local role authenticated;
select is((select count(*)::int from public.commercial_candidates), 0, 'commercial : aucun candidat visible');
select throws_ok($$ select public.admin_decline_candidate((select id from public.commercial_candidates limit 1)) $$,
  '42501', null, 'commercial : ne décide pas');
reset role;
select pg_temp.connecter('e1750000-0000-4000-8000-000000000003', 'support');
set local role authenticated;
select is((select count(*)::int from public.commercial_candidates), 0, 'support : aucun candidat visible');
reset role;
select pg_temp.connecter('e1750000-0000-4000-8000-000000000001', 'admin', 'aal1');
set local role authenticated;
select is((select count(*)::int from public.commercial_candidates), 0, 'admin sans double authentification : rien');
reset role;

select pg_temp.connecter('e1750000-0000-4000-8000-000000000001', 'admin');
set local role authenticated;
select is((select count(*)::int from public.commercial_candidates where email like '%175@example.test'), 3,
  'admin : les trois candidats');
select lives_ok($$ update public.commercial_candidates
  set interview_grid = '{"presentation": 4, "ecoute": 5}', interview_notes = 'Bon réseau.',
    attendance = 'present', stage = 'entretien'
  where email = 'karim175@example.test' $$, 'admin : grille, présence et étape');
select throws_ok($$ update public.commercial_candidates set email = 'x175@example.test'
  where email = 'karim175@example.test' $$, '42501', null, 'admin : les réponses du candidat ne changent pas');
select throws_ok($$ update public.commercial_candidates set stage = 'promu'
  where email = 'karim175@example.test' $$, '23514', null, 'étape inconnue : refusée');
select throws_ok($$ select public.admin_send_candidate_demo(
  (select id from public.commercial_candidates where email = 'karim175@example.test')) $$,
  '22023', null, 'lien de démo désactivé : rien n''est envoyé');
select lives_ok($$ select public.admin_save_candidate_test(
  (select id from public.commercial_candidates where email = 'karim175@example.test'),
  'presse', 15, '{"total": 15}') $$, 'admin : test de vente gardé');
select is(public.admin_candidate_test_context(
  (select id from public.commercial_candidates where email = 'karim175@example.test')),
  'Karim', 'admin : prénom pour le coach');
select lives_ok($$ select public.admin_decline_candidate(
  (select id from public.commercial_candidates where email = 'lea175@example.test')) $$,
  'admin : léa non retenue');
select is(public.admin_cancel_recruitment_meeting((select id from reunions where nom = 'jeudi')), 1,
  'réunion annulée : julie, encore inscrite, est prévenue');
reset role;

select is((select stage from public.commercial_candidates where email = 'julie175@example.test'), 'nouveau',
  'julie peut choisir une autre réunion');
select is((select count(*)::int from public.notifications n
  join public.commercial_candidates c on c.id = n.candidate_id
  where c.email = 'julie175@example.test' and n.type = 'recrutement_annulation'), 1, 'julie : e-mail d''annulation');
select is((select count(*)::int from public.notifications n
  join public.commercial_candidates c on c.id = n.candidate_id
  where c.email = 'lea175@example.test' and n.type = 'recrutement_reponse'), 1, 'léa : réponse polie');
set local role anon;
select throws_ok($$ select * from public.recruitment_candidate((select jeton from jetons where nom = 'lea')) $$,
  '22023', null, 'non retenue : son lien ne sert plus');
reset role;

-- Conservation : 2 ans après le dernier échange.
update public.commercial_candidates set last_contact_at = now() - interval '2 years 1 day'
where email = 'lea175@example.test';
select is(app.purge_commercial_candidates(), 1, 'candidature de plus de 2 ans supprimée');
select is((select count(*)::int from public.notifications n where n.candidate_id is not null
  and not exists (select 1 from public.commercial_candidates c where c.id = n.candidate_id)), 0,
  'ses e-mails partent avec elle');

select * from finish();
rollback;
