-- F-19 : dictées sauvegardées pour le devis, journal quote-from-voice. RLS avec chaque rôle.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

insert into auth.users (id, email, is_anonymous, email_confirmed_at, raw_app_meta_data, raw_user_meta_data) values
  ('a8100000-0000-4000-8000-000000000001', 'di.client@example.test', false, now(), '{}', '{"first_name":"Camille"}'),
  ('a8200000-0000-4000-8000-000000000001', 'di.x1@example.test', false, now(), '{"role":"artisan"}', '{"first_name":"Xavier"}'),
  ('a8200000-0000-4000-8000-000000000002', 'di.x2@example.test', false, now(), '{"role":"artisan"}', '{}');

create function pg_temp.connecter(uid uuid, app_role text) returns void language sql as $$
  select set_config('request.jwt.claims', jsonb_build_object(
    'sub', uid, 'role', 'authenticated', 'aal', 'aal1', 'app_metadata', jsonb_build_object('role', app_role)
  )::text, true);
$$;

insert into public.artisans (id, user_id, status, raison_sociale, zone_mode, connect_charges_enabled) values
  ('a8400000-0000-4000-8000-000000000001', 'a8200000-0000-4000-8000-000000000001', 'valide', 'ARTISAN X1', 'communes', true),
  ('a8400000-0000-4000-8000-000000000002', 'a8200000-0000-4000-8000-000000000002', 'valide', 'ARTISAN X2', 'communes', true);
insert into public.projects (id, user_id, status, description, trade_code, ville_code_insee, ville_nom, criteria_validated_at)
values ('a8500000-0000-4000-8000-000000000001', 'a8100000-0000-4000-8000-000000000001', 'demande_envoyee',
        'Prises à ajouter.', 'electricien', '06088', 'Nice', now());
insert into public.requests (id, project_id, artisan_id, particulier_id, contact_phone) values
  ('a8600000-0000-4000-8000-000000000001', 'a8500000-0000-4000-8000-000000000001',
   'a8400000-0000-4000-8000-000000000001', 'a8100000-0000-4000-8000-000000000001', '+33612345678');

select pg_temp.connecter('a8200000-0000-4000-8000-000000000001', 'artisan');
set local role authenticated;
select set_config('test.chantier',
  public.artisan_fix_appointment('a8600000-0000-4000-8000-000000000001', current_date + 2, '10:00')::text, true);

select throws_ok(
  $$ select public.artisan_save_dictation(current_setting('test.chantier')::uuid, '   ') $$,
  '22023', 'Dictée vide ou trop longue (5 000 caractères au plus)', 'dictée vide refusée');
select throws_ok(
  $$ select public.artisan_save_dictation(current_setting('test.chantier')::uuid, repeat('a', 5001)) $$,
  '22023', 'Dictée vide ou trop longue (5 000 caractères au plus)', 'dictée trop longue refusée');
select lives_ok(
  $$ select public.artisan_save_dictation(current_setting('test.chantier')::uuid, '  4 prises à 22,50 euros  ') $$,
  'dictée sauvegardée');
select lives_ok(
  $$ select public.artisan_save_dictation(current_setting('test.chantier')::uuid, '4 prises et 3 heures de pose') $$,
  'nouvelle sauvegarde : remplace la précédente');
select results_eq(
  $$ select transcript from public.quote_dictations $$,
  $$ values ('4 prises et 3 heures de pose'::text) $$,
  'une dictée par chantier, texte nettoyé');
select throws_ok(
  $$ insert into public.quote_dictations (chantier_id, artisan_id, transcript)
     values (current_setting('test.chantier')::uuid, app.my_artisan_id(), 'x') $$,
  '42501', null, 'écriture directe refusée');

-- ---------- Autre artisan, particulier, visiteur ----------
reset role;
select pg_temp.connecter('a8200000-0000-4000-8000-000000000002', 'artisan');
set local role authenticated;
select is((select count(*)::int from public.quote_dictations), 0, 'X2 : dictées d''autrui invisibles');
select throws_ok(
  $$ select public.artisan_save_dictation(current_setting('test.chantier')::uuid, 'x') $$,
  '42501', null, 'X2 : sauvegarde sur le chantier d''autrui refusée');
select public.artisan_delete_dictation(current_setting('test.chantier')::uuid);
reset role;
select is((select count(*)::int from public.quote_dictations), 1, 'X2 : suppression sans effet sur la dictée d''autrui');

select pg_temp.connecter('a8100000-0000-4000-8000-000000000001', 'particulier');
set local role authenticated;
select is((select count(*)::int from public.quote_dictations), 0, 'particulier : dictées de l''artisan invisibles');
reset role;

select set_config('request.jwt.claims', '{"role":"anon"}', true);
set local role anon;
select throws_ok('select 1 from public.quote_dictations', '42501', null, 'visiteur : aucun accès');
reset role;

-- ---------- Suppression, chantier annulé ----------
select pg_temp.connecter('a8200000-0000-4000-8000-000000000001', 'artisan');
set local role authenticated;
select public.artisan_delete_dictation(current_setting('test.chantier')::uuid);
select is((select count(*)::int from public.quote_dictations), 0, 'dictée supprimée par son auteur');
select public.artisan_cancel_chantier(current_setting('test.chantier')::uuid, null);
select throws_ok(
  $$ select public.artisan_save_dictation(current_setting('test.chantier')::uuid, '4 prises') $$,
  '22023', 'Ce chantier n''attend pas de devis', 'chantier annulé : plus de dictée');
reset role;

-- ---------- Journal des appels à l'IA ----------
select lives_ok(
  $$ insert into public.ai_runs (function_name, model, outcome, latency_ms)
     values ('quote-from-voice', 'anthropic/claude-sonnet-5.5', 'ok', 1200) $$,
  'journal : quote-from-voice accepté');
select throws_ok(
  $$ insert into public.ai_runs (function_name, model, outcome, latency_ms) values ('autre', 'x', 'ok', 1) $$,
  '23514', null, 'journal : fonction inconnue refusée');

select * from finish();
rollback;
