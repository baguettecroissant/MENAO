-- F-32, F-35 : paiement du solde une fois le chantier réceptionné (montant calculé), facture de
-- solde (lignes du devis, acompte déduit, TVA du devis moins celle de l'acompte), clôture,
-- notifications, droits de chaque rôle (CLAUDE.md).
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

insert into auth.users (id, email, is_anonymous, email_confirmed_at, raw_app_meta_data, raw_user_meta_data) values
  ('d3100000-0000-4000-8000-000000000001', 'solde.a@example.test', false, now(), '{}', '{"first_name":"Camille","last_name":"Exemple"}'),
  ('d3100000-0000-4000-8000-000000000002', 'solde.b@example.test', false, now(), '{}', '{"first_name":"Alex","last_name":"Exemple"}'),
  ('d3200000-0000-4000-8000-000000000001', 'solde.artisan@example.test', false, now(), '{"role":"artisan"}', '{"first_name":"Xavier"}'),
  ('d3200000-0000-4000-8000-000000000002', 'solde.autre@example.test', false, now(), '{"role":"artisan"}', '{"first_name":"Yasmine"}'),
  ('d3300000-0000-4000-8000-000000000001', 'solde.support@example.test', false, now(), '{"role":"support"}', '{}');

create function pg_temp.connecter(uid uuid, app_role text) returns void language sql as $$
  select set_config('request.jwt.claims', jsonb_build_object(
    'sub', uid, 'role', 'authenticated', 'aal', 'aal1', 'app_metadata', jsonb_build_object('role', app_role)
  )::text, true);
$$;

insert into public.artisans (id, user_id, status, siret, raison_sociale, forme_juridique_code, adresse_ligne,
  adresse_code_postal, adresse_commune, zone_mode, connect_charges_enabled, stripe_account_id, assujetti_tva) values
  ('d3400000-0000-4000-8000-000000000001', 'd3200000-0000-4000-8000-000000000001', 'valide', '00000002600013',
   'ARTISAN PV', '5710', '4 RUE DE LA PAIX', '75002', 'PARIS', 'communes', true, 'acct_solde', true),
  ('d3400000-0000-4000-8000-000000000002', 'd3200000-0000-4000-8000-000000000002', 'valide', '00000001800010',
   'ARTISAN AUTRE', '1000', '8 RUE DU PORT', '06300', 'NICE', 'communes', true, 'acct_solde_autre', true);
insert into public.artisan_documents (artisan_id, type, storage_path, mime_type, size_bytes, date_fin, numero, assureur, couverture, status)
values ('d3400000-0000-4000-8000-000000000001', 'decennale', 'd3400000-0000-4000-8000-000000000001/decennale.pdf',
  'application/pdf', 1000, current_date + 200, 'DEC-1', 'Assurances Exemple', 'France métropolitaine', 'valide');
insert into public.projects (id, user_id, status, description, summary, trade_code, ville_code_insee, ville_nom,
  code_postal, adresse, location, criteria_validated_at) values
  ('d3500000-0000-4000-8000-000000000001', 'd3100000-0000-4000-8000-000000000001', 'demande_envoyee',
   'Ajouter des prises.', 'Installation de prises', 'electricien', '06088', 'Nice', '06000',
   '1 Rue de l''Exemple 06000 Nice', 'SRID=4326;POINT(7.26 43.70)', now()),
  ('d3500000-0000-4000-8000-000000000002', 'd3100000-0000-4000-8000-000000000002', 'demande_envoyee',
   'Remplacer le tableau.', 'Tableau électrique', 'electricien', '06088', 'Nice', '06000',
   '2 Rue de l''Exemple 06000 Nice', 'SRID=4326;POINT(7.26 43.70)', now());
insert into public.requests (id, project_id, artisan_id, particulier_id, contact_phone) values
  ('d3600000-0000-4000-8000-000000000001', 'd3500000-0000-4000-8000-000000000001',
   'd3400000-0000-4000-8000-000000000001', 'd3100000-0000-4000-8000-000000000001', '+33612345678'),
  ('d3600000-0000-4000-8000-000000000002', 'd3500000-0000-4000-8000-000000000002',
   'd3400000-0000-4000-8000-000000000001', 'd3100000-0000-4000-8000-000000000002', '+33612345679');
select set_config('test.annee', extract(year from (now() at time zone 'Europe/Paris'))::int::text, true);
select set_config('test.aujourdhui', ((now() at time zone 'Europe/Paris')::date)::text, true);

-- Parcours jusqu'à la fin des travaux : rendez-vous, devis de 330 € TTC envoyé et signé, acompte
-- de 30 % payé, date de démarrage, démarrage, fin déclarée (appel en propriétaire de la base).
create function pg_temp.jusqu_a_la_fin(p_request uuid, p_client uuid, p_payment text) returns uuid
language plpgsql as $$
declare
  v_chantier uuid;
  v_devis uuid;
begin
  perform pg_temp.connecter('d3200000-0000-4000-8000-000000000001', 'artisan');
  v_chantier := public.artisan_fix_appointment(p_request, current_date + 2, '10:00');
  v_devis := public.artisan_save_quote_draft(v_chantier, $j$[
    {"type":"materiel","designation":"Prise de courant","quantityMilli":4000,"unit":"u","unitPriceHtCents":2250,"vatRateBp":1000},
    {"type":"main_oeuvre","designation":"Pose","quantityMilli":3000,"unit":"h","unitPriceHtCents":5500,"vatRateBp":1000},
    {"type":"autre","designation":"Déplacement","quantityMilli":1000,"unit":"forfait","unitPriceHtCents":4500,"vatRateBp":1000}
  ]$j$::jsonb);
  perform public.artisan_send_quote(v_devis, 30, current_date + 10, 2);
  perform public.transition_chantier(v_chantier, 'devis_signe');
  update public.quotes set status = 'signe', signed_at = now(), signed_pdf_path = artisan_id || '/signe.pdf'
  where id = v_devis;
  perform pg_temp.connecter(p_client, 'particulier');
  perform public.particulier_start_deposit(v_devis);
  perform public.record_payment(v_devis, 'acompte', 'acct_solde', 'cs_' || p_payment, 'pi_' || p_payment, 9900, 'paye');
  perform pg_temp.connecter('d3200000-0000-4000-8000-000000000001', 'artisan');
  perform public.artisan_confirm_start(v_chantier, (now() at time zone 'Europe/Paris')::date + 5, '08:00');
  perform app.start_due_chantiers(now() + interval '8 days');
  perform pg_temp.connecter('d3200000-0000-4000-8000-000000000001', 'artisan');
  perform public.artisan_declare_finished(v_chantier);
  return v_chantier;
end;
$$;
select set_config('test.consentements',
  '{"document":true,"cgu_prestataire":true,"cgu_menao":true,"echeancier":true}', true);
select set_config('test.chantier_a', pg_temp.jusqu_a_la_fin('d3600000-0000-4000-8000-000000000001',
  'd3100000-0000-4000-8000-000000000001', 'a')::text, true);
select set_config('test.chantier_b', pg_temp.jusqu_a_la_fin('d3600000-0000-4000-8000-000000000002',
  'd3100000-0000-4000-8000-000000000002', 'b')::text, true);
-- Chantier A réceptionné (PV sans réserves) ; chantier B : travaux terminés, sans PV.
select pg_temp.connecter('d3100000-0000-4000-8000-000000000001', 'particulier');
select set_config('test.pv', public.particulier_start_reception(current_setting('test.chantier_a')::uuid,
  null, current_setting('test.consentements')::jsonb)::text, true);
select public.record_reception_signature((current_setting('test.pv')::jsonb ->> 'request_id')::uuid, now(),
  'd3400000-0000-4000-8000-000000000001/pv/pv-signe.pdf', null);
select is((select status::text from public.chantiers where id = current_setting('test.chantier_a')::uuid),
  'receptionne', 'chantier A réceptionné');

-- ---------- « Payer le solde » ----------
select pg_temp.connecter('d3100000-0000-4000-8000-000000000002', 'particulier');
set local role authenticated;
select throws_ok(format('select public.particulier_start_balance(%L)', current_setting('test.chantier_a')),
  '42501', 'Chantier introuvable', 'autre client : pas de solde sur le chantier d''autrui');
select throws_ok(format('select public.particulier_start_balance(%L)', current_setting('test.chantier_b')),
  '22023', 'Le solde se paie une fois la réception des travaux validée', 'chantier non réceptionné : pas de solde');
select throws_ok('select app.quote_balance(gen_random_uuid())', '42501', null, 'client : calcul réservé à la base');
reset role;
select pg_temp.connecter('d3200000-0000-4000-8000-000000000001', 'artisan');
set local role authenticated;
select throws_ok(format('select public.particulier_start_balance(%L)', current_setting('test.chantier_a')),
  '42501', 'Chantier introuvable', 'artisan : le solde est payé par le client');
reset role;
select pg_temp.connecter('d3100000-0000-4000-8000-000000000001', 'particulier');
set local role authenticated;
select set_config('test.solde', public.particulier_start_balance(current_setting('test.chantier_a')::uuid)::text, true);
select is((current_setting('test.solde')::jsonb ->> 'amount_cents')::bigint, 23100::bigint,
  'solde = 330 € − 99 € d''acompte = 231 €');
select is(public.particulier_start_balance(current_setting('test.chantier_a')::uuid) ->> 'payment_id',
  current_setting('test.solde')::jsonb ->> 'payment_id', 'même paiement repris');
select results_eq(
  $$ select balance_cents, balance_status::text from public.particulier_chantiers(current_setting('test.chantier_a')::uuid) $$,
  $$ values (23100::bigint, 'en_attente'::text) $$,
  'Mes chantiers : solde à payer, paiement en attente');
reset role;

-- ---------- Encaissement (webhook) : facture de solde, clôture ----------
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
set local role service_role;
select is(public.record_payment((current_setting('test.solde')::jsonb ->> 'quote_id')::uuid, 'solde', 'acct_solde', 'cs_s', 'pi_s', 23000, 'paye'),
  'incoherent', 'montant différent : refusé');
select is(public.record_payment((current_setting('test.solde')::jsonb ->> 'quote_id')::uuid, 'solde', 'acct_solde', 'cs_s', 'pi_s', 23100, 'paye'),
  'paye', 'solde encaissé');
select is(public.record_payment((current_setting('test.solde')::jsonb ->> 'quote_id')::uuid, 'solde', 'acct_solde', 'cs_s', 'pi_s', 23100, 'paye'),
  'deja_paye', 'encaissement rejoué');
select is(public.record_payment((select id from public.quotes where chantier_id = current_setting('test.chantier_b')::uuid),
  'solde', 'acct_solde', 'cs_x', 'pi_x', 23100, 'paye'), 'inconnu', 'aucun solde demandé : inconnu');
reset role;
select results_eq(
  $$ select numero, kind::text, total_ht_cents, total_tva_cents, total_ttc_cents, vat_breakdown
     from public.invoices where chantier_id = current_setting('test.chantier_a')::uuid and kind = 'solde' $$,
  $$ values (format('FAC-%s-0003', current_setting('test.annee')), 'solde'::text, 21000::bigint, 2100::bigint, 23100::bigint,
             '[{"rateBp":1000,"baseHtCents":21000,"tvaCents":2100}]'::jsonb) $$,
  'facture de solde : 300 € HT − 90 € d''acompte, TVA 30 € − 9 €, numéro suivant de l''artisan');
select results_eq(
  $$ select jsonb_array_length(document -> 'lines'), document #>> '{quote_totals,total_ttc_cents}',
       document #>> '{deposits,0,numero}', document #>> '{deposits,0,total_ttc_cents}', document #>> '{invoice,kind}'
     from public.invoices where chantier_id = current_setting('test.chantier_a')::uuid and kind = 'solde' $$,
  $$ values (3, '33000'::text, format('FAC-%s-0001', current_setting('test.annee')), '9900'::text, 'solde'::text) $$,
  'données figées : lignes du devis, total des travaux, acompte déduit');
select results_eq(
  $$ select c.status::text, e.from_status::text, (e.details ->> 'montant')::bigint
     from public.chantiers c
     join public.chantier_events e on e.chantier_id = c.id and e.event = 'solde_paye'
     where c.id = current_setting('test.chantier_a')::uuid $$,
  $$ values ('cloture'::text, 'receptionne'::text, 23100::bigint) $$,
  'solde payé : chantier clôturé, transition journalisée');
select results_eq(
  $$ select user_id, data ->> 'destinataire', (data ->> 'montant')::bigint from public.notifications
     where type = 'solde_paye' order by data ->> 'destinataire' $$,
  $$ values ('d3200000-0000-4000-8000-000000000001'::uuid, 'artisan'::text, 23100::bigint),
            ('d3100000-0000-4000-8000-000000000001'::uuid, 'client'::text, 23100::bigint) $$,
  'notifications « solde payé » à l''artisan et au client');
select pg_temp.connecter('d3100000-0000-4000-8000-000000000001', 'particulier');
set local role authenticated;
select throws_ok(format('select public.particulier_start_balance(%L)', current_setting('test.chantier_a')),
  '22023', 'Le solde se paie une fois la réception des travaux validée', 'chantier clôturé : plus de solde');
select results_eq(
  $$ select status::text, closed_at is not null, balance_cents, balance_status::text
     from public.particulier_chantiers(current_setting('test.chantier_a')::uuid) $$,
  $$ values ('cloture'::text, true, 0::bigint, 'paye'::text) $$,
  'Mes chantiers : chantier clôturé, solde payé');
select is((select count(*)::int from public.invoices where chantier_id = current_setting('test.chantier_a')::uuid), 2,
  'client : facture d''acompte et facture de solde');
reset role;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
set local role anon;
select throws_ok(format('select public.particulier_start_balance(%L)', current_setting('test.chantier_a')),
  '42501', null, 'visiteur : aucune action');
reset role;

select * from finish();
rollback;
