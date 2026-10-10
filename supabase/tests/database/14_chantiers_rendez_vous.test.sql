-- F-16, F-17, F-18 : chantiers et machine à états (spec §9), rendez-vous, notes privées,
-- annulation, expertise. RLS vérifiée avec chaque rôle (CLAUDE.md).
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

insert into auth.users (id, email, is_anonymous, email_confirmed_at, raw_app_meta_data, raw_user_meta_data) values
  ('e1000000-0000-4000-8000-000000000001', 'ch.client@example.test', false, now(), '{}', '{"first_name":"Camille","last_name":"Exemple"}'),
  ('e1000000-0000-4000-8000-000000000002', 'ch.autre@example.test', false, now(), '{}', '{}'),
  ('e2000000-0000-4000-8000-000000000001', 'ch.x1@example.test', false, now(), '{"role":"artisan"}', '{"first_name":"Xavier"}'),
  ('e2000000-0000-4000-8000-000000000002', 'ch.x2@example.test', false, now(), '{"role":"artisan"}', '{"first_name":"Yasmine"}'),
  ('e2000000-0000-4000-8000-000000000003', 'ch.x3@example.test', false, now(), '{"role":"artisan"}', '{}'),
  ('e3000000-0000-4000-8000-000000000001', 'ch.support@example.test', false, now(), '{"role":"support"}', '{}');

create function pg_temp.connecter(uid uuid, app_role text) returns void language sql as $$
  select set_config('request.jwt.claims', jsonb_build_object(
    'sub', uid, 'role', 'authenticated', 'aal', 'aal1', 'app_metadata', jsonb_build_object('role', app_role)
  )::text, true);
$$;

insert into public.artisans (id, user_id, status, raison_sociale, zone_mode, connect_charges_enabled)
select ('e4000000-0000-4000-8000-00000000000' || n)::uuid, ('e2000000-0000-4000-8000-00000000000' || n)::uuid,
  'valide', 'ARTISAN ' || n, 'communes', true
from generate_series(1, 3) n;

insert into public.projects (id, user_id, status, description, summary, trade_code, ville_code_insee, ville_nom,
  code_postal, adresse, location, criteria_validated_at) values
  ('e5000000-0000-4000-8000-000000000001', 'e1000000-0000-4000-8000-000000000001', 'demande_envoyee',
   'Ajouter deux prises dans la salle de bain.', 'Installation de prises', 'electricien', '06088', 'Nice',
   '06000', '1 Rue de l''Exemple 06000 Nice', 'SRID=4326;POINT(7.26 43.70)', now());

insert into public.requests (id, project_id, artisan_id, particulier_id, contact_phone, status) values
  ('e6000000-0000-4000-8000-000000000001', 'e5000000-0000-4000-8000-000000000001',
   'e4000000-0000-4000-8000-000000000001', 'e1000000-0000-4000-8000-000000000001', '+33612345678', 'envoyee'),
  ('e6000000-0000-4000-8000-000000000002', 'e5000000-0000-4000-8000-000000000001',
   'e4000000-0000-4000-8000-000000000002', 'e1000000-0000-4000-8000-000000000001', '+33612345678', 'envoyee'),
  -- Acceptée avant la phase 3, sans rendez-vous.
  ('e6000000-0000-4000-8000-000000000003', 'e5000000-0000-4000-8000-000000000001',
   'e4000000-0000-4000-8000-000000000003', 'e1000000-0000-4000-8000-000000000001', '+33612345678', 'acceptee');

