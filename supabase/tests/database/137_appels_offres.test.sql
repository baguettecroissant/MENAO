-- Appels d'offres, lot 1 (F-136, ADR 0287) : formule Entreprise seulement, import des lignes du
-- DPGF, quantités et prix de l'artisan, TVA, suivi, prix des anciens devis, document du PDF,
-- isolement entre entreprises, suppression. Données fictives (identifiants e137…).
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

insert into auth.users (id, email, is_anonymous, email_confirmed_at, raw_app_meta_data, raw_user_meta_data) values
  ('e1370000-0000-4000-8000-000000000001', 'ao137.entreprise@example.test', false, now(), '{"role":"artisan"}', '{}'),
  ('e1370000-0000-4000-8000-000000000002', 'ao137.premium@example.test', false, now(), '{"role":"artisan"}', '{}'),
  ('e1370000-0000-4000-8000-000000000003', 'ao137.client@example.test', false, now(), '{"role":"particulier"}', '{}');
insert into public.artisans (id, user_id, status, raison_sociale, zone_mode, assujetti_tva) values
  ('e1371000-0000-4000-8000-000000000001', 'e1370000-0000-4000-8000-000000000001', 'valide', 'CARRELAGE 137', 'communes', true),
  ('e1371000-0000-4000-8000-000000000002', 'e1370000-0000-4000-8000-000000000002', 'valide', 'PREMIUM 137', 'communes', true);
insert into public.subscriptions (artisan_id, plan_code, stripe_customer_id, stripe_subscription_id, status) values
  ('e1371000-0000-4000-8000-000000000001', 'entreprise', 'cus_e137a', 'sub_e137a', 'active'),
  ('e1371000-0000-4000-8000-000000000002', 'premium', 'cus_e137b', 'sub_e137b', 'active');

-- Un ancien devis de l'entreprise, pour les prix pratiqués.
insert into public.projects (id, user_id, status, description, trade_code, ville_code_insee, ville_nom, criteria_validated_at) values
  ('e1372000-0000-4000-8000-000000000001', 'e1370000-0000-4000-8000-000000000003', 'criteres_valides', 'Salle de bains fictive',
   'plombier', '06004', 'Antibes', now());
insert into public.requests (id, project_id, artisan_id, particulier_id, contact_phone, status) values
  ('e1373000-0000-4000-8000-000000000001', 'e1372000-0000-4000-8000-000000000001', 'e1371000-0000-4000-8000-000000000001',
   'e1370000-0000-4000-8000-000000000003', '+33600001370', 'acceptee');
insert into public.chantiers (id, project_id, request_id, artisan_id, particulier_id, title) values
  ('e1374000-0000-4000-8000-000000000001', 'e1372000-0000-4000-8000-000000000001', 'e1373000-0000-4000-8000-000000000001',
   'e1371000-0000-4000-8000-000000000001', 'e1370000-0000-4000-8000-000000000003', 'Salle de bains');
insert into public.quotes (id, chantier_id, artisan_id, version, status, total_ht_cents, total_tva_cents, total_ttc_cents) values
  ('e1375000-0000-4000-8000-000000000001', 'e1374000-0000-4000-8000-000000000001', 'e1371000-0000-4000-8000-000000000001',
   1, 'brouillon', 0, 0, 0);
insert into public.quote_lines (quote_id, position, type, designation, quantity_milli, unit, unit_price_ht_cents, vat_rate_bp, total_ht_cents) values
  ('e1375000-0000-4000-8000-000000000001', 1, 'main_oeuvre', 'Pose carrelage grès cérame 60x60', 10000, 'm2', 7400, 1000, 74000),
  ('e1375000-0000-4000-8000-000000000001', 2, 'materiel', 'Plinthes carrelage', 5000, 'ml', 1450, 1000, 7250),
  ('e1375000-0000-4000-8000-000000000001', 3, 'autre', 'Déplacement', 1000, 'forfait', 0, 1000, 0);

create function pg_temp.connecter(uid uuid, app_role text default 'artisan') returns void language sql as $$
  select set_config('request.jwt.claims', jsonb_build_object(
    'sub', uid, 'role', 'authenticated', 'aal', 'aal1', 'app_metadata', jsonb_build_object('role', app_role)
  )::text, true);
$$;

-- ---------- Droit par formule ----------
select is((select (limites -> 'agents' ->> 'appels_offres')::boolean from public.plans where code = 'entreprise'), true,
  'Entreprise : appels d''offres inclus');
select is((select (limites -> 'agents' ->> 'appels_offres')::boolean from public.plans where code = 'premium'), false,
  'Premium : pas d''appels d''offres');
select ok(not has_function_privilege('anon', 'public.artisan_create_tender(text, text, date, text, text)', 'execute'),
  'création fermée aux visiteurs');

set local role authenticated;
select pg_temp.connecter('e1370000-0000-4000-8000-000000000002');
select throws_ok($$ select public.artisan_create_tender('Maison fictive') $$, '42501',
  'Les appels d''offres sont inclus dans la formule Entreprise.', 'Premium : création refusée');

-- ---------- Entreprise ----------
select pg_temp.connecter('e1370000-0000-4000-8000-000000000001');
select throws_ok($$ select public.artisan_create_tender('Maison', null, null, 'autre-dossier/fichier.xlsx') $$, '22023',
  'Fichier invalide.', 'fichier hors de son dossier : refusé');
