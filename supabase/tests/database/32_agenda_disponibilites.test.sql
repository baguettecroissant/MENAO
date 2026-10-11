-- F-44 : agenda et disponibilités de l'artisan (horaires, absences, créneaux bloqués, abonnement
-- .ics), artisan absent retiré des recherches, droits de chaque rôle (CLAUDE.md).
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

insert into auth.users (id, email, is_anonymous, email_confirmed_at, raw_app_meta_data, raw_user_meta_data) values
  ('ad000000-0000-4000-8000-000000000001', 'agenda.client@example.test', false, now(), '{}', '{"first_name":"Camille"}'),
  ('ad000000-0000-4000-8000-000000000002', 'agenda.support@example.test', false, now(), '{"role":"support"}', '{}'),
  ('ad100000-0000-4000-8000-000000000001', 'agenda.a1@example.test', false, now(), '{"role":"artisan"}', '{"first_name":"Noé"}'),
  ('ad100000-0000-4000-8000-000000000002', 'agenda.a2@example.test', false, now(), '{"role":"artisan"}', '{"first_name":"Inès"}');

create function pg_temp.connecter(uid uuid, app_role text) returns void language sql as $$
  select set_config('request.jwt.claims', jsonb_build_object(
    'sub', uid, 'role', 'authenticated', 'aal', 'aal1', 'app_metadata', jsonb_build_object('role', app_role)
  )::text, true);
$$;
-- Date du jour à Paris, décalée de n jours.
create function pg_temp.jour(n int) returns date language sql as $$
  select (now() at time zone 'Europe/Paris')::date + n
$$;

-- A1 : plombier visible à Nice (validé, paiements actifs, abonné) ; A2 : autre artisan.
insert into public.artisans (id, user_id, status, raison_sociale, zone_mode, connect_charges_enabled) values
  ('ad200000-0000-4000-8000-000000000001', 'ad100000-0000-4000-8000-000000000001', 'valide', 'NOE PLOMBERIE', 'communes', true),
  ('ad200000-0000-4000-8000-000000000002', 'ad100000-0000-4000-8000-000000000002', 'valide', 'INES PLOMBERIE', 'communes', true);
insert into public.artisan_trades (artisan_id, trade_code) values ('ad200000-0000-4000-8000-000000000001', 'plombier');
insert into public.artisan_zones (artisan_id, code_insee, nom) values ('ad200000-0000-4000-8000-000000000001', '06088', 'Nice');
insert into public.subscriptions (artisan_id, plan_code, stripe_customer_id, stripe_subscription_id, status, trial_end) values
  ('ad200000-0000-4000-8000-000000000001', 'base', 'cus_agenda_1', 'sub_agenda_1', 'trialing', now() + interval '30 days');
insert into public.projects (id, user_id, status, description, summary, trade_code, ville_code_insee, ville_nom,
  code_postal, adresse, location, ville_location, criteria_validated_at) values
  ('ad300000-0000-4000-8000-000000000001', 'ad000000-0000-4000-8000-000000000001', 'demande_envoyee',
   'Fuite sous l''évier de la cuisine.', 'Fuite sous l''évier', 'plombier', '06088', 'Nice', '06000',
   '1 Rue de l''Exemple 06000 Nice', 'SRID=4326;POINT(7.26 43.70)', 'SRID=4326;POINT(7.262 43.71)', now());
insert into public.requests (id, project_id, artisan_id, particulier_id, contact_phone) values
  ('ad400000-0000-4000-8000-000000000001', 'ad300000-0000-4000-8000-000000000001',
   'ad200000-0000-4000-8000-000000000001', 'ad000000-0000-4000-8000-000000000001', '+33612345678');

-- Isolement : les artisans du seed (visibles à Nice) sont mis en pause le temps du test.
update public.artisans set paused = true where id::text not like 'ad2%';

-- ---------- Pause et date de disponibilité ----------
select pg_temp.connecter('ad100000-0000-4000-8000-000000000001', 'artisan');
set local role authenticated;
select lives_ok($$ select public.set_artisan_available_from(pg_temp.jour(20)) $$, 'date de disponibilité enregistrée');
select lives_ok($$ select public.set_artisan_paused(true) $$, 'mise en pause');
reset role;
select results_eq(
  $$ select paused, available_from - pg_temp.jour(0) from public.artisans where id = 'ad200000-0000-4000-8000-000000000001' $$,
  $$ values (true, 20) $$, 'pause sans effacer la date de disponibilité');
select pg_temp.connecter('ad100000-0000-4000-8000-000000000001', 'artisan');
set local role authenticated;
select lives_ok($$ select public.set_artisan_paused(false) $$, 'reprise des demandes');
select lives_ok($$ select public.set_artisan_available_from(pg_temp.jour(-2)) $$, 'date passée : dès maintenant');
select throws_ok($$ select public.set_artisan_available_from(pg_temp.jour(400)) $$,
  '22023', 'Choisissez une date dans l''année à venir', 'date trop lointaine refusée');
