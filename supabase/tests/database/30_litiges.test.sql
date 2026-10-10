-- F-42 : « Signaler un problème lié au chantier » : ticket, chantier en litige, échanges avec le
-- support, photos, décision de l'équipe (reprise ou annulation), notifications, droits de chaque
-- rôle (CLAUDE.md).
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

insert into auth.users (id, email, is_anonymous, email_confirmed_at, raw_app_meta_data, raw_user_meta_data) values
  ('d6100000-0000-4000-8000-000000000001', 'litige.a@example.test', false, now(), '{}', '{"first_name":"Camille"}'),
  ('d6100000-0000-4000-8000-000000000002', 'litige.b@example.test', false, now(), '{}', '{"first_name":"Alex"}'),
  ('d6200000-0000-4000-8000-000000000001', 'litige.artisan@example.test', false, now(), '{"role":"artisan"}', '{"first_name":"Xavier"}'),
  ('d6300000-0000-4000-8000-000000000001', 'litige.support@example.test', false, now(), '{"role":"support"}', '{}');

create function pg_temp.connecter(uid uuid, app_role text) returns void language sql as $$
  select set_config('request.jwt.claims', jsonb_build_object(
    'sub', uid, 'role', 'authenticated', 'aal', 'aal1', 'app_metadata', jsonb_build_object('role', app_role)
  )::text, true);
$$;

insert into public.artisans (id, user_id, status, siret, raison_sociale, forme_juridique_code, adresse_ligne,
  adresse_code_postal, adresse_commune, zone_mode, connect_charges_enabled, stripe_account_id, assujetti_tva) values
  ('d6400000-0000-4000-8000-000000000001', 'd6200000-0000-4000-8000-000000000001', 'valide', '00000002600013',
   'ARTISAN LITIGE', '5710', '4 RUE DE LA PAIX', '75002', 'PARIS', 'communes', true, 'acct_litige', true);
insert into public.projects (id, user_id, status, description, summary, trade_code, ville_code_insee, ville_nom,
  code_postal, adresse, location, criteria_validated_at) values
  ('d6500000-0000-4000-8000-000000000001', 'd6100000-0000-4000-8000-000000000001', 'demande_envoyee',
   'Ajouter des prises.', 'Installation de prises', 'electricien', '06088', 'Nice', '06000',
   '1 Rue de l''Exemple 06000 Nice', 'SRID=4326;POINT(7.26 43.70)', now());
insert into public.requests (id, project_id, artisan_id, particulier_id, contact_phone) values
  ('d6600000-0000-4000-8000-000000000001', 'd6500000-0000-4000-8000-000000000001',
   'd6400000-0000-4000-8000-000000000001', 'd6100000-0000-4000-8000-000000000001', '+33612345678');
select pg_temp.connecter('d6200000-0000-4000-8000-000000000001', 'artisan');
select set_config('test.chantier', public.artisan_fix_appointment('d6600000-0000-4000-8000-000000000001',
  current_date + 2, '10:00')::text, true);

-- ---------- Signalement ----------
select pg_temp.connecter('d6100000-0000-4000-8000-000000000002', 'particulier');
set local role authenticated;
select throws_ok(format('select public.report_chantier_problem(%L, %L, %L)', current_setting('test.chantier'),
  'retard', 'Le rendez-vous n''a pas été honoré.'), '42501', 'Chantier introuvable', 'autre client : pas de signalement');
reset role;
select pg_temp.connecter('d6100000-0000-4000-8000-000000000001', 'particulier');
set local role authenticated;
select throws_ok(format('select public.report_chantier_problem(%L, %L, %L)', current_setting('test.chantier'),
  'retard', 'Trop court'), '22023', 'Décrivez le problème en 20 à 2 000 caractères', 'description trop courte refusée');
select throws_ok(format('select public.report_chantier_problem(%L, null, %L)', current_setting('test.chantier'),
  'Le rendez-vous n''a pas été honoré.'), '22023', 'Choisissez la nature du problème', 'catégorie obligatoire');
select set_config('test.ticket', public.report_chantier_problem(current_setting('test.chantier')::uuid, 'retard',
  '  Le rendez-vous n''a pas été honoré, sans prévenir.  ')::text, true);
select is(public.report_chantier_problem(current_setting('test.chantier')::uuid, 'autre', 'Un autre motif décrit ici.'),
  current_setting('test.ticket')::uuid, 'un seul signalement ouvert par personne et par chantier');
