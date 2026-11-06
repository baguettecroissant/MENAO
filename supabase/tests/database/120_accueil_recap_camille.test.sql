-- Horaires d'accueil (F-81) et récapitulatif du matin de Camille (F-80), ADR 0230 : jours fériés,
-- accueil ouvert ou fermé, prochaine ouverture, réglage par un admin seulement, état réservé à
-- l'équipe, récapitulatif à 8 h (heure de Paris), une fois par jour, rien sans activité, sans
-- coordonnées. Données fictives (identifiants c120…).
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

-- ---------- Jours fériés ----------
select is(app.easter_sunday(2026), date '2026-04-05', 'Pâques 2026');
select is(app.easter_sunday(2027), date '2027-03-28', 'Pâques 2027');
select ok(app.is_french_public_holiday(date '2026-04-06'), 'lundi de Pâques');
select ok(app.is_french_public_holiday(date '2026-05-14'), 'Ascension');
select ok(app.is_french_public_holiday(date '2026-05-25'), 'lundi de Pentecôte');
select ok(app.is_french_public_holiday(date '2026-11-11'), '11 novembre');
select ok(not app.is_french_public_holiday(date '2026-11-10'), 'jour ordinaire');

-- ---------- Horaires par défaut : lundi au vendredi, 9 h – 17 h ----------
select ok(app.reception_open_at('2026-11-06 10:00+01'), 'vendredi 10 h : ouvert');
select ok(not app.reception_open_at('2026-11-06 17:00+01'), 'vendredi 17 h : fermé');
select ok(not app.reception_open_at('2026-11-07 10:00+01'), 'samedi : fermé');
select ok(not app.reception_open_at('2026-11-11 10:00+01'), '11 novembre : fermé');

select is(app.reception_status_at('2026-11-06 10:00+01') ->> 'ouvert', 'true', 'ouvert maintenant');
select is((app.reception_status_at('2026-11-06 10:00+01') ->> 'ferme_a')::timestamptz,
  '2026-11-06 17:00+01'::timestamptz, 'ferme à 17 h');
select is((app.reception_status_at('2026-11-06 19:00+01') ->> 'prochaine_ouverture')::timestamptz,
  '2026-11-09 09:00+01'::timestamptz, 'vendredi soir : lundi 9 h');
select is((app.reception_status_at('2026-11-10 19:00+01') ->> 'prochaine_ouverture')::timestamptz,
  '2026-11-12 09:00+01'::timestamptz, 'veille du 11 novembre : jeudi 9 h');
select is((app.reception_status_at('2026-11-06 08:00+01') ->> 'prochaine_ouverture')::timestamptz,
  '2026-11-06 09:00+01'::timestamptz, 'avant l''ouverture : le jour même');

-- ---------- Comptes ----------
insert into auth.users (id, email, is_anonymous, email_confirmed_at, raw_app_meta_data, raw_user_meta_data) values
  ('c1200000-0000-4000-8000-000000000001', 'accueil120.admin@example.test', false, now(), '{"role":"admin"}', '{}'),
  ('c1200000-0000-4000-8000-000000000002', 'accueil120.support@example.test', false, now(), '{"role":"support"}', '{}'),
  ('c1200000-0000-4000-8000-000000000003', 'accueil120.client@example.test', false, now(), '{"role":"particulier"}', '{}');

-- Fonctions temporaires invisibles des autres rôles : réglages de session écrits en entier.
set local role authenticated;
select set_config('request.jwt.claims', jsonb_build_object('sub', 'c1200000-0000-4000-8000-000000000003',
  'role', 'authenticated', 'aal', 'aal1', 'app_metadata', jsonb_build_object('role', 'particulier'))::text, true);
select throws_ok($$ select public.reception_status() $$, '42501', null, 'particulier : état refusé');
select is((select count(*)::int from public.reception_settings), 0, 'particulier : réglages illisibles');
select throws_ok(
  $$ select public.admin_save_reception_settings('[]'::jsonb, '{}', true) $$, '42501', null,
  'particulier : enregistrement refusé');

select set_config('request.jwt.claims', jsonb_build_object('sub', 'c1200000-0000-4000-8000-000000000002',
  'role', 'authenticated', 'aal', 'aal2', 'app_metadata', jsonb_build_object('role', 'support'))::text, true);
select lives_ok($$ select public.reception_status() $$, 'support : état lisible');
select is((select count(*)::int from public.reception_settings), 1, 'support : réglages lisibles');
select throws_ok(
  $$ select public.admin_save_reception_settings('[]'::jsonb, '{}', true) $$, '42501', null,
  'support : enregistrement refusé');

