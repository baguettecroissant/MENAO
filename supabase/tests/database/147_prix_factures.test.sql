-- Prix d'achat repérés dans les factures (F-149, ADR 0311) : mise à jour d'un bloc avec les prix
-- relus sur la facture, datés de la facture ; ajout d'articles inconnus sans doublon ; lignes
-- passées en revue ; facture ou fourniture d'une autre entreprise refusée ; droits de chaque
-- rôle. Données fictives (identifiants e147…).
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

insert into auth.users (id, email, is_anonymous, email_confirmed_at, raw_app_meta_data, raw_user_meta_data) values
  ('e1470000-0000-4000-8000-000000000001', 'fac147.artisan@example.test', false, now(), '{"role":"artisan"}', '{}'),
  ('e1470000-0000-4000-8000-000000000002', 'fac147.autre@example.test', false, now(), '{"role":"artisan"}', '{}'),
  ('e1470000-0000-4000-8000-000000000003', 'fac147.client@example.test', false, now(), '{"role":"particulier"}', '{}');
insert into public.artisans (id, user_id, status, raison_sociale, zone_mode) values
  ('e1471000-0000-4000-8000-000000000001', 'e1470000-0000-4000-8000-000000000001', 'valide', 'PLATRERIE 147', 'communes'),
  ('e1471000-0000-4000-8000-000000000002', 'e1470000-0000-4000-8000-000000000002', 'valide', 'AUTRE 147', 'communes');
insert into public.artisan_supplies (id, artisan_id, designation, unit, purchase_price_cents, price_on) values
  ('e1472000-0000-4000-8000-000000000001', 'e1471000-0000-4000-8000-000000000001', 'Plaque BA13', 'm2', 250, '2026-09-01'),
  ('e1472000-0000-4000-8000-000000000002', 'e1471000-0000-4000-8000-000000000001', 'Rail 48', 'ml', 110, null),
  ('e1472000-0000-4000-8000-000000000003', 'e1471000-0000-4000-8000-000000000002', 'Plaque BA13', 'm2', 240, null);
insert into public.expenses (id, artisan_id, title, supplier_name, issued_on, total_ht_cents, total_tva_cents) values
  ('e1473000-0000-4000-8000-000000000001', 'e1471000-0000-4000-8000-000000000001', 'Facture négoce', 'Négoce fictif', '2026-11-07', 10000, 2000),
  ('e1473000-0000-4000-8000-000000000002', 'e1471000-0000-4000-8000-000000000002', 'Facture autre', 'Autre négoce', '2026-11-07', 10000, 2000);
insert into public.expense_lines (id, expense_id, position, designation, reference, unit, unit_price_ht_cents) values
  ('e1474000-0000-4000-8000-000000000001', 'e1473000-0000-4000-8000-000000000001', 1, 'Plaque BA13', 'BA13-250', 'm2', 272),
  ('e1474000-0000-4000-8000-000000000002', 'e1473000-0000-4000-8000-000000000001', 2, 'Rail 48', null, 'ml', 118),
  ('e1474000-0000-4000-8000-000000000003', 'e1473000-0000-4000-8000-000000000001', 3, 'Bande à joint papier', null, 'u', 460),
  ('e1474000-0000-4000-8000-000000000004', 'e1473000-0000-4000-8000-000000000001', 4, 'Remise', null, null, null),
  ('e1474000-0000-4000-8000-000000000005', 'e1473000-0000-4000-8000-000000000002', 1, 'Plaque BA13', null, 'm2', 999);

create function pg_temp.connecter(uid uuid, app_role text default 'artisan') returns void language sql as $$
  select set_config('request.jwt.claims', jsonb_build_object(
    'sub', uid, 'role', 'authenticated', 'aal', 'aal1', 'app_metadata', jsonb_build_object('role', app_role)
  )::text, true);
$$;

select pg_temp.connecter('e1470000-0000-4000-8000-000000000001');
set local role authenticated;