select throws_ok(
  format('insert into public.ticket_messages (ticket_id, author_id, from_staff, body) values (%L, auth.uid(), true, %L)',
    current_setting('test.ticket'), 'Faux support'),
  '42501', null, 'écriture directe refusée');
reset role;
select results_eq(
  $$ select t.type::text, t.category::text, t.message, t.status::text, c.status::text
     from public.tickets t join public.chantiers c on c.id = t.chantier_id $$,
  $$ values ('litige'::text, 'retard'::text, 'Le rendez-vous n''a pas été honoré, sans prévenir.'::text,
             'ouvert'::text, 'en_litige'::text) $$,
  'ticket « litige » ouvert, chantier en litige');
select results_eq(
  $$ select e.from_status::text, e.details ->> 'par', e.details ->> 'categorie' from public.chantier_events e
     where e.chantier_id = current_setting('test.chantier')::uuid and e.event = 'litige_ouvert' $$,
  $$ values ('rdv_planifie'::text, 'client'::text, 'retard'::text) $$,
  'transition litige_ouvert journalisée');
select results_eq(
  $$ select user_id, data ->> 'destinataire', data ->> 'categorie', data ? 'message' from public.notifications
     where type = 'litige_ouvert' $$,
  $$ values ('d6200000-0000-4000-8000-000000000001'::uuid, 'artisan'::text, 'retard'::text, false) $$,
  'artisan informé du litige, sans la description');

-- L'artisan signale aussi un problème : son propre ticket, le chantier reste en litige.
select pg_temp.connecter('d6200000-0000-4000-8000-000000000001', 'artisan');
set local role authenticated;
select set_config('test.ticket_artisan', public.report_chantier_problem(current_setting('test.chantier')::uuid,
  'comportement', 'Le client refuse l''accès au chantier.')::text, true);
select is((select count(*)::int from public.tickets), 1, 'artisan : voit seulement son signalement');
reset role;
select pg_temp.connecter('d6100000-0000-4000-8000-000000000002', 'particulier');
set local role authenticated;
select is_empty($$ select * from public.tickets $$, 'autre client : aucun signalement visible');
reset role;

-- ---------- Échanges avec le support ----------
select pg_temp.connecter('d6200000-0000-4000-8000-000000000001', 'artisan');
set local role authenticated;
select throws_ok(format('select public.add_ticket_message(%L, %L)', current_setting('test.ticket'), 'Intrusion'),
  '42501', 'Signalement introuvable', 'artisan : pas de message dans le ticket du client');
select is_empty(format('select * from public.ticket_messages where ticket_id = %L', current_setting('test.ticket')),
  'artisan : échanges du client invisibles');
reset role;
select pg_temp.connecter('d6100000-0000-4000-8000-000000000001', 'particulier');
set local role authenticated;
select lives_ok(format('select public.add_ticket_message(%L, %L)', current_setting('test.ticket'),
  'J''ai attendu toute la matinée.'), 'client : message ajouté');
reset role;
select pg_temp.connecter('d6300000-0000-4000-8000-000000000001', 'support');
set local role authenticated;
select lives_ok(format('select public.add_ticket_message(%L, %L)', current_setting('test.ticket'),
  'Nous contactons l''artisan aujourd''hui.'), 'équipe : réponse ajoutée');
reset role;
select results_eq(
  $$ select status::text from public.tickets where id = current_setting('test.ticket')::uuid $$,
  $$ values ('en_cours'::text) $$, 'ticket passé en cours à la première réponse');
select results_eq(
  $$ select user_id, data ->> 'ticket_id' from public.notifications where type = 'reponse_support' $$,
  $$ values ('d6100000-0000-4000-8000-000000000001'::uuid, current_setting('test.ticket')) $$,
  'client notifié de la réponse du support');
select pg_temp.connecter('d6100000-0000-4000-8000-000000000001', 'particulier');
set local role authenticated;
select results_eq(
  format('select from_staff, body from public.ticket_messages where ticket_id = %L order by created_at',
    current_setting('test.ticket')),
  $$ values (false, 'J''ai attendu toute la matinée.'::text), (true, 'Nous contactons l''artisan aujourd''hui.'::text) $$,
  'client : échanges du ticket dans l''ordre');
reset role;

-- ---------- Photos (process-upload, service_role) ----------
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
set local role service_role;
select is(public.record_ticket_photo(current_setting('test.ticket')::uuid, 'd6100000-0000-4000-8000-000000000001',
  current_setting('test.ticket') || '/photo.jpg'), 'ok', 'photo du déclarant ajoutée');
