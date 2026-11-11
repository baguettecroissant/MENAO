-- F-128 : urgence réglée par le particulier (ADR 0279) : lui seul, tant que la demande n'est pas
-- envoyée ; son choix est gardé à part de celui de l'analyse.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

insert into auth.users (id, email, is_anonymous, email_confirmed_at, raw_app_meta_data, raw_user_meta_data) values
  ('e3310000-0000-4000-8000-000000000001', null, true, null, '{}', '{}'),
  ('e3310000-0000-4000-8000-000000000002', 'urgence.autre@example.test', false, now(), '{}', '{}'),
  ('e3310000-0000-4000-8000-000000000003', 'urgence.artisan@example.test', false, now(), '{"role":"artisan"}', '{}'),
  ('e3310000-0000-4000-8000-000000000004', 'urgence.admin@example.test', false, now(), '{"role":"admin"}', '{}'),
  ('e3310000-0000-4000-8000-000000000005', 'urgence.support@example.test', false, now(), '{"role":"support"}', '{}');

create function pg_temp.connecter(uid uuid, app_role text, niveau text default 'aal1') returns void language sql as $$
  select set_config('request.jwt.claims', jsonb_build_object(
    'sub', uid, 'role', 'authenticated', 'aal', niveau, 'app_metadata', jsonb_build_object('role', app_role)
  )::text, true);
$$;

-- Projets créés par l'Edge Function (service_role), écrits ici hors RLS.
insert into public.projects (id, user_id, status, description, trade_code, date_mode, date_souhaitee) values
  ('e3320000-0000-4000-8000-000000000001', 'e3310000-0000-4000-8000-000000000001', 'brouillon',
   'Repeindre le salon.', 'peintre', 'date', current_date + 30),
  ('e3320000-0000-4000-8000-000000000002', 'e3310000-0000-4000-8000-000000000001', 'demande_envoyee',
   'Changer un robinet.', 'plombier', 'inconnue', null);

select is((select urgence_manuelle from public.projects where id = 'e3320000-0000-4000-8000-000000000001'),
  null, 'par défaut : urgence jamais réglée par le particulier');

-- ---------- Refusé aux autres ----------
set local role authenticated;
select pg_temp.connecter('e3310000-0000-4000-8000-000000000002', 'particulier');
select throws_ok($$ select public.set_project_urgency('e3320000-0000-4000-8000-000000000001', true) $$,
  '42501', 'Projet introuvable ou non modifiable', 'autre particulier : refusé');
select pg_temp.connecter('e3310000-0000-4000-8000-000000000003', 'artisan');
select throws_ok($$ select public.set_project_urgency('e3320000-0000-4000-8000-000000000001', true) $$,
  '42501', 'Projet introuvable ou non modifiable', 'artisan : refusé');
select pg_temp.connecter('e3310000-0000-4000-8000-000000000005', 'support');
select throws_ok($$ select public.set_project_urgency('e3320000-0000-4000-8000-000000000001', true) $$,
  '42501', 'Projet introuvable ou non modifiable', 'support : refusé');
select pg_temp.connecter('e3310000-0000-4000-8000-000000000004', 'admin', 'aal2');
select throws_ok($$ select public.set_project_urgency('e3320000-0000-4000-8000-000000000001', true) $$,
  '42501', 'Projet introuvable ou non modifiable', 'admin : refusé');
reset role;
select is((select urgence from public.projects where id = 'e3320000-0000-4000-8000-000000000001'),
  false, 'aucun changement après les refus');

-- ---------- Le particulier (session anonyme acceptée) ----------
set local role authenticated;
select pg_temp.connecter('e3310000-0000-4000-8000-000000000001', 'particulier');
update public.projects set urgence = true, urgence_manuelle = true
  where id = 'e3320000-0000-4000-8000-000000000001';
reset role;
select is((select urgence from public.projects where id = 'e3320000-0000-4000-8000-000000000001'),
  false, 'modification directe sans effet');

set local role authenticated;
select pg_temp.connecter('e3310000-0000-4000-8000-000000000001', 'particulier');
select throws_ok($$ select public.set_project_urgency('e3320000-0000-4000-8000-000000000001', null) $$,
  '22023', 'Indiquez si la demande est urgente', 'choix obligatoire');
select lives_ok($$ select public.set_project_urgency('e3320000-0000-4000-8000-000000000001', true) $$,
  'le particulier signale sa demande comme urgente');
reset role;
select results_eq(
  $$ select urgence, urgence_manuelle, date_mode::text, date_souhaitee from public.projects
     where id = 'e3320000-0000-4000-8000-000000000001' $$,
  $$ values (true, true, 'des_que_possible'::text, null::date) $$,
  'urgente : choix gardé, début dès que possible, date effacée');

set local role authenticated;
select pg_temp.connecter('e3310000-0000-4000-8000-000000000001', 'particulier');
select lives_ok($$ select public.set_project_urgency('e3320000-0000-4000-8000-000000000001', false) $$,
  'le particulier retire l''urgence');
reset role;
select results_eq(
  $$ select urgence, urgence_manuelle, date_mode::text from public.projects
     where id = 'e3320000-0000-4000-8000-000000000001' $$,
  $$ values (false, false, 'des_que_possible'::text) $$,
  'urgence retirée : choix gardé, délai laissé tel quel');

set local role authenticated;
select pg_temp.connecter('e3310000-0000-4000-8000-000000000001', 'particulier');
select throws_ok($$ select public.set_project_urgency('e3320000-0000-4000-8000-000000000002', true) $$,
  '42501', 'Projet introuvable ou non modifiable', 'demande déjà envoyée : refusé');
select throws_ok($$ select public.set_project_urgency('00000000-0000-4000-8000-000000000000', true) $$,
  '42501', 'Projet introuvable ou non modifiable', 'projet inconnu : refusé');
reset role;

-- ---------- Droits d'exécution ----------
select ok(not has_function_privilege('anon', 'public.set_project_urgency(uuid, boolean)', 'execute'),
  'visiteur sans session : exécution refusée');

select * from finish();
rollback;
