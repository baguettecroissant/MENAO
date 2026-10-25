-- Envoi au comptable (F-63, ADR 0187) : réglages enregistrés par l'artisan de l'espace pro
-- seulement (adresse contrôlée, au moins une partie), lisibles par lui seul ; envois automatiques
-- dus les 7 premiers jours du mois ou du trimestre, une fois par période, 3 échecs au plus ;
-- historique lisible par l'artisan seul. Données fictives.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

insert into auth.users (id, email, is_anonymous, email_confirmed_at, raw_app_meta_data, raw_user_meta_data) values
  ('dd500000-0000-4000-8000-000000000001', 'comptable103.a@example.test', false, now(), '{"role":"artisan"}', '{}'),
  ('dd500000-0000-4000-8000-000000000002', 'comptable103.b@example.test', false, now(), '{"role":"artisan"}', '{}'),
  ('dd500000-0000-4000-8000-000000000003', 'comptable103.c@example.test', false, now(), '{"role":"artisan"}', '{}'),
  ('dd500000-0000-4000-8000-000000000005', 'comptable103.admin@example.test', false, now(), '{"role":"admin"}', '{}');
insert into public.artisans (id, user_id, status, raison_sociale, zone_mode) values
  ('dd510000-0000-4000-8000-000000000001', 'dd500000-0000-4000-8000-000000000001', 'valide', 'COMPTABLE A', 'communes'),
  ('dd510000-0000-4000-8000-000000000002', 'dd500000-0000-4000-8000-000000000002', 'valide', 'COMPTABLE B', 'communes'),
  ('dd510000-0000-4000-8000-000000000003', 'dd500000-0000-4000-8000-000000000003', 'en_verification', 'COMPTABLE C', 'communes');

create function pg_temp.connecter(uid uuid, app_role text) returns void language sql as $$
  select set_config('request.jwt.claims', jsonb_build_object(
    'sub', uid, 'role', 'authenticated', 'aal', 'aal1', 'app_metadata', jsonb_build_object('role', app_role)
  )::text, true);
$$;

-- ---------- Réglages ----------
select pg_temp.connecter('dd500000-0000-4000-8000-000000000001', 'artisan');
set local role authenticated;
select lives_ok($$ select public.artisan_save_accountant_settings(true, '  Cabinet@Exemple.test ', 'mensuel', true, true) $$,
  'l''artisan enregistre ses réglages');
select lives_ok($$ select public.artisan_save_accountant_settings(true, 'cabinet@exemple.test', 'mensuel', true, false) $$,
  'un nouvel enregistrement remplace le précédent');
select results_eq($$ select enabled, email, period::text, include_invoices, include_expenses from public.accountant_settings $$,
  $$ values (true, 'cabinet@exemple.test'::text, 'mensuel'::text, true, false) $$,
  'il lit ses réglages, adresse en minuscules');
select throws_ok($$ select public.artisan_save_accountant_settings(true, 'pas-une-adresse', 'mensuel', true, true) $$,
  '23514', null, 'adresse invalide refusée');
select throws_ok($$ select public.artisan_save_accountant_settings(true, 'cabinet@exemple.test', 'mensuel', false, false) $$,
  '23514', null, 'aucune partie choisie : refusé');
select throws_ok($$ insert into public.accountant_settings (artisan_id, email) values ('dd510000-0000-4000-8000-000000000001', 'x@exemple.test') $$,
  '42501', null, 'écriture directe interdite');
select throws_ok($$ select * from public.accountant_exports_due(null, 10) $$,
  '42501', null, 'la liste des envois dus est réservée au serveur');
reset role;

select pg_temp.connecter('dd500000-0000-4000-8000-000000000002', 'artisan');
set local role authenticated;
select is_empty('select 1 from public.accountant_settings', 'un autre artisan ne voit pas les réglages');
select lives_ok($$ select public.artisan_save_accountant_settings(true, 'compta@exemple.test', 'trimestriel', true, true) $$,
  'l''artisan B règle un envoi trimestriel');
reset role;

select pg_temp.connecter('dd500000-0000-4000-8000-000000000005', 'admin');
set local role authenticated;
select is_empty('select 1 from public.accountant_settings', 'l''équipe MENAO ne lit pas les réglages');
reset role;

select pg_temp.connecter('dd500000-0000-4000-8000-000000000003', 'artisan');
set local role authenticated;
select throws_ok($$ select public.artisan_save_accountant_settings(true, 'c@exemple.test', 'mensuel', true, true) $$,
  '42501', 'acces_refuse', 'artisan en vérification : refusé');