reset role;
select results_eq(
  $$ select paused, available_from from public.artisans where id = 'ad200000-0000-4000-8000-000000000001' $$,
  $$ values (false, null::date) $$, 'disponible dès maintenant');
select pg_temp.connecter('ad000000-0000-4000-8000-000000000001', 'particulier');
set local role authenticated;
select throws_ok($$ select public.set_artisan_paused(true) $$, '42501', 'Fiche artisan introuvable',
  'client : pas de pause');
reset role;

-- ---------- Horaires ----------
select pg_temp.connecter('ad100000-0000-4000-8000-000000000001', 'artisan');
set local role authenticated;
select lives_ok(
  $$ select public.set_artisan_hours('[{"weekday":1,"start":"08:00","end":"12:00"},
       {"weekday":1,"start":"13:30","end":"17:30"},{"weekday":6,"start":"08:00","end":"12:00"}]') $$,
  'horaires enregistrés');
select results_eq(
  $$ select weekday::int, start_time::text, end_time::text from public.artisan_hours order by 1, 2 $$,
  $$ values (1, '08:00:00'::text, '12:00:00'::text), (1, '13:30:00', '17:30:00'), (6, '08:00:00', '12:00:00') $$,
  'artisan : lit ses horaires');
select throws_ok(
  $$ select public.set_artisan_hours('[{"weekday":2,"start":"08:00","end":"12:00"},{"weekday":2,"start":"11:00","end":"14:00"}]') $$,
  '22023', 'Les plages d''une même journée ne doivent pas se chevaucher', 'plages qui se chevauchent refusées');
select throws_ok(
  $$ select public.set_artisan_hours('[{"weekday":3,"start":"06:00","end":"07:00"},{"weekday":3,"start":"08:00","end":"09:00"},
       {"weekday":3,"start":"10:00","end":"11:00"},{"weekday":3,"start":"12:00","end":"13:00"}]') $$,
  '22023', 'Trois plages par jour au plus', 'quatre plages dans la journée refusées');
select throws_ok(
  $$ select public.set_artisan_hours('[{"weekday":4,"start":"12:00","end":"08:00"}]') $$,
  '22023', 'Chaque plage doit commencer avant de finir', 'plage à l''envers refusée');
select throws_ok(
  $$ select public.set_artisan_hours('[{"weekday":8,"start":"08:00","end":"12:00"}]') $$,
  '22023', 'Horaires invalides', 'jour inconnu refusé');
select throws_ok(
  $$ select public.set_artisan_hours('{"weekday":1}') $$, '22023', 'Horaires invalides', 'objet au lieu d''une liste refusé');
select is((select count(*)::int from public.artisan_hours), 3, 'horaires inchangés après les refus');
select throws_ok(
  $$ insert into public.artisan_hours (artisan_id, weekday, start_time, end_time)
     values ('ad200000-0000-4000-8000-000000000001', 2, '08:00', '12:00') $$,
  '42501', null, 'écriture directe refusée');

-- ---------- Absences ----------
select lives_ok(
  $$ select public.add_artisan_absence(pg_temp.jour(10), pg_temp.jour(14), ' Congés ') $$, 'absence ajoutée');
select results_eq(
  $$ select ends_on - starts_on, label from public.artisan_absences $$,
  $$ values (4, 'Congés'::text) $$, 'artisan : lit ses absences, motif nettoyé');
select throws_ok(
  $$ select public.add_artisan_absence(pg_temp.jour(14), pg_temp.jour(20), null) $$,
  '22023', 'Cette absence chevauche une absence déjà prévue', 'absences qui se chevauchent refusées');
select throws_ok(
  $$ select public.add_artisan_absence(pg_temp.jour(-10), pg_temp.jour(-1), null) $$,
  '22023', 'Cette absence est déjà terminée', 'absence passée refusée');
select throws_ok(
  $$ select public.add_artisan_absence(pg_temp.jour(5), pg_temp.jour(3), null) $$,
  '22023', 'Le dernier jour doit suivre le premier', 'dates à l''envers refusées');
select throws_ok(
  $$ select public.add_artisan_absence(pg_temp.jour(1), pg_temp.jour(366), null) $$,
  '22023', 'Une absence dure un an au plus', 'absence de plus d''un an refusée');
select throws_ok(
  $$ select public.add_artisan_absence(pg_temp.jour(400), pg_temp.jour(401), null) $$,
  '22023', 'Une absence se déclare au plus un an à l''avance', 'absence trop lointaine refusée');
