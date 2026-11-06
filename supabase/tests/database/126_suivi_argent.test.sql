-- Suivi de l'argent (F-87, ADR 0237) : chiffres du mois, acompte et solde à encaisser (pas ceux
-- déjà payés ou en cours), paiement échoué, paiement reçu sans facture, droit de la formule,
-- synthèse du mois une seule fois, rien pour un autre compte. Données fictives (c126…).
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

insert into auth.users (id, email, is_anonymous, email_confirmed_at, raw_app_meta_data, raw_user_meta_data) values
  ('c1260000-0000-4000-8000-000000000001', 'argent126.paul@example.test', false, now(), '{"role":"artisan"}', '{}'),
  ('c1260000-0000-4000-8000-000000000002', 'argent126.client@example.test', false, now(), '{"role":"particulier"}', '{}'),
  ('c1260000-0000-4000-8000-000000000003', 'argent126.base@example.test', false, now(), '{"role":"artisan"}', '{}');
insert into public.artisans (id, user_id, status, raison_sociale, zone_mode) values
  ('c1261000-0000-4000-8000-000000000001', 'c1260000-0000-4000-8000-000000000001', 'valide', 'PAUL 126', 'communes'),
  ('c1261000-0000-4000-8000-000000000003', 'c1260000-0000-4000-8000-000000000003', 'valide', 'BASE 126', 'communes');
insert into public.subscriptions (artisan_id, plan_code, stripe_customer_id, stripe_subscription_id, status) values
  ('c1261000-0000-4000-8000-000000000001', 'premium', 'cus_c126', 'sub_c126', 'active'),
  ('c1261000-0000-4000-8000-000000000003', 'base', 'cus_c126b', 'sub_c126b', 'active');

-- Trois chantiers : acompte dû (devis signé il y a 10 jours), acompte payé, solde dû (réceptionné).
insert into public.projects (id, user_id, status, description, trade_code, ville_code_insee, ville_nom, criteria_validated_at)
select ('c1262000-0000-4000-8000-00000000000' || n)::uuid, 'c1260000-0000-4000-8000-000000000002', 'criteres_valides',
  'Projet ' || n, 'plombier', '06004', 'Antibes', now()
from generate_series(1, 3) n;
insert into public.requests (id, project_id, artisan_id, particulier_id, contact_phone, status)
select ('c1263000-0000-4000-8000-00000000000' || n)::uuid, ('c1262000-0000-4000-8000-00000000000' || n)::uuid,
  'c1261000-0000-4000-8000-000000000001', 'c1260000-0000-4000-8000-000000000002', '+33600001260', 'acceptee'
from generate_series(1, 3) n;
insert into public.chantiers (id, project_id, request_id, artisan_id, particulier_id, title)
select ('c1264000-0000-4000-8000-00000000000' || n)::uuid, ('c1262000-0000-4000-8000-00000000000' || n)::uuid,
  ('c1263000-0000-4000-8000-00000000000' || n)::uuid, 'c1261000-0000-4000-8000-000000000001',
  'c1260000-0000-4000-8000-000000000002', 'Chantier ' || n
from generate_series(1, 3) n;
select set_config('menao.transition_chantier', 'on', true);
update public.chantiers set status = 'devis_signe' where id in ('c1264000-0000-4000-8000-000000000001', 'c1264000-0000-4000-8000-000000000002');
update public.chantiers set status = 'receptionne' where id = 'c1264000-0000-4000-8000-000000000003';
insert into public.chantier_events (chantier_id, event, from_status, to_status, actor_role, created_at) values
  ('c1264000-0000-4000-8000-000000000003', 'pv_sans_reserves', 'travaux_termines', 'receptionne', 'particulier',
   now() - interval '4 days');
select set_config('menao.transition_chantier', '', true);

insert into public.quotes (id, chantier_id, artisan_id, version, status, numero, total_ht_cents, total_tva_cents,
  total_ttc_cents, sent_at, valid_until, start_date, duration_days, payment_schedule, document, signed_at)
select ('c1265000-0000-4000-8000-00000000000' || n)::uuid, ('c1264000-0000-4000-8000-00000000000' || n)::uuid,
  'c1261000-0000-4000-8000-000000000001', 1, 'signe', 'DEVIS-2026-012' || n, 100000, 0, 100000,
  now() - interval '12 days', current_date + 20, current_date + 30, 5,
  '[{"percent":30,"trigger":"signature","amount_cents":30000},{"percent":70,"trigger":"reception","amount_cents":70000}]',
  '{}', now() - interval '10 days'
from generate_series(1, 3) n;

