-- F-125 : conversation d'un chantier consultée par l'équipe MENAO depuis un litige ou un message
-- signalé (ADR 0277) : lecture seule, réservée au support et aux admins en double authentification,
-- journalisée ; refusée aux parties, aux autres rôles et aux autres types de tickets (CLAUDE.md).
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

insert into auth.users (id, email, is_anonymous, email_confirmed_at, raw_app_meta_data, raw_user_meta_data) values
  ('e3210000-0000-4000-8000-000000000001', 'conv.client@example.test', false, now(), '{}', '{"first_name":"Camille","last_name":"Exemple"}'),
  ('e3220000-0000-4000-8000-000000000001', 'conv.artisan@example.test', false, now(), '{"role":"artisan"}', '{"first_name":"Xavier"}'),
  ('e3230000-0000-4000-8000-000000000001', 'conv.support@example.test', false, now(), '{"role":"support"}', '{}'),
  ('e3230000-0000-4000-8000-000000000002', 'conv.admin@example.test', false, now(), '{"role":"admin"}', '{}'),
  ('e3230000-0000-4000-8000-000000000003', 'conv.commercial@example.test', false, now(), '{"role":"commercial"}', '{}');

create function pg_temp.connecter(uid uuid, app_role text, niveau text default 'aal1') returns void language sql as $$
  select set_config('request.jwt.claims', jsonb_build_object(
    'sub', uid, 'role', 'authenticated', 'aal', niveau, 'app_metadata', jsonb_build_object('role', app_role)
  )::text, true);
$$;

insert into public.artisans (id, user_id, status, siret, raison_sociale, forme_juridique_code, adresse_ligne,
  adresse_code_postal, adresse_commune, zone_mode, connect_charges_enabled, stripe_account_id, assujetti_tva) values
  ('e3240000-0000-4000-8000-000000000001', 'e3220000-0000-4000-8000-000000000001', 'valide', '00000002600013',
   'ARTISAN CONVERSATION', '5710', '4 RUE DE LA PAIX', '06000', 'NICE', 'communes', true, 'acct_conv', true);
insert into public.projects (id, user_id, status, description, summary, trade_code, ville_code_insee, ville_nom,
  code_postal, adresse, location, criteria_validated_at) values
  ('e3250000-0000-4000-8000-000000000001', 'e3210000-0000-4000-8000-000000000001', 'demande_envoyee',
   'Ajouter des prises.', 'Installation de prises', 'electricien', '06088', 'Nice', '06000',
   '1 Rue de l''Exemple 06000 Nice', 'SRID=4326;POINT(7.26 43.70)', now());
insert into public.requests (id, project_id, artisan_id, particulier_id, contact_phone) values
  ('e3260000-0000-4000-8000-000000000001', 'e3250000-0000-4000-8000-000000000001',
   'e3240000-0000-4000-8000-000000000001', 'e3210000-0000-4000-8000-000000000001', '+33612345678');
select pg_temp.connecter('e3220000-0000-4000-8000-000000000001', 'artisan');
select set_config('test.chantier', public.artisan_fix_appointment('e3260000-0000-4000-8000-000000000001',
  current_date + 2, '10:00')::text, true);

-- Échanges : deux messages du client, un de l'artisan.
select pg_temp.connecter('e3210000-0000-4000-8000-000000000001', 'particulier');
select public.send_message(current_setting('test.chantier')::uuid, 'Bonjour, le portail sera ouvert.');
select pg_temp.connecter('e3220000-0000-4000-8000-000000000001', 'artisan');
select public.send_message(current_setting('test.chantier')::uuid, 'Message de l''artisan à signaler');
select set_config('test.message_artisan', (select id::text from public.messages
  where chantier_id = current_setting('test.chantier')::uuid and body like 'Message de l''artisan%'), true);
select pg_temp.connecter('e3210000-0000-4000-8000-000000000001', 'particulier');
select public.send_message(current_setting('test.chantier')::uuid, 'Merci, à jeudi.');

-- Tickets : un message signalé et un litige ouverts par le client, un message de contact.
select set_config('test.ticket_message', public.report_message(
  current_setting('test.message_artisan')::uuid, 'Propos déplacés dans ce message')::text, true);
select set_config('test.ticket_litige', public.report_chantier_problem(
  current_setting('test.chantier')::uuid, 'retard', 'L''artisan n''est pas venu au rendez-vous fixé.')::text, true);
reset role;
insert into public.tickets (id, type, contact_email, subject, message) values
  ('e3270000-0000-4000-8000-000000000001', 'contact', 'conv.contact@example.test', 'Question',
   'Une question sur MENAO, merci.');
select set_config('test.ticket_contact', 'e3270000-0000-4000-8000-000000000001', true);

