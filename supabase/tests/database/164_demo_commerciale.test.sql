-- Lien de démo de l'espace commercial (F-65, lot 57, ADR 0344) : la clé ouvre la démo seulement
-- si le lien est actif ; seul un admin (aal2) le lit, le change ou le désactive ; la table reste
-- fermée à tous. Données fictives (identifiants e164…).
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

insert into auth.users (id, email, is_anonymous, email_confirmed_at, raw_app_meta_data, raw_user_meta_data) values
  ('e1640000-0000-4000-8000-000000000001', 'demo164.admin@example.test', false, now(), '{"role":"admin"}', '{}'),
  ('e1640000-0000-4000-8000-000000000002', 'demo164.commercial@example.test', false, now(), '{"role":"commercial"}', '{}');

create function pg_temp.connecter(uid uuid, app_role text, aal text default 'aal2') returns void language sql as $$
  select set_config('request.jwt.claims', jsonb_build_object(
    'sub', uid, 'role', 'authenticated', 'aal', aal, 'app_metadata', jsonb_build_object('role', app_role)
  )::text, true);
$$;

select is((select count(*)::int from public.commercial_demo), 1, 'une seule ligne, créée par la migration');
select is((select enabled from public.commercial_demo), false, 'désactivé au départ');

-- Visiteur : la clé ne sert à rien tant que le lien est désactivé ; la table lui est fermée.
set local role anon;
select is(public.commercial_demo_open((select key from public.commercial_demo)), false,
  'lien désactivé : refusé');
reset role;
select is(public.commercial_demo_open(null), false, 'sans clé : refusé');

-- Admin : nouveau lien, activé ; l'ancienne clé tombe.
create temp table ancienne as select key from public.commercial_demo;
grant select on ancienne to authenticated, anon;
select pg_temp.connecter('e1640000-0000-4000-8000-000000000001', 'admin');
set local role authenticated;
select matches(public.admin_rotate_commercial_demo(), '^[a-f0-9]{32}$', 'admin : nouvelle clé');
select is((select enabled from public.admin_commercial_demo()), true, 'admin : lien activé');
select isnt((select key from public.admin_commercial_demo()), (select key from ancienne),
  'clé changée');
reset role;

set local role anon;
select is(public.commercial_demo_open((select key from ancienne)), false, 'ancienne clé : refusée');
select throws_ok($$ select key from public.commercial_demo $$, '42501', null,
  'visiteur : table fermée');
select throws_ok($$ select * from public.admin_commercial_demo() $$, '42501', null,
  'visiteur : lecture admin refusée');
reset role;
select is(public.commercial_demo_open((select key from public.commercial_demo)), true,
  'nouvelle clé : la démo s''ouvre');

-- Désactivation par l'admin, journalisée.
select pg_temp.connecter('e1640000-0000-4000-8000-000000000001', 'admin');
set local role authenticated;
select lives_ok($$ select public.admin_set_commercial_demo(false) $$, 'admin : lien désactivé');
reset role;
select is(public.commercial_demo_open((select key from public.commercial_demo)), false,
  'lien désactivé : la clé ne marche plus');
select is((select count(*)::int from public.audit_logs where target_type = 'demo_commerciale'), 2,
  'changements journalisés');

-- Admin sans double authentification, commercial : refusés.
select pg_temp.connecter('e1640000-0000-4000-8000-000000000001', 'admin', 'aal1');
set local role authenticated;
select throws_ok($$ select public.admin_rotate_commercial_demo() $$, '42501', null,
  'admin sans double authentification : refusé');
reset role;
select pg_temp.connecter('e1640000-0000-4000-8000-000000000002', 'commercial');
set local role authenticated;
select throws_ok($$ select public.admin_set_commercial_demo(true) $$, '42501', null,
  'commercial : refusé');
select throws_ok($$ select key from public.commercial_demo $$, '42501', null,
  'commercial : table fermée');
reset role;

select * from finish();
rollback;
