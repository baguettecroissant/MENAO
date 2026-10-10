-- F-40 : messagerie par chantier (particulier ↔ artisan) : envoi, pièces jointes, lecture et non
-- lus, notification groupée, conversation fermée, signalement, masquage par l'équipe, temps réel,
-- droits de chaque rôle (CLAUDE.md).
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

insert into auth.users (id, email, is_anonymous, email_confirmed_at, raw_app_meta_data, raw_user_meta_data) values
  ('d5100000-0000-4000-8000-000000000001', 'msg.a@example.test', false, now(), '{}', '{"first_name":"Camille","last_name":"Exemple"}'),
  ('d5100000-0000-4000-8000-000000000002', 'msg.b@example.test', false, now(), '{}', '{"first_name":"Alex"}'),
  ('d5200000-0000-4000-8000-000000000001', 'msg.artisan@example.test', false, now(), '{"role":"artisan"}', '{"first_name":"Xavier"}'),
  ('d5200000-0000-4000-8000-000000000002', 'msg.autre@example.test', false, now(), '{"role":"artisan"}', '{"first_name":"Yasmine"}'),
  ('d5300000-0000-4000-8000-000000000001', 'msg.support@example.test', false, now(), '{"role":"support"}', '{}');

create function pg_temp.connecter(uid uuid, app_role text) returns void language sql as $$
  select set_config('request.jwt.claims', jsonb_build_object(
    'sub', uid, 'role', 'authenticated', 'aal', 'aal1', 'app_metadata', jsonb_build_object('role', app_role)
  )::text, true);
$$;

insert into public.artisans (id, user_id, status, siret, raison_sociale, forme_juridique_code, adresse_ligne,
  adresse_code_postal, adresse_commune, zone_mode, connect_charges_enabled, stripe_account_id, assujetti_tva) values
  ('d5400000-0000-4000-8000-000000000001', 'd5200000-0000-4000-8000-000000000001', 'valide', '00000002600013',
   'ARTISAN MESSAGES', '5710', '4 RUE DE LA PAIX', '75002', 'PARIS', 'communes', true, 'acct_msg', true),
  ('d5400000-0000-4000-8000-000000000002', 'd5200000-0000-4000-8000-000000000002', 'valide', '00000001800010',
   'ARTISAN AUTRE', '1000', '8 RUE DU PORT', '06300', 'NICE', 'communes', true, 'acct_msg_autre', true);
insert into public.projects (id, user_id, status, description, summary, trade_code, ville_code_insee, ville_nom,
  code_postal, adresse, location, criteria_validated_at) values
  ('d5500000-0000-4000-8000-000000000001', 'd5100000-0000-4000-8000-000000000001', 'demande_envoyee',
   'Ajouter des prises.', 'Installation de prises', 'electricien', '06088', 'Nice', '06000',
   '1 Rue de l''Exemple 06000 Nice', 'SRID=4326;POINT(7.26 43.70)', now());
insert into public.requests (id, project_id, artisan_id, particulier_id, contact_phone) values
  ('d5600000-0000-4000-8000-000000000001', 'd5500000-0000-4000-8000-000000000001',
   'd5400000-0000-4000-8000-000000000001', 'd5100000-0000-4000-8000-000000000001', '+33612345678');
-- Rendez-vous fixé par l'artisan : le chantier (et sa conversation) existe.
select pg_temp.connecter('d5200000-0000-4000-8000-000000000001', 'artisan');
select set_config('test.chantier', public.artisan_fix_appointment('d5600000-0000-4000-8000-000000000001',
  current_date + 2, '10:00')::text, true);

select is((select count(*)::int from pg_publication_tables where pubname = 'supabase_realtime'
  and schemaname = 'public' and tablename = 'messages'), 1, 'messages publiés en temps réel');
select is((select public from storage.buckets where id = 'message-attachments'), false,
  'pièces jointes dans un bucket privé');

-- ---------- Envoi ----------
select pg_temp.connecter('d5100000-0000-4000-8000-000000000001', 'particulier');
set local role authenticated;
select throws_ok(format('select public.send_message(%L, %L)', current_setting('test.chantier'), '   '),
  '22023', 'Votre message doit compter entre 1 et 2 000 caractères', 'message vide refusé');
select throws_ok(format('select public.send_message(%L, %L)', current_setting('test.chantier'), repeat('x', 2001)),
  '22023', 'Votre message doit compter entre 1 et 2 000 caractères', 'message trop long refusé');
select lives_ok(format('select public.send_message(%L, %L)', current_setting('test.chantier'),
  '  Bonjour, le portail sera ouvert dès 8 h.  '), 'client : message envoyé');
select lives_ok(format('select public.send_message(%L, %L)', current_setting('test.chantier'), 'Code : 1234A'),
  'client : second message');
select throws_ok(
  format('insert into public.messages (chantier_id, author_id, kind, body) values (%L, auth.uid(), %L, %L)',
    current_setting('test.chantier'), 'texte', 'Direct'),
  '42501', null, 'écriture directe refusée');
