-- Recharges de minutes (F-84, ADR 0233) : catalogue lisible par tous, crédit d'une session payée
-- une seule fois (rôle service seulement), validité de 12 mois, expiration du reste (minutes les
-- plus anciennes consommées d'abord), minutes offertes elles aussi limitées à 12 mois.
-- Données fictives (identifiants c123…).
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

insert into auth.users (id, email, is_anonymous, email_confirmed_at, raw_app_meta_data, raw_user_meta_data) values
  ('c1230000-0000-4000-8000-000000000001', 'recharge123.paul@example.test', false, now(), '{"role":"artisan"}', '{}'),
  ('c1230000-0000-4000-8000-000000000002', 'recharge123.admin@example.test', false, now(), '{"role":"admin"}', '{}');
insert into public.artisans (id, user_id, status, raison_sociale, zone_mode) values
  ('c1231000-0000-4000-8000-000000000001', 'c1230000-0000-4000-8000-000000000001', 'valide', 'PAUL 123', 'communes');
insert into public.subscriptions (artisan_id, plan_code, stripe_customer_id, stripe_subscription_id, status) values
  ('c1231000-0000-4000-8000-000000000001', 'premium', 'cus_c123', 'sub_c123', 'active');

-- ---------- Catalogue ----------
set local role anon;
select is((select minutes || ' min, ' || prix_ht_centimes || ' c, ' || validite_mois || ' mois'
  from public.voice_topup_offers where code = 'recharge_100'), '100 min, 1900 c, 12 mois', 'catalogue lisible');
select throws_ok($$ insert into public.voice_topup_offers (code, nom, minutes, prix_ht_centimes, stripe_lookup_key)
  values ('pirate', 'X', 100, 100, 'pirate') $$, '42501', null, 'catalogue : aucune écriture');
reset role;

-- ---------- Crédit après paiement ----------
set local role authenticated;
select set_config('request.jwt.claims', jsonb_build_object('sub', 'c1230000-0000-4000-8000-000000000001',
  'role', 'authenticated', 'aal', 'aal1', 'app_metadata', jsonb_build_object('role', 'artisan'))::text, true);
select throws_ok(
  $$ select public.voice_credit_topup('c1231000-0000-4000-8000-000000000001', 'cs_c123_a', 'recharge_100', 1900) $$,
  '42501', null, 'artisan : se créditer lui-même refusé');
reset role;

set local role service_role;
select is(public.voice_credit_topup('c1231000-0000-4000-8000-000000000001', 'cs_c123_a', 'recharge_100', 1900),
  'credite', 'session payée : créditée');
select is(public.voice_credit_topup('c1231000-0000-4000-8000-000000000001', 'cs_c123_a', 'recharge_100', 1900),
  'deja', 'même session rejouée : rien de plus');
select throws_ok(
  $$ select public.voice_credit_topup('c1231000-0000-4000-8000-000000000001', 'cs_c123_b', 'inconnue', 1900) $$,
  '22023', 'Recharge inconnue', 'recharge inconnue : refusée');
select is((public.voice_artisan_agents('c1231000-0000-4000-8000-000000000001') ->> 'secondes_recharge')::int, 6000,
  '100 minutes rechargées');
reset role;
select ok(
  (select expires_at between now() + interval '12 months' - interval '1 day' and now() + interval '12 months' + interval '1 day'
   from public.voice_credits where stripe_session_id = 'cs_c123_a'),
  'valables 12 mois');
select is((select amount_ht_cents from public.voice_credits where stripe_session_id = 'cs_c123_a'), 1900, 'montant HT gardé');

-- ---------- Expiration : les plus anciennes d'abord ----------
-- Une deuxième recharge plus récente, puis 7 000 secondes consommées au-delà des minutes incluses.
insert into public.voice_credits (artisan_id, seconds, reason, reference, stripe_session_id, expires_at, created_at) values
  ('c1231000-0000-4000-8000-000000000001', 6000, 'recharge', 'recharge_100', 'cs_c123_c', now() + interval '6 months', now() + interval '1 second');
insert into public.voice_credits (artisan_id, seconds, reason, reference) values
  ('c1231000-0000-4000-8000-000000000001', -7000, 'consommation', 'appel-c123');

-- Dans 13 mois : la première recharge (entièrement consommée) n'a plus rien à faire expirer ;
-- la seconde a encore 5 000 secondes, qui expirent.
select is(app.expire_voice_credits(now() + interval '13 months'), 2, 'deux recharges arrivées à échéance');
select is((select count(*)::int from public.voice_credits where reason = 'expiration'), 1, 'une seule expiration');
select is((select -seconds from public.voice_credits where reason = 'expiration'), 5000, 'le reste de la seconde recharge');
select is((select coalesce(sum(seconds), 0)::int from public.voice_credits
  where artisan_id = 'c1231000-0000-4000-8000-000000000001'), 0, 'plus aucune minute rechargée');
select is(app.expire_voice_credits(now() + interval '14 months'), 0, 'déjà traitées : rien de plus');

-- ---------- Minutes offertes : 12 mois aussi ----------
set local role authenticated;
select set_config('request.jwt.claims', jsonb_build_object('sub', 'c1230000-0000-4000-8000-000000000002',
  'role', 'authenticated', 'aal', 'aal2', 'app_metadata', jsonb_build_object('role', 'admin'))::text, true);
select lives_ok(
  $$ select public.admin_grant_voice_minutes('c1231000-0000-4000-8000-000000000001', 30, 'Geste commercial') $$,
  'admin : minutes offertes');
reset role;
select ok((select expires_at is not null from public.voice_credits where reason = 'geste'), 'minutes offertes : avec échéance');

-- ---------- « Mes agents IA » ----------
set local role authenticated;
select set_config('request.jwt.claims', jsonb_build_object('sub', 'c1230000-0000-4000-8000-000000000001',
  'role', 'authenticated', 'aal', 'aal1', 'app_metadata', jsonb_build_object('role', 'artisan'))::text, true);
select is(jsonb_array_length(public.my_voice_topups() -> 'offres'), 1, 'artisan : offre de recharge');
select ok(public.my_voice_topups() ->> 'prochaine_echeance' is not null, 'artisan : prochaine échéance');
reset role;

select * from finish();
rollback;
