-- Formule « Ultimate » (F-186, ADR 0385) : nom affiché de la formule à 1 500 €, messages des
-- fonctions mis à jour, montant pour un artisan venu de nos publicités dans les réglages des primes
-- (admins seulement, mêmes bornes). Données fictives (identifiants c179…).
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

insert into auth.users (id, email, is_anonymous, email_confirmed_at, raw_app_meta_data, raw_user_meta_data) values
  ('c1790000-0000-4000-8000-000000000001', 'com179.admin@example.test', false, now(), '{"role":"admin"}', '{}'),
  ('c1790000-0000-4000-8000-000000000002', 'com179.julien@example.test', false, now(), '{"role":"commercial"}', '{}');

create function pg_temp.connecter(uid uuid, app_role text) returns void language sql as $$
  select set_config('request.jwt.claims', jsonb_build_object(
    'sub', uid, 'role', 'authenticated', 'aal', 'aal2', 'app_metadata', jsonb_build_object('role', app_role)
  )::text, true);
$$;

-- ---------- Nom de la formule ----------
select is((select nom from public.plans where code = 'entreprise'), 'Ultimate', 'formule à 1 500 € : Ultimate');
select is((select count(*)::int from public.plans where code = 'entreprise'), 1, 'code interne inchangé');
select is(
  (select count(*)::int from pg_catalog.pg_proc p
   join pg_catalog.pg_namespace n on n.oid = p.pronamespace
   where n.nspname in ('public', 'app')
     and (p.prosrc like '%Premium et Entreprise%' or p.prosrc like '%formule Entreprise%')),
  0, 'plus aucun message ne cite « Entreprise » comme formule');

-- ---------- Montant pour un artisan venu de nos publicités ----------
select has_column('public', 'commercial_bonus_settings', 'prime_validation_pub_centimes',
  'montant pour un artisan venu des publicités');

select pg_temp.connecter('c1790000-0000-4000-8000-000000000002', 'commercial');
set local role authenticated;
select throws_ok($$ select public.admin_save_commercial_bonus_settings(11000, 3000, 0, null, 10000, 20000, 5000) $$,
  '42501', null, 'commercial : réglages refusés');
reset role;

select pg_temp.connecter('c1790000-0000-4000-8000-000000000001', 'admin');
set local role authenticated;
select throws_ok($$ select public.admin_save_commercial_bonus_settings(11000, 3000, 0, null, 10000, 20000, 1000001) $$,
  '22023', null, 'montant publicités hors limites');
select lives_ok($$ select public.admin_save_commercial_bonus_settings(11000, 3000, 0, null, 10000, 20000, 5000) $$,
  'admin : 50 € pour un artisan venu des publicités');
select lives_ok($$ select public.admin_save_commercial_bonus_settings(11000, 3000, 0, null, 10000, 20000) $$,
  'appel à six montants toujours valable');
reset role;
select is((select prime_validation_pub_centimes from public.commercial_bonus_settings), null,
  'appel à six montants : montant publicités vidé');

select * from finish();
rollback;
