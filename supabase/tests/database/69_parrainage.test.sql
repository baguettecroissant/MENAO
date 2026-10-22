-- Parrainage entre artisans (F-60, ADR 0137) : code réservé aux artisans validés, stable ;
-- inscription avec le code d'un parrain validé (jamais le sien) ; codes distincts de ceux des
-- partenaires ; au premier paiement du filleul, un mois offert au parrain (V2, ADR 0154), une
-- seule fois ; mois à poser par la clé serveur seulement ; lecture limitée au parrain, au filleul
-- et aux admins.
-- Données fictives.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

insert into auth.users (id, email, is_anonymous, email_confirmed_at, raw_app_meta_data, raw_user_meta_data) values
  ('c6900000-0000-4000-8000-000000000001', 'parr69.parrain@example.test', false, now(), '{"role":"artisan"}', '{}'),
  ('c6900000-0000-4000-8000-000000000002', 'parr69.filleul@example.test', false, now(), '{"role":"artisan"}', '{}'),
  ('c6900000-0000-4000-8000-000000000003', 'parr69.brouillon@example.test', false, now(), '{"role":"artisan"}', '{}'),
  ('c6900000-0000-4000-8000-000000000004', 'parr69.admin@example.test', false, now(), '{"role":"admin"}', '{}');
insert into public.artisans (id, user_id, status, siret, raison_sociale, forme_juridique_code, adresse_ligne,
  adresse_code_postal, adresse_commune, zone_mode, assujetti_tva) values
  ('c6910000-0000-4000-8000-000000000001', 'c6900000-0000-4000-8000-000000000001', 'valide',
   '00000069000016', 'PARRAIN EXEMPLE', '5710', '1 RUE DE L''EXEMPLE', '06000', 'NICE', 'communes', true),
  ('c6910000-0000-4000-8000-000000000002', 'c6900000-0000-4000-8000-000000000002', 'brouillon',
   null, null, null, null, null, null, 'communes', true),
  ('c6910000-0000-4000-8000-000000000003', 'c6900000-0000-4000-8000-000000000003', 'brouillon',
   null, null, null, null, null, null, 'communes', true);

create function pg_temp.connecter(uid uuid, app_role text, aal text default 'aal2') returns void language sql as $$
  select set_config('request.jwt.claims', jsonb_build_object(
    'sub', uid, 'role', 'authenticated', 'aal', aal, 'app_metadata', jsonb_build_object('role', app_role)
  )::text, true);
$$;

-- ---------- Code : artisans validés seulement, stable ----------
select pg_temp.connecter('c6900000-0000-4000-8000-000000000003', 'artisan_en_attente');
set local role authenticated;
select ok(public.my_referral() is null, 'artisan non validé : pas encore de code');
reset role;

select pg_temp.connecter('c6900000-0000-4000-8000-000000000001', 'artisan');
set local role authenticated;
select matches(public.my_referral() ->> 'code', '^[a-hjkmnp-z2-9]{8}$', 'artisan validé : code de 8 caractères sans ambiguïté');
select is(public.my_referral() ->> 'code',
  (select code from public.artisan_referral_codes where artisan_id = 'c6910000-0000-4000-8000-000000000001'),
  'le code ne change pas d''un appel à l''autre');
select is((public.my_referral() ->> 'joined')::int, 0, 'aucun confrère inscrit pour l''instant');
reset role;

-- ---------- Codes des partenaires et des parrains : un seul espace de liens ----------
select pg_temp.connecter('c6900000-0000-4000-8000-000000000004', 'admin');
set local role authenticated;
select throws_ok(
  format($$ select public.admin_save_partner(%L, 'Agence', '73282932000074', 'parr69@example.test', 'actif') $$,
    (select code from public.artisan_referral_codes where artisan_id = 'c6910000-0000-4000-8000-000000000001')),
  '22023', 'Ce code est déjà utilisé.', 'code d''un parrain : refusé pour un partenaire');
reset role;

-- ---------- Inscription avec un code ----------
select lives_ok(
  format($$ select app.apply_artisan_signup('c6910000-0000-4000-8000-000000000002', jsonb_build_object('partner_code', upper(%L))) $$,
    (select code from public.artisan_referral_codes where artisan_id = 'c6910000-0000-4000-8000-000000000001')),
  'inscription avec le code du parrain (casse indifférente)');
select is(
  (select referrer_artisan_id from public.artisan_referrals where referred_artisan_id = 'c6910000-0000-4000-8000-000000000002'),
  'c6910000-0000-4000-8000-000000000001'::uuid, 'filleul rattaché à son parrain');
select lives_ok(
  format($$ select app.apply_artisan_signup('c6910000-0000-4000-8000-000000000001', jsonb_build_object('partner_code', %L)) $$,
    (select code from public.artisan_referral_codes where artisan_id = 'c6910000-0000-4000-8000-000000000001')),
  'son propre code : sans erreur');
