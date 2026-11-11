-- Équipe MENAO (F-133, ADR 0284) : liste des membres, changement d'accès et retrait de l'accès,
-- réservés à un admin en double authentification, jamais sur son propre compte, journalisés.
-- Données fictives (adresses equipe135.*).
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

insert into auth.users (id, email, is_anonymous, email_confirmed_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data) values
  ('e1350000-0000-4000-8000-000000000001', 'equipe135.admin@example.test', false, now(), now(), '{"role":"admin"}', '{}'),
  ('e1350000-0000-4000-8000-000000000002', 'equipe135.admin2@example.test', false, now(), now(), '{"role":"admin"}', '{}'),
  ('e1350000-0000-4000-8000-000000000003', 'equipe135.support@example.test', false, now(), null, '{"role":"support"}', '{}'),
  ('e1350000-0000-4000-8000-000000000004', 'equipe135.client@example.test', false, now(), now(), '{"role":"particulier"}', '{}');

create function pg_temp.connecter(uid uuid, app_role text, aal text default 'aal2') returns void language sql as $$
  select set_config('request.jwt.claims', jsonb_build_object(
    'sub', uid, 'role', 'authenticated', 'aal', aal, 'app_metadata', jsonb_build_object('role', app_role)
  )::text, true);
$$;

-- ---------- Droits ----------
select ok(not has_function_privilege('anon', 'public.admin_staff_members()', 'execute'),
  'liste fermée aux visiteurs');
select ok(not has_function_privilege('anon', 'public.admin_set_staff_role(uuid, public.app_role)', 'execute'),
  'changement d''accès fermé aux visiteurs');
select ok(not has_function_privilege('anon', 'public.admin_remove_staff(uuid)', 'execute'),
  'retrait fermé aux visiteurs');

set local role authenticated;
select pg_temp.connecter('e1350000-0000-4000-8000-000000000003', 'support');
select throws_ok('select * from public.admin_staff_members()', '42501', null, 'support : liste refusée');
select throws_ok(
  $$ select public.admin_set_staff_role('e1350000-0000-4000-8000-000000000002', 'support') $$,
  '42501', null, 'support : changement d''accès refusé');
select pg_temp.connecter('e1350000-0000-4000-8000-000000000001', 'admin', 'aal1');
select throws_ok('select * from public.admin_staff_members()', '42501', null,
  'admin sans double authentification : refusé');

-- ---------- Admin en double authentification ----------
select pg_temp.connecter('e1350000-0000-4000-8000-000000000001', 'admin');
select results_eq(
  $$ select email, role::text, derniere_connexion is null
     from public.admin_staff_members()
     where email like 'equipe135.%' order by user_id $$,
  $$ values ('equipe135.admin@example.test'::text, 'admin'::text, false),
            ('equipe135.admin2@example.test'::text, 'admin'::text, false),
            ('equipe135.support@example.test'::text, 'support'::text, true) $$,
  'membres de l''équipe seulement, avec leur accès et leur dernière connexion');

select throws_ok(
  $$ select public.admin_set_staff_role('e1350000-0000-4000-8000-000000000001', 'support') $$,
  '22023', null, 'jamais son propre accès');
select throws_ok(
  $$ select public.admin_set_staff_role('e1350000-0000-4000-8000-000000000004', 'support') $$,
  '22023', null, 'un client n''est pas un membre de l''équipe');
select throws_ok(
  $$ select public.admin_set_staff_role('e1350000-0000-4000-8000-000000000003', 'particulier') $$,
  '22023', null, 'accès limité à admin ou support');
select throws_ok(
  $$ select public.admin_set_staff_role('e1350000-0000-4000-8000-000000000003', 'support') $$,
  '22023', null, 'accès inchangé : refusé');

select lives_ok(
  $$ select public.admin_set_staff_role('e1350000-0000-4000-8000-000000000003', 'admin') $$,
  'support passé admin');
reset role;
select is((select role::text from public.profiles where user_id = 'e1350000-0000-4000-8000-000000000003'),
  'admin', 'rôle recopié dans le profil');
select is((select raw_app_meta_data ->> 'role' from auth.users where id = 'e1350000-0000-4000-8000-000000000003'),
  'admin', 'rôle posé dans app_metadata');

set local role authenticated;
select pg_temp.connecter('e1350000-0000-4000-8000-000000000001', 'admin');
select throws_ok(
  $$ select public.admin_remove_staff('e1350000-0000-4000-8000-000000000001') $$,
  '22023', null, 'jamais retirer son propre accès');
select lives_ok(
  $$ select public.admin_remove_staff('e1350000-0000-4000-8000-000000000002') $$,
  'accès d''un admin retiré');
select is(
  (select count(*)::int from public.admin_staff_members() where email = 'equipe135.admin2@example.test'),
  0, 'il ne figure plus dans l''équipe');
select throws_ok(
  $$ select public.admin_remove_staff('e1350000-0000-4000-8000-000000000002') $$,
  '22023', null, 'accès déjà retiré : refusé');
reset role;
select is((select raw_app_meta_data ->> 'role' from auth.users where id = 'e1350000-0000-4000-8000-000000000002'),
  'particulier', 'plus de rôle d''équipe');
select ok((select banned_until > now() from auth.users where id = 'e1350000-0000-4000-8000-000000000002'),
  'connexion bloquée');
select is(
  (select count(*)::int from public.audit_logs
   where action in ('equipe.acces', 'equipe.retrait')
     and target_id in ('e1350000-0000-4000-8000-000000000002', 'e1350000-0000-4000-8000-000000000003')),
  2, 'chaque action est journalisée');

select * from finish();
rollback;
