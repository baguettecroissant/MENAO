-- DPGF depuis les plans, lot 2 (F-140, ADR 0292) : revêtements des pièces, lignes calculées avec
-- leur origine et leur détail, quantité corrigée « saisi », case « J'ai vérifié les quantités »
-- (condition du PDF), revêtements gardés quand le relevé change, isolement entre entreprises.
-- Données fictives (identifiants e140…).
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

insert into auth.users (id, email, is_anonymous, email_confirmed_at, raw_app_meta_data, raw_user_meta_data) values
  ('e1400000-0000-4000-8000-000000000001', 'lots140.entreprise@example.test', false, now(), '{"role":"artisan"}', '{}'),
  ('e1400000-0000-4000-8000-000000000002', 'lots140.autre@example.test', false, now(), '{"role":"artisan"}', '{}');
insert into public.artisans (id, user_id, status, raison_sociale, zone_mode, assujetti_tva) values
  ('e1401000-0000-4000-8000-000000000001', 'e1400000-0000-4000-8000-000000000001', 'valide', 'RENOVATION 140', 'communes', true),
  ('e1401000-0000-4000-8000-000000000002', 'e1400000-0000-4000-8000-000000000002', 'valide', 'AUTRE 140', 'communes', true);
insert into public.subscriptions (artisan_id, plan_code, stripe_customer_id, stripe_subscription_id, status) values
  ('e1401000-0000-4000-8000-000000000001', 'entreprise', 'cus_e140a', 'sub_e140a', 'active'),
  ('e1401000-0000-4000-8000-000000000002', 'entreprise', 'cus_e140b', 'sub_e140b', 'active');

create function pg_temp.connecter(uid uuid) returns void language sql as $$
  select set_config('request.jwt.claims', jsonb_build_object(
    'sub', uid, 'role', 'authenticated', 'aal', 'aal1', 'app_metadata', jsonb_build_object('role', 'artisan')
  )::text, true);
$$;
create function pg_temp.ao() returns uuid language sql as $$
  select id from public.tenders where name = 'Maison 140'
$$;
create function pg_temp.piece(p_name text) returns uuid language sql as $$
  select id from public.tender_rooms where name = p_name
$$;

set local role authenticated;
select pg_temp.connecter('e1400000-0000-4000-8000-000000000001');
select lives_ok($$ select public.artisan_create_plan_tender('Maison 140',
  '[{"path":"e1401000-0000-4000-8000-000000000001/0b6f3c4e-1d2a-4b5c-8d9e-0f1a2b3c4d51.pdf","name":"Plans.pdf"}]'::jsonb,
  array['carreleur']) $$, 'appel d''offres depuis les plans');
select is(public.artisan_import_plan_reading(pg_temp.ao(),
  '[{"level":"RDC","name":"Séjour","areaCm2":451400,"perimeterMm":27000,"heightMm":2500,"source":"plan","file":1,"page":2},
    {"level":"RDC","name":"Salle d''eau","areaCm2":124100,"perimeterMm":14100,"heightMm":2500,"wet":true,"source":"plan","file":1,"page":2}]'::jsonb,
  '{"portes": 2}'::jsonb), 2, 'relevé : 2 pièces');

-- ---------- Revêtements ----------
select throws_ok($$ select public.artisan_save_plan_finishes(pg_temp.ao(),
  jsonb_build_array(jsonb_build_object('id', pg_temp.piece('Séjour'), 'floor', 'marbre', 'walls', 'peinture', 'ceiling', 'peinture'))) $$,
  '22023', 'Revêtements invalides.', 'revêtement inconnu refusé');
select lives_ok($$ select public.artisan_save_plan_finishes(pg_temp.ao(), jsonb_build_array(
  jsonb_build_object('id', pg_temp.piece('Séjour'), 'floor', 'carrelage', 'walls', 'peinture', 'ceiling', 'peinture', 'tileHeightMm', 2100),
  jsonb_build_object('id', pg_temp.piece('Salle d''eau'), 'floor', 'carrelage', 'walls', 'faience', 'ceiling', 'plaque', 'tileHeightMm', 2100))) $$,
  'revêtements enregistrés');
select results_eq(
  $$ select floor, walls, ceiling, tile_height_mm from public.tender_rooms order by position $$,
  $$ values ('carrelage'::text, 'peinture'::text, 'peinture'::text, null::integer), ('carrelage', 'faience', 'plaque', 2100) $$,
  'hauteur de faïence gardée seulement pour les murs en faïence');

