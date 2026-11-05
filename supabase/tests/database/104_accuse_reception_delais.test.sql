-- ADR 0221 : délai de réponse habituel communiqué au particulier à l'envoi (tranche, 3 réponses au
-- moins, moyenne sous 24 h) ; e-mail « demande envoyée » enrichi ; lecture réservée au client
-- auteur des demandes. Personnes et entreprises fictives.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

insert into auth.users (id, email, is_anonymous, email_confirmed_at, raw_app_meta_data, raw_user_meta_data) values
  ('b1040000-0000-4000-8000-000000000001', 'accuse.client@example.test', false, now(), '{}', '{}'),
  ('b1040000-0000-4000-8000-000000000002', 'accuse.autre@example.test', false, now(), '{}', '{}'),
  ('b1041000-0000-4000-8000-000000000001', 'accuse.a1@example.test', false, now(), '{"role":"artisan"}', '{}'),
  ('b1041000-0000-4000-8000-000000000002', 'accuse.a2@example.test', false, now(), '{"role":"artisan"}', '{}');

create function pg_temp.connecter(uid uuid) returns void language sql as $$
  select set_config('request.jwt.claims', jsonb_build_object(
    'sub', uid, 'role', 'authenticated', 'app_metadata', '{}'::jsonb)::text, true);
$$;

-- A1 répond en 1 h en moyenne (3 réponses) ; A2 n'a aucun historique.
insert into public.artisans (id, user_id, status, raison_sociale, zone_mode, connect_charges_enabled) values
  ('b1042000-0000-4000-8000-000000000001', 'b1041000-0000-4000-8000-000000000001', 'valide', 'RAPIDE PLOMBERIE', 'communes', true),
  ('b1042000-0000-4000-8000-000000000002', 'b1041000-0000-4000-8000-000000000002', 'valide', 'NOUVEAU PLOMBIER', 'communes', true);
insert into public.projects (id, user_id, description, trade_code, ville_code_insee, ville_nom)
select ('b1043000-0000-4000-8000-00000000000' || n)::uuid, 'b1040000-0000-4000-8000-000000000001',
  'Projet ' || n, 'plombier', '06088', 'Nice'
from generate_series(1, 4) n;
insert into public.requests (project_id, artisan_id, particulier_id, contact_phone, status, refusal_reason,
  created_at, responded_at)
select ('b1043000-0000-4000-8000-00000000000' || n)::uuid, 'b1042000-0000-4000-8000-000000000001',
  'b1040000-0000-4000-8000-000000000001', '+33612345678', 'refusee', 'planning_complet',
  now() - interval '3 hours', now() - interval '2 hours'
from generate_series(1, 3) n;

select is(app.response_band('b1042000-0000-4000-8000-000000000001'), 'deux_heures', 'A1 : moins de 2 h');
select is(app.response_band('b1042000-0000-4000-8000-000000000002'), null, 'A2 sans historique : rien');

-- Nouvel envoi : projet 4, aux deux artisans.
insert into public.requests (project_id, artisan_id, particulier_id, contact_phone) values
  ('b1043000-0000-4000-8000-000000000004', 'b1042000-0000-4000-8000-000000000001', 'b1040000-0000-4000-8000-000000000001', '+33612345678'),
  ('b1043000-0000-4000-8000-000000000004', 'b1042000-0000-4000-8000-000000000002', 'b1040000-0000-4000-8000-000000000001', '+33612345678');
set constraints all immediate;

select results_eq(
  $$ select (data ->> 'nb')::int, data -> 'delais' from public.notifications
     where type = 'demande_envoyee' and user_id = 'b1040000-0000-4000-8000-000000000001' $$,
  $$ values (2, '[{"nom": "RAPIDE PLOMBERIE", "tranche": "deux_heures"}]'::jsonb) $$,
  'e-mail : deux artisans contactés, délai habituel du seul artisan qui a un historique');

-- ---------- Client auteur ----------
select pg_temp.connecter('b1040000-0000-4000-8000-000000000001');
set local role authenticated;
select results_eq(
  $$ select r.artisan_id, b.tranche from public.particulier_response_bands(
       (select array_agg(id) from public.requests where project_id = 'b1043000-0000-4000-8000-000000000004')) b
     join public.requests r on r.id = b.request_id $$,
  $$ values ('b1042000-0000-4000-8000-000000000001'::uuid, 'deux_heures'::text) $$,
  'client : tranche de ses demandes, rien pour l''artisan sans historique');
reset role;

-- ---------- Autre utilisateur ----------
select pg_temp.connecter('b1040000-0000-4000-8000-000000000002');
set local role authenticated;
select is(
  (select count(*)::int from public.particulier_response_bands(
     (select array_agg(id) from public.requests where artisan_id = 'b1042000-0000-4000-8000-000000000001'))),
  0, 'autre utilisateur : rien sur les demandes d''un autre');
reset role;

select ok(not has_function_privilege('anon', 'public.particulier_response_bands(uuid[])', 'execute'),
  'visiteur sans session : refusé');
select ok(not has_function_privilege('authenticated', 'app.response_band(uuid)', 'execute'),
  'tranche brute : réservée à la base');

select * from finish();
rollback;