insert into public.payments (quote_id, chantier_id, artisan_id, kind, amount_cents, status, stripe_account_id, paid_at, created_at) values
  -- Chantier 1 : une tentative d'acompte échouée.
  ('c1265000-0000-4000-8000-000000000001', 'c1264000-0000-4000-8000-000000000001', 'c1261000-0000-4000-8000-000000000001',
   'acompte', 30000, 'echoue', 'acct_c126', null, now() - interval '5 days'),
  -- Chantier 2 : acompte payé, sans facture (émission en échec).
  ('c1265000-0000-4000-8000-000000000002', 'c1264000-0000-4000-8000-000000000002', 'c1261000-0000-4000-8000-000000000001',
   'acompte', 30000, 'paye', 'acct_c126', now() - interval '2 hours', now() - interval '3 hours'),
  -- Chantier 3 : acompte payé ; reste le solde (70 000).
  ('c1265000-0000-4000-8000-000000000003', 'c1264000-0000-4000-8000-000000000003', 'c1261000-0000-4000-8000-000000000001',
   'acompte', 30000, 'paye', 'acct_c126', now() - interval '9 days', now() - interval '9 days');

-- ---------- Suivi de l'artisan ----------
set local role authenticated;
select set_config('request.jwt.claims', jsonb_build_object('sub', 'c1260000-0000-4000-8000-000000000001',
  'role', 'authenticated', 'aal', 'aal1', 'app_metadata', jsonb_build_object('role', 'artisan'))::text, true);
select is((public.my_money_overview() ->> 'inclus')::boolean, true, 'Premium : agent comptable avancé inclus');
select is(jsonb_array_length(public.my_money_overview() -> 'a_encaisser'), 2, 'deux tranches à encaisser');
select is(
  (select x ->> 'tranche' from jsonb_array_elements(public.my_money_overview() -> 'a_encaisser') x
   where x ->> 'chantier_id' = 'c1264000-0000-4000-8000-000000000001'),
  'acompte', 'acompte dû depuis la signature');
select is(
  (select (x ->> 'echec')::boolean from jsonb_array_elements(public.my_money_overview() -> 'a_encaisser') x
   where x ->> 'chantier_id' = 'c1264000-0000-4000-8000-000000000001'),
  true, 'dernier paiement échoué signalé');
select is(
  (select (x ->> 'montant_cents')::bigint from jsonb_array_elements(public.my_money_overview() -> 'a_encaisser') x
   where x ->> 'tranche' = 'solde'),
  70000::bigint, 'solde : total moins les paiements reçus');
select ok(
  not exists (select 1 from jsonb_array_elements(public.my_money_overview() -> 'a_encaisser') x
    where x ->> 'chantier_id' = 'c1264000-0000-4000-8000-000000000002'),
  'acompte payé : rien à encaisser');
select is(jsonb_array_length(public.my_money_overview() -> 'sans_facture'), 2, 'paiements reçus sans facture');
select ok((public.my_money_overview() -> 'mois' ->> 'encaisse_cents')::bigint >= 30000, 'encaissé du mois');

-- Un autre artisan (Base) : son propre suivi, vide, sans l'agent avancé.
select set_config('request.jwt.claims', jsonb_build_object('sub', 'c1260000-0000-4000-8000-000000000003',
  'role', 'authenticated', 'aal', 'aal1', 'app_metadata', jsonb_build_object('role', 'artisan'))::text, true);
select is((public.my_money_overview() ->> 'inclus')::boolean, false, 'Base : agent avancé non inclus');
select is(jsonb_array_length(public.my_money_overview() -> 'a_encaisser'), 0, 'Base : rien d''un autre compte');

-- Un particulier : rien.
select set_config('request.jwt.claims', jsonb_build_object('sub', 'c1260000-0000-4000-8000-000000000002',
  'role', 'authenticated', 'aal', 'aal1', 'app_metadata', jsonb_build_object('role', 'particulier'))::text, true);
select is(public.my_money_overview(), null, 'particulier : aucun suivi');
reset role;

set local role anon;
select throws_ok($$ select public.my_money_overview() $$, '42501', null, 'visiteur : refusé');
reset role;

-- ---------- Synthèse du mois ----------
-- Le 1er du mois suivant : une synthèse pour l'artisan Premium actif, pas pour Base, une seule fois.
select lives_ok($$ select app.send_monthly_summaries(date_trunc('month', now()) + interval '1 month' + interval '7 hours') $$,
  'synthèses envoyées');
select is((select count(*)::int from public.notifications where type = 'synthese_mois'
  and user_id = 'c1260000-0000-4000-8000-000000000001'), 1, 'synthèse pour l''artisan Premium');
select is((select count(*)::int from public.notifications where type = 'synthese_mois'
  and user_id = 'c1260000-0000-4000-8000-000000000003'), 0, 'rien pour Base');
select lives_ok($$ select app.send_monthly_summaries(date_trunc('month', now()) + interval '1 month' + interval '8 hours') $$,
  'deuxième passage');
select is((select count(*)::int from public.notifications where type = 'synthese_mois'), 1, 'une seule fois par mois');
select is((select (data ->> 'a_encaisser')::int from public.notifications where type = 'synthese_mois'), 2,
  'synthèse : tranches à encaisser');

select * from finish();
rollback;
