-- Bibliothèque d'ouvrages, lot 1, PR 2 (F-141, ADR 0294) : coûts des lignes de devis lisibles par
-- l'entreprise seule (jamais par le client du chantier ni par l'équipe MENAO), enregistrés sur un
-- brouillon seulement ; prix courant des ouvrages ; prix de la bibliothèque dans l'historique des
-- prix des appels d'offres. Données fictives (identifiants e142…).
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

insert into auth.users (id, email, is_anonymous, email_confirmed_at, raw_app_meta_data, raw_user_meta_data) values
  ('e1420000-0000-4000-8000-000000000001', 'dev142.artisan@example.test', false, now(), '{"role":"artisan"}', '{}'),
  ('e1420000-0000-4000-8000-000000000002', 'dev142.autre@example.test', false, now(), '{"role":"artisan"}', '{}'),
  ('e1420000-0000-4000-8000-000000000003', 'dev142.client@example.test', false, now(), '{"role":"particulier"}', '{}'),
  ('e1420000-0000-4000-8000-000000000004', 'dev142.admin@example.test', false, now(), '{"role":"admin"}', '{}');
insert into public.artisans (id, user_id, status, raison_sociale, zone_mode) values
  ('e1421000-0000-4000-8000-000000000001', 'e1420000-0000-4000-8000-000000000001', 'valide', 'PLOMBERIE 142', 'communes'),
  ('e1421000-0000-4000-8000-000000000002', 'e1420000-0000-4000-8000-000000000002', 'valide', 'AUTRE 142', 'communes');
insert into public.projects (id, user_id, status, description, trade_code, ville_code_insee, ville_nom, criteria_validated_at) values
  ('e1422000-0000-4000-8000-000000000001', 'e1420000-0000-4000-8000-000000000003', 'criteres_valides', 'WC fictif', 'plombier', '06004', 'Antibes', now());
insert into public.requests (id, project_id, artisan_id, particulier_id, contact_phone, status) values
  ('e1423000-0000-4000-8000-000000000001', 'e1422000-0000-4000-8000-000000000001', 'e1421000-0000-4000-8000-000000000001',
   'e1420000-0000-4000-8000-000000000003', '+33600001420', 'acceptee');
insert into public.chantiers (id, project_id, request_id, artisan_id, particulier_id, title) values
  ('e1424000-0000-4000-8000-000000000001', 'e1422000-0000-4000-8000-000000000001', 'e1423000-0000-4000-8000-000000000001',
   'e1421000-0000-4000-8000-000000000001', 'e1420000-0000-4000-8000-000000000003', 'WC');
insert into public.quotes (id, chantier_id, artisan_id, version, status, total_ht_cents, total_tva_cents, total_ttc_cents) values
  ('e1425000-0000-4000-8000-000000000001', 'e1424000-0000-4000-8000-000000000001', 'e1421000-0000-4000-8000-000000000001',
   1, 'brouillon', 0, 0, 0);
insert into public.quote_lines (quote_id, position, type, designation, quantity_milli, unit, unit_price_ht_cents, vat_rate_bp, total_ht_cents) values
  ('e1425000-0000-4000-8000-000000000001', 1, 'autre', 'Pose d''un WC suspendu', 1000, 'u', 66550, 1000, 66550),
  ('e1425000-0000-4000-8000-000000000001', 2, 'autre', 'Déplacement', 1000, 'forfait', 3500, 2000, 3500);
insert into public.artisan_works (id, artisan_id, designation, unit, manual_price_cents, source) values
  ('e1426000-0000-4000-8000-000000000001', 'e1421000-0000-4000-8000-000000000001', 'Pose d''un WC suspendu', 'u', null, 'manuel'),
  ('e1426000-0000-4000-8000-000000000002', 'e1421000-0000-4000-8000-000000000001', 'Carrelage de sol', 'm2', 7400, 'devis');

create function pg_temp.connecter(uid uuid, app_role text default 'artisan', aal text default 'aal1') returns void language sql as $$
  select set_config('request.jwt.claims', jsonb_build_object(
    'sub', uid, 'role', 'authenticated', 'aal', aal, 'app_metadata', jsonb_build_object('role', app_role)
  )::text, true);
$$;

select ok((select relrowsecurity from pg_class where oid = 'public.quote_line_costs'::regclass), 'RLS activée sur quote_line_costs');
select ok(not has_table_privilege('authenticated', 'public.quote_line_costs', 'insert'), 'coûts : pas d''écriture directe');

