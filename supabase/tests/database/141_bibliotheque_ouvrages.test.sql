-- Bibliothèque d'ouvrages et marge, lot 1 (F-141, ADR 0293) : réglages, fournitures, ouvrages et
-- composition lisibles par l'entreprise seule (ni autre artisan, ni client, ni équipe MENAO, ni
-- visiteur) ; enregistrement atomique d'un ouvrage ; remplissage initial avec les anciens devis,
-- une seule fois ; fourniture utilisée non supprimable. Données fictives (identifiants e141…).
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

insert into auth.users (id, email, is_anonymous, email_confirmed_at, raw_app_meta_data, raw_user_meta_data) values
  ('e1410000-0000-4000-8000-000000000001', 'bib141.artisan@example.test', false, now(), '{"role":"artisan"}', '{}'),
  ('e1410000-0000-4000-8000-000000000002', 'bib141.autre@example.test', false, now(), '{"role":"artisan"}', '{}'),
  ('e1410000-0000-4000-8000-000000000003', 'bib141.client@example.test', false, now(), '{"role":"particulier"}', '{}'),
  ('e1410000-0000-4000-8000-000000000004', 'bib141.admin@example.test', false, now(), '{"role":"admin"}', '{}');
insert into public.artisans (id, user_id, status, raison_sociale, zone_mode) values
  ('e1411000-0000-4000-8000-000000000001', 'e1410000-0000-4000-8000-000000000001', 'valide', 'PLOMBERIE 141', 'communes'),
  ('e1411000-0000-4000-8000-000000000002', 'e1410000-0000-4000-8000-000000000002', 'valide', 'AUTRE 141', 'communes');

-- Un ancien devis de l'entreprise : deux lignes « WC suspendu » (la plus récente compte), une ligne
-- à 0 € (écartée).
insert into public.projects (id, user_id, status, description, trade_code, ville_code_insee, ville_nom, criteria_validated_at) values
  ('e1412000-0000-4000-8000-000000000001', 'e1410000-0000-4000-8000-000000000003', 'criteres_valides', 'WC fictif', 'plombier', '06004', 'Antibes', now());
insert into public.requests (id, project_id, artisan_id, particulier_id, contact_phone, status) values
  ('e1413000-0000-4000-8000-000000000001', 'e1412000-0000-4000-8000-000000000001', 'e1411000-0000-4000-8000-000000000001',
   'e1410000-0000-4000-8000-000000000003', '+33600001410', 'acceptee');
insert into public.chantiers (id, project_id, request_id, artisan_id, particulier_id, title) values
  ('e1414000-0000-4000-8000-000000000001', 'e1412000-0000-4000-8000-000000000001', 'e1413000-0000-4000-8000-000000000001',
   'e1411000-0000-4000-8000-000000000001', 'e1410000-0000-4000-8000-000000000003', 'WC');
insert into public.quotes (id, chantier_id, artisan_id, version, status, total_ht_cents, total_tva_cents, total_ttc_cents) values
  ('e1415000-0000-4000-8000-000000000001', 'e1414000-0000-4000-8000-000000000001', 'e1411000-0000-4000-8000-000000000001',
   1, 'brouillon', 0, 0, 0);
insert into public.quote_lines (quote_id, position, type, designation, quantity_milli, unit, unit_price_ht_cents, vat_rate_bp, total_ht_cents, updated_at) values
  ('e1415000-0000-4000-8000-000000000001', 1, 'autre', 'Pose d''un WC suspendu', 1000, 'u', 60000, 1000, 60000, now() - interval '30 days'),
  ('e1415000-0000-4000-8000-000000000001', 2, 'autre', 'Pose d''un WC suspendu ', 1000, 'u', 66550, 1000, 66550, now()),
  ('e1415000-0000-4000-8000-000000000001', 3, 'main_oeuvre', 'Déplacement', 1000, 'forfait', 3500, 2000, 3500, now()),
  ('e1415000-0000-4000-8000-000000000001', 4, 'autre', 'Geste commercial', 1000, 'forfait', 0, 2000, 0, now());

create function pg_temp.connecter(uid uuid, app_role text default 'artisan', aal text default 'aal1') returns void language sql as $$
  select set_config('request.jwt.claims', jsonb_build_object(
    'sub', uid, 'role', 'authenticated', 'aal', aal, 'app_metadata', jsonb_build_object('role', app_role)
  )::text, true);
$$;

select ok((select bool_and(relrowsecurity) from pg_class where oid in (
  'public.artisan_pricing_settings'::regclass, 'public.artisan_supplies'::regclass,
  'public.artisan_works'::regclass, 'public.artisan_work_components'::regclass)), 'RLS activée sur les 4 tables');
select ok(not has_table_privilege('anon', 'public.artisan_works', 'select'), 'visiteur : aucun accès aux ouvrages');
select ok(not has_table_privilege('authenticated', 'public.artisan_work_components', 'insert'),
  'composition : pas d''écriture directe');

set local role authenticated;

