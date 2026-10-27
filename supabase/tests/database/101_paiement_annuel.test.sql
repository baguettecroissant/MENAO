-- Paiement à l'année (F-15, ADR 0200, lot 2) : clé du prix annuel de chaque formule, périodicité
-- de l'abonnement (écrite par le webhook seulement), revenu mensuel du back-office. Données fictives.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

insert into auth.users (id, email, raw_app_meta_data, raw_user_meta_data) values
  ('a1010000-0000-4000-8000-000000000001', 'annuel.a@example.test', '{"role":"artisan"}', '{}'),
  ('a1010000-0000-4000-8000-000000000002', 'annuel.b@example.test', '{"role":"artisan"}', '{}');
insert into public.artisans (user_id, status) values
  ('a1010000-0000-4000-8000-000000000001', 'valide'),
  ('a1010000-0000-4000-8000-000000000002', 'valide');

create function pg_temp.connecter(uid uuid, app_role text) returns void language sql as $$
  select set_config('request.jwt.claims', jsonb_build_object(
    'sub', uid, 'role', 'authenticated', 'app_metadata', jsonb_build_object('role', app_role)
  )::text, true);
$$;

select results_eq(
  $$ select code, stripe_lookup_key_annuel from public.plans order by ordre $$,
  $$ values ('base'::text, 'menao_base_annuel'::text), ('premium', 'menao_premium_annuel'),
    ('entreprise', 'menao_entreprise_annuel') $$,
  'chaque formule a la clé de son prix annuel');

select results_eq(
  $$ select code from public.plans where recommandee $$,
  $$ values ('premium'::text) $$,
  'Premium est la formule recommandée');
select throws_ok(
  $$ update public.plans set recommandee = true where code = 'base' $$,
  '23505', null, 'une seule formule recommandée à la fois');

-- Revenu mensuel avant les abonnements du test (d'autres peuvent exister dans la base).
select set_config('test.mrr_avant', (app.subscription_summary() ->> 'mrr_cents'), true);

-- Le webhook (service_role) enregistre un abonnement au mois et un abonnement à l'année.
set local role service_role;
insert into public.subscriptions (artisan_id, plan_code, stripe_customer_id, stripe_subscription_id, status)
select id, 'base', 'cus_annuel_a', 'sub_annuel_a', 'active'
from public.artisans where user_id = 'a1010000-0000-4000-8000-000000000001';
insert into public.subscriptions (artisan_id, plan_code, stripe_customer_id, stripe_subscription_id, status, periodicite)
select id, 'base', 'cus_annuel_b', 'sub_annuel_b', 'active', 'annuel'
from public.artisans where user_id = 'a1010000-0000-4000-8000-000000000002';
select throws_ok(
  $$ update public.subscriptions set periodicite = 'hebdomadaire' where stripe_subscription_id = 'sub_annuel_a' $$,
  '23514', null, 'périodicité : au mois ou à l''année seulement');
reset role;

select is(
  (select periodicite from public.subscriptions where stripe_subscription_id = 'sub_annuel_a'),
  'mensuel', 'au mois par défaut');
-- 150 € au mois + 1 500 € à l'année (125 € par mois) = 275 € de revenu mensuel en plus.
select is(
  (app.subscription_summary() ->> 'mrr_cents')::int - current_setting('test.mrr_avant')::int,
  27500, 'revenu mensuel : un abonnement annuel compte pour un douzième de son prix');

-- L'artisan ne change pas sa périodicité lui-même.
select pg_temp.connecter('a1010000-0000-4000-8000-000000000001', 'artisan');
set local role authenticated;
select throws_ok(
  $$ update public.subscriptions set periodicite = 'annuel' $$,
  '42501', null, 'artisan : périodicité non modifiable');
reset role;

select * from finish();
rollback;
