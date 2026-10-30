-- Invitation d'un membre de l'équipe (F-67, ADR 0210) : fonction fermée aux visiteurs, réservée à
-- un admin en double authentification, rôle invité limité à admin ou support et déjà posé sur le
-- compte (par staff-invite, clé serveur), journal d'audit sans donnée personnelle.
-- Données fictives (adresses inv111.*).
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

insert into auth.users (id, email, is_anonymous, email_confirmed_at, raw_app_meta_data, raw_user_meta_data) values
  ('c1110000-0000-4000-8000-000000000001', 'inv111.admin@example.test', false, now(), '{"role":"admin"}', '{}'),
  ('c1110000-0000-4000-8000-000000000002', 'inv111.nouvel-admin@example.test', false, null, '{"role":"admin"}', '{}'),
  ('c1110000-0000-4000-8000-000000000003', 'inv111.support@example.test', false, null, '{"role":"support"}', '{}'),
  ('c1110000-0000-4000-8000-000000000004', 'inv111.client@example.test', false, now(), '{"role":"particulier"}', '{}'),
  ('c1110000-0000-4000-8000-000000000005', 'inv111.commercial@example.test', false, now(), '{"role":"commercial"}', '{}');

create function pg_temp.connecter(uid uuid, app_role text, aal text default 'aal2') returns void language sql as $$
  select set_config('request.jwt.claims', jsonb_build_object(
    'sub', uid, 'role', 'authenticated', 'aal', aal, 'app_metadata', jsonb_build_object('role', app_role)
  )::text, true);
$$;

-- ---------- Structure ----------
select ok(
  (select p.prosecdef from pg_proc p
   where p.oid = to_regprocedure('public.admin_record_staff_invite(uuid, public.app_role)')),
  'fonction SECURITY DEFINER');
select ok(not has_function_privilege('anon', 'public.admin_record_staff_invite(uuid, public.app_role)', 'execute'),
  'fermée aux visiteurs');
select ok(has_function_privilege('authenticated', 'public.admin_record_staff_invite(uuid, public.app_role)', 'execute'),
  'ouverte aux comptes connectés (le rôle est vérifié dedans)');

-- ---------- Appelant ----------
select pg_temp.connecter('c1110000-0000-4000-8000-000000000001', 'admin', 'aal1');
set local role authenticated;
select throws_ok(
  $$ select public.admin_record_staff_invite('c1110000-0000-4000-8000-000000000002', 'admin') $$,
  '42501', null, 'admin sans double authentification : refusé');
reset role;

select pg_temp.connecter('c1110000-0000-4000-8000-000000000005', 'commercial');
set local role authenticated;
select throws_ok(
  $$ select public.admin_record_staff_invite('c1110000-0000-4000-8000-000000000002', 'admin') $$,
  '42501', null, 'commercial : refusé');
reset role;

select pg_temp.connecter('c1110000-0000-4000-8000-000000000003', 'support');
set local role authenticated;
select throws_ok(
  $$ select public.admin_record_staff_invite('c1110000-0000-4000-8000-000000000002', 'admin') $$,
  '42501', null, 'support : refusé');
reset role;

-- ---------- Admin en double authentification ----------
select pg_temp.connecter('c1110000-0000-4000-8000-000000000001', 'admin');
set local role authenticated;
select lives_ok(
  $$ select public.admin_record_staff_invite('c1110000-0000-4000-8000-000000000002', 'admin') $$,
  'invitation d''un admin enregistrée');
select lives_ok(
  $$ select public.admin_record_staff_invite('c1110000-0000-4000-8000-000000000003', 'support') $$,
  'invitation d''un membre du support enregistrée');
select throws_ok(
  $$ select public.admin_record_staff_invite('c1110000-0000-4000-8000-000000000005', 'commercial') $$,
  '22023', 'Rôle invalide : admin ou support.', 'rôle commercial : refusé (invitation à part)');
select throws_ok(
  $$ select public.admin_record_staff_invite('c1110000-0000-4000-8000-000000000004', 'particulier') $$,
  '22023', 'Rôle invalide : admin ou support.', 'rôle particulier : refusé');
select throws_ok(
  $$ select public.admin_record_staff_invite('c1110000-0000-4000-8000-000000000004', 'admin') $$,
  '22023', 'Compte invité introuvable.', 'compte dont le rôle n''est pas encore admin : refusé');
select throws_ok(
  $$ select public.admin_record_staff_invite('c1110000-0000-4000-8000-000000000003', 'admin') $$,
  '22023', 'Compte invité introuvable.', 'rôle différent de celui du compte : refusé');
select throws_ok(
  $$ select public.admin_record_staff_invite('c1110000-0000-4000-8000-0000000000ff', 'admin') $$,
  '22023', 'Compte invité introuvable.', 'compte inexistant : refusé');
reset role;

-- ---------- Journal ----------
select results_eq(
  $$ select target_id, data ->> 'role' from public.audit_logs
     where action = 'equipe.invitation' and actor_id = 'c1110000-0000-4000-8000-000000000001'
     order by data ->> 'role' $$,
  $$ values ('c1110000-0000-4000-8000-000000000002'::uuid, 'admin'::text),
            ('c1110000-0000-4000-8000-000000000003'::uuid, 'support'::text) $$,
  'deux invitations journalisées, rôle seulement');
select is(
  (select count(*)::int from public.audit_logs
   where action = 'equipe.invitation' and data::text like '%@%'),
  0, 'aucune adresse e-mail dans le journal');

select * from finish();
rollback;
