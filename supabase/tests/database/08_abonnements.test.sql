-- F-15 : formules, abonnements, webhooks.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

insert into auth.users (id, email, raw_app_meta_data, raw_user_meta_data) values
  ('a8a8a8a8-0000-4000-8000-000000000001', 'abo.a@example.test', '{"role":"artisan"}', '{}'),
  ('a8a8a8a8-0000-4000-8000-000000000002', 'abo.b@example.test', '{"role":"artisan"}', '{}'),
  ('a8a8a8a8-0000-4000-8000-000000000004', 'abo.adm@example.test', '{"role":"admin"}', '{}');
insert into public.artisans (user_id, status) values
  ('a8a8a8a8-0000-4000-8000-000000000001', 'valide'),
  ('a8a8a8a8-0000-4000-8000-000000000002', 'valide');

create function pg_temp.connecter(uid uuid, app_role text, aal text default 'aal1') returns void language sql as $$
  select set_config('request.jwt.claims', jsonb_build_object(
    'sub', uid, 'role', 'authenticated', 'aal', aal, 'app_metadata', jsonb_build_object('role', app_role)
  )::text, true);
$$;

select results_eq(
  $$ select code, prix_mensuel_ht_centimes, ouverte from public.plans order by ordre $$,
  $$ values ('base'::text, 15000, true), ('premium', 50000, false), ('entreprise', 150000, false) $$,
  'formules 150 / 500 / 1 500 € HT, seule Base ouverte au lancement');

-- Le webhook (service_role) enregistre un abonnement en essai pour A.
set local role service_role;
insert into public.subscriptions (artisan_id, plan_code, stripe_customer_id, stripe_subscription_id, status, trial_end)
select id, 'base', 'cus_a', 'sub_a', 'trialing', now() + interval '90 days'
from public.artisans where user_id = 'a8a8a8a8-0000-4000-8000-000000000001';
insert into public.webhook_events (id, type) values ('evt_1', 'customer.subscription.created');
select throws_ok($$ insert into public.webhook_events (id, type) values ('evt_1', 'x') $$, '23505', null,
  'un événement Stripe ne peut être enregistré qu''une fois');
reset role;

select ok(app.artisan_subscription_active((select id from public.artisans where user_id = 'a8a8a8a8-0000-4000-8000-000000000001')),
  'essai en cours : abonnement actif');
select ok(not app.artisan_subscription_active((select id from public.artisans where user_id = 'a8a8a8a8-0000-4000-8000-000000000002')),
  'sans abonnement : inactif');
update public.subscriptions set status = 'past_due' where stripe_subscription_id = 'sub_a';
select ok(app.artisan_subscription_active((select id from public.artisans where user_id = 'a8a8a8a8-0000-4000-8000-000000000001')),
  'impayé en cours de relance : encore actif (délai de grâce)');
update public.subscriptions set status = 'unpaid' where stripe_subscription_id = 'sub_a';
select ok(not app.artisan_subscription_active((select id from public.artisans where user_id = 'a8a8a8a8-0000-4000-8000-000000000001')),
  'impayé définitif : inactif');

-- ---------- Artisan ----------
select pg_temp.connecter('a8a8a8a8-0000-4000-8000-000000000001', 'artisan');
set local role authenticated;
select is((select count(*)::int from public.subscriptions), 1, 'artisan : voit son abonnement');
select throws_ok($$ update public.subscriptions set status = 'active' $$, '42501', null,
  'artisan : ne modifie pas son abonnement');
select throws_ok($$ insert into public.subscriptions (artisan_id, stripe_customer_id, stripe_subscription_id, status)
  values (app.my_artisan_id(), 'cus_x', 'sub_x', 'active') $$, '42501', null, 'artisan : ne crée pas d''abonnement');
select throws_ok($$ update public.artisans set stripe_customer_id = 'cus_pirate' $$, '42501', null,
  'artisan : identifiant client Stripe non modifiable');
select throws_ok($$ update public.plans set prix_mensuel_ht_centimes = 1 $$, '42501', null,
  'artisan : ne modifie pas les formules');
select throws_ok('select 1 from public.webhook_events', '42501', null, 'artisan : aucun accès aux webhooks');
reset role;

select pg_temp.connecter('a8a8a8a8-0000-4000-8000-000000000002', 'artisan');
set local role authenticated;
select is_empty('select 1 from public.subscriptions', 'artisan : ne voit pas l''abonnement des autres');
reset role;

-- ---------- Admin ----------
select pg_temp.connecter('a8a8a8a8-0000-4000-8000-000000000004', 'admin', 'aal2');
set local role authenticated;
select ok((select count(*) from public.subscriptions where stripe_subscription_id = 'sub_a') = 1,
  'admin : voit les abonnements');
reset role;

-- ---------- Visiteur ----------
set local role anon;
select is((select count(*)::int from public.plans), 3, 'visiteur : formules lisibles (page Espace Pro)');
select throws_ok('select 1 from public.subscriptions', '42501', null, 'visiteur : aucun abonnement');
reset role;

select * from finish();
rollback;
