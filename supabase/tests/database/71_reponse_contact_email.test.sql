-- Réponse de l'équipe à un déclarant sans compte (ADR 0140) : message de la page Contact (ou
-- candidature partenaire) envoyé sans compte ; la réponse de l'équipe crée un e-mail vers
-- l'adresse du ticket, avec son texte, jamais en push ni dans un centre de notifications ; un
-- déclarant avec compte reste notifié comme avant. Données fictives.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

insert into auth.users (id, email, is_anonymous, email_confirmed_at, raw_app_meta_data, raw_user_meta_data) values
  ('c7100000-0000-4000-8000-000000000001', 'rep71.support@example.test', false, now(), '{"role":"support"}', '{}'),
  ('c7100000-0000-4000-8000-000000000002', 'rep71.client@example.test', false, now(), '{"role":"particulier"}', '{"first_name":"Camille"}');

create function pg_temp.connecter(uid uuid, app_role text) returns void language sql as $$
  select set_config('request.jwt.claims', jsonb_build_object(
    'sub', uid, 'role', 'authenticated', 'aal', 'aal1', 'app_metadata', jsonb_build_object('role', app_role)
  )::text, true);
$$;

-- ---------- Message envoyé sans compte ----------
set local role anon;
select lives_ok(
  $$ select public.send_contact_message('rep71.candidat@example.test', 'Candidature partenaire : Agence Exemple',
       'Entreprise : Agence Exemple') $$,
  'candidature envoyée sans compte');
reset role;
select set_config('test.ticket',
  (select id::text from public.tickets where contact_email = 'rep71.candidat@example.test'), true);

-- Plus aucune notification de file en attente : on part d'une file vide pour ce test.
update public.notifications set status = 'envoyee', sent_at = now() where status in ('a_envoyer', 'en_cours');

-- ---------- Réponse de l'équipe : e-mail vers l'adresse du ticket ----------
select pg_temp.connecter('c7100000-0000-4000-8000-000000000001', 'support');
set local role authenticated;
select lives_ok(
  $$ select public.add_ticket_message(current_setting('test.ticket')::uuid,
       E'Bonjour,\nmerci pour votre candidature.') $$,
  'l''équipe répond');
reset role;
select results_eq(
  $$ select type::text, channel::text, user_id, ticket_id::text, data ->> 'titre', data ->> 'message', push_status
     from public.notifications where ticket_id = current_setting('test.ticket')::uuid $$,
  $$ values ('reponse_contact', 'email', null::uuid, current_setting('test.ticket'),
            'Candidature partenaire : Agence Exemple', E'Bonjour,\nmerci pour votre candidature.',
            null::public.notification_status) $$,
  'e-mail en attente : sans compte, lié au ticket, avec le texte, sans push');
select ok(
  not (select data from public.notifications where ticket_id = current_setting('test.ticket')::uuid) ? 'email',
  'l''adresse n''est pas copiée dans les données de la notification');
select results_eq(
  $$ select type::text, email, first_name from public.claim_notifications(10) $$,
  $$ values ('reponse_contact', 'rep71.candidat@example.test', null::text) $$,
  'envoi : adresse lue dans le ticket au moment de l''envoi');

-- ---------- Le déclarant ne peut pas écrire dans le fil sans compte ; avec compte : comme avant ----------
select pg_temp.connecter('c7100000-0000-4000-8000-000000000002', 'particulier');
set local role authenticated;
select lives_ok(
  $$ select public.send_contact_message('rep71.client@example.test', 'Question', 'Une question.') $$,
  'message envoyé avec un compte');
reset role;
select set_config('test.ticket_compte',
  (select id::text from public.tickets where contact_email = 'rep71.client@example.test'), true);
select pg_temp.connecter('c7100000-0000-4000-8000-000000000001', 'support');
set local role authenticated;
select lives_ok(
  $$ select public.add_ticket_message(current_setting('test.ticket_compte')::uuid, 'Voici la réponse.') $$,
  'l''équipe répond au client connecté');
reset role;
select results_eq(
  $$ select type::text, user_id::text, ticket_id from public.notifications
     where user_id = 'c7100000-0000-4000-8000-000000000002' $$,
  $$ values ('reponse_support', 'c7100000-0000-4000-8000-000000000002', null::uuid) $$,
  'client avec compte : notification habituelle, rien de plus');
select is_empty(
  $$ select 1 from public.notifications where ticket_id = current_setting('test.ticket_compte')::uuid $$,
  'client avec compte : pas d''e-mail en double vers l''adresse du ticket');

-- ---------- Garde-fous ----------
select throws_ok(
  $$ insert into public.notifications (type, channel, data) values ('reponse_contact', 'email', '{}') $$,
  '23514', null, 'une notification vise un compte ou un ticket');
select throws_ok(
  $$ insert into public.notifications (ticket_id, type, channel, data)
     values (current_setting('test.ticket')::uuid, 'reponse_contact', 'push', '{}') $$,
  '23514', null, 'sans compte : e-mail seulement');

select pg_temp.connecter('c7100000-0000-4000-8000-000000000002', 'particulier');
set local role authenticated;
select is_empty($$ select 1 from public.notifications where ticket_id is not null $$,
  'centre de notifications : les e-mails sans compte n''y apparaissent jamais');
reset role;

select * from finish();
rollback;
