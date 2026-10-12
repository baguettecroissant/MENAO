-- F-42, F-08 : « Mes échanges avec MENAO » (ADR 0041). Fil d'un message de la page Contact :
-- messages du déclarant, réponse de l'équipe notifiée avec le type du ticket.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

insert into auth.users (id, email, is_anonymous, email_confirmed_at, raw_app_meta_data, raw_user_meta_data) values
  ('bb100000-0000-4000-8000-000000000001', 'echange.a@example.test', false, now(), '{}', '{"first_name":"Camille","last_name":"Exemple"}'),
  ('bb100000-0000-4000-8000-000000000002', 'echange.b@example.test', false, now(), '{}', '{"first_name":"Alex","last_name":"Exemple"}'),
  ('bb300000-0000-4000-8000-000000000001', 'echange.support@example.test', false, now(), '{"role":"support"}', '{}');

create function pg_temp.connecter(uid uuid, app_role text) returns void language sql as $$
  select set_config('request.jwt.claims', jsonb_build_object(
    'sub', uid, 'role', 'authenticated', 'aal', 'aal1', 'app_metadata', jsonb_build_object('role', app_role)
  )::text, true);
$$;

-- ---------- Le client écrit depuis la page Contact, connecté ----------
select pg_temp.connecter('bb100000-0000-4000-8000-000000000001', 'particulier');
set local role authenticated;
select lives_ok(
  $$ select public.send_contact_message('echange.a@example.test', 'Question sur un devis', 'Le devis peut-il inclure la pose ?') $$,
  'message de contact envoyé connecté');
select lives_ok(
  $$ select public.send_contact_message('echange.a@example.test', '', 'Une autre question, sans objet.') $$,
  'message de contact sans objet');
select is((select count(*)::int from public.tickets where type = 'contact'), 2, 'client : voit ses deux messages');
select set_config('test.ticket',
  (select id::text from public.tickets where subject = 'Question sur un devis'), true);
select set_config('test.ticket_sans_objet',
  (select id::text from public.tickets where subject is null), true);
select lives_ok(
  $$ select public.add_ticket_message(current_setting('test.ticket')::uuid, 'J''ajoute une précision.') $$,
  'client : complète son message dans le fil');
reset role;

select pg_temp.connecter('bb100000-0000-4000-8000-000000000002', 'particulier');
set local role authenticated;
select throws_ok(
  $$ select public.add_ticket_message(current_setting('test.ticket')::uuid, 'Intrusion') $$,
  '42501', 'Signalement introuvable', 'autre client : pas d''accès au fil');
select is_empty($$ select 1 from public.ticket_messages $$, 'autre client : ne lit pas le fil');
reset role;

-- ---------- L'équipe répond ----------
select pg_temp.connecter('bb300000-0000-4000-8000-000000000001', 'support');
set local role authenticated;
select lives_ok(
  $$ select public.add_ticket_message(current_setting('test.ticket')::uuid, 'Oui, demandez-le à l''artisan.') $$,
  'équipe : répond dans le fil');
select lives_ok(
  $$ select public.add_ticket_message(current_setting('test.ticket_sans_objet')::uuid, 'Bonjour, voici notre réponse.') $$,
  'équipe : répond au message sans objet');
reset role;
select results_eq(
  $$ select status::text from public.tickets where id = current_setting('test.ticket')::uuid $$,
  $$ values ('en_cours') $$, 'ticket pris en charge');
select results_eq(
  $$ select data ->> 'ticket_id', data ->> 'type', data ->> 'titre' from public.notifications
     where user_id = 'bb100000-0000-4000-8000-000000000001' and type = 'reponse_support'
     order by data ->> 'titre' $$,
  $$ values (current_setting('test.ticket'), 'contact', 'Question sur un devis'),
            (current_setting('test.ticket_sans_objet'), 'contact', 'votre message') $$,
  'client prévenu, avec le type du ticket et son objet');

select pg_temp.connecter('bb100000-0000-4000-8000-000000000001', 'particulier');
set local role authenticated;
select results_eq(
  $$ select from_staff, body from public.ticket_messages
     where ticket_id = current_setting('test.ticket')::uuid order by created_at, from_staff $$,
  $$ values (false, 'J''ajoute une précision.'), (true, 'Oui, demandez-le à l''artisan.') $$,
  'client : lit le fil complet');
reset role;

-- ---------- Échange clos ----------
update public.tickets set status = 'resolu', resolved_at = now() where id = current_setting('test.ticket')::uuid;
select pg_temp.connecter('bb100000-0000-4000-8000-000000000001', 'particulier');
set local role authenticated;
select throws_ok(
  $$ select public.add_ticket_message(current_setting('test.ticket')::uuid, 'Encore une question') $$,
  '22023', 'Ce signalement est clos', 'échange clos : plus de message');
reset role;

select * from finish();
rollback;
