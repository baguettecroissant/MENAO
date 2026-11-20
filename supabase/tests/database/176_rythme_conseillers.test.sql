-- Rythme des conseillers (F-184, lot 78, ADR 0381) : objectif de la semaine (démarrage, objectif
-- propre), « Mes résultats » du conseiller (ses semaines, le classement en prénom et initiale),
-- onglet Rythme et réglages réservés aux administrateurs (aal2), journalisés, e-mail du lundi une
-- seule fois par semaine. Données fictives (example.test, SIRET 00000176…) ; le seed est chargé
-- avant : on ne compte que nos lignes.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

insert into auth.users (id, email, is_anonymous, email_confirmed_at, raw_app_meta_data, raw_user_meta_data) values
  ('e1760000-0000-4000-8000-000000000001', 'rythme176.admin@example.test', false, now(), '{"role":"admin"}', '{}'),
  ('e1760000-0000-4000-8000-000000000002', 'rythme176.sarah@example.test', false, now(), '{"role":"commercial"}', '{}'),
  ('e1760000-0000-4000-8000-000000000003', 'rythme176.ines@example.test', false, now(), '{"role":"commercial"}', '{}'),
  ('e1760000-0000-4000-8000-000000000004', 'rythme176.paul@example.test', false, now(), '{"role":"commercial"}', '{}'),
  ('e1760000-0000-4000-8000-000000000005', 'rythme176.client@example.test', false, now(), '{"role":"particulier"}', '{}'),
  ('e1760000-0000-4000-8000-000000000011', 'rythme176.artisan1@example.test', false, now(), '{"role":"artisan"}', '{}'),
  ('e1760000-0000-4000-8000-000000000012', 'rythme176.artisan2@example.test', false, now(), '{"role":"artisan"}', '{}'),
  ('e1760000-0000-4000-8000-000000000013', 'rythme176.artisan3@example.test', false, now(), '{"role":"artisan"}', '{}');

create function pg_temp.connecter(uid uuid, app_role text, aal text default 'aal2') returns void language sql as $$
  select set_config('request.jwt.claims', jsonb_build_object(
    'sub', uid, 'role', 'authenticated', 'aal', aal, 'app_metadata', jsonb_build_object('role', app_role)
  )::text, true);
$$;

-- Semaine en cours (lundi, heure de Paris).
create function pg_temp.lundi() returns date language sql as $$
  select date_trunc('week', now() at time zone 'Europe/Paris')::date
$$;
grant execute on function pg_temp.lundi() to authenticated;

-- Sarah : arrivée il y a 5 semaines ; Inès : cette semaine ; Paul : suspendu.
insert into public.commercials (id, user_id, code, nom, status, created_at) values
  ('e1762000-0000-4000-8000-000000000001', 'e1760000-0000-4000-8000-000000000002', 'sarah-176', '  Sarah   Kaci ', 'actif',
   now() - interval '35 days'),
  ('e1762000-0000-4000-8000-000000000002', 'e1760000-0000-4000-8000-000000000003', 'ines-176', 'Inès Martin', 'actif', now()),
  ('e1762000-0000-4000-8000-000000000003', 'e1760000-0000-4000-8000-000000000004', 'paul-176', 'Paul Girard', 'suspendu',
   now() - interval '60 days');

-- Deux artisans de Sarah validés la semaine dernière, un en vérification.
insert into public.artisans (id, user_id, raison_sociale, status) values
  ('e1761000-0000-4000-8000-000000000001', 'e1760000-0000-4000-8000-000000000011', 'PLOMBERIE R176 UN', 'valide'),
  ('e1761000-0000-4000-8000-000000000002', 'e1760000-0000-4000-8000-000000000012', 'ELEC R176 DEUX', 'valide'),
  ('e1761000-0000-4000-8000-000000000003', 'e1760000-0000-4000-8000-000000000013', 'MACON R176 TROIS', 'en_verification');
