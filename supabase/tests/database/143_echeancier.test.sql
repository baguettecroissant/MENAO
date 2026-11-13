-- F-146 : échéancier de paiement réglable. Tranches (arrondi, solde calculé), échéancier par
-- défaut (« Mes paiements »), devis 30 / 40 / 30 (paiement au démarrage dû quand le chantier
-- commence, relançable, facture d'acompte, déduit du solde), devis sans acompte (le chantier
-- passe aussitôt à « acompte payé », sans notification de paiement), droits de chaque rôle.
-- Données fictives (e146…).
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

insert into auth.users (id, email, is_anonymous, email_confirmed_at, raw_app_meta_data, raw_user_meta_data) values
  ('e1461000-0000-4000-8000-000000000001', 'ech.a@example.test', false, now(), '{}', '{"first_name":"Camille","last_name":"Exemple"}'),
  ('e1461000-0000-4000-8000-000000000002', 'ech.b@example.test', false, now(), '{}', '{"first_name":"Alex","last_name":"Exemple"}'),
  ('e1462000-0000-4000-8000-000000000001', 'ech.artisan@example.test', false, now(), '{"role":"artisan"}', '{"first_name":"Xavier"}');

create function pg_temp.connecter(uid uuid, app_role text) returns void language sql as $$
  select set_config('request.jwt.claims', jsonb_build_object(
    'sub', uid, 'role', 'authenticated', 'aal', 'aal1', 'app_metadata', jsonb_build_object('role', app_role)
  )::text, true);
$$;

insert into public.artisans (id, user_id, status, siret, raison_sociale, forme_juridique_code, adresse_ligne,
  adresse_code_postal, adresse_commune, zone_mode, connect_charges_enabled, stripe_account_id, assujetti_tva) values
  ('e1464000-0000-4000-8000-000000000001', 'e1462000-0000-4000-8000-000000000001', 'valide', '00000002600013',
   'ARTISAN ECHEANCIER', '5710', '4 RUE DE LA PAIX', '75002', 'PARIS', 'communes', true, 'acct_ech', true);
insert into public.artisan_documents (artisan_id, type, storage_path, mime_type, size_bytes, date_fin, numero, assureur, couverture, status)
values ('e1464000-0000-4000-8000-000000000001', 'decennale', 'e1464000-0000-4000-8000-000000000001/decennale.pdf',
  'application/pdf', 1000, current_date + 200, 'DEC-1', 'Assurances Exemple', 'France métropolitaine', 'valide');
insert into public.projects (id, user_id, status, description, summary, trade_code, ville_code_insee, ville_nom,
  code_postal, adresse, location, criteria_validated_at) values
  ('e1465000-0000-4000-8000-000000000001', 'e1461000-0000-4000-8000-000000000001', 'demande_envoyee',
   'Ajouter des prises.', 'Installation de prises', 'electricien', '06088', 'Nice', '06000',
   '1 Rue de l''Exemple 06000 Nice', 'SRID=4326;POINT(7.26 43.70)', now()),
  ('e1465000-0000-4000-8000-000000000002', 'e1461000-0000-4000-8000-000000000002', 'demande_envoyee',
   'Remplacer une prise.', 'Petite réparation', 'electricien', '06088', 'Nice', '06000',
   '2 Rue de l''Exemple 06000 Nice', 'SRID=4326;POINT(7.26 43.70)', now());
insert into public.requests (id, project_id, artisan_id, particulier_id, contact_phone) values
  ('e1466000-0000-4000-8000-000000000001', 'e1465000-0000-4000-8000-000000000001',
   'e1464000-0000-4000-8000-000000000001', 'e1461000-0000-4000-8000-000000000001', '+33612345678'),
  ('e1466000-0000-4000-8000-000000000002', 'e1465000-0000-4000-8000-000000000002',
   'e1464000-0000-4000-8000-000000000001', 'e1461000-0000-4000-8000-000000000002', '+33612345679');
select set_config('test.cases', '{"document":true,"cgu_prestataire":true,"cgu_menao":true,"echeancier":true}', true);

-- Devis de 330 € TTC (TVA 10 %) envoyé avec l'échéancier donné, puis signé par le client.
create function pg_temp.devis_signe(p_request uuid, p_client uuid, p_deposit int, p_start int, p_save boolean)
returns uuid
language plpgsql as $$
declare
  v_chantier uuid;
  v_devis uuid;
  v_debut jsonb;