-- ---------- Refus ----------
select throws_ok($$ select public.artisan_apply_invoice_prices(
    '[{"supplyId": "e1472000-0000-4000-8000-000000000003", "lineId": "e1474000-0000-4000-8000-000000000001"}]'::jsonb, '{}', '{}') $$,
  '22023', 'Fourniture ou facture inconnue.', 'fourniture d''une autre entreprise refusée');
select throws_ok($$ select public.artisan_apply_invoice_prices(
    '[{"supplyId": "e1472000-0000-4000-8000-000000000001", "lineId": "e1474000-0000-4000-8000-000000000005"}]'::jsonb, '{}', '{}') $$,
  '22023', 'Fourniture ou facture inconnue.', 'facture d''une autre entreprise refusée');
select throws_ok($$ select public.artisan_apply_invoice_prices('[]'::jsonb, '{e1474000-0000-4000-8000-000000000004}', '{}') $$,
  '22023', 'Fourniture ou facture inconnue.', 'ligne sans unité ni prix : pas d''ajout');
select throws_ok($$ select public.artisan_apply_invoice_prices('{}'::jsonb, '{}', '{}') $$,
  '22023', 'Mise à jour invalide.', 'liste attendue');

-- ---------- Mise à jour ----------
select is(public.artisan_apply_invoice_prices(
    '[{"supplyId": "e1472000-0000-4000-8000-000000000001", "lineId": "e1474000-0000-4000-8000-000000000001"}]'::jsonb,
    '{e1474000-0000-4000-8000-000000000003}',
    '{e1474000-0000-4000-8000-000000000001,e1474000-0000-4000-8000-000000000002,e1474000-0000-4000-8000-000000000003,e1474000-0000-4000-8000-000000000005}'),
  '{"updated": 1, "added": 1}'::jsonb, 'une fourniture mise à jour, un article ajouté');
select results_eq(
  $$ select purchase_price_cents, price_on, reference, supplier from public.artisan_supplies
     where id = 'e1472000-0000-4000-8000-000000000001' $$,
  $$ values (272, '2026-11-07'::date, 'BA13-250'::text, 'Négoce fictif'::text) $$,
  'prix de la facture, daté de la facture, référence et fournisseur repris');
select is((select purchase_price_cents from public.artisan_supplies where id = 'e1472000-0000-4000-8000-000000000002'), 110,
  'rail laissé (non coché)');
select results_eq(
  $$ select unit::text, purchase_price_cents, supplier from public.artisan_supplies where designation = 'Bande à joint papier' $$,
  $$ values ('u'::text, 460, 'Négoce fictif'::text) $$, 'article ajouté avec le prix de la facture');
select is((select count(*)::int from public.library_invoice_reviews), 3,
  'trois lignes passées en revue (celle d''une autre entreprise ignorée)');
select is(public.artisan_apply_invoice_prices('[]'::jsonb, '{e1474000-0000-4000-8000-000000000003}', '{}'),
  '{"updated": 0, "added": 0}'::jsonb, 'article déjà ajouté : pas de doublon');
reset role;

-- ---------- Autres rôles ----------
select pg_temp.connecter('e1470000-0000-4000-8000-000000000002');
set local role authenticated;
select is((select count(*)::int from public.library_invoice_reviews), 0, 'autre entreprise : ne voit rien');
reset role;
select is((select purchase_price_cents from public.artisan_supplies where id = 'e1472000-0000-4000-8000-000000000003'), 240,
  'la fourniture de l''autre entreprise n''a pas changé');

select pg_temp.connecter('e1470000-0000-4000-8000-000000000003', 'particulier');
set local role authenticated;
select throws_ok($$ select public.artisan_apply_invoice_prices('[]'::jsonb, '{}', '{}') $$,
  '42501', null, 'client : refusé');
select is((select count(*)::int from public.library_invoice_reviews), 0, 'client : ne voit rien');
reset role;
set local role anon;
select throws_ok($$ select public.artisan_apply_invoice_prices('[]'::jsonb, '{}', '{}') $$,
  '42501', null, 'visiteur : refusé');
reset role;

select * from finish();
rollback;
