-- F-14 étape 6 : compte Stripe Connect et visibilité.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

insert into auth.users (id, email, raw_app_meta_data, raw_user_meta_data) values
  ('c9c9c9c9-0000-4000-8000-000000000001', 'connect.a@example.test', '{"role":"artisan"}', '{}');
insert into public.artisans (user_id, status) values ('c9c9c9c9-0000-4000-8000-000000000001', 'valide');

create function pg_temp.artisan() returns uuid language sql as $$
  select id from public.artisans where user_id = 'c9c9c9c9-0000-4000-8000-000000000001'
$$;

select ok(not app.artisan_is_visible(pg_temp.artisan()), 'validé sans abonnement ni paiements : invisible');

insert into public.subscriptions (artisan_id, plan_code, stripe_customer_id, stripe_subscription_id, status)
values (pg_temp.artisan(), 'base', 'cus_c', 'sub_c', 'trialing');
select ok(not app.artisan_is_visible(pg_temp.artisan()), 'abonné sans compte de paiement : invisible');

update public.artisans set stripe_account_id = 'acct_c', connect_charges_enabled = true where id = pg_temp.artisan();
select ok(app.artisan_is_visible(pg_temp.artisan()), 'validé + abonné + paiements actifs : visible');

update public.artisans set status = 'suspendu' where id = pg_temp.artisan();
select ok(not app.artisan_is_visible(pg_temp.artisan()), 'suspendu : invisible');
update public.artisans set status = 'valide' where id = pg_temp.artisan();
update public.subscriptions set status = 'canceled' where artisan_id = pg_temp.artisan();
select ok(not app.artisan_is_visible(pg_temp.artisan()), 'abonnement résilié : invisible');

select set_config('request.jwt.claims', jsonb_build_object('sub', 'c9c9c9c9-0000-4000-8000-000000000001',
  'role', 'authenticated', 'app_metadata', jsonb_build_object('role', 'artisan'))::text, true);
set local role authenticated;
select throws_ok($$ update public.artisans set connect_charges_enabled = true $$, '42501', null,
  'artisan : ne déclare pas lui-même son compte de paiement actif');
select throws_ok($$ update public.artisans set stripe_account_id = 'acct_pirate' $$, '42501', null,
  'artisan : identifiant de compte Stripe non modifiable');
select results_eq($$ select stripe_account_id, connect_charges_enabled from public.artisans $$,
  $$ values ('acct_c'::text, true) $$, 'artisan : lit l''état de son compte de paiement');
select throws_ok($$ update public.artisans set connect_requirements_due = '{}' $$, '42501', null,
  'artisan : ne modifie pas les informations attendues par Stripe');
reset role;
update public.artisans set connect_requirements_due = array['external_account'],
  connect_disabled_reason = 'requirements.past_due' where id = pg_temp.artisan();
select set_config('request.jwt.claims', jsonb_build_object('sub', 'c9c9c9c9-0000-4000-8000-000000000001',
  'role', 'authenticated', 'app_metadata', jsonb_build_object('role', 'artisan'))::text, true);
set local role authenticated;
select results_eq(
  $$ select connect_requirements_due, connect_requirements_pending, connect_disabled_reason from public.artisans $$,
  $$ values (array['external_account']::text[], '{}'::text[], 'requirements.past_due'::text) $$,
  'artisan : lit ce que Stripe attend encore');
reset role;

select * from finish();
rollback;
