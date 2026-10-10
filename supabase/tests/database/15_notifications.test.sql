-- F-41 : notifications par e-mail (file d'envoi), déclencheurs, rappel de la veille, lots de la
-- fonction notify. RLS vérifiée avec chaque rôle (CLAUDE.md).
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

insert into auth.users (id, email, is_anonymous, email_confirmed_at, raw_app_meta_data, raw_user_meta_data) values
  ('f1000000-0000-4000-8000-000000000001', 'no.client@example.test', false, now(), '{}', '{"first_name":"Camille","last_name":"Exemple"}'),
  ('f1000000-0000-4000-8000-000000000002', 'no.autre@example.test', false, now(), '{}', '{}'),
  ('f2000000-0000-4000-8000-000000000001', 'no.x1@example.test', false, now(), '{"role":"artisan"}', '{"first_name":"Xavier"}');

create function pg_temp.connecter(uid uuid, app_role text) returns void language sql as $$
  select set_config('request.jwt.claims', jsonb_build_object(
    'sub', uid, 'role', 'authenticated', 'aal', 'aal1', 'app_metadata', jsonb_build_object('role', app_role)
  )::text, true);
$$;

-- Isolement : aucune autre notification (seed) dans les comptages.
delete from public.notifications;

insert into public.artisans (id, user_id, status, raison_sociale, zone_mode, connect_charges_enabled)
values ('f4000000-0000-4000-8000-000000000001', 'f2000000-0000-4000-8000-000000000001', 'valide', 'ARTISAN X', 'communes', true);
insert into public.projects (id, user_id, status, description, summary, trade_code, ville_code_insee, ville_nom,
  code_postal, adresse, location, urgence, criteria_validated_at) values
  ('f5000000-0000-4000-8000-000000000001', 'f1000000-0000-4000-8000-000000000001', 'demande_envoyee',
   'Ajouter deux prises.', 'Installation de prises, appelez le 06 12 34 56 78', 'electricien', '06088', 'Nice',
   '06000', '1 Rue de l''Exemple 06000 Nice', 'SRID=4326;POINT(7.26 43.70)', true, now());

-- ---------- Nouvelle demande : à l'artisan ----------
insert into public.requests (id, project_id, artisan_id, particulier_id, contact_phone) values
  ('f6000000-0000-4000-8000-000000000001', 'f5000000-0000-4000-8000-000000000001',
   'f4000000-0000-4000-8000-000000000001', 'f1000000-0000-4000-8000-000000000001', '+33612345678');
select results_eq(
  $$ select user_id, type::text, status::text, data ->> 'titre', data ->> 'ville', data ->> 'client', (data ->> 'urgence')::boolean,
            data ->> 'request_id'
     from public.notifications $$,
  $$ values ('f2000000-0000-4000-8000-000000000001'::uuid, 'nouvelle_demande'::text, 'a_envoyer'::text,
             'Installation de prises, appelez le [téléphone]'::text, 'Nice'::text, 'Camille'::text, true,
             'f6000000-0000-4000-8000-000000000001'::text) $$,
  'nouvelle demande : notification à l''artisan, sans coordonnées');

-- ---------- Rendez-vous fixé, déplacé : au particulier ----------
select pg_temp.connecter('f2000000-0000-4000-8000-000000000001', 'artisan');
set local role authenticated;
select set_config('test.chantier',
  public.artisan_fix_appointment('f6000000-0000-4000-8000-000000000001', current_date + 3, '16:30')::text, true);
reset role;
select results_eq(
  $$ select user_id, data ->> 'artisan', data ->> 'titre', (data ->> 'rendez_vous')::timestamptz, data ->> 'chantier_id'
     from public.notifications where type = 'rdv_fixe' $$,
  $$ values ('f1000000-0000-4000-8000-000000000001'::uuid, 'Xavier'::text, 'Installation de prises, appelez le 06 12 34 56 78'::text,
             ((current_date + 3) + time '16:30') at time zone 'Europe/Paris', current_setting('test.chantier')) $$,
  'rendez-vous fixé : notification au particulier');

select pg_temp.connecter('f2000000-0000-4000-8000-000000000001', 'artisan');
set local role authenticated;
-- Demain (heure de Paris) à 10 h : sert aussi au rappel de la veille.
select public.artisan_reschedule_appointment(current_setting('test.chantier')::uuid,
  (now() at time zone 'Europe/Paris')::date + 1, '10:00');
select public.artisan_save_appointment_notes(current_setting('test.chantier')::uuid, 'Code 1234');
reset role;
select results_eq(
  $$ select user_id, (data ->> 'rendez_vous')::timestamptz from public.notifications where type = 'rdv_modifie' $$,
  $$ values ('f1000000-0000-4000-8000-000000000001'::uuid,
             (((now() at time zone 'Europe/Paris')::date + 1) + time '10:00') at time zone 'Europe/Paris') $$,
  'rendez-vous déplacé : une notification, les notes ne déclenchent rien');

-- ---------- Rappel de la veille (18 h, heure de Paris) ----------
select is(app.enqueue_appointment_reminders((((now() at time zone 'Europe/Paris')::date) + time '17:00') at time zone 'Europe/Paris'),
  0, 'avant 18 h : pas encore de rappel');
select is(app.enqueue_appointment_reminders((((now() at time zone 'Europe/Paris')::date) + time '18:30') at time zone 'Europe/Paris'),
  1, 'à 18 h 30 la veille : rappel du rendez-vous de demain');
select results_eq(
  $$ select user_id, data ->> 'destinataire', data ->> 'client', data ->> 'adresse', data ->> 'artisan'
     from public.notifications where type = 'rdv_rappel' order by data ->> 'destinataire' $$,
  $$ values ('f2000000-0000-4000-8000-000000000001'::uuid, 'artisan'::text, 'Camille Exemple'::text, '1 Rue de l''Exemple 06000 Nice'::text, null::text),
            ('f1000000-0000-4000-8000-000000000001'::uuid, 'particulier'::text, null::text, null::text, 'Xavier'::text) $$,
  'rappel au particulier et à l''artisan (adresse et nom du client pour l''artisan)');
select is(app.enqueue_appointment_reminders((((now() at time zone 'Europe/Paris')::date) + time '19:30') at time zone 'Europe/Paris'),
  0, 'un seul rappel par rendez-vous');

-- ---------- Annulation par l'artisan : au particulier ----------
select pg_temp.connecter('f2000000-0000-4000-8000-000000000001', 'artisan');
set local role authenticated;
select public.artisan_cancel_chantier(current_setting('test.chantier')::uuid, 'Planning complet');
reset role;
select results_eq(
  $$ select user_id, data ->> 'motif', data ? 'rendez_vous' from public.notifications where type = 'chantier_annule' $$,
  $$ values ('f1000000-0000-4000-8000-000000000001'::uuid, 'Planning complet'::text, false) $$,
  'annulation : notification au particulier avec le motif');
select is((select count(*)::int from public.notifications
           where data ?| array['email', 'phone', 'telephone', 'contact_phone']), 0,
  'aucune adresse e-mail ni téléphone dans les données des notifications');

-- ---------- RLS ----------
select pg_temp.connecter('f1000000-0000-4000-8000-000000000001', 'particulier');
set local role authenticated;
select is((select count(*)::int from public.notifications), 4, 'particulier : ses 4 notifications seulement');
select throws_ok($$ insert into public.notifications (user_id, type) values (auth.uid(), 'rdv_fixe') $$,
  '42501', null, 'particulier : création directe refusée');
select throws_ok($$ update public.notifications set read_at = now() $$,
  '42501', null, 'particulier : modification directe refusée');
select throws_ok($$ select * from public.claim_notifications(10) $$,
  '42501', null, 'particulier : pas d''accès aux lots d''envoi');
reset role;

select pg_temp.connecter('f2000000-0000-4000-8000-000000000001', 'artisan');
set local role authenticated;
select is((select count(*)::int from public.notifications), 2, 'artisan : ses 2 notifications seulement');
reset role;

select pg_temp.connecter('f1000000-0000-4000-8000-000000000002', 'particulier');
set local role authenticated;
select is((select count(*)::int from public.notifications), 0, 'autre compte : aucune notification visible');
reset role;

select set_config('request.jwt.claims', '{"role":"anon"}', true);
set local role anon;
select throws_ok('select 1 from public.notifications', '42501', null, 'visiteur : aucun accès');
reset role;

-- ---------- Lots d'envoi (fonction notify) ----------
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
set local role service_role;
select results_eq(
  $$ select type::text, email, first_name from public.claim_notifications(1) $$,
  $$ values ('nouvelle_demande'::text, 'no.x1@example.test'::text, 'Xavier'::text) $$,
  'lot : la plus ancienne, avec l''adresse et le prénom du destinataire');
select is((select count(*)::int from public.claim_notifications(10)), 5, 'lot suivant : les 5 autres');
select is((select count(*)::int from public.claim_notifications(10)), 0, 'notifications en cours : pas reprises tout de suite');
select is((select count(*)::int from public.notifications where status = 'en_cours' and attempts = 1), 6,
  'toutes en cours, 1re tentative');

select public.complete_notification(
  (select id from public.notifications where type = 'nouvelle_demande'), true);
select public.complete_notification(
  (select id from public.notifications where type = 'rdv_fixe'), false, 'resend 403 validation_error', false);
select public.complete_notification(
  (select id from public.notifications where type = 'rdv_modifie'), false, 'resend 500', true);
select results_eq(
  $$ select type::text, status::text, sent_at is not null, last_error from public.notifications
     where type in ('nouvelle_demande', 'rdv_fixe', 'rdv_modifie') order by type $$,
  $$ values ('nouvelle_demande'::text, 'envoyee'::text, true, null::text),
            ('rdv_fixe'::text, 'echec'::text, false, 'resend 403 validation_error'::text),
            ('rdv_modifie'::text, 'a_envoyer'::text, false, 'resend 500'::text) $$,
  'envoyée, échec définitif, à retenter');
reset role;

update public.notifications set locked_at = now() - interval '11 minutes' where type = 'chantier_annule';
update public.notifications set attempts = 5 where type = 'rdv_modifie';
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
set local role service_role;
select results_eq(
  $$ select type::text from public.claim_notifications(10) $$,
  $$ values ('chantier_annule'::text) $$,
  'reprise après 10 minutes ; plus de tentative au-delà de 5');
reset role;

-- ---------- Appel de la fonction notify ----------
select lives_ok($$ select app.dispatch_notifications() $$, 'sans adresse ni secret dans Vault : aucun appel, sans erreur');
select isnt_empty($$ select 1 from cron.job where jobname = 'menao-envoi-notifications' $$, 'envoi planifié chaque minute');
select isnt_empty($$ select 1 from cron.job where jobname = 'menao-rappels-rendez-vous' $$, 'rappels planifiés');

select * from finish();
rollback;
