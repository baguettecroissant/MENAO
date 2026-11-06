-- Relance des impayés (F-87, ADR 0238) : relance d'un toucher (Premium et Entreprise, une tous les
-- 3 jours, paiement encore dû), rappel au client sans coordonnées de l'artisan, relances
-- automatiques à J+7, J+15 et J+30 si l'artisan les active, journal lu par l'artisan seul.
-- Données fictives (c127…).
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

insert into auth.users (id, email, is_anonymous, email_confirmed_at, raw_app_meta_data, raw_user_meta_data) values
  ('c1270000-0000-4000-8000-000000000001', 'relance127.paul@example.test', false, now(), '{"role":"artisan"}', '{}'),
  ('c1270000-0000-4000-8000-000000000002', 'relance127.client@example.test', false, now(), '{"role":"particulier"}', '{}'),
  ('c1270000-0000-4000-8000-000000000003', 'relance127.base@example.test', false, now(), '{"role":"artisan"}', '{}');
insert into public.artisans (id, user_id, status, raison_sociale, nom_commercial, zone_mode) values
  ('c1271000-0000-4000-8000-000000000001', 'c1270000-0000-4000-8000-000000000001', 'valide', 'PAUL 127', 'Plâtrerie Paul', 'communes'),
  ('c1271000-0000-4000-8000-000000000003', 'c1270000-0000-4000-8000-000000000003', 'valide', 'BASE 127', null, 'communes');
insert into public.subscriptions (artisan_id, plan_code, stripe_customer_id, stripe_subscription_id, status) values
  ('c1271000-0000-4000-8000-000000000001', 'premium', 'cus_c127', 'sub_c127', 'active'),
  ('c1271000-0000-4000-8000-000000000003', 'base', 'cus_c127b', 'sub_c127b', 'active');

-- Deux chantiers : acompte dû depuis 10 jours, acompte déjà payé.
insert into public.projects (id, user_id, status, description, trade_code, ville_code_insee, ville_nom, criteria_validated_at)
select ('c1272000-0000-4000-8000-00000000000' || n)::uuid, 'c1270000-0000-4000-8000-000000000002', 'criteres_valides',
  'Projet ' || n, 'plombier', '06004', 'Antibes', now()
from generate_series(1, 2) n;
insert into public.requests (id, project_id, artisan_id, particulier_id, contact_phone, status)
select ('c1273000-0000-4000-8000-00000000000' || n)::uuid, ('c1272000-0000-4000-8000-00000000000' || n)::uuid,
  'c1271000-0000-4000-8000-000000000001', 'c1270000-0000-4000-8000-000000000002', '+33600001270', 'acceptee'
from generate_series(1, 2) n;
insert into public.chantiers (id, project_id, request_id, artisan_id, particulier_id, title)
select ('c1274000-0000-4000-8000-00000000000' || n)::uuid, ('c1272000-0000-4000-8000-00000000000' || n)::uuid,
  ('c1273000-0000-4000-8000-00000000000' || n)::uuid, 'c1271000-0000-4000-8000-000000000001',
  'c1270000-0000-4000-8000-000000000002', 'Chantier ' || n
from generate_series(1, 2) n;
select set_config('menao.transition_chantier', 'on', true);
update public.chantiers set status = 'devis_signe' where artisan_id = 'c1271000-0000-4000-8000-000000000001';
select set_config('menao.transition_chantier', '', true);
insert into public.quotes (id, chantier_id, artisan_id, version, status, numero, total_ht_cents, total_tva_cents,
  total_ttc_cents, sent_at, valid_until, start_date, duration_days, payment_schedule, document, signed_at, signed_pdf_path)
select ('c1275000-0000-4000-8000-00000000000' || n)::uuid, ('c1274000-0000-4000-8000-00000000000' || n)::uuid,
  'c1271000-0000-4000-8000-000000000001', 1, 'signe', 'DEVIS-2026-027' || n, 100000, 0, 100000,
  now() - interval '12 days', current_date + 20, current_date + 30, 5,
  '[{"percent":30,"trigger":"signature","amount_cents":30000},{"percent":70,"trigger":"reception","amount_cents":70000}]',
  '{}', now() - interval '10 days', 'devis-signes/c127/devis-' || n || '.pdf'
from generate_series(1, 2) n;
insert into public.payments (quote_id, chantier_id, artisan_id, kind, amount_cents, status, stripe_account_id, paid_at) values
  ('c1275000-0000-4000-8000-000000000002', 'c1274000-0000-4000-8000-000000000002', 'c1271000-0000-4000-8000-000000000001',
   'acompte', 30000, 'paye', 'acct_c127', now() - interval '5 days');

