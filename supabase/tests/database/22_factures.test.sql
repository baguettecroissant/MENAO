-- F-35 : facture d'acompte émise à l'encaissement (numéro par artisan sans trou, TVA répartie comme
-- dans packages/core, données figées), droits de chaque rôle (CLAUDE.md).
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

insert into auth.users (id, email, is_anonymous, email_confirmed_at, raw_app_meta_data, raw_user_meta_data) values
  ('ac100000-0000-4000-8000-000000000001', 'fac.client@example.test', false, now(), '{}', '{"first_name":"Camille","last_name":"Exemple"}'),
  ('ac200000-0000-4000-8000-000000000001', 'fac.x1@example.test', false, now(), '{"role":"artisan"}', '{"first_name":"Xavier"}'),
  ('ac200000-0000-4000-8000-000000000002', 'fac.x2@example.test', false, now(), '{"role":"artisan"}', '{"first_name":"Yasmine"}'),
  ('ac300000-0000-4000-8000-000000000001', 'fac.support@example.test', false, now(), '{"role":"support"}', '{}');

create function pg_temp.connecter(uid uuid, app_role text) returns void language sql as $$
  select set_config('request.jwt.claims', jsonb_build_object(
    'sub', uid, 'role', 'authenticated', 'aal', 'aal1', 'app_metadata', jsonb_build_object('role', app_role)
  )::text, true);
$$;

insert into public.artisans (id, user_id, status, siret, raison_sociale, forme_juridique_code, adresse_ligne,
  adresse_code_postal, adresse_commune, zone_mode, connect_charges_enabled, stripe_account_id, assujetti_tva) values
  ('ac400000-0000-4000-8000-000000000001', 'ac200000-0000-4000-8000-000000000001', 'valide', '00000002600013',
   'ARTISAN X1', '5710', '4 RUE DE LA PAIX', '75002', 'PARIS', 'communes', true, 'acct_fac_x1', true),
  ('ac400000-0000-4000-8000-000000000002', 'ac200000-0000-4000-8000-000000000002', 'valide', '00000001800010',
   'ARTISAN X2', '1000', '8 RUE DU PORT', '06300', 'NICE', 'communes', true, 'acct_fac_x2', true);
insert into public.artisan_documents (artisan_id, type, storage_path, mime_type, size_bytes, date_fin, numero, assureur, couverture, status)
select a, 'decennale', a || '/decennale.pdf', 'application/pdf', 1000, current_date + 200, 'DEC-1', 'Assurances Exemple',
  'France métropolitaine', 'valide'
from unnest(array['ac400000-0000-4000-8000-000000000001', 'ac400000-0000-4000-8000-000000000002']::uuid[]) a;
insert into public.projects (id, user_id, status, description, summary, trade_code, ville_code_insee, ville_nom,
  code_postal, adresse, location, criteria_validated_at) values
  ('ac500000-0000-4000-8000-000000000001', 'ac100000-0000-4000-8000-000000000001', 'demande_envoyee',
   'Ajouter des prises.', 'Installation de prises', 'electricien', '06088', 'Nice', '06000',
   '1 Rue de l''Exemple 06000 Nice', 'SRID=4326;POINT(7.26 43.70)', now());
insert into public.requests (id, project_id, artisan_id, particulier_id, contact_phone) values
  ('ac600000-0000-4000-8000-000000000001', 'ac500000-0000-4000-8000-000000000001',
   'ac400000-0000-4000-8000-000000000001', 'ac100000-0000-4000-8000-000000000001', '+33612345678'),
  ('ac600000-0000-4000-8000-000000000002', 'ac500000-0000-4000-8000-000000000001',
   'ac400000-0000-4000-8000-000000000002', 'ac100000-0000-4000-8000-000000000001', '+33612345678');
select set_config('test.annee', extract(year from (now() at time zone 'Europe/Paris'))::int::text, true);
select set_config('test.aujourdhui', ((now() at time zone 'Europe/Paris')::date)::text, true);