reset role;
select results_eq(
  $$ select user_id, data ->> 'destinataire', data ->> 'auteur', (data ->> 'messages')::int, send_after > now()
     from public.notifications where type = 'nouveaux_messages' $$,
  $$ values ('d5200000-0000-4000-8000-000000000001'::uuid, 'artisan'::text, 'Camille'::text, 2, true) $$,
  'artisan : une notification groupée (deux messages), envoyée dans 10 minutes');
select pg_temp.connecter('d5200000-0000-4000-8000-000000000001', 'artisan');
set local role authenticated;
select lives_ok(format('select public.send_message(%L, %L)', current_setting('test.chantier'),
  'Merci, à demain !'), 'artisan : réponse envoyée');
reset role;

-- ---------- Autres comptes ----------
select pg_temp.connecter('d5100000-0000-4000-8000-000000000002', 'particulier');
set local role authenticated;
select throws_ok(format('select public.send_message(%L, %L)', current_setting('test.chantier'), 'Intrus'),
  '42501', 'Conversation introuvable', 'autre client : pas d''envoi');
select is_empty($$ select * from public.messages $$, 'autre client : aucun message visible');
select is_empty(format('select * from public.chantier_messages(%L)', current_setting('test.chantier')),
  'autre client : conversation illisible');
select is_empty($$ select * from public.my_conversations() $$, 'autre client : aucune conversation');
reset role;
select pg_temp.connecter('d5200000-0000-4000-8000-000000000002', 'artisan');
set local role authenticated;
select throws_ok(format('select public.send_message(%L, %L)', current_setting('test.chantier'), 'Intrus'),
  '42501', 'Conversation introuvable', 'autre artisan : pas d''envoi');
select is_empty($$ select * from public.messages $$, 'autre artisan : aucun message visible');
reset role;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
set local role anon;
select throws_ok($$ select * from public.messages $$, '42501', null, 'visiteur : aucune lecture');
select throws_ok(format('select public.send_message(%L, %L)', current_setting('test.chantier'), 'Anonyme'),
  '42501', null, 'visiteur : aucun envoi');
reset role;

-- ---------- Lecture, non lus ----------
select pg_temp.connecter('d5200000-0000-4000-8000-000000000001', 'artisan');
set local role authenticated;
select results_eq(
  $$ select other_name, last_body, last_mine, unread, closed from public.my_conversations() $$,
  $$ values ('Camille Exemple'::text, 'Merci, à demain !'::text, true, 2, false) $$,
  'artisan : conversation listée, deux messages non lus');
select is(public.my_unread_messages(), 2, 'artisan : pastille de deux non lus');
select is(public.mark_conversation_read(current_setting('test.chantier')::uuid), 2,
  'artisan : conversation ouverte, deux messages marqués lus');
select is(public.my_unread_messages(), 0, 'artisan : plus de non lus');
reset role;
select is((select count(*)::int from public.notifications
  where type = 'nouveaux_messages' and user_id = 'd5200000-0000-4000-8000-000000000001'), 0,
  'artisan : e-mail en attente annulé une fois les messages lus');
select results_eq(
  $$ select data ->> 'destinataire', data ->> 'auteur', (data ->> 'messages')::int from public.notifications
     where type = 'nouveaux_messages' and user_id = 'd5100000-0000-4000-8000-000000000001' $$,
  $$ values ('client'::text, 'Xavier'::text, 1) $$,
  'client : notification de la réponse de l''artisan');
select pg_temp.connecter('d5100000-0000-4000-8000-000000000001', 'particulier');
set local role authenticated;
select results_eq(
  format('select mine, kind::text, body, read_at is not null, hidden from public.chantier_messages(%L)',
    current_setting('test.chantier')),
  $$ values (true, 'texte'::text, 'Bonjour, le portail sera ouvert dès 8 h.'::text, true, false),
            (true, 'texte'::text, 'Code : 1234A'::text, true, false),
            (false, 'texte'::text, 'Merci, à demain !'::text, false, false) $$,
  'client : conversation dans l''ordre, ses messages lus par l''artisan');
select results_eq(
  $$ select other_name, unread from public.my_conversations() $$,
  $$ values ('Xavier'::text, 1) $$,
  'client : un message non lu de l''artisan');
reset role;

-- ---------- Pièces jointes (process-upload, service_role) ----------
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
set local role service_role;
select is(public.record_message_attachment(current_setting('test.chantier')::uuid,
  'd5100000-0000-4000-8000-000000000001', 'photo', current_setting('test.chantier') || '/photo.jpg'),
  'ok', 'photo du client jointe');
select is(public.record_message_attachment(current_setting('test.chantier')::uuid,
  'd5200000-0000-4000-8000-000000000001', 'fichier', current_setting('test.chantier') || '/plan.pdf'),
  'ok', 'document PDF de l''artisan joint');
select is(public.record_message_attachment(current_setting('test.chantier')::uuid,
  'd5100000-0000-4000-8000-000000000002', 'photo', current_setting('test.chantier') || '/autre.jpg'),
  'forbidden', 'pièce jointe d''un tiers refusée');