reset role;

set local role anon;
select throws_ok($$ select public.artisan_save_accountant_settings(true, 'c@exemple.test', 'mensuel', true, true) $$,
  '42501', null, 'visiteur : refusé');
reset role;

-- Réglages actifs d'un artisan en vérification : jamais envoyés.
insert into public.accountant_settings (artisan_id, enabled, email) values
  ('dd510000-0000-4000-8000-000000000003', true, 'c@exemple.test');

-- ---------- Envois dus ----------
select results_eq($$ select artisan_id, period::text, period_start, period_end from public.accountant_exports_due('2026-10-03', 10) $$,
  $$ values
    ('dd510000-0000-4000-8000-000000000001'::uuid, 'mensuel'::text, '2026-09-01'::date, '2026-09-30'::date),
    ('dd510000-0000-4000-8000-000000000002'::uuid, 'trimestriel'::text, '2026-07-01'::date, '2026-09-30'::date)
  $$, 'début octobre : septembre pour l''envoi mensuel, 3e trimestre pour le trimestriel');
select results_eq($$ select artisan_id, period_start, period_end from public.accountant_exports_due('2026-11-07', 10) $$,
  $$ values ('dd510000-0000-4000-8000-000000000001'::uuid, '2026-10-01'::date, '2026-10-31'::date) $$,
  'début novembre : le mensuel seulement');
select is_empty($$ select 1 from public.accountant_exports_due('2026-11-08', 10) $$, 'après le 7 : rien');
select results_eq($$ select period_start, period_end from public.accountant_exports_due('2027-01-02', 10) where period = 'trimestriel' $$,
  $$ values ('2026-10-01'::date, '2026-12-31'::date) $$, 'janvier : 4e trimestre de l''année précédente');

insert into public.accountant_exports (artisan_id, kind, status, period_start, period_end, recipient) values
  ('dd510000-0000-4000-8000-000000000001', 'automatique', 'envoye', '2026-09-01', '2026-09-30', 'cabinet@exemple.test'),
  ('dd510000-0000-4000-8000-000000000002', 'automatique', 'echec', '2026-07-01', '2026-09-30', 'compta@exemple.test'),
  ('dd510000-0000-4000-8000-000000000002', 'automatique', 'echec', '2026-07-01', '2026-09-30', 'compta@exemple.test');
select results_eq($$ select artisan_id from public.accountant_exports_due('2026-10-03', 10) $$,
  $$ values ('dd510000-0000-4000-8000-000000000002'::uuid) $$,
  'période déjà envoyée : plus due ; deux échecs : encore due');
insert into public.accountant_exports (artisan_id, kind, status, period_start, period_end, recipient) values
  ('dd510000-0000-4000-8000-000000000002', 'automatique', 'echec', '2026-07-01', '2026-09-30', 'compta@exemple.test');
select is_empty($$ select 1 from public.accountant_exports_due('2026-10-03', 10) $$, 'trois échecs : on arrête');
select throws_ok($$
  insert into public.accountant_exports (artisan_id, kind, status, period_start, period_end, recipient)
  values ('dd510000-0000-4000-8000-000000000001', 'automatique', 'envoye', '2026-09-01', '2026-09-30', 'cabinet@exemple.test')
$$, '23505', null, 'un seul envoi automatique réussi par période');
select lives_ok($$
  insert into public.accountant_exports (artisan_id, kind, status, period_start, period_end, recipient)
  values ('dd510000-0000-4000-8000-000000000001', 'manuel', 'envoye', '2026-09-01', '2026-09-30', 'cabinet@exemple.test')
$$, 'un envoi à la main reste possible');
update public.accountant_settings set enabled = false where artisan_id = 'dd510000-0000-4000-8000-000000000001';
select is_empty($$ select 1 from public.accountant_exports_due('2026-11-03', 10) where artisan_id = 'dd510000-0000-4000-8000-000000000001' $$,
  'envoi désactivé : rien');

-- ---------- Historique ----------
select pg_temp.connecter('dd500000-0000-4000-8000-000000000001', 'artisan');
set local role authenticated;
select is((select count(*)::int from public.accountant_exports), 2, 'l''artisan lit son historique');
reset role;
select pg_temp.connecter('dd500000-0000-4000-8000-000000000002', 'artisan');
set local role authenticated;
select is((select count(*)::int from public.accountant_exports), 3, 'l''artisan B lit le sien seulement');
reset role;

select * from finish();
rollback;
