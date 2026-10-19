-- Parrainages dans le back-office (F-60, ADR 0143) : liste avec parrain, filleul et mois offerts,
-- chiffres clés, annulation avant la récompense (motif obligatoire, journalisée), parrainage d'un
-- artisan sur sa fiche ; réservé aux admins en session aal2. Données fictives.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

insert into auth.users (id, email, is_anonymous, email_confirmed_at, raw_app_meta_data, raw_user_meta_data) values
  ('c7300000-0000-4000-8000-000000000001', 'adm73.admin@example.test', false, now(), '{"role":"admin"}', '{}'),
  ('c7300000-0000-4000-8000-000000000002', 'adm73.parrain@example.test', false, now(), '{"role":"artisan"}', '{}'),
  ('c7300000-0000-4000-8000-000000000003', 'adm73.filleul@example.test', false, now(), '{"role":"artisan"}', '{}'),
  ('c7300000-0000-4000-8000-000000000004', 'adm73.second@example.test', false, now(), '{"role":"artisan"}', '{}');
insert into public.artisans (id, user_id, status, raison_sociale, nom_commercial, zone_mode, assujetti_tva) values
  ('c7310000-0000-4000-8000-000000000001', 'c7300000-0000-4000-8000-000000000002', 'valide', 'PARRAIN EXEMPLE SARL', 'Plomberie Parrain', 'communes', true),
  ('c7310000-0000-4000-8000-000000000002', 'c7300000-0000-4000-8000-000000000003', 'valide', 'FILLEUL EXEMPLE', null, 'communes', true),
  ('c7310000-0000-4000-8000-000000000003', 'c7300000-0000-4000-8000-000000000004', 'brouillon', null, null, 'communes', true);
insert into public.artisan_referral_codes (artisan_id, code) values ('c7310000-0000-4000-8000-000000000001', 'parr7300');
insert into public.artisan_referrals (id, referrer_artisan_id, referred_artisan_id, status, rewarded_at) values
  ('c7320000-0000-4000-8000-000000000001', 'c7310000-0000-4000-8000-000000000001', 'c7310000-0000-4000-8000-000000000002', 'recompense', now()),
  ('c7320000-0000-4000-8000-000000000002', 'c7310000-0000-4000-8000-000000000001', 'c7310000-0000-4000-8000-000000000003', 'en_attente', null);
insert into public.artisan_free_months (artisan_id, referral_id, status, applied_at, stripe_subscription_id) values
  ('c7310000-0000-4000-8000-000000000002', 'c7320000-0000-4000-8000-000000000001', 'applique', now(), 'sub_adm73_f'),
  ('c7310000-0000-4000-8000-000000000001', 'c7320000-0000-4000-8000-000000000001', 'a_appliquer', null, null);

create function pg_temp.connecter(uid uuid, app_role text, aal text default 'aal2') returns void language sql as $$
  select set_config('request.jwt.claims', jsonb_build_object(
    'sub', uid, 'role', 'authenticated', 'aal', aal, 'app_metadata', jsonb_build_object('role', app_role)
  )::text, true);
$$;

-- ---------- Réservé aux admins ----------
select pg_temp.connecter('c7300000-0000-4000-8000-000000000002', 'artisan');
set local role authenticated;
select throws_ok($$ select * from public.admin_referrals() $$, '42501', null, 'artisan : liste impossible');
select throws_ok($$ select public.admin_referral_summary() $$, '42501', null, 'artisan : chiffres impossibles');
select throws_ok(
  $$ select public.admin_cancel_referral('c7320000-0000-4000-8000-000000000002', 'Abus') $$,
  '42501', null, 'artisan : annulation impossible');
reset role;
select pg_temp.connecter('c7300000-0000-4000-8000-000000000001', 'admin', 'aal1');
set local role authenticated;
select throws_ok($$ select * from public.admin_referrals() $$, '42501', null, 'admin sans double authentification : impossible');
reset role;

-- ---------- Liste, chiffres, fiche ----------
select pg_temp.connecter('c7300000-0000-4000-8000-000000000001', 'admin');
set local role authenticated;
select results_eq(
  $$ select status::text, referrer, referred, referrer_month::text, referred_month::text
     from public.admin_referrals() where referrer_id = 'c7310000-0000-4000-8000-000000000001' order by status $$,
  $$ values ('en_attente', 'Plomberie Parrain', 'Artisan', null::text, null::text),
            ('recompense', 'Plomberie Parrain', 'FILLEUL EXEMPLE', 'a_appliquer', 'applique') $$,
  'liste : noms (commercial, sinon raison sociale, sinon nom du compte), statuts, mois de chacun');
select is(
  (select count(*)::int from public.admin_referrals('en_attente') where referrer_id = 'c7310000-0000-4000-8000-000000000001'),
  1, 'filtre par statut');
select ok((public.admin_referral_summary() ->> 'mois_poses')::int >= 1, 'chiffres clés : mois posés');
select results_eq(
  $$ select d ->> 'code', d ->> 'parrain', json_array_length(d -> 'filleuls'), d ->> 'mois_en_attente'
     from (select public.admin_artisan_referral('c7310000-0000-4000-8000-000000000001') as d) s $$,
  $$ values ('parr7300', null::text, 2, '1') $$,
  'fiche du parrain : code, sans parrain, deux filleuls, un mois en attente');
select is(
  public.admin_artisan_referral('c7310000-0000-4000-8000-000000000002') -> 'parrain' ->> 'nom',
  'Plomberie Parrain', 'fiche du filleul : son parrain');

-- ---------- Annulation avant la récompense ----------
select throws_ok(
  $$ select public.admin_cancel_referral('c7320000-0000-4000-8000-000000000002', '  ') $$,
  '22023', 'Indiquez le motif de l''annulation.', 'annulation sans motif : refusée');
select throws_ok(
  $$ select public.admin_cancel_referral('c7320000-0000-4000-8000-000000000001', 'Trop tard') $$,
  '22023', 'Parrainage introuvable ou déjà récompensé.', 'parrainage récompensé : annulation impossible');
select lives_ok(
  $$ select public.admin_cancel_referral('c7320000-0000-4000-8000-000000000002', 'Même dirigeant, seconde entreprise') $$,
  'parrainage en attente annulé avec son motif');
reset role;
select results_eq(
  $$ select status::text, cancel_reason from public.artisan_referrals where id = 'c7320000-0000-4000-8000-000000000002' $$,
  $$ values ('annule', 'Même dirigeant, seconde entreprise') $$,
  'statut et motif enregistrés');
select is((select count(*)::int from public.audit_logs where action = 'parrainage.annule'), 1, 'annulation journalisée');

select * from finish();
rollback;