select is_empty($$ select 1 from public.artisan_referrals where referred_artisan_id = 'c6910000-0000-4000-8000-000000000001' $$,
  'son propre code : aucun parrainage');

-- Code d'un artisan qui n'est plus validé : sans effet.
insert into public.artisan_referral_codes (artisan_id, code) values ('c6910000-0000-4000-8000-000000000003', 'brouil69');
select lives_ok($$ select app.apply_artisan_signup('c6910000-0000-4000-8000-000000000001', '{"partner_code": "brouil69"}'::jsonb) $$,
  'code d''un artisan non validé : sans erreur');
select is_empty($$ select 1 from public.artisan_referrals where referrer_artisan_id = 'c6910000-0000-4000-8000-000000000003' $$,
  'code d''un artisan non validé : aucun parrainage');

-- ---------- Premier paiement du filleul : un mois offert au parrain (ADR 0154) ----------
insert into public.subscriptions (artisan_id, stripe_customer_id, stripe_subscription_id, status) values
  ('c6910000-0000-4000-8000-000000000001', 'cus_parr69_a', 'sub_parr69_parrain', 'active'),
  ('c6910000-0000-4000-8000-000000000002', 'cus_parr69_b', 'sub_parr69_filleul', 'active');
select ok(public.record_subscription_payment('sub_parr69_filleul'), 'premier paiement du filleul');
select is((select status::text from public.artisan_referrals where referred_artisan_id = 'c6910000-0000-4000-8000-000000000002'),
  'recompense', 'parrainage récompensé');
select results_eq(
  $$ select artisan_id from public.artisan_free_months where status = 'a_appliquer'
     and artisan_id in ('c6910000-0000-4000-8000-000000000001', 'c6910000-0000-4000-8000-000000000002') $$,
  $$ values ('c6910000-0000-4000-8000-000000000001'::uuid) $$,
  'un mois offert au parrain, aucun au filleul');
select ok(not public.record_subscription_payment('sub_parr69_filleul'), 'paiements suivants : sans effet');
select is((select count(*)::int from public.artisan_free_months
           where artisan_id in ('c6910000-0000-4000-8000-000000000001', 'c6910000-0000-4000-8000-000000000002')),
  1, 'jamais de mois offert en double');
select is(public.record_subscription_payment('sub_parr69_parrain'), true, 'premier paiement du parrain lui-même');
select is((select count(*)::int from public.artisan_free_months where artisan_id = 'c6910000-0000-4000-8000-000000000001'),
  1, 'le paiement du parrain ne crée pas de mois offert');

-- ---------- Mois à poser sur les abonnements (clé serveur) ----------
select results_eq(
  $$ select stripe_subscription_id from public.free_month_candidates('sub_parr69_filleul') $$,
  $$ values ('sub_parr69_parrain') $$,
  'facture du filleul : mois du parrain à poser');
select results_eq(
  $$ select stripe_subscription_id from public.free_month_candidates('sub_parr69_parrain') $$,
  $$ values ('sub_parr69_parrain') $$,
  'facture du parrain : son propre mois seulement');
select lives_ok(
  $$ select public.mark_free_month_applied(
       (select grant_id from public.free_month_candidates('sub_parr69_parrain')), 'sub_parr69_parrain') $$,
  'mois du parrain posé');
select is_empty(
  $$ select 1 from public.free_month_candidates('sub_parr69_filleul') $$,
  'plus aucun mois à poser');

-- ---------- Droits ----------
select pg_temp.connecter('c6900000-0000-4000-8000-000000000001', 'artisan');
set local role authenticated;
select is((public.my_referral() ->> 'joined')::int, 1, 'parrain : un confrère inscrit');
select is((public.my_referral() ->> 'months_earned')::int, 1, 'parrain : un mois gagné');
select is((select count(*)::int from public.artisan_free_months), 1, 'parrain : ses mois offerts seulement');
select throws_ok($$ select * from public.free_month_candidates('sub_parr69_filleul') $$, '42501', null,
  'mois à poser : réservé à la clé serveur');
select throws_ok($$ select public.mark_free_month_applied(gen_random_uuid(), 'sub_x') $$, '42501', null,
  'pose d''un mois : réservée à la clé serveur');
reset role;

select pg_temp.connecter('c6900000-0000-4000-8000-000000000003', 'artisan_en_attente');
set local role authenticated;
select is_empty($$ select 1 from public.artisan_referrals $$, 'autre artisan : aucun parrainage visible');
select is_empty($$ select 1 from public.artisan_free_months $$, 'autre artisan : aucun mois offert visible');
select is((select count(*)::int from public.artisan_referral_codes), 1, 'autre artisan : seulement son propre code');
reset role;

select * from finish();
rollback;