-- ---------- Référentiel des transitions (même contenu que packages/core) ----------
select results_eq(
  $$ select from_status::text, event::text, to_status::text from public.chantier_transitions order by 1, 2 $$,
  $$ select * from (values
       ('acompte_paye', 'date_confirmee', 'planifie'),
       ('acompte_paye', 'litige_ouvert', 'en_litige'),
       ('demande_envoyee', 'annulation', 'annule'),
       ('demande_envoyee', 'rdv_fixe', 'rdv_planifie'),
       ('devis_en_revision', 'annulation', 'annule'),
       ('devis_en_revision', 'devis_envoye', 'devis_envoye'),
       ('devis_en_revision', 'litige_ouvert', 'en_litige'),
       ('devis_envoye', 'annulation', 'annule'),
       ('devis_envoye', 'devis_refuse', 'devis_refuse'),
       ('devis_envoye', 'devis_signe', 'devis_signe'),
       ('devis_envoye', 'litige_ouvert', 'en_litige'),
       ('devis_envoye', 'revision_demandee', 'devis_en_revision'),
       ('devis_signe', 'acompte_paye', 'acompte_paye'),
       ('devis_signe', 'annulation', 'annule'),
       ('devis_signe', 'litige_ouvert', 'en_litige'),
       ('en_cours', 'fin_declaree', 'travaux_termines'),
       ('en_cours', 'litige_ouvert', 'en_litige'),
       ('en_litige', 'litige_annule', 'annule'),
       ('planifie', 'demarrage', 'en_cours'),
       ('planifie', 'litige_ouvert', 'en_litige'),
       ('rdv_planifie', 'annulation', 'annule'),
       ('rdv_planifie', 'devis_envoye', 'devis_envoye'),
       ('rdv_planifie', 'litige_ouvert', 'en_litige'),
       ('receptionne', 'litige_ouvert', 'en_litige'),
       ('receptionne', 'solde_paye', 'cloture'),
       ('reserves_a_lever', 'litige_ouvert', 'en_litige'),
       ('reserves_a_lever', 'reserves_levees', 'receptionne'),
       ('travaux_termines', 'litige_ouvert', 'en_litige'),
       ('travaux_termines', 'pv_avec_reserves', 'reserves_a_lever'),
       ('travaux_termines', 'pv_sans_reserves', 'receptionne')
     ) v(a, b, c) order by 1, 2 $$,
  '30 transitions autorisées, identiques à packages/core');

-- ---------- Artisan X1 : fixe le rendez-vous ----------
select pg_temp.connecter('e2000000-0000-4000-8000-000000000001', 'artisan');
set local role authenticated;
select throws_ok(
  $$ select public.artisan_fix_appointment('e6000000-0000-4000-8000-000000000001', current_date - 1, '10:00') $$,
  '22023', 'Choisissez une date et une heure à venir', 'rendez-vous dans le passé refusé');
select throws_ok(
  $$ select public.artisan_fix_appointment('e6000000-0000-4000-8000-000000000001', current_date + 200, '10:00') $$,
  '22023', 'Le rendez-vous doit avoir lieu dans les 6 prochains mois', 'rendez-vous à plus de 180 jours refusé');
select throws_ok(
  $$ select public.artisan_fix_appointment('e6000000-0000-4000-8000-000000000001', null, '10:00') $$,
  '22023', 'Indiquez la date et l''heure du rendez-vous', 'date obligatoire');
select throws_ok(
  $$ select public.artisan_fix_appointment('e6000000-0000-4000-8000-000000000002', current_date + 2, '10:00') $$,
  '42501', null, 'demande d''un autre artisan : refusée');
select throws_ok(
  $$ select public.artisan_respond_request('e6000000-0000-4000-8000-000000000001', true) $$,
  '22023', 'Fixez un rendez-vous pour accepter la demande', 'plus d''acceptation sans rendez-vous');

select set_config('test.chantier',
  public.artisan_fix_appointment('e6000000-0000-4000-8000-000000000001', current_date + 2, '10:00')::text, true);
select results_eq(
  $$ select status::text, title, adresse from public.chantiers where id = current_setting('test.chantier')::uuid $$,
  $$ values ('rdv_planifie'::text, 'Installation de prises'::text, '1 Rue de l''Exemple 06000 Nice'::text) $$,
  'chantier créé au rendez-vous fixé');