-- Même répartition que packages/core (test « plusieurs taux »).
select is(app.deposit_invoice_vat(
    '[{"rateBp":1000,"baseHtCents":8333,"tvaCents":833},{"rateBp":2000,"baseHtCents":6,"tvaCents":1}]', 9173, 2751),
  '[{"rateBp":1000,"baseHtCents":2498,"tvaCents":250},{"rateBp":2000,"baseHtCents":3,"tvaCents":0}]'::jsonb,
  'TVA de la facture d''acompte : prorata du TTC, comme packages/core');

-- ---------- Devis envoyés, signés, acomptes en attente ----------
select pg_temp.connecter('ac200000-0000-4000-8000-000000000001', 'artisan');
set local role authenticated;
select set_config('test.chantier',
  public.artisan_fix_appointment('ac600000-0000-4000-8000-000000000001', current_date + 2, '10:00')::text, true);
select set_config('test.devis', public.artisan_save_quote_draft(current_setting('test.chantier')::uuid, $$[
  {"type":"materiel","designation":"Prise de courant","quantityMilli":4000,"unit":"u","unitPriceHtCents":2250,"vatRateBp":1000},
  {"type":"main_oeuvre","designation":"Pose","quantityMilli":3000,"unit":"h","unitPriceHtCents":5500,"vatRateBp":1000},
  {"type":"autre","designation":"Déplacement","quantityMilli":1000,"unit":"forfait","unitPriceHtCents":4500,"vatRateBp":1000}
]$$::jsonb)::text, true);
select set_config('test.numero', public.artisan_send_quote(current_setting('test.devis')::uuid, 30, current_date + 10, 2), true);
reset role;
select pg_temp.connecter('ac200000-0000-4000-8000-000000000002', 'artisan');
set local role authenticated;
select set_config('test.chantier2',
  public.artisan_fix_appointment('ac600000-0000-4000-8000-000000000002', current_date + 2, '14:00')::text, true);
select set_config('test.devis2', public.artisan_save_quote_draft(current_setting('test.chantier2')::uuid,
  '[{"type":"materiel","designation":"Prise","quantityMilli":1000,"unit":"u","unitPriceHtCents":1500,"vatRateBp":2000}]')::text, true);
select public.artisan_send_quote(current_setting('test.devis2')::uuid, 30, current_date + 10, 1);
reset role;
select public.transition_chantier(c, 'devis_signe')
from unnest(array[current_setting('test.chantier'), current_setting('test.chantier2')]::uuid[]) c;
update public.quotes set status = 'signe', signed_at = now(), signed_pdf_path = artisan_id || '/signe.pdf'
where id in (current_setting('test.devis')::uuid, current_setting('test.devis2')::uuid);
select pg_temp.connecter('ac100000-0000-4000-8000-000000000001', 'particulier');
set local role authenticated;
select public.particulier_start_deposit(current_setting('test.devis')::uuid);
select public.particulier_start_deposit(current_setting('test.devis2')::uuid);
select is((select count(*)::int from public.invoices), 0, 'aucune facture avant l''encaissement');
reset role;

-- ---------- Encaissement (webhook) : facture d'acompte émise ----------
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
set local role service_role;
select is(public.record_payment(current_setting('test.devis')::uuid, 'acompte', 'acct_fac_x1', 'cs_1', 'pi_1', 9900, 'paye'),
  'paye', 'acompte de X1 encaissé');
select is(public.record_payment(current_setting('test.devis')::uuid, 'acompte', 'acct_fac_x1', 'cs_1', 'pi_1', 9900, 'paye'),
  'deja_paye', 'encaissement rejoué');
select is(public.record_payment(current_setting('test.devis2')::uuid, 'acompte', 'acct_fac_x2', 'cs_2', 'pi_2', 540, 'paye'),
  'paye', 'acompte de X2 encaissé');
reset role;

