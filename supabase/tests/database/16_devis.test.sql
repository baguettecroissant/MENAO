-- F-19 : brouillon de devis, lignes, totaux en centimes (mêmes règles que packages/core),
-- régime de TVA, suggestions, RLS avec chaque rôle (CLAUDE.md).
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

insert into auth.users (id, email, is_anonymous, email_confirmed_at, raw_app_meta_data, raw_user_meta_data) values
  ('a7100000-0000-4000-8000-000000000001', 'dv.client@example.test', false, now(), '{}', '{"first_name":"Camille","last_name":"Exemple"}'),
  ('a7200000-0000-4000-8000-000000000001', 'dv.x1@example.test', false, now(), '{"role":"artisan"}', '{"first_name":"Xavier"}'),
  ('a7200000-0000-4000-8000-000000000002', 'dv.x2@example.test', false, now(), '{"role":"artisan"}', '{"first_name":"Yasmine"}'),
  ('a7300000-0000-4000-8000-000000000001', 'dv.support@example.test', false, now(), '{"role":"support"}', '{}');

create function pg_temp.connecter(uid uuid, app_role text) returns void language sql as $$
  select set_config('request.jwt.claims', jsonb_build_object(
    'sub', uid, 'role', 'authenticated', 'aal', 'aal1', 'app_metadata', jsonb_build_object('role', app_role)
  )::text, true);
$$;

-- X1 assujetti à la TVA, X2 en franchise en base.
insert into public.artisans (id, user_id, status, raison_sociale, zone_mode, connect_charges_enabled, assujetti_tva) values
  ('a7400000-0000-4000-8000-000000000001', 'a7200000-0000-4000-8000-000000000001', 'valide', 'ARTISAN X1', 'communes', true, true),
  ('a7400000-0000-4000-8000-000000000002', 'a7200000-0000-4000-8000-000000000002', 'valide', 'ARTISAN X2', 'communes', true, false);
insert into public.projects (id, user_id, status, description, summary, trade_code, ville_code_insee, ville_nom,
  code_postal, adresse, location, criteria_validated_at) values
  ('a7500000-0000-4000-8000-000000000001', 'a7100000-0000-4000-8000-000000000001', 'demande_envoyee',
   'Ajouter des prises.', 'Installation de prises', 'electricien', '06088', 'Nice', '06000',
   '1 Rue de l''Exemple 06000 Nice', 'SRID=4326;POINT(7.26 43.70)', now());
insert into public.requests (id, project_id, artisan_id, particulier_id, contact_phone) values
  ('a7600000-0000-4000-8000-000000000001', 'a7500000-0000-4000-8000-000000000001',
   'a7400000-0000-4000-8000-000000000001', 'a7100000-0000-4000-8000-000000000001', '+33612345678'),
  ('a7600000-0000-4000-8000-000000000002', 'a7500000-0000-4000-8000-000000000001',
   'a7400000-0000-4000-8000-000000000002', 'a7100000-0000-4000-8000-000000000001', '+33612345678');

-- Lignes de la maquette : 300,00 € HT, 30,00 € de TVA (10 %), 330,00 € TTC.
select set_config('test.lignes', $$[
  {"type":"materiel","designation":" Prise de courant Legrand Céliane étanche ","description":"Finition blanc, certifiée IP44","quantityMilli":4000,"unit":"u","unitPriceHtCents":2250,"vatRateBp":1000},
  {"type":"main_oeuvre","designation":"Pose, raccordement et mise en service","description":"","quantityMilli":3000,"unit":"h","unitPriceHtCents":5500,"vatRateBp":1000},
  {"type":"autre","designation":"Forfait déplacement","quantityMilli":1000,"unit":"forfait","unitPriceHtCents":4500,"vatRateBp":1000}
]$$, true);

-- ---------- Artisan X1 : brouillon ----------
select pg_temp.connecter('a7200000-0000-4000-8000-000000000001', 'artisan');
set local role authenticated;
select set_config('test.chantier',
  public.artisan_fix_appointment('a7600000-0000-4000-8000-000000000001', current_date + 2, '10:00')::text, true);
select set_config('test.devis',
  public.artisan_save_quote_draft(current_setting('test.chantier')::uuid, current_setting('test.lignes')::jsonb)::text, true);
select results_eq(
  $$ select status::text, version::int, total_ht_cents, total_tva_cents, total_ttc_cents, vat_breakdown
     from public.quotes where id = current_setting('test.devis')::uuid $$,
  $$ values ('brouillon'::text, 1, 30000::bigint, 3000::bigint, 33000::bigint,
             '[{"rateBp":1000,"baseHtCents":30000,"tvaCents":3000}]'::jsonb) $$,
  'brouillon enregistré : totaux de la maquette (300 € HT, 330 € TTC)');