select results_eq(
  $$ select event::text, from_status::text, to_status::text, actor_role, actor_id from public.chantier_events
     where chantier_id = current_setting('test.chantier')::uuid $$,
  $$ values ('rdv_fixe'::text, 'demande_envoyee'::text, 'rdv_planifie'::text, 'artisan'::text,
             'e2000000-0000-4000-8000-000000000001'::uuid) $$,
  'transition journalisée avec son auteur');
select is(
  (select starts_at from public.appointments where chantier_id = current_setting('test.chantier')::uuid),
  ((current_date + 2) + time '10:00') at time zone 'Europe/Paris',
  'heure du rendez-vous saisie en heure de Paris');
select results_eq(
  $$ select d ->> 'status', d #>> '{client,phone}', d ->> 'adresse', d ->> 'chantier_id'
     from public.artisan_request_detail('e6000000-0000-4000-8000-000000000001') d $$,
  $$ values ('acceptee'::text, '+33612345678'::text, '1 Rue de l''Exemple 06000 Nice'::text, current_setting('test.chantier')) $$,
  'demande acceptée : coordonnées visibles, chantier rattaché');
select throws_ok(
  $$ select public.artisan_fix_appointment('e6000000-0000-4000-8000-000000000001', current_date + 3, '10:00') $$,
  '22023', 'Un rendez-vous est déjà fixé pour cette demande', 'un seul chantier par demande');

-- Écritures directes interdites.
select throws_ok(
  $$ select public.transition_chantier(current_setting('test.chantier')::uuid, 'devis_envoye') $$,
  '42501', null, 'transition_chantier() inaccessible aux utilisateurs');
select throws_ok(
  $$ update public.chantiers set title = 'Piratage' where id = current_setting('test.chantier')::uuid $$,
  '42501', null, 'chantier non modifiable directement');
select throws_ok(
  $$ insert into public.chantiers (project_id, request_id, artisan_id, particulier_id, title)
     values ('e5000000-0000-4000-8000-000000000001', 'e6000000-0000-4000-8000-000000000002',
             'e4000000-0000-4000-8000-000000000001', 'e1000000-0000-4000-8000-000000000001', 'X') $$,
  '42501', null, 'création directe de chantier refusée');
select throws_ok(
  $$ insert into public.chantier_events (chantier_id, event, from_status, to_status, actor_role)
     values (current_setting('test.chantier')::uuid, 'solde_paye', 'receptionne', 'cloture', 'artisan') $$,
  '42501', null, 'écriture directe dans le journal refusée');

-- Notes privées et modification de la date.
select lives_ok(
  $$ select public.artisan_save_appointment_notes(current_setting('test.chantier')::uuid, '  Code portail : 1234  ') $$,
  'notes enregistrées');
select is((select artisan_notes from public.appointments where chantier_id = current_setting('test.chantier')::uuid),
  'Code portail : 1234', 'notes lisibles par l''artisan');
select throws_ok(
  $$ select public.artisan_save_appointment_notes(current_setting('test.chantier')::uuid, repeat('x', 5001)) $$,
  '22023', 'Vos notes dépassent 5 000 caractères', 'notes limitées à 5 000 caractères');
select throws_ok(
  $$ select public.artisan_reschedule_appointment(current_setting('test.chantier')::uuid, current_date - 1, '09:00') $$,
  '22023', 'Choisissez une date et une heure à venir', 'nouvelle date dans le passé refusée');
select lives_ok(
  $$ select public.artisan_reschedule_appointment(current_setting('test.chantier')::uuid, current_date + 3, '14:30') $$,
  'rendez-vous déplacé');
select is((select starts_at from public.appointments where chantier_id = current_setting('test.chantier')::uuid),
  ((current_date + 3) + time '14:30') at time zone 'Europe/Paris', 'nouvelle date enregistrée');
select results_eq(
  $$ select title, artisan_name, client_name from public.chantier_appointment(current_setting('test.chantier')::uuid) $$,
  $$ values ('Installation de prises'::text, 'Xavier'::text, 'Camille Exemple'::text) $$,
  'données du fichier agenda pour l''artisan');