select lives_ok($$ select public.artisan_create_tender('Maison individuelle — Mougins', 'Atelier fictif',
  date '2026-11-28', 'e1371000-0000-4000-8000-000000000001/0b6f3c4e-1d2a-4b5c-8d9e-0f1a2b3c4d5e.xlsx', 'DPGF.xlsx') $$,
  'création avec le fichier de l''architecte');
select is((select source_kind || ' ' || vat_rate_bp from public.tenders where name like 'Maison individuelle%'), 'xlsx 2000',
  'Excel, TVA 20 % par défaut');

select is(public.artisan_import_tender_lines(
  (select id from public.tenders where name like 'Maison individuelle%'),
  '{"sheet":"DPGF","headerRow":3}'::jsonb,
  '[{"kind":"titre","code":"LOT 05","designation":"CARRELAGE","lot":"LOT 05 CARRELAGE","sheetRow":5},
    {"kind":"poste","code":"5.2","designation":"Carrelage sol grès cérame 60 x 60","lot":"LOT 05 CARRELAGE","unitLabel":"m²","unit":"m2","quantityMilli":62000,"unitPriceHtCents":7400,"priceReference":"Pose carrelage grès cérame 60x60","sheetRow":7},
    {"kind":"poste","code":"5.6","designation":"Seuils","lot":"LOT 05 CARRELAGE","unitLabel":"U","unit":"u","quantityMilli":4000,"sheetRow":9}]'::jsonb),
  3, 'trois lignes importées');
select results_eq(
  $$ select kind, architect_quantity_milli, quantity_milli, unit_price_ht_cents, price_source
     from public.tender_lines order by position $$,
  $$ values ('titre'::text, null::bigint, null::bigint, null::integer, null::text),
            ('poste', 62000::bigint, 62000::bigint, 7400, 'devis'),
            ('poste', 4000::bigint, 4000::bigint, null::integer, null::text) $$,
  'quantité de l''architecte gardée, prix suggéré marqué « devis »');

select lives_ok($$ select public.artisan_save_tender(
  (select id from public.tenders where name like 'Maison individuelle%'), 1000,
  jsonb_build_array(
    jsonb_build_object('id', (select id from public.tender_lines where code = '5.2'), 'quantityMilli', 77400, 'unitPriceHtCents', 7400),
    jsonb_build_object('id', (select id from public.tender_lines where code = '5.6'), 'quantityMilli', 6000, 'unitPriceHtCents', 3500))) $$,
  'quantités et prix enregistrés');
select results_eq(
  $$ select code, architect_quantity_milli, quantity_milli, unit_price_ht_cents, price_source
     from public.tender_lines where kind = 'poste' order by position $$,
  $$ values ('5.2'::text, 62000::bigint, 77400::bigint, 7400, 'devis'::text),
            ('5.6', 4000::bigint, 6000::bigint, 3500, 'manuel') $$,
  'prix inchangé : « devis » ; prix saisi : « manuel » ; quantité de l''architecte conservée');
select is((select vat_rate_bp::int from public.tenders where name like 'Maison individuelle%'), 1000, 'TVA 10 %');
select throws_ok($$ select public.artisan_save_tender((select id from public.tenders limit 1), 0, '[]') $$, '22023',
  'Taux de TVA invalide.', 'TVA 0 % refusée pour une entreprise assujettie');

select lives_ok($$ select public.artisan_update_tender((select id from public.tenders limit 1),
  'Maison individuelle — Mougins', 'envoye', 'Atelier fictif', date '2026-11-28') $$, 'offre marquée envoyée');
select is((select status::text from public.tenders limit 1), 'envoye', 'suivi : envoyé');

select results_eq(
  $$ select designation, unit::text, unit_price_ht_cents from public.artisan_price_history() order by designation $$,
  $$ values ('Plinthes carrelage'::text, 'ml'::text, 1450), ('Pose carrelage grès cérame 60x60', 'm2', 7400) $$,
  'prix pratiqués : ses devis, sans les lignes à 0 €');

select is((public.tender_document((select id from public.tenders limit 1)) -> 'issuer' ->> 'raison_sociale'), 'CARRELAGE 137',
  'document du PDF : émetteur');
select is(jsonb_array_length(public.tender_document((select id from public.tenders limit 1)) -> 'lines'), 3,
  'document du PDF : lignes');

-- ---------- Isolement ----------
select pg_temp.connecter('e1370000-0000-4000-8000-000000000002');
select is_empty($$ select 1 from public.tenders $$, 'une autre entreprise ne voit pas l''appel d''offres');
select is_empty($$ select 1 from public.tender_lines $$, 'ni ses lignes');
select is(public.tender_document((select id from public.tenders limit 1)), null, 'ni son document');
select is_empty($$ select 1 from public.artisan_price_history() $$, 'ni ses prix');
select throws_ok(
  $$ select public.artisan_delete_tender('00000000-0000-4000-8000-000000000000') $$, '22023',
  'Appel d''offres introuvable.', 'suppression d''un appel d''offres inconnu refusée');

-- ---------- Suppression par l'entreprise ----------
select pg_temp.connecter('e1370000-0000-4000-8000-000000000001');
select is(public.artisan_delete_tender((select id from public.tenders limit 1)),
  array['e1371000-0000-4000-8000-000000000001/0b6f3c4e-1d2a-4b5c-8d9e-0f1a2b3c4d5e.xlsx'], 'suppression : chemin du fichier rendu');
select is_empty($$ select 1 from public.tender_lines $$, 'lignes supprimées avec l''appel d''offres');

select * from finish();
rollback;
