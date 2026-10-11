-- F-10, F-16 : temps de réponse moyen de l'artisan (180 derniers jours, demandes auxquelles il a
-- répondu), publié sur la fiche à partir de 3 réponses, visible par l'artisan sur son tableau de
-- bord ; droits de chaque rôle (CLAUDE.md).
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

insert into auth.users (id, email, is_anonymous, email_confirmed_at, raw_app_meta_data, raw_user_meta_data) values
  ('b5000000-0000-4000-8000-000000000001', 'reponse.client@example.test', false, now(), '{}', '{}'),
  ('b5100000-0000-4000-8000-000000000001', 'reponse.a1@example.test', false, now(), '{"role":"artisan"}', '{"first_name":"Maël"}'),
  ('b5100000-0000-4000-8000-000000000002', 'reponse.a2@example.test', false, now(), '{"role":"artisan"}', '{}');

create function pg_temp.connecter(uid uuid, app_role text) returns void language sql as $$
  select set_config('request.jwt.claims', jsonb_build_object(
    'sub', uid, 'role', 'authenticated', 'aal', 'aal1', 'app_metadata', jsonb_build_object('role', app_role)
  )::text, true);
$$;

-- A1 : artisan visible (validé, paiements actifs, abonné) ; A2 : sans demande.
insert into public.artisans (id, user_id, status, raison_sociale, zone_mode, connect_charges_enabled) values
  ('b5200000-0000-4000-8000-000000000001', 'b5100000-0000-4000-8000-000000000001', 'valide', 'MAEL RENOV', 'communes', true),
  ('b5200000-0000-4000-8000-000000000002', 'b5100000-0000-4000-8000-000000000002', 'valide', 'AUTRE RENOV', 'communes', true);
insert into public.subscriptions (artisan_id, plan_code, stripe_customer_id, stripe_subscription_id, status, trial_end) values
  ('b5200000-0000-4000-8000-000000000001', 'base', 'cus_reponse_1', 'sub_reponse_1', 'trialing', now() + interval '30 days');

-- Cinq projets du client, une demande chacun à A1 :
-- trois réponses récentes (1 h, 2 h, 3 h), une réponse de plus de 180 jours, une sans réponse.
insert into public.projects (id, user_id, description, trade_code, ville_code_insee, ville_nom)
select ('b5300000-0000-4000-8000-00000000000' || n)::uuid, 'b5000000-0000-4000-8000-000000000001',
  'Projet ' || n, 'plombier', '06088', 'Nice'
from generate_series(1, 5) n;
insert into public.requests (project_id, artisan_id, particulier_id, contact_phone, status, refusal_reason,
  created_at, responded_at)
select ('b5300000-0000-4000-8000-00000000000' || d.n)::uuid, 'b5200000-0000-4000-8000-000000000001',
  'b5000000-0000-4000-8000-000000000001', '+33612345678', d.status::public.request_status,
  case when d.status = 'refusee' then 'planning_complet'::public.refusal_reason end, d.created, d.responded
from (values
  (1, 'refusee', now() - interval '2 hours', now() - interval '1 hour'),
  (2, 'acceptee', now() - interval '5 hours', now() - interval '3 hours'),
  (3, 'acceptee', now() - interval '30 hours', now() - interval '27 hours'),
  (4, 'acceptee', now() - interval '200 days', now() - interval '190 days'),
  (5, 'envoyee', now() - interval '1 hour', null::timestamptz)
) as d (n, status, created, responded);

-- ---------- Artisan : sa valeur exacte ----------
select pg_temp.connecter('b5100000-0000-4000-8000-000000000001', 'artisan');
set local role authenticated;
select results_eq($$ select minutes, responses from public.my_response_stats() $$,
  $$ values (120, 3) $$, 'artisan : moyenne des réponses des 180 derniers jours (2 h, 3 réponses)');
reset role;

select pg_temp.connecter('b5100000-0000-4000-8000-000000000002', 'artisan');
set local role authenticated;
select results_eq($$ select minutes, responses from public.my_response_stats() $$,
  $$ values (null::integer, 0) $$, 'artisan sans demande : aucune réponse');
reset role;

-- ---------- Fiche publique : à partir de 3 réponses ----------
select set_config('request.jwt.claims', '{"role":"anon"}', true);
set local role anon;
select is(public.artisan_public_profile('b5200000-0000-4000-8000-000000000001') ->> 'response_minutes', '120',
  'fiche : temps de réponse moyen publié');
select throws_ok($$ select * from public.my_response_stats() $$, '42501', null,
  'visiteur : pas de statistiques de compte');
reset role;

delete from public.requests where project_id = 'b5300000-0000-4000-8000-000000000003';
select pg_temp.connecter('b5000000-0000-4000-8000-000000000001', 'particulier');
set local role authenticated;
select is(public.artisan_public_profile('b5200000-0000-4000-8000-000000000001') -> 'response_minutes', 'null'::jsonb,
  'deux réponses seulement : rien de publié');
select results_eq($$ select minutes, responses from public.my_response_stats() $$,
  $$ values (null::integer, 0) $$, 'client : pas de statistiques d''artisan');
reset role;

select * from finish();
rollback;