select is(public.record_message_attachment(current_setting('test.chantier')::uuid,
  'd5100000-0000-4000-8000-000000000001', 'texte', current_setting('test.chantier') || '/texte.jpg'),
  'invalid', 'type de pièce jointe invalide');
reset role;
select pg_temp.connecter('d5100000-0000-4000-8000-000000000001', 'particulier');
set local role authenticated;
select throws_ok(format('select public.record_message_attachment(%L, auth.uid(), %L, %L)',
  current_setting('test.chantier'), 'photo', current_setting('test.chantier') || '/x.jpg'),
  '42501', null, 'client : enregistrement direct d''une pièce jointe refusé');

-- ---------- Signalement ----------
select set_config('test.message_artisan', (select message_id::text from public.chantier_messages(
  current_setting('test.chantier')::uuid) where kind = 'texte' and not mine), true);
select throws_ok(format('select public.report_message(%L, %L)', current_setting('test.message_artisan'), 'Court'),
  '22023', 'Décrivez le problème en 10 à 1 000 caractères', 'motif trop court refusé');
select set_config('test.ticket', public.report_message(current_setting('test.message_artisan')::uuid,
  'Propos déplacés dans ce message.')::text, true);
select is(public.report_message(current_setting('test.message_artisan')::uuid, 'Encore un autre motif'),
  current_setting('test.ticket')::uuid, 'un seul signalement ouvert par personne et par message');
reset role;
select pg_temp.connecter('d5100000-0000-4000-8000-000000000002', 'particulier');
set local role authenticated;
select throws_ok(format('select public.report_message(%L, %L)', current_setting('test.message_artisan'),
  'Motif suffisamment long'), '42501', 'Message introuvable', 'autre client : pas de signalement');
reset role;
select results_eq(
  $$ select type::text, message_id::text, contact_email, status::text from public.tickets $$,
  $$ values ('message'::text, current_setting('test.message_artisan'), 'msg.a@example.test'::text, 'ouvert'::text) $$,
  'ticket « message » pour l''équipe');

-- ---------- Masquage par l'équipe ----------
select pg_temp.connecter('d5100000-0000-4000-8000-000000000001', 'particulier');
set local role authenticated;
select throws_ok(format('select public.admin_moderate_message(%L, true, %L)', current_setting('test.message_artisan'),
  'Motif suffisamment long'), '42501', 'Réservé à l''équipe MENAO', 'client : pas de modération');
reset role;
select pg_temp.connecter('d5300000-0000-4000-8000-000000000001', 'support');
set local role authenticated;
select throws_ok(format('select public.admin_moderate_message(%L, true, %L)', current_setting('test.message_artisan'),
  'Court'), '22023', 'Indiquez le motif du masquage en 10 à 500 caractères', 'masquage sans motif refusé');
select lives_ok(format('select public.admin_moderate_message(%L, true, %L)', current_setting('test.message_artisan'),
  'Propos injurieux envers le client'), 'message masqué');
reset role;
select results_eq(
  $$ select (select status::text from public.tickets), (select action from public.audit_logs
       where target_id = current_setting('test.message_artisan')::uuid) $$,
  $$ values ('resolu'::text, 'message.masque'::text) $$,
  'masqué : signalement clos, action journalisée');
select pg_temp.connecter('d5100000-0000-4000-8000-000000000001', 'particulier');
set local role authenticated;
select results_eq(
  format('select body, hidden from public.chantier_messages(%L) where message_id = %L',
    current_setting('test.chantier'), current_setting('test.message_artisan')),
  $$ values (null::text, true) $$,
  'client : contenu du message masqué retiré');
select throws_ok(format('select public.report_message(%L, %L)', current_setting('test.message_artisan'),
  'Motif suffisamment long'), '42501', 'Message introuvable', 'message masqué : plus de signalement');
reset role;
select pg_temp.connecter('d5300000-0000-4000-8000-000000000001', 'support');
set local role authenticated;
select lives_ok(format('select public.admin_moderate_message(%L, false, null)', current_setting('test.message_artisan')),
  'message rétabli');
reset role;
select is((select hidden_at is null and moderation_reason is null from public.messages
  where id = current_setting('test.message_artisan')::uuid), true, 'rétabli : contenu de nouveau visible');

-- ---------- Conversation fermée (chantier annulé) ----------
select pg_temp.connecter('d5200000-0000-4000-8000-000000000001', 'artisan');
select public.artisan_cancel_chantier(current_setting('test.chantier')::uuid, 'Client injoignable');
set local role authenticated;
select throws_ok(format('select public.send_message(%L, %L)', current_setting('test.chantier'), 'Encore ?'),
  '22023', 'Cette conversation est fermée', 'chantier annulé : plus d''envoi');
select is((select closed from public.my_conversations()), true, 'conversation marquée fermée');
reset role;
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
set local role service_role;
select is(public.record_message_attachment(current_setting('test.chantier')::uuid,
  'd5100000-0000-4000-8000-000000000001', 'photo', current_setting('test.chantier') || '/tard.jpg'),
  'locked', 'chantier annulé : plus de pièce jointe');
reset role;

select * from finish();
rollback;
