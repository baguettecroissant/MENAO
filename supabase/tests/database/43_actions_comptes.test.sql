-- F-52 (lot 3b, ADR 0048) : actions de l'équipe sur un compte. Suspension de l'accès (connexion
-- bloquée, sessions fermées, motif transmis) et rétablissement, journal des liens de mot de passe
-- et des exports, demandes de suppression dans la vue d'ensemble.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

insert into auth.users (id, email, is_anonymous, email_confirmed_at, raw_app_meta_data, raw_user_meta_data) values
  ('bf100000-0000-4000-8000-000000000001', 'acces.client@example.test', false, now(), '{}', '{"first_name":"Camille","last_name":"Acces"}'),
  ('bf100000-0000-4000-8000-000000000002', null, true, null, '{}', '{}'),
  ('bf300000-0000-4000-8000-000000000001', 'acces.admin@example.test', false, now(), '{"role":"admin"}', '{}'),
  ('bf300000-0000-4000-8000-000000000002', 'acces.support@example.test', false, now(), '{"role":"support"}', '{}');
insert into auth.sessions (id, user_id) values
  ('bf500000-0000-4000-8000-000000000001', 'bf100000-0000-4000-8000-000000000001');

create function pg_temp.connecter(uid uuid, app_role text, aal text default 'aal1') returns void language sql as $$
  select set_config('request.jwt.claims', jsonb_build_object(
    'sub', uid, 'role', 'authenticated', 'aal', aal, 'app_metadata', jsonb_build_object('role', app_role)
  )::text, true);
$$;

-- ---------- Accès réservé aux admins avec double authentification ----------
select pg_temp.connecter('bf100000-0000-4000-8000-000000000001', 'particulier');
set local role authenticated;
select throws_ok(
  $$ select public.admin_suspend_account('bf100000-0000-4000-8000-000000000001', 'Test') $$,
  '42501', null, 'particulier : ne suspend pas un compte');
select throws_ok(
  $$ select public.admin_reactivate_account('bf100000-0000-4000-8000-000000000001') $$,
  '42501', null, 'particulier : ne rétablit pas un compte');
select throws_ok(
  $$ select public.admin_log_account_action('bf100000-0000-4000-8000-000000000001', 'compte.export') $$,
  '42501', null, 'particulier : pas de journal des actions');
reset role;

select pg_temp.connecter('bf300000-0000-4000-8000-000000000001', 'admin', 'aal1');
set local role authenticated;
select throws_ok(
  $$ select public.admin_suspend_account('bf100000-0000-4000-8000-000000000001', 'Test') $$,
  '42501', null, 'admin sans double authentification : refusé');
reset role;

-- ---------- Comptes visés : jamais l'équipe, ni soi-même, ni une session anonyme ----------
select pg_temp.connecter('bf300000-0000-4000-8000-000000000001', 'admin', 'aal2');
set local role authenticated;
select throws_ok(
  $$ select public.admin_suspend_account('bf300000-0000-4000-8000-000000000001', 'Test') $$,
  '22023', null, 'pas son propre compte');
select throws_ok(
  $$ select public.admin_suspend_account('bf300000-0000-4000-8000-000000000002', 'Test') $$,
  '22023', null, 'pas un compte de l''équipe');
select throws_ok(
  $$ select public.admin_suspend_account('bf100000-0000-4000-8000-000000000002', 'Test') $$,
  '22023', null, 'pas une session anonyme');
select throws_ok(
  $$ select public.admin_suspend_account('bf100000-0000-4000-8000-000000000001', '  ') $$,
  '22023', null, 'motif obligatoire');

-- ---------- Suspension puis rétablissement ----------
select lives_ok(
  $$ select public.admin_suspend_account('bf100000-0000-4000-8000-000000000001', 'Fraude au paiement.') $$,
  'accès suspendu');
select throws_ok(
  $$ select public.admin_suspend_account('bf100000-0000-4000-8000-000000000001', 'Encore') $$,
  '22023', null, 'déjà suspendu : refusé');