-- ---------- Remplissage initial ----------
select pg_temp.connecter('e1410000-0000-4000-8000-000000000001');
select is(public.artisan_seed_library(), 2, 'remplissage : 2 ouvrages (doublon et ligne à 0 € écartés)');
select results_eq(
  $$ select designation, unit::text, manual_price_cents, source, line_type::text from public.artisan_works order by designation $$,
  $$ values ('Déplacement'::text, 'forfait'::text, 3500, 'devis'::text, 'main_oeuvre'::text),
            ('Pose d''un WC suspendu', 'u', 66550, 'devis', 'autre') $$,
  'au dernier prix, désignation sans espace en trop');
select is(public.artisan_seed_library(), 0, 'remplissage une seule fois');

-- ---------- Réglages et fournitures ----------
select lives_ok($$ update public.artisan_pricing_settings set hour_cost_cents = 3500, hour_price_cents = 5500,
  supply_coef_bp = 13000 where artisan_id = 'e1411000-0000-4000-8000-000000000001' $$, 'réglages enregistrés');
select is((select margin_alert_bp from public.artisan_pricing_settings), null, 'aucun seuil par défaut');
select lives_ok($$ insert into public.artisan_supplies (id, artisan_id, designation, supplier, unit, purchase_price_cents, price_on)
  values ('e1416000-0000-4000-8000-000000000001', 'e1411000-0000-4000-8000-000000000001', 'Bâti-support WC', 'Négoce fictif', 'u', 18000, '2026-11-01') $$,
  'fourniture ajoutée');
select throws_ok($$ insert into public.artisan_supplies (artisan_id, designation, purchase_price_cents)
  values ('e1411000-0000-4000-8000-000000000002', 'Intrus', 100) $$, '42501', null, 'fourniture pour une autre entreprise refusée');

-- ---------- Ouvrage composé ----------
select throws_ok($$ select public.artisan_save_work('{"designation":"  "}'::jsonb, '[]'::jsonb) $$,
  '22023', 'Indiquez la désignation de l''ouvrage.', 'désignation obligatoire');
select lives_ok($$ select public.artisan_save_work(
  '{"designation":"Pose d''un WC suspendu","unit":"u","vatRateBp":1000,"detailed":false,"manualPriceCents":null}'::jsonb,
  '[{"kind":"fourniture","supplyId":"e1416000-0000-4000-8000-000000000001","quantityMilli":1000},
    {"kind":"heures","quantityMilli":3000},
    {"kind":"frais","label":"Évacuation des gravats","quantityMilli":1000,"costCents":2000}]'::jsonb,
  (select id from public.artisan_works where designation like 'Pose d''un WC%')) $$,
  'composition enregistrée, prix calculé');
select results_eq(
  $$ select c.kind, c.quantity_milli from public.artisan_work_components c order by c.position $$,
  $$ values ('fourniture'::text, 1000), ('heures', 3000), ('frais', 1000) $$, 'composition dans l''ordre');
select is((select manual_price_cents from public.artisan_works where designation like 'Pose d''un WC%'), null,
  'prix repris du devis remplacé par le prix calculé');
select throws_ok($$ select public.artisan_save_work('{"designation":"Déplacement","unit":"forfait"}'::jsonb, '[]'::jsonb) $$,
  '22023', 'Un ouvrage porte déjà cette désignation avec cette unité.', 'pas de doublon');
select throws_ok($$ delete from public.artisan_supplies where id = 'e1416000-0000-4000-8000-000000000001' $$,
  '23503', null, 'fourniture utilisée dans un ouvrage : non supprimable');

select set_config('test.ouvrage', (select id::text from public.artisan_works where designation like 'Pose d''un WC%'), true);

-- ---------- Autre artisan ----------
select pg_temp.connecter('e1410000-0000-4000-8000-000000000002');
select is_empty($$ select 1 from public.artisan_works $$, 'autre artisan : aucun ouvrage visible');
select is_empty($$ select 1 from public.artisan_supplies $$, 'autre artisan : aucune fourniture visible');
select is_empty($$ select 1 from public.artisan_pricing_settings $$, 'autre artisan : aucun réglage visible');
select throws_ok($$ select public.artisan_save_work('{"designation":"Vol"}'::jsonb,
  '[{"kind":"fourniture","supplyId":"e1416000-0000-4000-8000-000000000001","quantityMilli":1000}]'::jsonb) $$,
  '22023', 'Fourniture introuvable.', 'autre artisan : fourniture d''une autre entreprise refusée');
select throws_ok($$ select public.artisan_save_work(
  '{"designation":"X"}'::jsonb, '[]'::jsonb, current_setting('test.ouvrage')::uuid) $$,
  '22023', 'Ouvrage introuvable.', 'autre artisan : ouvrage d''une autre entreprise non modifiable');

-- ---------- Client du chantier et équipe MENAO ----------
select pg_temp.connecter('e1410000-0000-4000-8000-000000000003', 'particulier');
select is_empty($$ select 1 from public.artisan_works union all select 1 from public.artisan_work_components
  union all select 1 from public.artisan_supplies $$, 'client : aucun coût ni ouvrage');
select throws_ok($$ select public.artisan_seed_library() $$, '42501', null, 'client : pas de bibliothèque');
select pg_temp.connecter('e1410000-0000-4000-8000-000000000004', 'admin', 'aal2');
select is_empty($$ select 1 from public.artisan_works union all select 1 from public.artisan_pricing_settings $$,
  'équipe MENAO : ne lit pas les prix ni les marges');

select * from finish();
rollback;