insert into public.commercial_attributions (artisan_id, commercial_id) values
  ('e1761000-0000-4000-8000-000000000001', 'e1762000-0000-4000-8000-000000000001'),
  ('e1761000-0000-4000-8000-000000000002', 'e1762000-0000-4000-8000-000000000001'),
  ('e1761000-0000-4000-8000-000000000003', 'e1762000-0000-4000-8000-000000000001');
insert into public.artisan_reviews (artisan_id, decision, created_at) values
  ('e1761000-0000-4000-8000-000000000001', 'valide', (pg_temp.lundi() - 5 + time '10:00') at time zone 'Europe/Paris'),
  ('e1761000-0000-4000-8000-000000000002', 'valide', (pg_temp.lundi() - 3 + time '10:00') at time zone 'Europe/Paris');

-- Réglages par défaut : 7 par semaine, 3 les 2 premières semaines.
update public.launch_settings set rythme_semaine = 7, rythme_demarrage = 3, semaines_demarrage = 2,
  classement_visible = true, email_lundi = true, email_lundi_envoye = null where id;

-- ---------------------------------------------------------------------------------------------
-- Règles
-- ---------------------------------------------------------------------------------------------
select is(app.pace_objective(date '2027-01-13', null, date '2027-01-04'), null, 'avant son arrivée : aucun objectif');
select is(app.pace_objective(date '2027-01-13', null, date '2027-01-11'), 3, 'semaine d''arrivée : démarrage');
select is(app.pace_objective(date '2027-01-13', null, date '2027-01-18'), 3, '2e semaine : démarrage');
select is(app.pace_objective(date '2027-01-13', null, date '2027-01-25'), 7, '3e semaine : rythme commun');
select is(app.pace_objective(date '2027-01-13', 4, date '2027-01-25'), 4, 'objectif propre après le démarrage');
select is(app.pace_objective(date '2027-01-13', 2, date '2027-01-11'), 2, 'objectif propre plus bas que le démarrage');
select is(app.short_person_name('  Sarah   kaci '), 'Sarah K.', 'prénom et initiale');
select is(app.short_person_name('Inès'), 'Inès', 'prénom seul');
select is(app.notification_category('conseiller_semaine'), 'rappels', 'e-mail du lundi : un rappel, qui se coupe');
select is(app.notification_category('finalisation_relance'), 'rappels', 'les autres rappels inchangés');

-- ---------------------------------------------------------------------------------------------
-- Accès
-- ---------------------------------------------------------------------------------------------
set local role anon;
select throws_ok($$ select public.commercial_pace() $$, '42501', null, 'visiteur : refusé');
select throws_ok($$ select public.admin_commercial_pace() $$, '42501', null, 'visiteur : onglet Rythme refusé');
reset role;

select pg_temp.connecter('e1760000-0000-4000-8000-000000000005', 'particulier');
set local role authenticated;
select throws_ok($$ select public.commercial_pace() $$, '42501', null, 'particulier : refusé');
reset role;