select set_config('request.jwt.claims', jsonb_build_object('sub', 'c1200000-0000-4000-8000-000000000001',
  'role', 'authenticated', 'aal', 'aal2', 'app_metadata', jsonb_build_object('role', 'admin'))::text, true);
select throws_ok(
  $$ select public.admin_save_reception_settings('[{"jour": 1, "debut": "17:00", "fin": "09:00"}]'::jsonb, '{}', true) $$,
  '22023', null, 'plage à l''envers : refusée');
select throws_ok(
  $$ select public.admin_save_reception_settings('[{"jour": 8, "debut": "09:00", "fin": "17:00"}]'::jsonb, '{}', true) $$,
  '22023', null, 'jour inconnu : refusé');
select lives_ok(
  $$ select public.admin_save_reception_settings(
       '[{"jour": 6, "debut": "10:00", "fin": "12:00"}, {"jour": 1, "debut": "14:00", "fin": "18:00"}, {"jour": 1, "debut": "08:30", "fin": "12:00"}]'::jsonb,
       '{2026-11-16, 2026-11-16}', false) $$,
  'admin : horaires enregistrés');
reset role;

select is((select hours -> 0 from public.reception_settings),
  '{"jour": 1, "debut": "08:30", "fin": "12:00"}'::jsonb, 'plages triées par jour et par heure');
select is((select closed_dates from public.reception_settings), '{2026-11-16}'::date[], 'dates sans doublon');
select ok(app.reception_open_at('2026-11-07 11:00+01'), 'samedi matin : ouvert');
select ok(not app.reception_open_at('2026-11-09 13:00+01'), 'lundi midi : fermé (pause)');
select ok(not app.reception_open_at('2026-11-16 09:00+01'), 'fermeture exceptionnelle');
select ok(app.reception_open_at('2026-11-11 10:00+01') is false, 'mercredi : aucune plage');
select is((app.reception_status_at('2026-11-09 12:30+01') ->> 'prochaine_ouverture')::timestamptz,
  '2026-11-09 14:00+01'::timestamptz, 'pendant la pause : reprise l''après-midi');

-- ---------- Récapitulatif du matin ----------
-- Horaires par défaut de nouveau.
update public.reception_settings set hours = '[{"jour": 5, "debut": "09:00", "fin": "17:00"}]', closed_dates = '{}',
  holidays_closed = true;
select is(app.send_camille_recap('2026-11-13 08:00+01'), 0, 'aucune activité : rien');
insert into public.ai_runs (function_name, model, outcome, latency_ms, audio_seconds, created_at) values
  ('voice-assistant', 'vapi', 'ok', 0, 120, '2026-11-13 10:00+01'),
  ('voice-assistant', 'vapi', 'ok', 0, 60, '2026-11-13 22:00+01');
insert into public.tickets (type, contact_email, contact_phone, subject, message, created_at) values
  ('rappel_pro', 'rappel120@example.test', '+33600001200', 'Demande de rappel (secrétaire vocale Camille)',
   E'Prénom : Jean\nMotif : question sur les formules\nMeilleur moment : demain matin', '2026-11-13 21:00+01');

select is(app.send_camille_recap('2026-11-14 09:00+01'), 0, '9 h : pas d''envoi');
select is(app.send_camille_recap('2026-11-14 08:00+01'), 1, '8 h : envoyé');
select is(app.send_camille_recap('2026-11-14 08:30+01'), 0, 'une seule fois par jour');
select is(
  (select count(*)::int from public.notifications where type = 'equipe_recap_camille'
     and user_id in ('c1200000-0000-4000-8000-000000000001', 'c1200000-0000-4000-8000-000000000002')),
  2, 'admins et support prévenus');
select is(
  (select count(*)::int from public.notifications where type = 'equipe_recap_camille'
     and user_id = 'c1200000-0000-4000-8000-000000000003'),
  0, 'particulier : rien');
select is(
  (select data - 'motifs' from public.notifications where type = 'equipe_recap_camille'
     and user_id = 'c1200000-0000-4000-8000-000000000001'),
  '{"appels": 2, "minutes": 3, "hors_horaires": 1, "rappels": 1, "rendez_vous": 0,
    "demandes_preparees": 0, "demandes_validees": 0}'::jsonb,
  'chiffres : appels, minutes, hors horaires, rappels');
select is(
  (select data -> 'motifs' from public.notifications where type = 'equipe_recap_camille'
     and user_id = 'c1200000-0000-4000-8000-000000000001'),
  '["question sur les formules"]'::jsonb, 'motif du rappel');
select ok(
  not exists (select 1 from public.notifications where type = 'equipe_recap_camille'
    and (data::text like '%@%' or data::text like '%+336%' or data::text like '%Jean%')),
  'aucune coordonnée ni prénom dans la notification');

select * from finish();
rollback;
