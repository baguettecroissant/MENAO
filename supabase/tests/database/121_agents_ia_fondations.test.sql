-- Agents IA des formules, lot 1 (F-82, ADR 0231) : droits par formule (Base sans voix, Premium
-- 300 minutes), appels comptés une seule fois, dépassement débité des minutes rechargées, alertes à
-- 80 % puis à épuisement (une fois chacune), minutes offertes par un admin, accès réservés.
-- Données fictives (identifiants c121…).
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

insert into auth.users (id, email, is_anonymous, email_confirmed_at, raw_app_meta_data, raw_user_meta_data) values
  ('c1210000-0000-4000-8000-000000000001', 'agents121.premium@example.test', false, now(), '{"role":"artisan"}', '{}'),
  ('c1210000-0000-4000-8000-000000000002', 'agents121.base@example.test', false, now(), '{"role":"artisan"}', '{}'),
  ('c1210000-0000-4000-8000-000000000003', 'agents121.admin@example.test', false, now(), '{"role":"admin"}', '{}');
insert into public.artisans (id, user_id, status, raison_sociale, zone_mode) values
  ('c1211000-0000-4000-8000-000000000001', 'c1210000-0000-4000-8000-000000000001', 'valide', 'PREMIUM 121', 'communes'),
  ('c1211000-0000-4000-8000-000000000002', 'c1210000-0000-4000-8000-000000000002', 'valide', 'BASE 121', 'communes');

-- ---------- Droits par formule ----------
select is(app.artisan_agents('c1211000-0000-4000-8000-000000000001') ->> 'formule', null, 'sans abonnement : aucune formule');
select is((app.artisan_agents('c1211000-0000-4000-8000-000000000001') ->> 'secondes_restantes')::int, 0,
  'sans abonnement : aucune minute');

insert into public.subscriptions (artisan_id, plan_code, stripe_customer_id, stripe_subscription_id, status, trial_end) values
  ('c1211000-0000-4000-8000-000000000001', 'premium', 'cus_c121a', 'sub_c121a', 'trialing', now() + interval '30 days'),
  ('c1211000-0000-4000-8000-000000000002', 'base', 'cus_c121b', 'sub_c121b', 'active', null);

select is((app.artisan_agents('c1211000-0000-4000-8000-000000000001') ->> 'secondes_incluses')::int, 18000,
  'Premium à l''essai : 300 minutes');
select is((app.artisan_agents('c1211000-0000-4000-8000-000000000001') -> 'agents' ->> 'secretaire')::boolean, true,
  'Premium : secrétaire dédiée');
select is((app.artisan_agents('c1211000-0000-4000-8000-000000000002') ->> 'secondes_incluses')::int, 0, 'Base : aucune minute');
select is((app.artisan_agents('c1211000-0000-4000-8000-000000000002') -> 'agents' ->> 'secretaire')::boolean, false,
  'Base : pas de secrétaire');
select is((select (limites -> 'agents' ->> 'voix_minutes')::int from public.plans where code = 'entreprise'), 1000,
  'Entreprise : 1 000 minutes');

-- ---------- Accès ----------
set local role authenticated;
select set_config('request.jwt.claims', jsonb_build_object('sub', 'c1210000-0000-4000-8000-000000000001',
  'role', 'authenticated', 'aal', 'aal1', 'app_metadata', jsonb_build_object('role', 'artisan'))::text, true);
select throws_ok(
  $$ select public.voice_record_usage('c1211000-0000-4000-8000-000000000001', 'appel-c121-x', 60, 'secretaire') $$,
  '42501', null, 'artisan : compter un appel refusé');
select throws_ok($$ select * from public.admin_voice_usage() $$, '42501', null, 'artisan : suivi admin refusé');
select throws_ok(
  $$ select public.admin_grant_voice_minutes('c1211000-0000-4000-8000-000000000001', 10, 'essai') $$,
  '42501', null, 'artisan : minutes offertes refusées');
reset role;

-- ---------- Comptage ----------
set local role service_role;
select lives_ok(
  $$ select public.voice_record_usage('c1211000-0000-4000-8000-000000000001', 'appel-c121-1', 120, 'secretaire') $$,
  'appel compté');