begin
  perform pg_temp.connecter('e1462000-0000-4000-8000-000000000001', 'artisan');
  v_chantier := public.artisan_fix_appointment(p_request, current_date + 2, '10:00');
  v_devis := public.artisan_save_quote_draft(v_chantier, $j$[
    {"type":"materiel","designation":"Prise de courant","quantityMilli":4000,"unit":"u","unitPriceHtCents":2250,"vatRateBp":1000},
    {"type":"main_oeuvre","designation":"Pose","quantityMilli":3000,"unit":"h","unitPriceHtCents":5500,"vatRateBp":1000},
    {"type":"autre","designation":"Déplacement","quantityMilli":1000,"unit":"forfait","unitPriceHtCents":4500,"vatRateBp":1000}
  ]$j$::jsonb);
  perform public.artisan_send_quote(v_devis, p_deposit, current_date + 10, 2, p_save, p_start);
  perform pg_temp.connecter(p_client, 'particulier');
  v_debut := public.particulier_start_signature(v_devis, current_setting('test.cases')::jsonb);
  perform public.record_quote_signature((v_debut ->> 'request_id')::uuid, now(), 'e1464000/signe.pdf', 'e1464000/preuve.pdf');
  return v_chantier;
end;
$$;

-- ---------- Tranches : arrondi à l'inférieur, le solde calcule le reste ----------
select is(app.build_payment_schedule(33000, 30, 40),
  '[{"percent":30,"trigger":"signature","amount_cents":9900},{"percent":40,"trigger":"demarrage","amount_cents":13200},
    {"percent":30,"trigger":"reception","amount_cents":9900}]'::jsonb, '30 / 40 / 30');
select is(app.build_payment_schedule(33000, 0, 0),
  '[{"percent":100,"trigger":"reception","amount_cents":33000}]'::jsonb, 'sans acompte : tout à la réception');
select is(app.build_payment_schedule(1001, 33, 33),
  '[{"percent":33,"trigger":"signature","amount_cents":330},{"percent":33,"trigger":"demarrage","amount_cents":330},
    {"percent":34,"trigger":"reception","amount_cents":341}]'::jsonb, 'arrondis : le solde garde les centimes');

-- ---------- « Mes paiements » : échéancier par défaut ----------
select pg_temp.connecter('e1462000-0000-4000-8000-000000000001', 'artisan');
set local role authenticated;
select throws_ok('select public.set_payment_defaults(50, 50)', '22023',
  'Il doit rester au moins 1 % à payer à la réception', 'défaut sans solde refusé');
select throws_ok('select public.set_payment_defaults(-1, 0)', '22023',
  'L''acompte doit être compris entre 0 et 99 %', 'acompte négatif refusé');
select lives_ok('select public.set_payment_defaults(30, 40)', 'échéancier par défaut enregistré');
select results_eq($$ select default_deposit_percent::int, default_start_percent::int from public.artisans
     where id = 'e1464000-0000-4000-8000-000000000001' $$,
  $$ values (30, 40) $$, 'défaut : 30 % à la signature, 40 % au démarrage');
reset role;
select pg_temp.connecter('e1461000-0000-4000-8000-000000000001', 'particulier');
set local role authenticated;
select throws_ok('select public.set_payment_defaults(30, 0)', '42501', null, 'client : pas d''échéancier d''artisan');
reset role;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
set local role anon;
select throws_ok('select public.set_payment_defaults(30, 0)', '42501', null, 'visiteur : aucun accès');
reset role;

-- ---------- Devis 30 / 40 / 30 ----------
select set_config('test.chantier_a', pg_temp.devis_signe('e1466000-0000-4000-8000-000000000001',
  'e1461000-0000-4000-8000-000000000001', 30, 40, false)::text, true);
select set_config('test.devis_a', (select id::text from public.quotes where chantier_id = current_setting('test.chantier_a')::uuid), true);
select is((select payment_schedule from public.quotes where id = current_setting('test.devis_a')::uuid),
  app.build_payment_schedule(33000, 30, 40), 'devis : échéancier en trois tranches figé');