-- ---------- Refusé aux parties et aux autres rôles ----------
set local role authenticated;
select pg_temp.connecter('e3210000-0000-4000-8000-000000000001', 'particulier');
select throws_ok(format('select * from public.admin_ticket_conversation(%L)', current_setting('test.ticket_litige')),
  '42501', 'Réservé à l''équipe MENAO', 'client : refusé');
select pg_temp.connecter('e3220000-0000-4000-8000-000000000001', 'artisan');
select throws_ok(format('select * from public.admin_ticket_conversation(%L)', current_setting('test.ticket_litige')),
  '42501', 'Réservé à l''équipe MENAO', 'artisan : refusé');
select pg_temp.connecter('e3230000-0000-4000-8000-000000000003', 'commercial');
select throws_ok(format('select * from public.admin_ticket_conversation(%L)', current_setting('test.ticket_litige')),
  '42501', 'Réservé à l''équipe MENAO', 'commercial : refusé');
select pg_temp.connecter('e3230000-0000-4000-8000-000000000002', 'admin', 'aal1');
select throws_ok(format('select * from public.admin_ticket_conversation(%L)', current_setting('test.ticket_litige')),
  '42501', 'Réservé à l''équipe MENAO', 'admin sans double authentification : refusé');
reset role;
select is((select count(*)::int from public.audit_logs where action = 'conversation.consultee'), 0,
  'aucune consultation journalisée après les refus');

-- ---------- Support : litige ----------
set local role authenticated;
select pg_temp.connecter('e3230000-0000-4000-8000-000000000001', 'support');
select results_eq(
  format('select author_side, author_name, body, reported from public.admin_ticket_conversation(%L)',
    current_setting('test.ticket_litige')),
  $$ values ('client'::text, 'Camille Exemple'::text, 'Bonjour, le portail sera ouvert.'::text, false),
            ('artisan'::text, 'ARTISAN CONVERSATION'::text, 'Message de l''artisan à signaler'::text, false),
            ('client'::text, 'Camille Exemple'::text, 'Merci, à jeudi.'::text, false) $$,
  'support : toute la conversation du chantier en litige, dans l''ordre, avec les auteurs');
select throws_ok(format('select * from public.admin_ticket_conversation(%L)', current_setting('test.ticket_contact')),
  '42501', 'Conversation consultable seulement depuis un litige ou un message signalé',
  'support : refusé depuis un ticket de contact');
select throws_ok('select * from public.admin_ticket_conversation(''00000000-0000-4000-8000-000000000000'')',
  '42501', 'Conversation consultable seulement depuis un litige ou un message signalé',
  'ticket inconnu : refusé');
select throws_ok(
  format('insert into public.messages (chantier_id, author_id, kind, body) values (%L, auth.uid(), %L, %L)',
    current_setting('test.chantier'), 'texte', 'Intrusion'),
  '42501', null, 'support : aucune écriture dans la conversation');
reset role;
select results_eq(
  $$ select actor_id::text, target_type, target_id::text, data ->> 'ticket_id', data ->> 'type'
     from public.audit_logs where action = 'conversation.consultee' $$,
  format($$ values ('e3230000-0000-4000-8000-000000000001'::text, 'chantier'::text, %L::text, %L::text, 'litige'::text) $$,
    current_setting('test.chantier'), current_setting('test.ticket_litige')),
  'consultation journalisée : qui, quel chantier, depuis quel ticket');

-- ---------- Message signalé, puis masqué : contenu et motif visibles par l'équipe ----------
set local role authenticated;
select pg_temp.connecter('e3230000-0000-4000-8000-000000000001', 'support');
select public.admin_moderate_message(current_setting('test.message_artisan')::uuid, true,
  'Propos contraires aux conditions d''utilisation');
select results_eq(
  format('select body, hidden, moderation_reason, reported from public.admin_ticket_conversation(%L) where reported',
    current_setting('test.ticket_message')),
  $$ values ('Message de l''artisan à signaler'::text, true,
             'Propos contraires aux conditions d''utilisation'::text, true) $$,
  'message signalé : repéré, masqué, contenu et motif lisibles par l''équipe');
select is((select count(*)::int from public.admin_ticket_conversation(current_setting('test.ticket_message')::uuid)),
  3, 'message signalé : toute la conversation du chantier');

-- ---------- Admin en double authentification ----------
select pg_temp.connecter('e3230000-0000-4000-8000-000000000002', 'admin', 'aal2');
select is((select count(*)::int from public.admin_ticket_conversation(current_setting('test.ticket_litige')::uuid)),
  3, 'admin en double authentification : autorisé');
reset role;
select is((select count(*)::int from public.audit_logs where action = 'conversation.consultee'), 4,
  'chaque consultation est journalisée');

-- ---------- Droits d'exécution ----------
select ok(not has_function_privilege('anon', 'public.admin_ticket_conversation(uuid)', 'execute'),
  'visiteur anonyme : exécution refusée');

select * from finish();
rollback;