-- ---------------------------------------------------------------------------------------------
-- « Mes résultats » de Sarah
-- ---------------------------------------------------------------------------------------------
select pg_temp.connecter('e1760000-0000-4000-8000-000000000002', 'commercial');
set local role authenticated;
create temp table r as select public.commercial_pace() as j;
select is(jsonb_array_length((select j -> 'me' -> 'weeks' from r)), 8, 'huit semaines');
select is((select j #>> '{me,weeks,7,semaine}' from r)::date, pg_temp.lundi(), 'la dernière est la semaine en cours');
select is((select j #>> '{me,weeks,6,valides}' from r)::int, 2, 'deux validés la semaine dernière');
select is((select j #>> '{me,weeks,6,objectif}' from r)::int, 7, 'objectif de la semaine dernière : 7');
select is((select j #>> '{me,weeks,2,objectif}' from r)::int, 3, 'semaine d''arrivée : 3');
select is((select j #> '{me,weeks,1,objectif}' from r), 'null'::jsonb, 'avant son arrivée : aucun objectif');
select is((select j #>> '{me,en_verification}' from r)::int, 1, 'un dossier en vérification');
select is((select j #>> '{settings,rythme_semaine}' from r)::int, 7, 'rythme commun lu');
select ok((select (j #>> '{equipe,valides}')::int >= 2 from r), 'total de l''équipe');
select is(
  (select e from r, jsonb_array_elements(j -> 'classement') e where e ->> 'moi' = 'true'),
  jsonb_build_object('nom', 'Sarah K.', 'moi', true, 'valides', 2, 'semaines', 4),
  'classement : elle-même, en prénom et initiale, 4 semaines terminées');
select is(
  (select count(*) from r, jsonb_array_elements(j -> 'classement') e where e ->> 'nom' in ('Inès M.', 'Paul G.'))::int,
  0, 'classement : ni l''arrivée de la semaine, ni le suspendu');
select is((select count(*) from public.launch_settings)::int, 0, 'réglages fermés au conseiller');
select throws_ok($$ select public.admin_commercial_pace() $$, '42501', null, 'conseiller : onglet Rythme refusé');
select throws_ok($$ select public.admin_set_commercial_pace('e1762000-0000-4000-8000-000000000001', 1, null) $$,
  '42501', null, 'conseiller : ne change pas son objectif');
reset role;

-- ---------------------------------------------------------------------------------------------
-- Back-office
-- ---------------------------------------------------------------------------------------------
select pg_temp.connecter('e1760000-0000-4000-8000-000000000001', 'admin', 'aal1');
set local role authenticated;
select throws_ok($$ select public.admin_commercial_pace() $$, '42501', null, 'admin sans double authentification : refusé');
reset role;

select pg_temp.connecter('e1760000-0000-4000-8000-000000000001', 'admin');
set local role authenticated;
create temp table a as select public.admin_commercial_pace() as j;
select ok((select exists (select 1 from a, jsonb_array_elements(j -> 'conseillers') e
  where e ->> 'id' = 'e1762000-0000-4000-8000-000000000001' and jsonb_array_length(e -> 'weeks') = 8
    and e ->> 'dernier_valide' is not null)), 'onglet Rythme : Sarah, ses semaines et son dernier validé');
select ok((select not exists (select 1 from a, jsonb_array_elements(j -> 'conseillers') e
  where e ->> 'id' = 'e1762000-0000-4000-8000-000000000003')), 'onglet Rythme : sans le suspendu');
select is((select j #>> '{settings,alerte_retard}' from a), 'true', 'réglages du suivi lus');

-- Objectif propre.
select lives_ok($$ select public.admin_set_commercial_pace('e1762000-0000-4000-8000-000000000001', 4, ' Temps partiel ') $$,
  'objectif propre enregistré');
select throws_ok($$ select public.admin_set_commercial_pace('e1762000-0000-4000-8000-000000000001', 0, null) $$,
  '22023', null, 'objectif propre : 0 refusé');
select throws_ok($$ select public.admin_set_commercial_pace('e1762000-0000-4000-8000-0000000000ff', 4, null) $$,
  'P0002', null, 'conseiller inconnu');

-- Réglages.
select throws_ok($$ select public.admin_save_pace_settings(p_objectif_valides => 500, p_debut_recrutement => date '2027-03-31', p_fin_recrutement => date '2027-01-11', p_rythme_semaine => 7, p_rythme_demarrage => 3, p_semaines_demarrage => 2, p_repere_visites_jour => 8, p_email_lundi => true, p_classement_visible => true, p_alerte_retard => true) $$,
  '22023', null, 'fin avant le début : refusé');
select throws_ok($$ select public.admin_save_pace_settings(p_objectif_valides => 500, p_debut_recrutement => date '2027-01-11', p_fin_recrutement => date '2027-03-31', p_rythme_semaine => 0, p_rythme_demarrage => 3, p_semaines_demarrage => 2, p_repere_visites_jour => 8, p_email_lundi => true, p_classement_visible => true, p_alerte_retard => true) $$,
  '22023', null, 'rythme 0 : refusé');
select lives_ok($$ select public.admin_save_pace_settings(p_objectif_valides => 500, p_debut_recrutement => date '2027-01-11', p_fin_recrutement => date '2027-03-31', p_rythme_semaine => 7, p_rythme_demarrage => 3, p_semaines_demarrage => 2, p_repere_visites_jour => 8, p_email_lundi => true, p_classement_visible => false, p_alerte_retard => true) $$,
  'réglages enregistrés');
reset role;
select is((select objectif_valides from public.launch_settings), 500, 'objectif commun gardé');
select is((select fin_recrutement from public.launch_settings), date '2027-03-31', 'date de l''objectif gardée');
select ok(exists (select 1 from public.audit_logs where action = 'lancement.rythme'
  and actor_id = 'e1760000-0000-4000-8000-000000000001'), 'réglages journalisés');
select ok(exists (select 1 from public.audit_logs where action = 'commercial.rythme'
  and target_id = 'e1762000-0000-4000-8000-000000000001'), 'objectif propre journalisé');
select is((select rythme_raison from public.commercials where id = 'e1762000-0000-4000-8000-000000000001'),
  'Temps partiel', 'raison nettoyée');

-- Sarah voit son objectif propre ; le classement est masqué.
select pg_temp.connecter('e1760000-0000-4000-8000-000000000002', 'commercial');
set local role authenticated;
select is((public.commercial_pace() #>> '{me,weeks,7,objectif}')::int, 4, 'objectif propre de la semaine');
select is((public.commercial_pace() #>> '{me,weeks,2,objectif}')::int, 3, 'démarrage plus bas gardé');
select is(public.commercial_pace() -> 'classement', 'null'::jsonb, 'classement masqué par l''équipe');
reset role;

-- Retour au rythme commun : la raison part avec l'objectif.
select pg_temp.connecter('e1760000-0000-4000-8000-000000000001', 'admin');
set local role authenticated;
select public.admin_set_commercial_pace('e1762000-0000-4000-8000-000000000001', null, 'oubliée');
reset role;
select is((select rythme_raison from public.commercials where id = 'e1762000-0000-4000-8000-000000000001'),
  null, 'sans objectif propre, plus de raison');

-- ---------------------------------------------------------------------------------------------
-- E-mail du lundi
-- ---------------------------------------------------------------------------------------------
-- Lundi prochain, heure de Paris.
create function pg_temp.lundi_prochain(h int) returns timestamptz language sql as $$
  select ((pg_temp.lundi() + 7)::timestamp + make_interval(hours => h)) at time zone 'Europe/Paris'
$$;
update public.launch_settings set email_lundi_envoye = null where id;
select is(app.send_pace_weekly(pg_temp.lundi_prochain(7)), 0, 'avant 8 h : rien');
select is(app.send_pace_weekly(pg_temp.lundi_prochain(9) - interval '1 day'), 0, 'un dimanche : rien');
select ok(app.send_pace_weekly(pg_temp.lundi_prochain(9)) >= 2, 'lundi 9 h : envoyé');
select is(app.send_pace_weekly(pg_temp.lundi_prochain(10)), 0, 'une seule fois par semaine');
select is((select count(*) from public.notifications n where n.type = 'conseiller_semaine'
  and n.user_id = 'e1760000-0000-4000-8000-000000000002')::int, 1, 'Sarah reçoit un e-mail');
select is((select count(*) from public.notifications n where n.type = 'conseiller_semaine'
  and n.user_id = 'e1760000-0000-4000-8000-000000000004')::int, 0, 'le suspendu, non');
select is((select (n.data ->> 'nouvel_objectif')::int from public.notifications n where n.type = 'conseiller_semaine'
  and n.user_id = 'e1760000-0000-4000-8000-000000000002'), 7, 'objectif de la nouvelle semaine');
select is((select (n.data ->> 'cible')::int from public.notifications n where n.type = 'conseiller_semaine'
  and n.user_id = 'e1760000-0000-4000-8000-000000000002'), 500, 'objectif commun rappelé');
update public.launch_settings set email_lundi_envoye = null, email_lundi = false where id;
select is(app.send_pace_weekly(pg_temp.lundi_prochain(9)), 0, 'e-mail du lundi coupé : rien');

select * from finish();
rollback;
