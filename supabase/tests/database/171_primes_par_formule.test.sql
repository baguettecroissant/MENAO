-- Primes des commerciaux selon la formule (F-174, ADR 0366) : réglages à six montants (admins
-- seulement), prime d'abonnement de Base, Premium ou Ultimate selon l'abonnement actif, repli sur
-- Base quand le montant de la formule est vide, montants dans « Mes résultats ». Données fictives
-- (SIRET 00000171…, identifiants c171…).
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

insert into auth.users (id, email, is_anonymous, email_confirmed_at, raw_app_meta_data, raw_user_meta_data) values
  ('c1710000-0000-4000-8000-000000000001', 'com171.admin@example.test', false, now(), '{"role":"admin"}', '{}'),
  ('c1710000-0000-4000-8000-000000000002', 'com171.julien@example.test', false, now(), '{"role":"commercial"}', '{}'),
  ('c1710000-0000-4000-8000-000000000011', 'com171.artisan1@example.test', false, now(), '{"role":"artisan"}', '{}'),
  ('c1710000-0000-4000-8000-000000000012', 'com171.artisan2@example.test', false, now(), '{"role":"artisan"}', '{}'),
  ('c1710000-0000-4000-8000-000000000013', 'com171.artisan3@example.test', false, now(), '{"role":"artisan"}', '{}');

insert into public.commercials (id, user_id, code, nom, status) values
  ('c1712000-0000-4000-8000-000000000001', 'c1710000-0000-4000-8000-000000000002', 'julien-171', 'Julien Exemple', 'actif');
insert into public.artisans (id, user_id, siret, raison_sociale, status) values
  ('c1711000-0000-4000-8000-000000000001', 'c1710000-0000-4000-8000-000000000011', '00000171100001', 'PLOMBERIE C171 BASE', 'brouillon'),
  ('c1711000-0000-4000-8000-000000000002', 'c1710000-0000-4000-8000-000000000012', '00000171200009', 'ELEC C171 PREMIUM', 'brouillon'),
  ('c1711000-0000-4000-8000-000000000003', 'c1710000-0000-4000-8000-000000000013', '00000171300007', 'MACONNERIE C171 ENTREPRISE', 'brouillon');
insert into public.commercial_attributions (artisan_id, commercial_id)
select a.id, 'c1712000-0000-4000-8000-000000000001' from public.artisans a where a.id::text like 'c1711000-%';

create function pg_temp.connecter(uid uuid, app_role text, aal text default 'aal2') returns void language sql as $$
  select set_config('request.jwt.claims', jsonb_build_object(
    'sub', uid, 'role', 'authenticated', 'aal', aal, 'app_metadata', jsonb_build_object('role', app_role)
  )::text, true);
$$;

-- ---------- Réglages : réservés aux admins ----------
select pg_temp.connecter('c1710000-0000-4000-8000-000000000002', 'commercial');
set local role authenticated;
select throws_ok($$ select public.admin_save_commercial_bonus_settings(11000, 3000, 0, null, 10000, 20000) $$,
  '42501', null, 'commercial : réglages refusés');
reset role;

select pg_temp.connecter('c1710000-0000-4000-8000-000000000001', 'admin');
set local role authenticated;
select throws_ok($$ select public.admin_save_commercial_bonus_settings(11000, 3000, 0, null, 1000001, 20000) $$,
  '22023', null, 'montant Premium hors limites');
select lives_ok($$ select public.admin_save_commercial_bonus_settings(11000, 3000, 0, null, 10000, 20000) $$,
  'admin : barème réel (110 €, puis 30, 100 ou 200 €)');
reset role;
select results_eq(
  $$ select prime_validation_centimes, prime_abonnement_centimes, prime_abonnement_premium_centimes,
       prime_abonnement_entreprise_centimes from public.commercial_bonus_settings $$,
  $$ values (11000, 3000, 10000, 20000) $$,
  'réglages enregistrés');

-- ---------- Validation, puis premier paiement de chaque formule ----------
update public.artisans set status = 'valide' where id::text like 'c1711000-%';
insert into public.subscriptions (artisan_id, plan_code, stripe_customer_id, stripe_subscription_id, status) values
  ('c1711000-0000-4000-8000-000000000001', 'base', 'cus_c171_1', 'sub_c171_1', 'active'),
  ('c1711000-0000-4000-8000-000000000002', 'premium', 'cus_c171_2', 'sub_c171_2', 'active'),
  ('c1711000-0000-4000-8000-000000000003', 'entreprise', 'cus_c171_3', 'sub_c171_3', 'active');
set local role service_role;
select ok(public.record_subscription_payment('sub_c171_1'), 'premier paiement (Base)');
select ok(public.record_subscription_payment('sub_c171_2'), 'premier paiement (Premium)');
select ok(public.record_subscription_payment('sub_c171_3'), 'premier paiement (Ultimate)');
reset role;

update public.commercial_bonuses set validate_after = now() - interval '1 day'
where commercial_id = 'c1712000-0000-4000-8000-000000000001';
select lives_ok($$ select app.validate_commercial_bonuses() $$, 'vérification quotidienne');
select results_eq(
  $$ select artisan_id, kind::text, status::text, amount_cents
     from public.commercial_bonuses where commercial_id = 'c1712000-0000-4000-8000-000000000001'
     order by artisan_id, kind::text $$,
  $$ values
       ('c1711000-0000-4000-8000-000000000001'::uuid, 'abonnement'::text, 'validee'::text, 3000),
       ('c1711000-0000-4000-8000-000000000001', 'validation', 'validee', 11000),
       ('c1711000-0000-4000-8000-000000000002', 'abonnement', 'validee', 10000),
       ('c1711000-0000-4000-8000-000000000002', 'validation', 'validee', 11000),
       ('c1711000-0000-4000-8000-000000000003', 'abonnement', 'validee', 20000),
       ('c1711000-0000-4000-8000-000000000003', 'validation', 'validee', 11000) $$,
  'prime d''abonnement selon la formule : 30, 100 ou 200 €');

-- ---------- Montant de formule vide : celui de Base ----------
select is(app.commercial_subscription_bonus_cents('premium'), 10000, 'Premium : son montant');
update public.commercial_bonus_settings set prime_abonnement_premium_centimes = null where id;
select is(app.commercial_subscription_bonus_cents('premium'), 3000, 'Premium vide : montant de Base');
select is(app.commercial_subscription_bonus_cents('base'), 3000, 'Base');

-- ---------- « Mes résultats » : le barème complet ----------
select pg_temp.connecter('c1710000-0000-4000-8000-000000000002', 'commercial');
set local role authenticated;
select results_eq(
  $$ select (r ->> 'prime_validation_centimes')::int, (r ->> 'prime_abonnement_centimes')::int,
       (r ->> 'prime_abonnement_premium_centimes')::int, (r ->> 'prime_abonnement_entreprise_centimes')::int
     from public.commercial_results() r $$,
  $$ values (11000, 3000, 3000, 20000) $$,
  'Mes résultats : prime de validation et primes d''abonnement des trois formules');
reset role;

select * from finish();
rollback;