select throws_ok(
  $$ select public.add_artisan_absence(pg_temp.jour(30), pg_temp.jour(31), repeat('x', 81)) $$,
  '22023', 'Motif trop long (80 caractères au plus)', 'motif trop long refusé');
reset role;

-- ---------- Recherche : absence à venir sans effet, absence en cours = artisan retiré ----------
select pg_temp.connecter('ad000000-0000-4000-8000-000000000001', 'particulier');
set local role authenticated;
select results_eq(
  $$ select artisan_id from public.match_artisans('ad300000-0000-4000-8000-000000000001') $$,
  $$ values ('ad200000-0000-4000-8000-000000000001'::uuid) $$, 'absence à venir : artisan toujours proposé');
reset role;
select pg_temp.connecter('ad100000-0000-4000-8000-000000000001', 'artisan');
set local role authenticated;
select set_config('test.absence',
  public.add_artisan_absence(pg_temp.jour(-1), pg_temp.jour(1), null)::text, true);
reset role;
select pg_temp.connecter('ad000000-0000-4000-8000-000000000001', 'particulier');
set local role authenticated;
select is_empty(
  $$ select * from public.match_artisans('ad300000-0000-4000-8000-000000000001') $$,
  'absent aujourd''hui : retiré des résultats');
select is(public.artisan_public_profile('ad200000-0000-4000-8000-000000000001') ->> 'paused', 'true',
  'fiche : indisponible pendant l''absence');
reset role;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
set local role anon;
select is_empty(
  $$ select * from public.public_artisans_for_commune('plombier', '06088') $$,
  'pages publiques : artisan absent retiré');
select throws_ok($$ select * from public.artisan_absences $$, '42501', null, 'visiteur : aucune lecture des absences');
select throws_ok($$ select * from public.artisan_hours $$, '42501', null, 'visiteur : aucune lecture des horaires');
select throws_ok($$ select public.renew_artisan_calendar_feed() $$, '42501', null, 'visiteur : pas de lien d''abonnement');
reset role;

-- ---------- Autre artisan, client et équipe ----------
select pg_temp.connecter('ad100000-0000-4000-8000-000000000002', 'artisan');
set local role authenticated;
select is_empty($$ select * from public.artisan_hours $$, 'autre artisan : horaires invisibles');
select is_empty($$ select * from public.artisan_absences $$, 'autre artisan : absences invisibles');
select throws_ok(
  $$ select public.delete_artisan_absence(current_setting('test.absence')::uuid) $$,
  '42501', 'Absence introuvable', 'autre artisan : suppression refusée');
reset role;
select pg_temp.connecter('ad000000-0000-4000-8000-000000000001', 'particulier');
set local role authenticated;
select is_empty($$ select * from public.artisan_absences $$, 'client : absences invisibles');
select throws_ok($$ select public.set_artisan_hours('[]') $$, '42501', 'Fiche artisan introuvable',
  'client : pas d''horaires');
reset role;
select pg_temp.connecter('ad000000-0000-4000-8000-000000000002', 'support');
set local role authenticated;
select is((select count(*)::int from public.artisan_absences
  where artisan_id = 'ad200000-0000-4000-8000-000000000001'), 2, 'équipe : lit les absences');
select is((select count(*)::int from public.artisan_hours
  where artisan_id = 'ad200000-0000-4000-8000-000000000001'), 3, 'équipe : lit les horaires');
reset role;

-- Fin de l'absence en cours : l'artisan est de nouveau proposé.
select pg_temp.connecter('ad100000-0000-4000-8000-000000000001', 'artisan');
set local role authenticated;
select lives_ok($$ select public.delete_artisan_absence(current_setting('test.absence')::uuid) $$,
  'absence supprimée');
reset role;
select pg_temp.connecter('ad000000-0000-4000-8000-000000000001', 'particulier');
set local role authenticated;
select results_eq(
  $$ select artisan_id from public.match_artisans('ad300000-0000-4000-8000-000000000001') $$,
  $$ values ('ad200000-0000-4000-8000-000000000001'::uuid) $$, 'absence supprimée : artisan de nouveau proposé');
reset role;

-- ---------- Créneaux bloqués ----------
select pg_temp.connecter('ad100000-0000-4000-8000-000000000001', 'artisan');
set local role authenticated;
select set_config('test.creneau',
  public.add_artisan_blocked_slot(pg_temp.jour(2), '14:00', '16:00', 'Rendez-vous personnel')::text, true);
select results_eq(
  $$ select (starts_at at time zone 'Europe/Paris')::time::text, (ends_at - starts_at)::text, label
     from public.artisan_blocked_slots $$,
  $$ values ('14:00:00'::text, '02:00:00'::text, 'Rendez-vous personnel'::text) $$,
  'créneau bloqué en heure de Paris');