-- ---------- Relance d'un toucher ----------
set local role authenticated;
select set_config('request.jwt.claims', jsonb_build_object('sub', 'c1270000-0000-4000-8000-000000000001',
  'role', 'authenticated', 'aal', 'aal1', 'app_metadata', jsonb_build_object('role', 'artisan'))::text, true);
select lives_ok($$ select public.artisan_send_payment_reminder('c1274000-0000-4000-8000-000000000001', 'acompte') $$,
  'relance envoyée');
select throws_ok($$ select public.artisan_send_payment_reminder('c1274000-0000-4000-8000-000000000001', 'acompte') $$,
  '22023', 'Ce client a déjà été relancé il y a moins de 3 jours.', 'pas deux relances en 3 jours');
select throws_ok($$ select public.artisan_send_payment_reminder('c1274000-0000-4000-8000-000000000002', 'acompte') $$,
  '22023', 'Ce paiement n''est plus à encaisser.', 'acompte déjà payé : refusé');
select is((select count(*)::int from public.payment_reminders), 1, 'artisan : son journal');
select is((public.my_money_overview() -> 'a_encaisser' -> 0 ->> 'relances')::int, 1, 'suivi : nombre de relances');
select ok(public.my_money_overview() -> 'a_encaisser' -> 0 ->> 'derniere_relance' is not null, 'suivi : dernière relance');
select is((public.my_money_overview() ->> 'relances_auto')::boolean, false, 'relances automatiques désactivées par défaut');
reset role;

select is(
  (select (data ->> 'montant')::bigint from public.notifications
   where type = 'paiement_relance' and user_id = 'c1270000-0000-4000-8000-000000000002'),
  30000::bigint, 'rappel au client : montant de l''acompte');
select is(
  (select data ->> 'artisan' from public.notifications where type = 'paiement_relance'),
  'Plâtrerie Paul', 'au nom de l''entreprise');

-- Formule Base : ni relance ni relances automatiques ; le client ne lit pas le journal.
set local role authenticated;
select set_config('request.jwt.claims', jsonb_build_object('sub', 'c1270000-0000-4000-8000-000000000003',
  'role', 'authenticated', 'aal', 'aal1', 'app_metadata', jsonb_build_object('role', 'artisan'))::text, true);
select throws_ok($$ select public.artisan_send_payment_reminder('c1274000-0000-4000-8000-000000000001', 'acompte') $$,
  '42501', null, 'Base : relance refusée');
select throws_ok($$ select public.set_payment_reminders_auto(true) $$, '42501', null, 'Base : relances automatiques refusées');
select is((select count(*)::int from public.payment_reminders), 0, 'autre artisan : rien');
select set_config('request.jwt.claims', jsonb_build_object('sub', 'c1270000-0000-4000-8000-000000000002',
  'role', 'authenticated', 'aal', 'aal1', 'app_metadata', jsonb_build_object('role', 'particulier'))::text, true);
select is((select count(*)::int from public.payment_reminders), 0, 'client : journal illisible');
select throws_ok($$ insert into public.payment_reminders (artisan_id, chantier_id, kind, mode)
  values ('c1271000-0000-4000-8000-000000000001', 'c1274000-0000-4000-8000-000000000001', 'acompte', 'manuel') $$,
  '42501', null, 'écriture directe refusée');
reset role;

-- ---------- Relances automatiques ----------
-- Désactivées : rien ne part.
select is(app.send_auto_payment_reminders(now() + interval '4 days'), 0, 'désactivées : aucun rappel');

set local role authenticated;
select set_config('request.jwt.claims', jsonb_build_object('sub', 'c1270000-0000-4000-8000-000000000001',
  'role', 'authenticated', 'aal', 'aal1', 'app_metadata', jsonb_build_object('role', 'artisan'))::text, true);
select lives_ok($$ select public.set_payment_reminders_auto(true) $$, 'relances automatiques activées');
reset role;

-- J+10 : relance manuelle il y a moins de 3 jours, donc rien ; J+14 : palier J+7.
select is(app.send_auto_payment_reminders(now() + interval '1 day'), 0, 'trop tôt après une relance manuelle');
select is(app.send_auto_payment_reminders(now() + interval '4 days'), 1, 'palier J+7');
select is(app.send_auto_payment_reminders(now() + interval '5 days'), 0, 'moins de 3 jours après le rappel J+7');
select is(app.send_auto_payment_reminders(now() + interval '8 days'), 1, 'palier J+15');
select is(app.send_auto_payment_reminders(now() + interval '21 days'), 1, 'palier J+30');
select is(app.send_auto_payment_reminders(now() + interval '40 days'), 0, 'plus rien après J+30');
select is((select count(*)::int from public.payment_reminders where mode = 'auto'), 3, 'trois rappels automatiques au plus');
select is((select count(*)::int from public.notifications where type = 'paiement_relance'), 4, 'quatre rappels au client en tout');

select * from finish();
rollback;