select results_eq(
  $$ select status::text, client_first_name, appointment_at from public.artisan_chantiers() $$,
  $$ values ('rdv_planifie'::text, 'Camille'::text, ((current_date + 3) + time '14:30') at time zone 'Europe/Paris') $$,
  'chantiers de l''artisan avec le prochain rendez-vous');
select results_eq(
  $$ select d #>> '{chantier,status}', d #>> '{appointment,notes}', d #>> '{client,email}'
     from public.artisan_chantier_detail(current_setting('test.chantier')::uuid) d $$,
  $$ values ('rdv_planifie'::text, 'Code portail : 1234'::text, 'ch.client@example.test'::text) $$,
  'détail du chantier : rendez-vous, notes, coordonnées');

-- Expertise d'un autre corps de métier.
select throws_ok(
  $$ select public.artisan_report_expertise('e6000000-0000-4000-8000-000000000001', 'inconnu', null) $$,
  '22023', 'Choisissez le corps de métier nécessaire', 'corps de métier obligatoire');
select set_config('test.ticket',
  public.artisan_report_expertise('e6000000-0000-4000-8000-000000000001', 'plombier', 'Évacuation à reprendre')::text, true);
select is(
  public.artisan_report_expertise('e6000000-0000-4000-8000-000000000001', 'plombier', 'Encore')::text,
  current_setting('test.ticket'), 'un seul signalement ouvert par projet');
select results_eq(
  $$ select type::text, subject, message, contact_email from public.tickets $$,
  $$ values ('expertise'::text, 'Plombier'::text, 'Évacuation à reprendre'::text, 'ch.x1@example.test'::text) $$,
  'ticket d''expertise visible par son auteur');

-- ---------- Artisan X2 : non partie au chantier ----------
reset role;
select pg_temp.connecter('e2000000-0000-4000-8000-000000000002', 'artisan');
set local role authenticated;
select is((select count(*)::int from public.chantiers), 0, 'X2 : chantiers d''autrui invisibles');
select is((select count(*)::int from public.chantier_events), 0, 'X2 : journal d''autrui invisible');
select is((select count(*)::int from public.appointments), 0, 'X2 : rendez-vous d''autrui invisibles');
select is(public.artisan_chantier_detail(current_setting('test.chantier')::uuid), null, 'X2 : détail invisible');
select is((select count(*)::int from public.chantier_appointment(current_setting('test.chantier')::uuid)), 0,
  'X2 : fichier agenda inaccessible');
select throws_ok(
  $$ select public.artisan_reschedule_appointment(current_setting('test.chantier')::uuid, current_date + 4, '10:00') $$,
  '42501', null, 'X2 : déplacement refusé');
select throws_ok($$ select public.artisan_cancel_chantier(current_setting('test.chantier')::uuid, null) $$,
  '42501', null, 'X2 : annulation refusée');
select throws_ok($$ select public.artisan_save_appointment_notes(current_setting('test.chantier')::uuid, 'x') $$,
  '42501', null, 'X2 : notes refusées');
select throws_ok(
  $$ select public.artisan_report_expertise('e6000000-0000-4000-8000-000000000001', 'plombier', null) $$,
  '42501', null, 'X2 : signalement sur la demande d''autrui refusé');
select is((select count(*)::int from public.tickets), 0, 'X2 : tickets d''autrui invisibles');

-- ---------- Particulier : voit le chantier et la date, jamais les notes ----------
reset role;
select pg_temp.connecter('e1000000-0000-4000-8000-000000000001', 'particulier');
set local role authenticated;
select is((select count(*)::int from public.chantiers), 1, 'particulier : voit son chantier');
select is((select count(*)::int from public.chantier_events), 1, 'particulier : voit le journal de son chantier');
select is((select count(*)::int from public.appointments), 0, 'particulier : notes privées de l''artisan invisibles');
select results_eq(
  $$ select chantier_status::text, appointment_at from public.particulier_requests()
     where artisan_id = 'e4000000-0000-4000-8000-000000000001' $$,
  $$ values ('rdv_planifie'::text, ((current_date + 3) + time '14:30') at time zone 'Europe/Paris') $$,
  'particulier : date du rendez-vous dans son suivi');