select results_eq(
  $$ select numero, issued_on::text, kind::text, total_ht_cents, total_tva_cents, total_ttc_cents, vat_breakdown
     from public.invoices where quote_id = current_setting('test.devis')::uuid $$,
  $$ values (format('FAC-%s-0001', current_setting('test.annee')), current_setting('test.aujourdhui'), 'acompte'::text,
             9000::bigint, 900::bigint, 9900::bigint, '[{"rateBp":1000,"baseHtCents":9000,"tvaCents":900}]'::jsonb) $$,
  'une seule facture d''acompte : 30 % de 330 € TTC, soit 90 € HT et 9 € de TVA');
select is(
  (select jsonb_build_object(
     'paid_on', document #>> '{invoice,paid_on}',
     'devis', document #>> '{quote,numero}',
     'pourcentage', document #> '{quote,deposit_percent}',
     'emetteur', document #>> '{issuer,raison_sociale}',
     'client', document #>> '{client,last_name}')
   from public.invoices where quote_id = current_setting('test.devis')::uuid),
  jsonb_build_object('paid_on', current_setting('test.aujourdhui'), 'devis', current_setting('test.numero'),
    'pourcentage', 30, 'emetteur', 'ARTISAN X1', 'client', 'Exemple'),
  'données figées : date de paiement, devis, pourcentage, émetteur et client');
select is((select numero from public.invoices where quote_id = current_setting('test.devis2')::uuid),
  format('FAC-%s-0001', current_setting('test.annee')), 'X2 : sa propre séquence de factures');
select results_eq(
  $$ select total_ht_cents, total_tva_cents from public.invoices where quote_id = current_setting('test.devis2')::uuid $$,
  $$ values (450::bigint, 90::bigint) $$,
  'acompte à 20 % de TVA : 5,40 € TTC = 4,50 € HT + 0,90 €');

-- ---------- Droits ----------
select set_config('test.facture', (select id::text from public.invoices where quote_id = current_setting('test.devis')::uuid), true);
select pg_temp.connecter('ac100000-0000-4000-8000-000000000001', 'particulier');
set local role authenticated;
select is((select count(*)::int from public.invoices), 2, 'particulier : factures de ses chantiers');
select is(public.invoice_document(current_setting('test.facture')::uuid) #>> '{invoice,numero}',
  format('FAC-%s-0001', current_setting('test.annee')), 'particulier : données de sa facture');
select throws_ok('update public.invoices set total_ttc_cents = 1', '42501', null, 'particulier : aucune écriture');
reset role;
select pg_temp.connecter('ac200000-0000-4000-8000-000000000002', 'artisan');
set local role authenticated;
select is((select count(*)::int from public.invoices), 1, 'X2 : ses factures seulement');
select is(public.invoice_document(current_setting('test.facture')::uuid), null, 'X2 : facture d''autrui illisible');
select is((select count(*)::int from public.invoice_number_counters), 0, 'X2 : compteurs non lisibles');
select throws_ok($$ insert into public.invoices (payment_id, quote_id, chantier_id, artisan_id, kind, numero, issued_on,
    total_ht_cents, total_tva_cents, total_ttc_cents, vat_breakdown, document)
  select payment_id, quote_id, chantier_id, artisan_id, kind, 'FAC-2026-9999', issued_on, 1, 0, 1, '[]', '{}'
  from public.invoices limit 1 $$, '42501', null, 'artisan : pas de facture émise à la main');
reset role;
select pg_temp.connecter('ac300000-0000-4000-8000-000000000001', 'support');
set local role authenticated;
select is((select count(*)::int from public.invoices), 2, 'support : factures lisibles');
select is((select count(*)::int from public.invoice_number_counters), 2, 'support : compteurs lisibles');
reset role;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
set local role anon;
select throws_ok('select 1 from public.invoices', '42501', null, 'visiteur : aucun accès');
select throws_ok(format('select public.invoice_document(%L)', current_setting('test.facture')), '42501', null,
  'visiteur : données de facture inaccessibles');
reset role;

select * from finish();
rollback;