select throws_ok(
  $$ select public.add_artisan_blocked_slot(pg_temp.jour(2), '16:00', '14:00', null) $$,
  '22023', 'L''heure de fin doit suivre l''heure de début', 'créneau à l''envers refusé');
select throws_ok(
  $$ select public.add_artisan_blocked_slot(pg_temp.jour(-1), '08:00', '09:00', null) $$,
  '22023', 'Ce créneau est déjà passé', 'créneau passé refusé');
select throws_ok(
  $$ select public.add_artisan_blocked_slot(pg_temp.jour(400), '08:00', '09:00', null) $$,
  '22023', 'Un créneau se bloque au plus un an à l''avance', 'créneau trop lointain refusé');
-- Rendez-vous de visite : chantier créé, dans l'agenda et l'abonnement.
select set_config('test.chantier',
  public.artisan_fix_appointment('ad400000-0000-4000-8000-000000000001', pg_temp.jour(3), '10:00')::text, true);
reset role;
select pg_temp.connecter('ad000000-0000-4000-8000-000000000002', 'support');
set local role authenticated;
select is_empty($$ select * from public.artisan_blocked_slots $$, 'équipe : créneaux bloqués (notes personnelles) invisibles');
reset role;
select pg_temp.connecter('ad100000-0000-4000-8000-000000000002', 'artisan');
set local role authenticated;
select is_empty($$ select * from public.artisan_blocked_slots $$, 'autre artisan : créneaux invisibles');
select throws_ok(
  $$ select public.delete_artisan_blocked_slot(current_setting('test.creneau')::uuid) $$,
  '42501', 'Créneau introuvable', 'autre artisan : suppression du créneau refusée');
reset role;

-- ---------- Abonnement .ics ----------
select pg_temp.connecter('ad100000-0000-4000-8000-000000000001', 'artisan');
set local role authenticated;
select set_config('test.jeton', public.renew_artisan_calendar_feed(), true);
select ok(current_setting('test.jeton') ~ '^[0-9a-f]{48}$', 'lien d''abonnement : jeton aléatoire de 48 caractères');
select is((select token from public.artisan_calendar_feeds), current_setting('test.jeton'), 'artisan : lit son lien');
reset role;
select pg_temp.connecter('ad000000-0000-4000-8000-000000000002', 'support');
set local role authenticated;
select is_empty($$ select * from public.artisan_calendar_feeds $$, 'équipe : lien d''abonnement invisible');
reset role;

select set_config('request.jwt.claims', '{"role":"anon"}', true);
set local role anon;
select results_eq(
  $$ select kind, title, place from public.artisan_calendar_events(current_setting('test.jeton')) order by kind $$,
  $$ values ('absence'::text, 'Congés'::text, null::text),
            ('creneau', 'Rendez-vous personnel', null),
            ('visite', 'Fuite sous l''évier', '06000 Nice') $$,
  'abonnement : absences, créneaux et visites, avec la commune seulement');
select results_eq(
  $$ select chantier_id = current_setting('test.chantier')::uuid from public.artisan_calendar_events(current_setting('test.jeton'))
     where kind = 'visite' $$,
  $$ values (true) $$, 'abonnement : visite reliée à son chantier');
select throws_ok(
  $$ select * from public.artisan_calendar_events(repeat('0', 48)) $$, 'P0002', 'Lien d''abonnement inconnu',
  'jeton inconnu : refusé');
select throws_ok(
  $$ select * from public.artisan_calendar_events('pas-un-jeton') $$, 'P0002', 'Lien d''abonnement inconnu',
  'jeton mal formé : refusé');
reset role;
select isnt((select last_read_at from public.artisan_calendar_feeds
  where artisan_id = 'ad200000-0000-4000-8000-000000000001'), null, 'dernière lecture notée');

-- Renouvellement : l'ancien lien ne donne plus rien ; désactivation.
select pg_temp.connecter('ad100000-0000-4000-8000-000000000001', 'artisan');
set local role authenticated;
select isnt(public.renew_artisan_calendar_feed(), current_setting('test.jeton'), 'nouveau lien');
reset role;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
set local role anon;
select throws_ok(
  $$ select * from public.artisan_calendar_events(current_setting('test.jeton')) $$, 'P0002', 'Lien d''abonnement inconnu',
  'ancien lien désactivé');
reset role;
select pg_temp.connecter('ad100000-0000-4000-8000-000000000001', 'artisan');
set local role authenticated;
select lives_ok($$ select public.disable_artisan_calendar_feed() $$, 'abonnement désactivé');
select is_empty($$ select * from public.artisan_calendar_feeds $$, 'plus de lien d''abonnement');
select lives_ok($$ select public.delete_artisan_blocked_slot(current_setting('test.creneau')::uuid) $$,
  'créneau supprimé');
reset role;

select * from finish();
rollback;