set local role authenticated;

-- ---------- Coûts du brouillon ----------
select pg_temp.connecter('e1420000-0000-4000-8000-000000000001');
select lives_ok($$ select public.artisan_save_quote_costs('e1425000-0000-4000-8000-000000000001',
  '[{"position":1,"unitCostCents":49000,"workId":"e1426000-0000-4000-8000-000000000001"},
    {"position":2,"unitCostCents":null}]'::jsonb) $$, 'coûts enregistrés (ligne sans coût ignorée)');
select results_eq(
  $$ select position::integer, unit_cost_cents, work_id from public.quote_line_costs $$,
  $$ values (1, 49000, 'e1426000-0000-4000-8000-000000000001'::uuid) $$, 'coût et ouvrage d''origine');
select lives_ok($$ select public.artisan_save_quote_costs('e1425000-0000-4000-8000-000000000001',
  '[{"position":1,"unitCostCents":50000,"workId":"e1426000-0000-4000-8000-ffffffffffff"}]'::jsonb) $$, 'coûts remplacés');
select results_eq($$ select unit_cost_cents, work_id from public.quote_line_costs $$,
  $$ values (50000, null::uuid) $$, 'ouvrage inconnu : pas rattaché');

-- ---------- Prix courant des ouvrages ----------
select lives_ok($$ select public.artisan_set_work_prices(
  '[{"id":"e1426000-0000-4000-8000-000000000001","priceCents":66550}]'::jsonb) $$, 'prix courant enregistré');
select results_eq(
  $$ select designation, unit_price_ht_cents, source from public.artisan_price_history() order by source, designation $$,
  $$ values ('Carrelage de sol'::text, 7400, 'bibliotheque'::text), ('Pose d''un WC suspendu', 66550, 'bibliotheque'),
            ('Déplacement', 3500, 'devis'), ('Pose d''un WC suspendu', 66550, 'devis') $$,
  'historique : bibliothèque (prix courant ou repris), puis devis');

-- ---------- Autre artisan ----------
select pg_temp.connecter('e1420000-0000-4000-8000-000000000002');
select is_empty($$ select 1 from public.quote_line_costs $$, 'autre artisan : aucun coût visible');
select throws_ok($$ select public.artisan_save_quote_costs('e1425000-0000-4000-8000-000000000001', '[]'::jsonb) $$,
  '22023', 'Devis introuvable.', 'autre artisan : coûts non modifiables');
select lives_ok($$ select public.artisan_set_work_prices(
  '[{"id":"e1426000-0000-4000-8000-000000000001","priceCents":1}]'::jsonb) $$, 'autre artisan : sans effet');
select is_empty($$ select 1 from public.artisan_price_history() $$, 'autre artisan : aucun prix');

-- ---------- Client du chantier et équipe MENAO ----------
select pg_temp.connecter('e1420000-0000-4000-8000-000000000003', 'particulier');
select is_empty($$ select 1 from public.quote_line_costs $$, 'client : jamais leur coût');
select pg_temp.connecter('e1420000-0000-4000-8000-000000000004', 'admin', 'aal2');
select is_empty($$ select 1 from public.quote_line_costs $$, 'équipe MENAO : pas de coûts');

reset role;
select is((select price_cents from public.artisan_works where id = 'e1426000-0000-4000-8000-000000000001'), 66550,
  'le prix n''a pas été changé par l''autre artisan');

-- Devis envoyé : coûts figés.
update public.quotes set status = 'envoye', numero = 'DEVIS-2026-0142', sent_at = now(),
  valid_until = current_date + 30, start_date = current_date + 10, duration_days = 2,
  payment_schedule = '[]', document = '{}'
where id = 'e1425000-0000-4000-8000-000000000001';
set local role authenticated;
select pg_temp.connecter('e1420000-0000-4000-8000-000000000001');
select throws_ok($$ select public.artisan_save_quote_costs('e1425000-0000-4000-8000-000000000001', '[]'::jsonb) $$,
  '22023', 'Devis introuvable.', 'devis envoyé : coûts figés');
select pg_temp.connecter('e1420000-0000-4000-8000-000000000003', 'particulier');
select isnt_empty($$ select 1 from public.quote_lines $$, 'client : il voit les lignes du devis envoyé');
select is_empty($$ select 1 from public.quote_line_costs $$, 'client : jamais leur coût');

select * from finish();
rollback;
