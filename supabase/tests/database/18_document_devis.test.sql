-- F-20 : données du PDF du devis (quote_document) ; brouillon lisible par son artisan seulement,
-- testé avec chaque rôle (CLAUDE.md). Devis envoyé : 19_envoi_devis.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

insert into auth.users (id, email, is_anonymous, email_confirmed_at, raw_app_meta_data, raw_user_meta_data) values
  ('a8100000-0000-4000-8000-000000000001', 'pdf.client@example.test', false, now(), '{}', '{"first_name":"Camille","last_name":"Exemple"}'),
  ('a8200000-0000-4000-8000-000000000001', 'pdf.x1@example.test', false, now(), '{"role":"artisan"}', '{"first_name":"Xavier"}'),
  ('a8200000-0000-4000-8000-000000000002', 'pdf.x2@example.test', false, now(), '{"role":"artisan"}', '{"first_name":"Yasmine"}'),
  ('a8300000-0000-4000-8000-000000000001', 'pdf.support@example.test', false, now(), '{"role":"support"}', '{}');

create function pg_temp.connecter(uid uuid, app_role text) returns void language sql as $$
  select set_config('request.jwt.claims', jsonb_build_object(
    'sub', uid, 'role', 'authenticated', 'aal', 'aal1', 'app_metadata', jsonb_build_object('role', app_role)
  )::text, true);
$$;

insert into public.artisans (id, user_id, status, siret, raison_sociale, forme_juridique_code, adresse_ligne,
  adresse_code_postal, adresse_commune, nom_commercial, zone_mode, connect_charges_enabled, assujetti_tva) values
  ('a8400000-0000-4000-8000-000000000001', 'a8200000-0000-4000-8000-000000000001', 'valide', '00000002600013',
   'ARTISAN X1', '5710', '4 RUE DE LA PAIX', '75002', 'PARIS', 'X1 Électricité', 'communes', true, true),
  ('a8400000-0000-4000-8000-000000000002', 'a8200000-0000-4000-8000-000000000002', 'valide', '00000001800010',
   'ARTISAN X2', null, null, null, null, null, 'communes', true, false);
update public.profiles set phone = '+33600000001' where user_id = 'a8200000-0000-4000-8000-000000000001';
insert into public.artisan_documents (artisan_id, type, storage_path, mime_type, size_bytes, date_fin, numero, assureur, couverture, status) values
  ('a8400000-0000-4000-8000-000000000001', 'decennale', 'a8400000/decennale.pdf', 'application/pdf', 1000,
   current_date + 200, 'DEC-123', 'Assurances Exemple', 'France métropolitaine', 'valide'),
  ('a8400000-0000-4000-8000-000000000002', 'decennale', 'a8400000/decennale-x2.pdf', 'application/pdf', 1000,
   current_date + 200, 'DEC-456', 'Assurances Exemple', 'France métropolitaine', 'refuse');
insert into public.projects (id, user_id, status, description, summary, trade_code, ville_code_insee, ville_nom,
  code_postal, adresse, location, criteria_validated_at) values
  ('a8500000-0000-4000-8000-000000000001', 'a8100000-0000-4000-8000-000000000001', 'demande_envoyee',
   'Ajouter des prises.', 'Installation de prises', 'electricien', '06088', 'Nice', '06000',
   '1 Rue de l''Exemple 06000 Nice', 'SRID=4326;POINT(7.26 43.70)', now());
insert into public.requests (id, project_id, artisan_id, particulier_id, contact_phone) values
  ('a8600000-0000-4000-8000-000000000001', 'a8500000-0000-4000-8000-000000000001',
   'a8400000-0000-4000-8000-000000000001', 'a8100000-0000-4000-8000-000000000001', '+33612345678'),
  ('a8600000-0000-4000-8000-000000000002', 'a8500000-0000-4000-8000-000000000001',
   'a8400000-0000-4000-8000-000000000002', 'a8100000-0000-4000-8000-000000000001', '+33612345678');

select set_config('test.tva', (select tva_intracom from public.artisans
  where id = 'a8400000-0000-4000-8000-000000000001'), true);

-- ---------- Artisan X1 : brouillon de la maquette (300 € HT, 330 € TTC) ----------
select pg_temp.connecter('a8200000-0000-4000-8000-000000000001', 'artisan');
set local role authenticated;
select set_config('test.chantier',
  public.artisan_fix_appointment('a8600000-0000-4000-8000-000000000001', current_date + 2, '10:00')::text, true);
select set_config('test.devis', public.artisan_save_quote_draft(current_setting('test.chantier')::uuid, $$[
  {"type":"materiel","designation":"Prise de courant","description":"Finition blanc","quantityMilli":4000,"unit":"u","unitPriceHtCents":2250,"vatRateBp":1000},
  {"type":"main_oeuvre","designation":"Pose et raccordement","quantityMilli":3000,"unit":"h","unitPriceHtCents":5500,"vatRateBp":1000},
  {"type":"autre","designation":"Forfait déplacement","quantityMilli":1000,"unit":"forfait","unitPriceHtCents":4500,"vatRateBp":1000}
]$$::jsonb)::text, true);
select set_config('test.document', public.quote_document(current_setting('test.devis')::uuid)::text, true);

