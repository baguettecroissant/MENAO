-- RLS de profiles et legal_acceptances, avec un utilisateur de chaque rôle (CLAUDE.md).
begin;
create extension if not exists pgtap with schema extensions;
select plan(21);

insert into auth.users (id, email, raw_app_meta_data, raw_user_meta_data) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'rls.a@example.test', '{}',
   '{"first_name":"Alice","legal":{"cgu":"v1","confidentialite":"v1"}}'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'rls.b@example.test', '{}',
   '{"first_name":"Bruno","legal":{"cgu":"v1","confidentialite":"v1"}}'),
  ('cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'rls.artisan@example.test', '{"role":"artisan"}', '{}'),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddddd', 'rls.support@example.test', '{"role":"support"}', '{}'),
  ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', 'rls.admin@example.test', '{"role":"admin"}', '{}');

-- Simule un utilisateur connecté (claims identiques à ceux d'un JWT Supabase).
create function pg_temp.connecter(uid uuid, app_role text, user_meta jsonb default '{}', aal text default 'aal1')
returns void language sql as $$
  select set_config('request.jwt.claims', jsonb_build_object(
    'sub', uid, 'role', 'authenticated', 'aal', aal,
    'app_metadata', jsonb_build_object('role', app_role),
    'user_metadata', user_meta
  )::text, true);
$$;

-- ---------- Particulier A ----------
select pg_temp.connecter('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'particulier');
set local role authenticated;

select results_eq(
  'select user_id from public.profiles',
  $$ values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid) $$,
  'particulier : ne voit que son propre profil'
);

select results_eq(
  $$ update public.profiles set first_name = 'Alicia'
     where user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' returning first_name $$,
  $$ values ('Alicia'::text) $$,
  'particulier : peut modifier son prénom'
);

select throws_ok(
  $$ update public.profiles set role = 'admin' where user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' $$,
  '42501',
  null,
  'particulier : ne peut pas modifier son rôle'
);

select throws_ok(
  $$ update public.profiles set user_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
     where user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' $$,
  '42501',
  null,
  'particulier : ne peut pas modifier le propriétaire du profil'
);

select is_empty(
  $$ update public.profiles set first_name = 'Pirate'
     where user_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' returning 1 $$,
  'particulier : ne peut pas modifier le profil d''un autre'
);

select throws_ok(
  $$ insert into public.profiles (user_id) values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb') $$,
  '42501',
  null,
  'particulier : ne peut pas créer de profil'
);

select throws_ok(
  $$ delete from public.profiles where user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' $$,
  '42501',
  null,
  'particulier : ne peut pas supprimer de profil'
);

select results_eq(
  'select count(*)::int from public.legal_acceptances',
  array[2],
  'particulier : ne voit que ses propres acceptations légales'
);

select throws_ok(
  $$ insert into public.legal_acceptances (user_id, document, version)
     values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'cgu', 'v2') $$,
  '42501',
  null,
  'particulier : ne peut pas écrire d''acceptation légale lui-même'
);

select throws_ok(
  $$ delete from public.legal_acceptances $$,
  '42501',
  null,
  'particulier : ne peut pas effacer ses acceptations légales'
);

-- Rôle « admin » glissé dans user_metadata : aucun effet.
reset role;
select pg_temp.connecter('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'particulier', '{"role":"admin"}');
set local role authenticated;

select results_eq(
  'select user_id from public.profiles',
  $$ values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid) $$,
  'un rôle dans user_metadata ne donne aucun droit'
);

-- ---------- Artisan ----------
reset role;
select pg_temp.connecter('cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'artisan');
set local role authenticated;

select results_eq(
  'select user_id from public.profiles',
  $$ values ('cccccccc-cccc-4ccc-8ccc-cccccccccccc'::uuid) $$,
  'artisan : ne voit que son propre profil'
);

-- ---------- Support ----------
reset role;
select pg_temp.connecter('dddddddd-dddd-4ddd-8ddd-dddddddddddd', 'support');
set local role authenticated;

select is(
  (select count(*)::int from public.profiles where user_id in
    ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
     'cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
     'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee')),
  5,
  'support : voit tous les profils'
);

select is(
  (select count(*)::int from public.legal_acceptances
   where user_id in ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb')),
  4,
  'support : voit les acceptations légales'
);

select is_empty(
  $$ update public.profiles set first_name = 'Modifié'
     where user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' returning 1 $$,
  'support : ne peut pas modifier le profil d''un utilisateur'
);

-- ---------- Admin sans double authentification (aal1) : aucun droit admin ----------
reset role;
select pg_temp.connecter('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', 'admin');
set local role authenticated;

select results_eq(
  'select user_id from public.profiles',
  $$ values ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'::uuid) $$,
  'admin sans double authentification : ne voit que son profil'
);

-- ---------- Admin (aal2) ----------
reset role;
select pg_temp.connecter('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', 'admin', '{}', 'aal2');
set local role authenticated;

select is(
  (select count(*)::int from public.profiles where user_id in
    ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
     'cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
     'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee')),
  5,
  'admin : voit tous les profils'
);

select throws_ok(
  $$ update public.profiles set role = 'particulier' where user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' $$,
  '42501',
  null,
  'admin : ne change pas un rôle via profiles (seulement app_metadata, côté serveur)'
);

-- ---------- Rôle inconnu dans le JWT ----------
reset role;
select pg_temp.connecter('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'superadmin');
set local role authenticated;

select results_eq(
  'select user_id from public.profiles',
  $$ values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'::uuid) $$,
  'rôle inconnu dans le JWT : traité comme un utilisateur sans privilège'
);

-- ---------- Visiteur (anon) ----------
reset role;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
set local role anon;

select throws_ok(
  'select 1 from public.profiles',
  '42501',
  null,
  'visiteur : aucun accès aux profils'
);

select throws_ok(
  'select 1 from public.legal_acceptances',
  '42501',
  null,
  'visiteur : aucun accès aux acceptations légales'
);

reset role;
select * from finish();
rollback;