-- Relevé corrigé : les revêtements restent.
select lives_ok($$ select public.artisan_save_plan_rooms(pg_temp.ao(), jsonb_build_array(
  (select jsonb_build_object('id', id, 'level', level, 'name', name, 'areaCm2', 460000, 'perimeterMm', perimeter_mm,
     'heightMm', height_mm, 'wet', wet, 'habitable', habitable) from public.tender_rooms where name = 'Séjour'),
  (select jsonb_build_object('id', id, 'level', level, 'name', name, 'areaCm2', area_cm2, 'perimeterMm', perimeter_mm,
     'heightMm', height_mm, 'wet', wet, 'habitable', habitable) from public.tender_rooms where name = 'Salle d''eau')),
  '{}'::jsonb) $$, 'relevé corrigé après les revêtements');
select results_eq(
  $$ select name, source, floor, walls from public.tender_rooms order by position $$,
  $$ values ('Séjour'::text, 'saisi'::text, 'carrelage'::text, 'peinture'::text), ('Salle d''eau', 'plan', 'carrelage', 'faience') $$,
  'revêtements gardés quand le relevé change');

-- ---------- DPGF créé ----------
select is(public.artisan_import_plan_lines(pg_temp.ao(),
  '[{"kind":"titre","lot":"LOT 01 CARRELEUR","code":"LOT 01","designation":"CARRELEUR","source":"plan"},
    {"kind":"poste","lot":"LOT 01 CARRELEUR","code":"1.1","designation":"Carrelage de sol","unit":"m2","unitLabel":"m²",
     "quantityMilli":58410,"unitPriceHtCents":7400,"priceReference":"Pose carrelage","source":"plan","detail":"Séjour 46 + Salle d''eau 12,41 = 58,41 m²"},
    {"kind":"poste","lot":"LOT 01 CARRELEUR","code":"1.2","designation":"Étanchéité (SPEC) sous douche","unit":"m2","unitLabel":"m²",
     "quantityMilli":null,"source":"inconnu","detail":"À compléter : surface des douches non cotée sur le plan."}]'::jsonb),
  3, 'DPGF : 3 lignes');
select results_eq(
  $$ select code, quantity_source, price_source, architect_quantity_milli from public.tender_lines order by position $$,
  $$ values ('LOT 01'::text, null::text, null::text, null::bigint), ('1.1', 'plan', 'devis', null), ('1.2', 'manque', null, null) $$,
  'origine des quantités (inconnue → à compléter), prix repris des devis, pas de quantité d''architecte');
select is((select quantity_detail from public.tender_lines where code = '1.1'), 'Séjour 46 + Salle d''eau 12,41 = 58,41 m²',
  'détail du calcul gardé');

-- ---------- Vérification avant l'export ----------
select is(public.tender_document(pg_temp.ao()), null, 'PDF refusé tant que les quantités ne sont pas vérifiées');
select lives_ok($$ select public.artisan_check_tender_quantities(pg_temp.ao(), true) $$, 'quantités vérifiées');
select isnt(public.tender_document(pg_temp.ao()), null, 'PDF possible après la vérification');

-- Quantité corrigée dans l'éditeur : « saisi » ; prix seul changé : origine de la quantité gardée.
select lives_ok($$ select public.artisan_save_tender(pg_temp.ao(), 2000, jsonb_build_array(
  jsonb_build_object('id', (select id from public.tender_lines where code = '1.1'), 'quantityMilli', 60000, 'unitPriceHtCents', 7400),
  jsonb_build_object('id', (select id from public.tender_lines where code = '1.2'), 'quantityMilli', null, 'unitPriceHtCents', 4200))) $$,
  'chiffrage enregistré');
select results_eq(
  $$ select code, quantity_source from public.tender_lines where kind = 'poste' order by position $$,
  $$ values ('1.1'::text, 'saisi'::text), ('1.2', 'manque') $$,
  'quantité changée → saisi');

-- DPGF recréé : la vérification est à refaire.
select lives_ok($$ select public.artisan_import_plan_lines(pg_temp.ao(), '[]'::jsonb) $$, 'DPGF recréé');
select is((select quantities_checked_at from public.tenders where name = 'Maison 140'), null, 'vérification à refaire');
select throws_ok($$ select public.artisan_check_tender_quantities(pg_temp.ao(), true) $$, '22023',
  'Créez d''abord le DPGF.', 'pas de vérification sans DPGF');

-- ---------- Autre entreprise ----------
select pg_temp.connecter('e1400000-0000-4000-8000-000000000002');
select throws_ok($$ select public.artisan_import_plan_lines(
  (select id from public.tenders where artisan_id = 'e1401000-0000-4000-8000-000000000001'), '[]'::jsonb) $$,
  '22023', 'Appel d''offres introuvable.', 'autre entreprise : DPGF non modifiable');

select * from finish();
rollback;