select lives_ok(
  $$ select public.voice_record_usage('c1211000-0000-4000-8000-000000000001', 'appel-c121-1', 120, 'secretaire') $$,
  'même appel rejoué : sans effet');
select is((public.voice_artisan_agents('c1211000-0000-4000-8000-000000000001') ->> 'secondes_utilisees')::int, 120,
  'compté une seule fois');
-- 14 400 secondes en tout : 80 % des minutes incluses.
select lives_ok(
  $$ select public.voice_record_usage('c1211000-0000-4000-8000-000000000001', 'appel-c121-2', 14280, 'secretaire') $$,
  'appel qui atteint 80 %');
reset role;
select is((select count(*)::int from public.notifications
  where user_id = 'c1210000-0000-4000-8000-000000000001' and type = 'agents_minutes_80'), 1, 'alerte à 80 %');

-- Minutes offertes par un admin.
set local role authenticated;
select set_config('request.jwt.claims', jsonb_build_object('sub', 'c1210000-0000-4000-8000-000000000003',
  'role', 'authenticated', 'aal', 'aal2', 'app_metadata', jsonb_build_object('role', 'admin'))::text, true);
select throws_ok(
  $$ select public.admin_grant_voice_minutes('c1211000-0000-4000-8000-000000000001', 10, '  ') $$,
  '22023', null, 'motif obligatoire');
select lives_ok(
  $$ select public.admin_grant_voice_minutes('c1211000-0000-4000-8000-000000000001', 10, 'Essai de la secrétaire') $$,
  'admin : 10 minutes offertes');
select is((select count(*)::int from public.admin_voice_usage()), 1, 'admin : suivi des minutes du mois');
reset role;

-- Dépassement : débité des minutes offertes.
set local role service_role;
select lives_ok(
  $$ select public.voice_record_usage('c1211000-0000-4000-8000-000000000001', 'appel-c121-3', 4000, 'secretaire') $$,
  'appel au-delà des minutes incluses');
select is((public.voice_artisan_agents('c1211000-0000-4000-8000-000000000001') ->> 'secondes_restantes')::int, 200,
  '400 secondes prises sur les 600 offertes');
reset role;
select is((select count(*)::int from public.notifications
  where user_id = 'c1210000-0000-4000-8000-000000000001' and type = 'agents_minutes_80'), 1, 'alerte à 80 % : une seule fois');
select is((select count(*)::int from public.notifications
  where user_id = 'c1210000-0000-4000-8000-000000000001' and type = 'agents_minutes_epuisees'), 0, 'pas encore épuisé');

set local role service_role;
select lives_ok(
  $$ select public.voice_record_usage('c1211000-0000-4000-8000-000000000001', 'appel-c121-4', 300, 'devis') $$,
  'dernier appel');
select is((public.voice_artisan_agents('c1211000-0000-4000-8000-000000000001') ->> 'secondes_restantes')::int, 0,
  'plus aucune minute');
reset role;
select is((select count(*)::int from public.notifications
  where user_id = 'c1210000-0000-4000-8000-000000000001' and type = 'agents_minutes_epuisees'), 1, 'alerte d''épuisement');

-- ---------- « Mes agents IA » et lecture des appels ----------
set local role authenticated;
select set_config('request.jwt.claims', jsonb_build_object('sub', 'c1210000-0000-4000-8000-000000000001',
  'role', 'authenticated', 'aal', 'aal1', 'app_metadata', jsonb_build_object('role', 'artisan'))::text, true);
select is(jsonb_array_length(public.my_ai_agents() -> 'appels'), 4, 'artisan : ses derniers appels');
select is((select count(*)::int from public.voice_usage), 4, 'artisan : ses appels lisibles');
select set_config('request.jwt.claims', jsonb_build_object('sub', 'c1210000-0000-4000-8000-000000000002',
  'role', 'authenticated', 'aal', 'aal1', 'app_metadata', jsonb_build_object('role', 'artisan'))::text, true);
select is((select count(*)::int from public.voice_usage), 0, 'autre artisan : rien');
select is((select count(*)::int from public.voice_credits), 0, 'autre artisan : aucune recharge lisible');
select is(public.my_ai_agents() ->> 'formule', 'base', 'autre artisan : sa formule');
reset role;

select * from finish();
rollback;