select results_eq(
  $$ select position::int, designation, description, total_ht_cents from public.quote_lines
     where quote_id = current_setting('test.devis')::uuid order by position $$,
  $$ values (1, 'Prise de courant Legrand Céliane étanche'::text, 'Finition blanc, certifiée IP44'::text, 9000::bigint),
            (2, 'Pose, raccordement et mise en service'::text, null::text, 16500::bigint),
            (3, 'Forfait déplacement'::text, null::text, 4500::bigint) $$,
  'lignes dans l''ordre, textes nettoyés, total HT par ligne');

-- Nouvel enregistrement : mêmes devis, lignes remplacées ; arrondis identiques à packages/core.
select is(
  public.artisan_save_quote_draft(current_setting('test.chantier')::uuid, $$[
    {"type":"main_oeuvre","designation":"Pose","quantityMilli":2500,"unit":"h","unitPriceHtCents":3333,"vatRateBp":1000},
    {"type":"materiel","designation":"Vis","quantityMilli":1000,"unit":"u","unitPriceHtCents":3,"vatRateBp":2000},
    {"type":"materiel","designation":"Cheville","quantityMilli":1000,"unit":"u","unitPriceHtCents":3,"vatRateBp":2000}
  ]$$::jsonb)::text,
  current_setting('test.devis'), 'un seul brouillon par chantier');
select results_eq(
  $$ select total_ht_cents, total_tva_cents, total_ttc_cents, vat_breakdown from public.quotes
     where id = current_setting('test.devis')::uuid $$,
  $$ values (8339::bigint, 834::bigint, 9173::bigint,
             '[{"rateBp":1000,"baseHtCents":8333,"tvaCents":833},{"rateBp":2000,"baseHtCents":6,"tvaCents":1}]'::jsonb) $$,
  '2,5 h × 33,33 € = 83,33 € ; TVA par taux sur le total hors taxe (6 × 20 % = 1 centime)');
select is((select count(*)::int from public.quote_lines where quote_id = current_setting('test.devis')::uuid), 3,
  'anciennes lignes remplacées');

select throws_ok(
  $$ select public.artisan_save_quote_draft(current_setting('test.chantier')::uuid,
       '[{"type":"materiel","designation":"Prise","quantityMilli":1000,"unit":"u","unitPriceHtCents":100,"vatRateBp":0}]') $$,
  '22023', 'Taux de TVA incompatible avec votre régime de TVA', 'assujetti : pas de TVA à 0 %');
select throws_ok(
  $$ select public.artisan_save_quote_draft(current_setting('test.chantier')::uuid,
       '[{"type":"materiel","designation":"Prise","quantityMilli":1000,"unit":"u","unitPriceHtCents":100,"vatRateBp":700}]') $$,
  '23514', null, 'taux de TVA inconnu refusé');
select throws_ok(
  $$ select public.artisan_save_quote_draft(current_setting('test.chantier')::uuid,
       '[{"type":"materiel","designation":"Prise","quantityMilli":0,"unit":"u","unitPriceHtCents":100,"vatRateBp":2000}]') $$,
  '23514', null, 'quantité nulle refusée');
select throws_ok(
  $$ select public.artisan_save_quote_draft(current_setting('test.chantier')::uuid,
       '[{"type":"materiel","designation":"Prise","quantityMilli":100000000,"unit":"u","unitPriceHtCents":100000000,"vatRateBp":2000}]') $$,
  '23514', null, 'ligne au-delà de 10 000 000 € HT refusée');
select throws_ok(
  $$ select public.artisan_save_quote_draft(current_setting('test.chantier')::uuid,
       (select jsonb_agg('{"type":"autre","designation":"X","quantityMilli":1000,"unit":"u","unitPriceHtCents":1,"vatRateBp":2000}'::jsonb)
        from generate_series(1, 201))) $$,
  '22023', 'Un devis compte 200 lignes au plus', '200 lignes au plus');
select is((select total_ttc_cents from public.quotes where id = current_setting('test.devis')::uuid), 9173::bigint,
  'enregistrement refusé : brouillon inchangé');

select results_eq(
  $$ select designation, unit_price_ht_cents from public.artisan_previous_lines('pos') $$,
  $$ values ('Pose'::text, 3333) $$,
  'suggestions : lignes déjà saisies par l''artisan');
select is((select count(*)::int from public.artisan_previous_lines('%')), 0, 'caractères spéciaux pris à la lettre');
select results_eq(
  $$ select status::text, line_count, total_ttc_cents, title, client_name from public.artisan_quotes() $$,
  $$ values ('brouillon'::text, 3, 9173::bigint, 'Installation de prises'::text, 'Camille Exemple'::text) $$,
  'liste des devis de l''artisan');