select is((select document #> '{terms,schedule}' from public.quotes where id = current_setting('test.devis_a')::uuid),
  app.build_payment_schedule(33000, 30, 40), 'document du devis : échéancier en trois tranches');
select is((select status::text from public.chantiers where id = current_setting('test.chantier_a')::uuid),
  'devis_signe', 'avec acompte : le chantier attend l''acompte');
select pg_temp.connecter('e1461000-0000-4000-8000-000000000001', 'particulier');
select public.particulier_start_deposit(current_setting('test.devis_a')::uuid);
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
select is(public.record_payment(current_setting('test.devis_a')::uuid, 'acompte', 'acct_ech', 'cs_a', 'pi_a', 9900, 'paye'),
  'paye', 'acompte de 30 % encaissé');
select pg_temp.connecter('e1461000-0000-4000-8000-000000000001', 'particulier');
set local role authenticated;
select throws_ok(format('select public.particulier_start_demarrage(%L)', current_setting('test.chantier_a')), '22023',
  'Le paiement au démarrage se règle une fois les travaux commencés, avant la réception', 'avant le démarrage : rien à payer');
reset role;

-- Démarrage : le client est prévenu, le paiement apparaît dans « À encaisser ».
select pg_temp.connecter('e1462000-0000-4000-8000-000000000001', 'artisan');
select public.artisan_confirm_start(current_setting('test.chantier_a')::uuid, (now() at time zone 'Europe/Paris')::date + 5, '08:00');
select app.start_due_chantiers(now() + interval '8 days');
select is((select status::text from public.chantiers where id = current_setting('test.chantier_a')::uuid),
  'en_cours', 'chantier commencé');
select results_eq(
  $$ select user_id, (data ->> 'montant')::bigint from public.notifications where type = 'demarrage_du'
     and data ->> 'chantier_id' = current_setting('test.chantier_a') $$,
  $$ values ('e1461000-0000-4000-8000-000000000001'::uuid, 13200::bigint) $$,
  'client prévenu : 132 € à payer au démarrage');
select results_eq(
  $$ select x ->> 'tranche', (x ->> 'montant_cents')::bigint, x ->> 'depuis' is not null
     from jsonb_array_elements(app.money_open_items('e1464000-0000-4000-8000-000000000001')) x $$,
  $$ values ('demarrage'::text, 13200::bigint, true) $$,
  'À encaisser : paiement au démarrage dû');

select pg_temp.connecter('e1462000-0000-4000-8000-000000000001', 'artisan');
set local role authenticated;
select throws_ok(format('select public.particulier_start_demarrage(%L)', current_setting('test.chantier_a')), '42501',
  'Chantier introuvable', 'artisan : le paiement est fait par le client');
reset role;
select ok(app.remind_payment('e1464000-0000-4000-8000-000000000001', current_setting('test.chantier_a')::uuid,
  'demarrage', 'manuel', null, now()), 'paiement au démarrage relançable');
select is((select data ->> 'tranche' from public.notifications where type = 'paiement_relance'
    and data ->> 'chantier_id' = current_setting('test.chantier_a')), 'demarrage',
  'relance envoyée au client pour le paiement au démarrage');
select pg_temp.connecter('e1461000-0000-4000-8000-000000000002', 'particulier');
set local role authenticated;
select throws_ok(format('select public.particulier_start_demarrage(%L)', current_setting('test.chantier_a')), '42501',
  'Chantier introuvable', 'autre client : pas de paiement sur le chantier d''autrui');
reset role;
select pg_temp.connecter('e1461000-0000-4000-8000-000000000001', 'particulier');
set local role authenticated;
select set_config('test.demarrage', public.particulier_start_demarrage(current_setting('test.chantier_a')::uuid)::text, true);
select is((current_setting('test.demarrage')::jsonb ->> 'amount_cents')::bigint, 13200::bigint, 'paiement au démarrage : 132 €');
select results_eq(
  $$ select start_payment_cents, start_payment_status::text, deposit_status::text
     from public.particulier_chantiers(current_setting('test.chantier_a')::uuid) $$,
  $$ values (13200::bigint, 'en_attente'::text, 'paye'::text) $$,
  'Mes chantiers : paiement au démarrage en attente, acompte payé');
reset role;

select set_config('request.jwt.claims', '{"role":"service_role"}', true);
set local role service_role;
select is(public.record_payment(current_setting('test.devis_a')::uuid, 'demarrage', 'acct_ech', 'cs_d', 'pi_d', 13200, 'paye'),
  'paye', 'paiement au démarrage encaissé');
reset role;
select is((select status::text from public.chantiers where id = current_setting('test.chantier_a')::uuid),
  'en_cours', 'le paiement au démarrage ne change pas l''état du chantier');
select results_eq(
  $$ select kind::text, total_ht_cents, total_tva_cents, total_ttc_cents, (document #>> '{quote,tranche_percent}')::int
     from public.invoices where chantier_id = current_setting('test.chantier_a')::uuid and kind = 'demarrage' $$,
  $$ values ('demarrage'::text, 12000::bigint, 1200::bigint, 13200::bigint, 40) $$,
  'facture d''acompte du démarrage : 120 € HT, 12 € de TVA, 40 % du devis');
select results_eq(
  $$ select user_id, data ->> 'destinataire', (data ->> 'montant')::bigint from public.notifications
     where type = 'demarrage_paye' and data ->> 'chantier_id' = current_setting('test.chantier_a') order by data ->> 'destinataire' $$,
  $$ values ('e1462000-0000-4000-8000-000000000001'::uuid, 'artisan'::text, 13200::bigint),
            ('e1461000-0000-4000-8000-000000000001'::uuid, 'client'::text, 13200::bigint) $$,
  'notifications « paiement au démarrage reçu » à l''artisan et au client');
select is(jsonb_array_length(app.money_open_items('e1464000-0000-4000-8000-000000000001')), 0,
  'À encaisser : plus rien de dû');

-- Réception puis solde : 330 € − 99 € − 132 € = 99 €, les deux acomptes déduits.
select pg_temp.connecter('e1462000-0000-4000-8000-000000000001', 'artisan');
select public.artisan_declare_finished(current_setting('test.chantier_a')::uuid);
select pg_temp.connecter('e1461000-0000-4000-8000-000000000001', 'particulier');
select set_config('test.pv', public.particulier_start_reception(current_setting('test.chantier_a')::uuid,
  null, current_setting('test.cases')::jsonb)::text, true);
select public.record_reception_signature((current_setting('test.pv')::jsonb ->> 'request_id')::uuid, now(),
  'e1464000-0000-4000-8000-000000000001/pv/pv-signe.pdf', null);
select pg_temp.connecter('e1461000-0000-4000-8000-000000000001', 'particulier');
set local role authenticated;
select is((public.particulier_start_balance(current_setting('test.chantier_a')::uuid) ->> 'amount_cents')::bigint,
  9900::bigint, 'solde = 330 € − 99 € − 132 €');
reset role;
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
set local role service_role;
select is(public.record_payment(current_setting('test.devis_a')::uuid, 'solde', 'acct_ech', 'cs_s', 'pi_s', 9900, 'paye'),
  'paye', 'solde encaissé');
reset role;
select results_eq(
  $$ select total_ht_cents, total_tva_cents, jsonb_array_length(document -> 'deposits'),
       (select string_agg(d ->> 'kind', ',' order by d ->> 'kind') from jsonb_array_elements(document -> 'deposits') d)
     from public.invoices where chantier_id = current_setting('test.chantier_a')::uuid and kind = 'solde' $$,
  $$ values (9000::bigint, 900::bigint, 2, 'acompte,demarrage'::text) $$,
  'facture de solde : 90 € HT, 9 € de TVA, acompte et démarrage déduits');
select is((select status::text from public.chantiers where id = current_setting('test.chantier_a')::uuid),
  'cloture', 'chantier clôturé');

-- ---------- Devis sans acompte (et enregistré comme défaut) ----------
select set_config('test.chantier_b', pg_temp.devis_signe('e1466000-0000-4000-8000-000000000002',
  'e1461000-0000-4000-8000-000000000002', 0, 0, true)::text, true);
select results_eq($$ select default_deposit_percent::int, default_start_percent::int from public.artisans
     where id = 'e1464000-0000-4000-8000-000000000001' $$,
  $$ values (0, 0) $$, 'défaut remplacé depuis l''envoi : sans acompte');
select is((select payment_schedule from public.quotes where chantier_id = current_setting('test.chantier_b')::uuid),
  '[{"percent":100,"trigger":"reception","amount_cents":33000}]'::jsonb, 'devis sans acompte : 100 % à la réception');
select results_eq(
  $$ select e.event::text, coalesce((e.details ->> 'sans_acompte')::boolean, false) from public.chantier_events e
     where e.chantier_id = current_setting('test.chantier_b')::uuid and e.event in ('devis_signe', 'acompte_paye')
     order by e.created_at, e.event $$,
  $$ values ('devis_signe'::text, true), ('acompte_paye'::text, true) $$,
  'signature puis « acompte payé » journalisés, sans acompte');
select is((select status::text from public.chantiers where id = current_setting('test.chantier_b')::uuid),
  'acompte_paye', 'sans acompte : la date se fixe dès la signature');
select is((select count(*)::int from public.notifications where type = 'acompte_paye'
    and data ->> 'chantier_id' = current_setting('test.chantier_b')), 0,
  'sans acompte : aucune notification de paiement');
select is((select (data ->> 'sans_acompte')::boolean from public.notifications where type = 'devis_signe'
    and data ->> 'chantier_id' = current_setting('test.chantier_b')), true,
  'artisan prévenu : devis signé sans acompte');
select is(jsonb_array_length(app.money_open_items('e1464000-0000-4000-8000-000000000001')), 0,
  'À encaisser : aucun acompte à réclamer');
select pg_temp.connecter('e1461000-0000-4000-8000-000000000002', 'particulier');
set local role authenticated;
select throws_ok(format('select public.particulier_start_deposit(%L)',
    (select id from public.quotes where chantier_id = current_setting('test.chantier_b')::uuid)),
  '22023', null, 'sans acompte : rien à payer à la signature');
reset role;

select * from finish();
rollback;
