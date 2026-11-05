-- Simulateur d'entraînement des commerciaux (F-74, ADR 0224) : note enregistrée seulement par un
-- commercial actif, contrôles, lecture par le commercial lui-même ou un admin, aucune écriture
-- directe. Données fictives (identifiants c115…).
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

insert into auth.users (id, email, is_anonymous, email_confirmed_at, raw_app_meta_data, raw_user_meta_data) values
  ('c1150000-0000-4000-8000-000000000001', 'ent115.admin@example.test', false, now(), '{"role":"admin"}', '{}'),
  ('c1150000-0000-4000-8000-000000000002', 'ent115.julien@example.test', false, now(), '{"role":"commercial"}', '{}'),
  ('c1150000-0000-4000-8000-000000000003', 'ent115.sami@example.test', false, now(), '{"role":"commercial"}', '{}'),
  ('c1150000-0000-4000-8000-000000000004', 'ent115.lea@example.test', false, now(), '{"role":"commercial"}', '{}'),
  ('c1150000-0000-4000-8000-000000000005', 'ent115.artisan@example.test', false, now(), '{"role":"artisan"}', '{}');

insert into public.commercials (id, user_id, code, nom, status) values
  ('c1151000-0000-4000-8000-000000000001', 'c1150000-0000-4000-8000-000000000002', 'julien-115', 'Julien Exemple', 'actif'),
  ('c1151000-0000-4000-8000-000000000002', 'c1150000-0000-4000-8000-000000000003', 'sami-115', 'Sami Exemple', 'actif'),
  ('c1151000-0000-4000-8000-000000000003', 'c1150000-0000-4000-8000-000000000004', 'lea-115', 'Léa Exemple', 'suspendu');

create function pg_temp.connecter(uid uuid, app_role text) returns void language sql as $$
  select set_config('request.jwt.claims', jsonb_build_object(
    'sub', uid, 'role', 'authenticated', 'aal', 'aal2', 'app_metadata', jsonb_build_object('role', app_role)
  )::text, true);
$$;

select pg_temp.connecter('c1150000-0000-4000-8000-000000000002', 'commercial');
set local role authenticated;
select lives_ok($$ select public.commercial_save_training('mefiant', 14, 8) $$, 'séance enregistrée');
select lives_ok($$ select public.commercial_save_training('patron', 9, 5) $$, 'seconde séance');
select throws_ok($$ select public.commercial_save_training('inconnu', 10, 5) $$,
  '22023', 'Séance invalide.', 'artisan inconnu refusé');
select throws_ok($$ select public.commercial_save_training('presse', 21, 5) $$,
  '22023', 'Séance invalide.', 'note au-delà de 20 refusée');
select throws_ok($$ select public.commercial_save_training('presse', 10, 13) $$,
  '22023', 'Séance invalide.', 'trop de messages refusés');
select throws_ok(
  $$ insert into public.commercial_trainings (commercial_id, persona, score, turns)
     values ('c1151000-0000-4000-8000-000000000001', 'presse', 20, 3) $$,
  '42501', null, 'aucune écriture directe');
select is((select count(*)::int from public.commercial_trainings), 2, 'commercial : ses séances');
select is((select max(score) from public.commercial_trainings), 14, 'commercial : ses notes');
reset role;

select pg_temp.connecter('c1150000-0000-4000-8000-000000000003', 'commercial');
set local role authenticated;
select is((select count(*)::int from public.commercial_trainings), 0, 'autre commercial : aucune séance');
reset role;

select pg_temp.connecter('c1150000-0000-4000-8000-000000000004', 'commercial');
set local role authenticated;
select throws_ok($$ select public.commercial_save_training('mefiant', 10, 4) $$,
  '42501', 'Réservé aux commerciaux', 'commerciale suspendue : refusé');
reset role;

select pg_temp.connecter('c1150000-0000-4000-8000-000000000005', 'artisan');
set local role authenticated;
select throws_ok($$ select public.commercial_save_training('mefiant', 10, 4) $$,
  '42501', 'Réservé aux commerciaux', 'artisan : refusé');
select is((select count(*)::int from public.commercial_trainings), 0, 'artisan : aucune séance');
reset role;

set local role anon;
select throws_ok($$ select count(*) from public.commercial_trainings $$, '42501', null, 'visiteur : aucune lecture');
reset role;

select pg_temp.connecter('c1150000-0000-4000-8000-000000000001', 'admin');
set local role authenticated;
select is(
  (select count(*)::int from public.commercial_trainings where commercial_id = 'c1151000-0000-4000-8000-000000000001'),
  2, 'admin : lit les séances');
reset role;

select * from finish();
rollback;