select throws_ok($$ insert into public.quotes (chantier_id, artisan_id) values (current_setting('test.chantier')::uuid, app.my_artisan_id()) $$,
  '42501', null, 'création directe de devis refusée');
select throws_ok($$ update public.quote_lines set unit_price_ht_cents = 1 $$,
  '42501', null, 'modification directe des lignes refusée');

-- ---------- Artisan X2 (franchise en base) ----------
reset role;
select pg_temp.connecter('a7200000-0000-4000-8000-000000000002', 'artisan');
set local role authenticated;
select is((select count(*)::int from public.quotes), 0, 'X2 : devis d''autrui invisibles');
select is((select count(*)::int from public.quote_lines), 0, 'X2 : lignes d''autrui invisibles');
select is((select count(*)::int from public.artisan_previous_lines('')), 0, 'X2 : aucune suggestion venant d''autrui');
select throws_ok(
  $$ select public.artisan_save_quote_draft(current_setting('test.chantier')::uuid, '[]') $$,
  '42501', null, 'X2 : brouillon sur le chantier d''autrui refusé');
select set_config('test.chantier2',
  public.artisan_fix_appointment('a7600000-0000-4000-8000-000000000002', current_date + 2, '14:00')::text, true);
select throws_ok(
  $$ select public.artisan_save_quote_draft(current_setting('test.chantier2')::uuid,
       '[{"type":"materiel","designation":"Prise","quantityMilli":1000,"unit":"u","unitPriceHtCents":100,"vatRateBp":2000}]') $$,
  '22023', 'Taux de TVA incompatible avec votre régime de TVA', 'franchise en base : TVA à 0 % seulement');
select set_config('test.devis2', public.artisan_save_quote_draft(current_setting('test.chantier2')::uuid,
  '[{"type":"materiel","designation":"Prise","quantityMilli":2000,"unit":"u","unitPriceHtCents":1500,"vatRateBp":0}]')::text, true);
select results_eq(
  $$ select total_ht_cents, total_tva_cents, total_ttc_cents from public.quotes
     where id = current_setting('test.devis2')::uuid $$,
  $$ values (3000::bigint, 0::bigint, 3000::bigint) $$,
  'franchise en base : TTC = HT');

-- ---------- Particulier, équipe, visiteur ----------
reset role;
select pg_temp.connecter('a7100000-0000-4000-8000-000000000001', 'particulier');
set local role authenticated;
select is((select count(*)::int from public.quotes), 0, 'particulier : brouillons invisibles');
select throws_ok(
  $$ select public.artisan_save_quote_draft(current_setting('test.chantier')::uuid, '[]') $$,
  '42501', null, 'particulier : pas de devis');
reset role;

select pg_temp.connecter('a7300000-0000-4000-8000-000000000001', 'support');
set local role authenticated;
select is((select count(*)::int from public.quotes), 2, 'support : voit les devis');
reset role;

select set_config('request.jwt.claims', '{"role":"anon"}', true);
set local role anon;
select throws_ok('select 1 from public.quotes', '42501', null, 'visiteur : aucun accès aux devis');
select throws_ok('select 1 from public.quote_lines', '42501', null, 'visiteur : aucun accès aux lignes');
reset role;

-- ---------- Devis envoyé : lignes figées, visible du particulier ----------
update public.quotes set status = 'envoye', numero = 'DEVIS-2026-0001', sent_at = now(),
  valid_until = current_date + 30, start_date = current_date + 10, duration_days = 2,
  payment_schedule = '[]', document = '{}'
where id = current_setting('test.devis')::uuid;
select throws_ok(
  $$ update public.quote_lines set unit_price_ht_cents = 1 where quote_id = current_setting('test.devis')::uuid $$,
  '42501', 'Les lignes d''un devis envoyé ne peuvent plus changer', 'lignes d''un devis envoyé figées');
select pg_temp.connecter('a7100000-0000-4000-8000-000000000001', 'particulier');
set local role authenticated;
select is((select count(*)::int from public.quotes), 1, 'particulier : devis envoyé visible');
select is((select count(*)::int from public.quote_lines), 3, 'particulier : lignes du devis envoyé visibles');
reset role;

-- Chantier sans rendez-vous en attente de devis : enregistrement refusé.
select pg_temp.connecter('a7200000-0000-4000-8000-000000000001', 'artisan');
set local role authenticated;
select public.artisan_cancel_chantier(current_setting('test.chantier')::uuid, null);
select throws_ok(
  $$ select public.artisan_save_quote_draft(current_setting('test.chantier')::uuid, '[]') $$,
  '22023', 'Ce chantier n''attend pas de devis', 'chantier annulé : plus de devis');

select * from finish();
rollback;