select is(public.record_ticket_photo(current_setting('test.ticket')::uuid, 'd6200000-0000-4000-8000-000000000001',
  current_setting('test.ticket') || '/autre.jpg'), 'forbidden', 'photo d''un tiers refusée');
reset role;

-- ---------- Décision de l'équipe ----------
select pg_temp.connecter('d6100000-0000-4000-8000-000000000001', 'particulier');
set local role authenticated;
select throws_ok(format('select public.admin_close_dispute(%L, %L, %L)', current_setting('test.ticket'), 'reprise',
  'Décision suffisamment longue'), '42501', 'Réservé à l''équipe MENAO', 'client : pas de décision');
reset role;
select pg_temp.connecter('d6300000-0000-4000-8000-000000000001', 'support');
set local role authenticated;
select throws_ok(format('select public.admin_close_dispute(%L, %L, %L)', current_setting('test.ticket'), 'reprise',
  'Court'), '22023', 'Expliquez la décision en 10 à 2 000 caractères', 'décision sans explication refusée');
select throws_ok(format('select public.admin_close_dispute(%L, %L, %L)', current_setting('test.ticket'), 'remboursement',
  'Décision suffisamment longue'), '22023', 'Choisissez la décision : reprise ou annulation du chantier',
  'décision inconnue refusée');
select lives_ok(format('select public.admin_close_dispute(%L, %L, %L)', current_setting('test.ticket'), 'reprise',
  'Nouveau rendez-vous convenu avec l''artisan.'), 'litige clos : reprise du chantier');
reset role;
select results_eq(
  $$ select c.status::text, t.status::text, (select action from public.audit_logs where target_id = t.id)
     from public.tickets t join public.chantiers c on c.id = t.chantier_id
     where t.id = current_setting('test.ticket')::uuid $$,
  $$ values ('rdv_planifie'::text, 'resolu'::text, 'litige.clos'::text) $$,
  'reprise : chantier revenu à son état d''avant le litige, ticket résolu, décision journalisée');
select results_eq(
  $$ select data ->> 'destinataire', data ->> 'decision', data ->> 'ticket_id' from public.notifications
     where type = 'litige_clos' order by data ->> 'destinataire' $$,
  $$ values ('artisan'::text, 'reprise'::text, null::text),
            ('client'::text, 'reprise'::text, current_setting('test.ticket')) $$,
  'décision notifiée aux deux parties, lien vers le ticket pour le déclarant');
select pg_temp.connecter('d6100000-0000-4000-8000-000000000001', 'particulier');
set local role authenticated;
select throws_ok(format('select public.add_ticket_message(%L, %L)', current_setting('test.ticket'), 'Encore'),
  '22023', 'Ce signalement est clos', 'ticket clos : plus de message');
reset role;

-- Ticket de l'artisan : le chantier n'est plus en litige, il ne peut qu'être clos.
select pg_temp.connecter('d6300000-0000-4000-8000-000000000001', 'support');
set local role authenticated;
select throws_ok(format('select public.admin_close_dispute(%L, %L, %L)', current_setting('test.ticket_artisan'),
  'annulation', 'Annulation demandée par l''artisan'), '22023',
  'Seul un chantier en litige peut être annulé par l''équipe', 'annulation hors litige refusée');
select lives_ok(format('select public.admin_close_dispute(%L, %L, %L)', current_setting('test.ticket_artisan'),
  'reprise', 'Situation réglée avec le client.'), 'ticket de l''artisan clos');
reset role;

-- Nouveau litige, cette fois annulé par l'équipe.
select pg_temp.connecter('d6100000-0000-4000-8000-000000000001', 'particulier');
select set_config('test.ticket2', public.report_chantier_problem(current_setting('test.chantier')::uuid, 'comportement',
  'L''artisan ne répond plus à mes messages.')::text, true);
select pg_temp.connecter('d6300000-0000-4000-8000-000000000001', 'support');
set local role authenticated;
select lives_ok(format('select public.admin_close_dispute(%L, %L, %L)', current_setting('test.ticket2'), 'annulation',
  'Chantier annulé d''un commun accord.'), 'litige clos : annulation');
reset role;
select is((select status::text from public.chantiers where id = current_setting('test.chantier')::uuid), 'annule',
  'annulation : chantier annulé');
select set_config('request.jwt.claims', '{"role":"anon"}', true);
set local role anon;
select throws_ok($$ select * from public.ticket_messages $$, '42501', null, 'visiteur : aucune lecture');
reset role;

select * from finish();
rollback;