select is((select count(*)::int from public.chantier_appointment(current_setting('test.chantier')::uuid)), 1,
  'particulier : fichier agenda disponible');
select throws_ok(
  $$ select public.artisan_fix_appointment('e6000000-0000-4000-8000-000000000002', current_date + 2, '10:00') $$,
  '42501', null, 'particulier : ne fixe pas de rendez-vous');

-- ---------- Autre particulier, équipe, visiteur ----------
reset role;
select pg_temp.connecter('e1000000-0000-4000-8000-000000000002', 'particulier');
set local role authenticated;
select is((select count(*)::int from public.chantiers), 0, 'autre particulier : aucun chantier visible');
select is((select count(*)::int from public.chantier_events), 0, 'autre particulier : aucun journal visible');
select is((select count(*)::int from public.chantier_appointment(current_setting('test.chantier')::uuid)), 0,
  'autre particulier : fichier agenda inaccessible');

reset role;
select pg_temp.connecter('e3000000-0000-4000-8000-000000000001', 'support');
set local role authenticated;
select is((select count(*)::int from public.chantiers), 1, 'support : voit les chantiers');
select is((select count(*)::int from public.chantier_events), 1, 'support : voit les journaux');
select is((select count(*)::int from public.appointments), 0, 'support : notes privées invisibles');

reset role;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
set local role anon;
select throws_ok('select 1 from public.chantiers', '42501', null, 'visiteur : aucun accès aux chantiers');
select throws_ok('select 1 from public.chantier_events', '42501', null, 'visiteur : aucun accès aux journaux');
select throws_ok('select 1 from public.appointments', '42501', null, 'visiteur : aucun accès aux rendez-vous');
select is((select count(*)::int from public.chantier_transitions), 30, 'visiteur : référentiel des transitions lisible');
select throws_ok(
  $$ select public.artisan_fix_appointment('e6000000-0000-4000-8000-000000000001', current_date + 2, '10:00') $$,
  '42501', null, 'visiteur : aucune fonction de chantier');

-- ---------- Garde-fous en base (même pour le serveur) ----------
reset role;
select throws_ok(
  $$ update public.chantiers set status = 'cloture' where id = current_setting('test.chantier')::uuid $$,
  '42501', 'L''état d''un chantier ne change que par transition_chantier()', 'état modifiable seulement par transition');
select throws_ok(
  $$ update public.chantiers set artisan_id = 'e4000000-0000-4000-8000-000000000002' where id = current_setting('test.chantier')::uuid $$,
  '42501', 'Les parties d''un chantier ne changent pas', 'parties figées');
select throws_ok(
  $$ insert into public.chantiers (project_id, request_id, artisan_id, particulier_id, title, status)
     values ('e5000000-0000-4000-8000-000000000001', 'e6000000-0000-4000-8000-000000000002',
             'e4000000-0000-4000-8000-000000000002', 'e1000000-0000-4000-8000-000000000001', 'X', 'cloture') $$,
  '42501', 'Un chantier commence à l''état demande_envoyee', 'état initial imposé');
select throws_ok($$ delete from public.chantier_events $$,
  '42501', 'Le journal du chantier est immuable', 'journal non effaçable');
select throws_ok($$ update public.chantier_events set details = '{"x":1}' $$,
  '42501', 'Le journal du chantier est immuable', 'journal non modifiable');

-- Transitions par le serveur (webhooks) : interdites hors du référentiel, litige aller-retour.
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
set local role service_role;
select throws_ok(
  $$ select public.transition_chantier(current_setting('test.chantier')::uuid, 'devis_signe') $$,
  '22023', 'Transition interdite : devis_signe depuis l''état rdv_planifie', 'transition hors référentiel refusée');
select is(public.transition_chantier(current_setting('test.chantier')::uuid, 'litige_ouvert')::text,
  'en_litige', 'litige ouvert');