reset role;

select ok(
  (select banned_until > now() + interval '99 years' from auth.users
   where id = 'bf100000-0000-4000-8000-000000000001'),
  'connexion bloquée (banned_until)');
select is_empty(
  $$ select 1 from auth.sessions where user_id = 'bf100000-0000-4000-8000-000000000001' $$,
  'sessions fermées');
select ok(
  exists (select 1 from public.audit_logs
          where action = 'compte.suspendu' and target_id = 'bf100000-0000-4000-8000-000000000001'
            and data ->> 'motif' = 'Fraude au paiement.'),
  'suspension journalisée avec son motif');
select is(
  (select data ->> 'motif' from public.notifications
   where user_id = 'bf100000-0000-4000-8000-000000000001' and type = 'acces_suspendu'),
  'Fraude au paiement.', 'personne prévenue du motif');

select pg_temp.connecter('bf300000-0000-4000-8000-000000000001', 'admin', 'aal2');
set local role authenticated;
select lives_ok(
  $$ select public.admin_reactivate_account('bf100000-0000-4000-8000-000000000001') $$,
  'accès rétabli');
select throws_ok(
  $$ select public.admin_reactivate_account('bf100000-0000-4000-8000-000000000001') $$,
  '22023', null, 'pas suspendu : refusé');
reset role;

select is(
  (select banned_until from auth.users where id = 'bf100000-0000-4000-8000-000000000001'),
  null, 'connexion de nouveau possible');
select ok(
  exists (select 1 from public.audit_logs
          where action = 'compte.retabli' and target_id = 'bf100000-0000-4000-8000-000000000001'),
  'rétablissement journalisé');
select ok(
  exists (select 1 from public.notifications
          where user_id = 'bf100000-0000-4000-8000-000000000001' and type = 'acces_retabli'),
  'personne prévenue du rétablissement');

-- ---------- Journal des actions faites hors de la base ----------
select pg_temp.connecter('bf300000-0000-4000-8000-000000000001', 'admin', 'aal2');
set local role authenticated;
select lives_ok(
  $$ select public.admin_log_account_action('bf100000-0000-4000-8000-000000000001', 'compte.export') $$,
  'export journalisé');
select lives_ok(
  $$ select public.admin_log_account_action('bf100000-0000-4000-8000-000000000001', 'compte.lien_mot_de_passe') $$,
  'lien de mot de passe journalisé');
select throws_ok(
  $$ select public.admin_log_account_action('bf100000-0000-4000-8000-000000000001', 'compte.autre') $$,
  '22023', null, 'action inconnue refusée');
select set_config('test.avant', public.admin_overview()::text, true);
reset role;

select results_eq(
  $$ select action from public.audit_logs
     where target_id = 'bf100000-0000-4000-8000-000000000001' and action like 'compte.%'
       and action in ('compte.export', 'compte.lien_mot_de_passe')
     order by action $$,
  $$ values ('compte.export'), ('compte.lien_mot_de_passe') $$,
  'actions journalisées');

-- ---------- Demandes de suppression dans la vue d'ensemble ----------
insert into public.tickets (type, user_id, contact_email, subject, due_at)
values ('suppression_compte', 'bf100000-0000-4000-8000-000000000001', 'acces.client@example.test',
  'Suppression du compte', now() + interval '1 month');
select pg_temp.connecter('bf300000-0000-4000-8000-000000000001', 'admin', 'aal2');
set local role authenticated;
select set_config('test.apres', public.admin_overview()::text, true);
reset role;
select is(
  (current_setting('test.apres')::jsonb #>> '{tickets,suppressions}')::int
    - (current_setting('test.avant')::jsonb #>> '{tickets,suppressions}')::int,
  1, 'demande de suppression comptée');
select ok(
  (current_setting('test.apres')::jsonb #>> '{tickets,suppression_echeance}')::timestamptz
    <= now() + interval '1 month',
  'échéance de la plus proche demande');

select * from finish();
rollback;
