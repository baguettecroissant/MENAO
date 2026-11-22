-- Formules à jour (F-172, ADR 0363) : l'import de catalogue, les prix à jour et la hausse des
-- prix sont refusés en formule Base et sans formule, permis en Premium ; les droits sont posés
-- sur les trois formules ; le comparatif a ses sept nouvelles lignes. Données fictives.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

insert into auth.users (id, email, is_anonymous, email_confirmed_at, raw_app_meta_data, raw_user_meta_data) values
  ('f7000000-0000-4000-8000-000000000001', 'formules170.base@example.test', false, now(), '{"role":"artisan"}', '{}'),
  ('f7000000-0000-4000-8000-000000000002', 'formules170.premium@example.test', false, now(), '{"role":"artisan"}', '{}'),
  ('f7000000-0000-4000-8000-000000000003', 'formules170.sans@example.test', false, now(), '{"role":"artisan"}', '{}');
insert into public.artisans (id, user_id, status, raison_sociale, zone_mode) values
  ('f7010000-0000-4000-8000-000000000001', 'f7000000-0000-4000-8000-000000000001', 'valide', 'BASE 170', 'communes'),
  ('f7010000-0000-4000-8000-000000000002', 'f7000000-0000-4000-8000-000000000002', 'valide', 'PREMIUM 170', 'communes'),
  ('f7010000-0000-4000-8000-000000000003', 'f7000000-0000-4000-8000-000000000003', 'valide', 'SANS 170', 'communes');
insert into public.subscriptions (artisan_id, plan_code, stripe_customer_id, stripe_subscription_id, status, trial_end) values
  ('f7010000-0000-4000-8000-000000000001', 'base', 'cus_l170_1', 'sub_l170_1', 'trialing', now() + interval '30 days'),
  ('f7010000-0000-4000-8000-000000000002', 'premium', 'cus_l170_2', 'sub_l170_2', 'trialing', now() + interval '30 days');
insert into public.artisan_works (artisan_id, designation, unit, manual_price_cents, source) values
  ('f7010000-0000-4000-8000-000000000002', 'Pose WC suspendu', 'u', 66550, 'manuel');

create function pg_temp.connecter(uid uuid) returns void language sql as $$
  select set_config('request.jwt.claims', jsonb_build_object(
    'sub', uid, 'role', 'authenticated', 'app_metadata', jsonb_build_object('role', 'artisan')
  )::text, true);
$$;

-- ---------- Droits posés sur les formules ----------
select is(
  (select jsonb_object_agg(code, limites -> 'agents' -> 'import_catalogue') from public.plans
   where code in ('base', 'premium', 'entreprise')),
  '{"base": false, "premium": true, "entreprise": true}'::jsonb, 'import de catalogue : Premium et Ultimate');
select is(
  (select jsonb_object_agg(code, limites -> 'agents' -> 'prix_a_jour') from public.plans
   where code in ('base', 'premium', 'entreprise')),
  '{"base": false, "premium": true, "entreprise": true}'::jsonb, 'prix à jour : Premium et Ultimate');

-- ---------- Formule Base : refusé ----------
select pg_temp.connecter('f7000000-0000-4000-8000-000000000001');
set local role authenticated;
select throws_ok(
  $$ select public.artisan_import_library('ouvrages',
       '[{"designation": "Pose évier", "unit": "u", "priceCents": 12000, "vatRateBp": 1000}]'::jsonb, false) $$,
  '42501', null, 'Base : import de catalogue refusé');
select throws_ok(
  $$ select public.artisan_raise_prices(300, 'euro', true, false) $$,
  '42501', null, 'Base : hausse des prix refusée');
select throws_ok(
  $$ select public.artisan_apply_invoice_prices('[]'::jsonb, '{}'::uuid[], '{}'::uuid[]) $$,
  '42501', null, 'Base : prix à jour d''après les factures refusés');

-- ---------- Sans formule en cours : droits de Base ----------
reset role;
select pg_temp.connecter('f7000000-0000-4000-8000-000000000003');
set local role authenticated;
select throws_ok(
  $$ select public.artisan_raise_prices(300, 'euro', true, false) $$,
  '42501', null, 'sans formule : hausse des prix refusée');

-- ---------- Formule Premium : permis ----------
reset role;
select pg_temp.connecter('f7000000-0000-4000-8000-000000000002');
set local role authenticated;
select lives_ok(
  $$ select public.artisan_raise_prices(300, 'euro', true, false) $$,
  'Premium : hausse des prix permise');
select lives_ok(
  $$ select public.artisan_apply_invoice_prices('[]'::jsonb, '{}'::uuid[], '{}'::uuid[]) $$,
  'Premium : prix à jour permis');

-- ---------- Comparatif ----------
reset role;
select is(
  (select count(*)::int from public.plan_features where libelle in (
    'Demandes urgentes', 'Bibliothèque d''ouvrages MENAO', 'Import de votre catalogue',
    'DPGF créé depuis un plan', 'Questions à MENAO sur vos plans',
    'Suivi des paiements à encaisser', 'Prix à jour d''après vos factures')),
  7, 'les sept lignes des fonctions récentes sont au comparatif');
select is(
  (select valeurs from public.plan_features where libelle = 'Import de votre catalogue'),
  '{"base": false, "premium": true, "entreprise": true}'::jsonb, 'import de catalogue : Premium et Ultimate');

select * from finish();
rollback;