select throws_ok(
  $$ select public.transition_chantier(current_setting('test.chantier')::uuid, 'annulation') $$,
  '22023', null, 'pas d''annulation simple pendant un litige');
select is(public.transition_chantier(current_setting('test.chantier')::uuid, 'litige_resolu')::text,
  'rdv_planifie', 'litige résolu : retour à l''état précédent');
select is(
  (select actor_role from public.chantier_events where chantier_id = current_setting('test.chantier')::uuid
   order by created_at desc limit 1),
  'systeme', 'transition du serveur journalisée comme « systeme »');
reset role;

-- ---------- Annulation par l'artisan ----------
select pg_temp.connecter('e2000000-0000-4000-8000-000000000001', 'artisan');
set local role authenticated;
select lives_ok(
  $$ select public.artisan_cancel_chantier(current_setting('test.chantier')::uuid, '  Client injoignable  ') $$,
  'chantier annulé');
select results_eq(
  $$ select c.status::text, a.status::text, r.status::text
     from public.chantiers c
     join public.appointments a on a.chantier_id = c.id
     join public.requests r on r.id = c.request_id
     where c.id = current_setting('test.chantier')::uuid $$,
  $$ values ('annule'::text, 'annule'::text, 'annulee'::text) $$,
  'chantier, rendez-vous et demande annulés');
select results_eq(
  $$ select details ->> 'par', details ->> 'motif' from public.chantier_events
     where chantier_id = current_setting('test.chantier')::uuid and event = 'annulation' $$,
  $$ values ('artisan'::text, 'Client injoignable'::text) $$,
  'motif d''annulation journalisé');
select throws_ok($$ select public.artisan_cancel_chantier(current_setting('test.chantier')::uuid, null) $$,
  '22023', 'Ce chantier ne peut plus être annulé', 'annulation définitive');
select throws_ok(
  $$ select public.artisan_reschedule_appointment(current_setting('test.chantier')::uuid, current_date + 5, '10:00') $$,
  '22023', 'Le rendez-vous ne peut plus être modifié', 'plus de déplacement après annulation');
select results_eq(
  $$ select d ->> 'adresse', d #>> '{client,phone}' from public.artisan_request_detail('e6000000-0000-4000-8000-000000000001') d $$,
  $$ values (null::text, null::text) $$,
  'après annulation : coordonnées de nouveau masquées');

reset role;
select pg_temp.connecter('e1000000-0000-4000-8000-000000000001', 'particulier');
set local role authenticated;
select results_eq(
  $$ select status::text, chantier_status::text, appointment_at from public.particulier_requests()
     where artisan_id = 'e4000000-0000-4000-8000-000000000001' $$,
  $$ values ('annulee'::text, 'annule'::text, null::timestamptz) $$,
  'particulier : annulation visible, place libérée');
select is((select count(*)::int from public.chantier_appointment(current_setting('test.chantier')::uuid)), 0,
  'particulier : plus de fichier agenda après annulation');

-- ---------- Demande expirée ; demande acceptée avant la phase 3 ----------
reset role;
update public.requests set expires_at = now() - interval '1 minute' where id = 'e6000000-0000-4000-8000-000000000002';
select pg_temp.connecter('e2000000-0000-4000-8000-000000000002', 'artisan');
set local role authenticated;
select throws_ok(
  $$ select public.artisan_fix_appointment('e6000000-0000-4000-8000-000000000002', current_date + 2, '10:00') $$,
  '22023', 'Cette demande n''attend plus de réponse', 'demande expirée : plus de rendez-vous');
reset role;
select pg_temp.connecter('e2000000-0000-4000-8000-000000000003', 'artisan');
set local role authenticated;
select lives_ok(
  $$ select public.artisan_fix_appointment('e6000000-0000-4000-8000-000000000003', current_date + 2, '08:00') $$,
  'demande acceptée sans rendez-vous : rendez-vous fixé ensuite');

select * from finish();
rollback;