select is(current_setting('test.document')::jsonb -> 'quote',
  jsonb_build_object(
    'id', current_setting('test.devis')::uuid, 'artisan_id', 'a8400000-0000-4000-8000-000000000001',
    'status', 'brouillon', 'numero', null, 'version', 1,
    'issued_on', (now() at time zone 'Europe/Paris')::date,
    'total_ht_cents', 30000, 'total_tva_cents', 3000, 'total_ttc_cents', 33000,
    'vat_breakdown', '[{"rateBp":1000,"baseHtCents":30000,"tvaCents":3000}]'::jsonb),
  'devis : brouillon daté du jour, totaux et TVA par taux');
select is(current_setting('test.document')::jsonb -> 'lines',
  $$[
    {"type":"materiel","designation":"Prise de courant","description":"Finition blanc","quantity_milli":4000,"unit":"u","unit_price_ht_cents":2250,"vat_rate_bp":1000,"total_ht_cents":9000},
    {"type":"main_oeuvre","designation":"Pose et raccordement","description":null,"quantity_milli":3000,"unit":"h","unit_price_ht_cents":5500,"vat_rate_bp":1000,"total_ht_cents":16500},
    {"type":"autre","designation":"Forfait déplacement","description":null,"quantity_milli":1000,"unit":"forfait","unit_price_ht_cents":4500,"vat_rate_bp":1000,"total_ht_cents":4500}
  ]$$::jsonb,
  'lignes dans l''ordre du devis');
select is(current_setting('test.document')::jsonb -> 'issuer',
  jsonb_build_object(
    'raison_sociale', 'ARTISAN X1', 'nom_commercial', 'X1 Électricité', 'forme_juridique_code', '5710',
    'siret', '00000002600013', 'tva_intracom', current_setting('test.tva'), 'assujetti_tva', true,
    'adresse_ligne', '4 RUE DE LA PAIX', 'code_postal', '75002', 'commune', 'PARIS',
    'email', 'pdf.x1@example.test', 'phone', '+33600000001', 'logo_path', null,
    'decennale', jsonb_build_object('assureur', 'Assurances Exemple', 'numero', 'DEC-123',
      'couverture', 'France métropolitaine', 'date_fin', current_date + 200)),
  'artisan : identité, TVA, contact, logo (aucun) et assurance décennale');
select is(current_setting('test.document')::jsonb -> 'client',
  '{"first_name":"Camille","last_name":"Exemple"}'::jsonb, 'client : prénom et nom');
select is(current_setting('test.document')::jsonb -> 'chantier',
  '{"title":"Installation de prises","adresse":"1 Rue de l''Exemple 06000 Nice","code_postal":"06000","ville_nom":"Nice"}'::jsonb,
  'chantier : intitulé et adresse');
select is(current_setting('test.document')::jsonb -> 'terms', 'null'::jsonb, 'brouillon : modalités fixées à l''envoi');
select is(public.quote_document('a8000000-0000-4000-8000-000000000000'), null, 'devis inconnu : rien');

-- ---------- Artisan X2 : devis d'autrui, assurance refusée ----------
reset role;
select pg_temp.connecter('a8200000-0000-4000-8000-000000000002', 'artisan');
set local role authenticated;
select is(public.quote_document(current_setting('test.devis')::uuid), null, 'X2 : devis d''autrui illisible');
select set_config('test.chantier2',
  public.artisan_fix_appointment('a8600000-0000-4000-8000-000000000002', current_date + 2, '14:00')::text, true);
select set_config('test.devis2', public.artisan_save_quote_draft(current_setting('test.chantier2')::uuid,
  '[{"type":"materiel","designation":"Prise","quantityMilli":1000,"unit":"u","unitPriceHtCents":1500,"vatRateBp":0}]')::text, true);
select is(public.quote_document(current_setting('test.devis2')::uuid) -> 'issuer' -> 'decennale', 'null'::jsonb,
  'attestation décennale refusée : non reprise');
select is(public.quote_document(current_setting('test.devis2')::uuid) -> 'issuer' ->> 'tva_intracom', null,
  'franchise en base : pas de numéro de TVA');

-- ---------- Particulier, équipe, visiteur ----------
reset role;
select pg_temp.connecter('a8100000-0000-4000-8000-000000000001', 'particulier');
set local role authenticated;
select is(public.quote_document(current_setting('test.devis')::uuid), null, 'particulier : brouillon illisible');
reset role;

select pg_temp.connecter('a8300000-0000-4000-8000-000000000001', 'support');
set local role authenticated;
select is(public.quote_document(current_setting('test.devis')::uuid), null, 'support : brouillon non rendu');
reset role;

select set_config('request.jwt.claims', '{"role":"anon"}', true);
set local role anon;
select throws_ok(format('select public.quote_document(%L)', current_setting('test.devis')),
  '42501', null, 'visiteur : fonction inaccessible');
reset role;

select * from finish();
rollback;
