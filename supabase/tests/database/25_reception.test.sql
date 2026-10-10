-- F-25, F-26 : PV de réception signé par le client (sans ou avec réserves), numéro par artisan,
-- données figées, procédure remplacée quand les réserves changent, transitions et notifications,
-- droits de chaque rôle (CLAUDE.md).
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

insert into auth.users (id, email, is_anonymous, email_confirmed_at, raw_app_meta_data, raw_user_meta_data) values
  ('b3100000-0000-4000-8000-000000000001', 'pv.a@example.test', false, now(), '{}', '{"first_name":"Camille","last_name":"Exemple"}'),
  ('b3100000-0000-4000-8000-000000000002', 'pv.b@example.test', false, now(), '{}', '{"first_name":"Alex","last_name":"Exemple"}'),
  ('b3200000-0000-4000-8000-000000000001', 'pv.artisan@example.test', false, now(), '{"role":"artisan"}', '{"first_name":"Xavier"}'),
  ('b3200000-0000-4000-8000-000000000002', 'pv.autre@example.test', false, now(), '{"role":"artisan"}', '{"first_name":"Yasmine"}'),
  ('b3300000-0000-4000-8000-000000000001', 'pv.support@example.test', false, now(), '{"role":"support"}', '{}');

create function pg_temp.connecter(uid uuid, app_role text) returns void language sql as $$
  select set_config('request.jwt.claims', jsonb_build_object(
    'sub', uid, 'role', 'authenticated', 'aal', 'aal1', 'app_metadata', jsonb_build_object('role', app_role)
  )::text, true);
$$;

insert into public.artisans (id, user_id, status, siret, raison_sociale, forme_juridique_code, adresse_ligne,
  adresse_code_postal, adresse_commune, zone_mode, connect_charges_enabled, stripe_account_id, assujetti_tva) values
  ('b3400000-0000-4000-8000-000000000001', 'b3200000-0000-4000-8000-000000000001', 'valide', '00000002600013',
   'ARTISAN PV', '5710', '4 RUE DE LA PAIX', '75002', 'PARIS', 'communes', true, 'acct_pv', true),
  ('b3400000-0000-4000-8000-000000000002', 'b3200000-0000-4000-8000-000000000002', 'valide', '00000001800010',
   'ARTISAN AUTRE', '1000', '8 RUE DU PORT', '06300', 'NICE', 'communes', true, 'acct_pv_autre', true);
insert into public.artisan_documents (artisan_id, type, storage_path, mime_type, size_bytes, date_fin, numero, assureur, couverture, status)
values ('b3400000-0000-4000-8000-000000000001', 'decennale', 'b3400000-0000-4000-8000-000000000001/decennale.pdf',
  'application/pdf', 1000, current_date + 200, 'DEC-1', 'Assurances Exemple', 'France métropolitaine', 'valide');
insert into public.projects (id, user_id, status, description, summary, trade_code, ville_code_insee, ville_nom,
  code_postal, adresse, location, criteria_validated_at) values
  ('b3500000-0000-4000-8000-000000000001', 'b3100000-0000-4000-8000-000000000001', 'demande_envoyee',
   'Ajouter des prises.', 'Installation de prises', 'electricien', '06088', 'Nice', '06000',
   '1 Rue de l''Exemple 06000 Nice', 'SRID=4326;POINT(7.26 43.70)', now()),
  ('b3500000-0000-4000-8000-000000000002', 'b3100000-0000-4000-8000-000000000002', 'demande_envoyee',
   'Remplacer le tableau.', 'Tableau électrique', 'electricien', '06088', 'Nice', '06000',
   '2 Rue de l''Exemple 06000 Nice', 'SRID=4326;POINT(7.26 43.70)', now());
insert into public.requests (id, project_id, artisan_id, particulier_id, contact_phone) values
  ('b3600000-0000-4000-8000-000000000001', 'b3500000-0000-4000-8000-000000000001',
   'b3400000-0000-4000-8000-000000000001', 'b3100000-0000-4000-8000-000000000001', '+33612345678'),
  ('b3600000-0000-4000-8000-000000000002', 'b3500000-0000-4000-8000-000000000002',
   'b3400000-0000-4000-8000-000000000001', 'b3100000-0000-4000-8000-000000000002', '+33612345679');
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
  perform pg_temp.connecter('b3200000-0000-4000-8000-000000000001', 'artisan');
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
  perform public.record_payment(v_devis, 'acompte', 'acct_pv', 'cs_' || p_payment, 'pi_' || p_payment, 9900, 'paye');
  perform pg_temp.connecter('b3200000-0000-4000-8000-000000000001', 'artisan');
  perform public.artisan_confirm_start(v_chantier, (now() at time zone 'Europe/Paris')::date + 5, '08:00');
  perform app.start_due_chantiers(now() + interval '8 days');
  perform pg_temp.connecter('b3200000-0000-4000-8000-000000000001', 'artisan');
  perform public.artisan_declare_finished(v_chantier);
  return v_chantier;
end;
$$;
select set_config('test.chantier_a', pg_temp.jusqu_a_la_fin('b3600000-0000-4000-8000-000000000001',
  'b3100000-0000-4000-8000-000000000001', 'a')::text, true);
select is((select status::text from public.chantiers where id = current_setting('test.chantier_a')::uuid),
  'travaux_termines', 'chantier A : travaux terminés');
select set_config('test.consentements',
  '{"document":true,"cgu_prestataire":true,"cgu_menao":true,"echeancier":true,"versions":{"cgu":"1"}}', true);

-- ---------- Ouverture de la signature du PV ----------
select pg_temp.connecter('b3100000-0000-4000-8000-000000000001', 'particulier');
set local role authenticated;
select throws_ok(format('select public.particulier_start_reception(%L, null, %L)', current_setting('test.chantier_a'),
    '{"document":true,"cgu_prestataire":true,"cgu_menao":true}'),
  '22023', 'Cochez toutes les cases pour signer le PV', 'cases obligatoires');
select throws_ok(format('select public.particulier_start_reception(%L, %L, %L)', current_setting('test.chantier_a'),
    'Court', current_setting('test.consentements')),
  '22023', 'Décrivez vos réserves en 10 à 2 000 caractères', 'réserves trop courtes');
select set_config('test.depart', public.particulier_start_reception(current_setting('test.chantier_a')::uuid, null,
  current_setting('test.consentements')::jsonb)::text, true);
select is(current_setting('test.depart')::jsonb ->> 'numero', format('PV-%s-R01', current_setting('test.annee')),
  'PV numéroté PV-AAAA-R01');
select is(current_setting('test.depart')::jsonb #>> '{signer,email}', 'pv.a@example.test', 'signataire : le client');
select results_eq(
  $$ select status::text, with_reserves, reserves is null, issued_on::text,
       document #>> '{quote,total_ttc_cents}', document ->> 'paid_cents', document #>> '{quote,deposit_percent}',
       document #>> '{client,last_name}', document #>> '{issuer,raison_sociale}', document ->> 'finished_on' is not null
     from public.receptions where chantier_id = current_setting('test.chantier_a')::uuid $$,
  $$ values ('en_signature'::text, false, true, current_setting('test.aujourdhui'), '33000'::text, '9900'::text,
             '30'::text, 'Exemple'::text, 'ARTISAN PV'::text, true) $$,
  'PV figé : sans réserves, devis de 330 €, acompte versé de 99 €, client, entreprise, fin des travaux');
select is((public.particulier_start_reception(current_setting('test.chantier_a')::uuid, null,
    current_setting('test.consentements')::jsonb) ->> 'request_id'),
  current_setting('test.depart')::jsonb ->> 'request_id', 'même PV, même procédure reprise');
reset role;

-- Le client ajoute des réserves : même numéro, nouveau document, ancienne procédure abandonnée.
select pg_temp.connecter('b3100000-0000-4000-8000-000000000001', 'particulier');
set local role authenticated;
select set_config('test.reprise', public.particulier_start_reception(current_setting('test.chantier_a')::uuid,
  '  Plinthe à repeindre dans le salon.  ', current_setting('test.consentements')::jsonb)::text, true);
reset role;
select results_eq(
  $$ select (current_setting('test.reprise')::jsonb ->> 'numero') = (current_setting('test.depart')::jsonb ->> 'numero'),
       (current_setting('test.reprise')::jsonb ->> 'request_id') <> (current_setting('test.depart')::jsonb ->> 'request_id'),
       r.with_reserves, r.reserves, r.document #>> '{reception,reserves}',
       (select status::text from public.signature_requests where id = (current_setting('test.depart')::jsonb ->> 'request_id')::uuid)
     from public.receptions r where r.chantier_id = current_setting('test.chantier_a')::uuid $$,
  $$ values (true, true, true, 'Plinthe à repeindre dans le salon.'::text, 'Plinthe à repeindre dans le salon.'::text,
             'abandonnee'::text) $$,
  'réserves ajoutées : même numéro, nouveau document, procédure précédente abandonnée');

-- ---------- Droits ----------
select set_config('test.pv_a',
  (select id::text from public.receptions where chantier_id = current_setting('test.chantier_a')::uuid), true);
select pg_temp.connecter('b3100000-0000-4000-8000-000000000002', 'particulier');
set local role authenticated;
select throws_ok(format('select public.particulier_start_reception(%L, null, %L)', current_setting('test.chantier_a'),
    current_setting('test.consentements')),
  '42501', 'Chantier introuvable', 'autre client : pas de PV sur le chantier d''autrui');
select is(public.reception_document(current_setting('test.pv_a')::uuid), null, 'autre client : PV d''autrui illisible');
select is((select count(*)::int from public.receptions), 0, 'autre client : aucun PV visible');
reset role;
select pg_temp.connecter('b3200000-0000-4000-8000-000000000001', 'artisan');
set local role authenticated;
select throws_ok(format('select public.particulier_start_reception(%L, null, %L)', current_setting('test.chantier_a'),
    current_setting('test.consentements')),
  '42501', 'Chantier introuvable', 'artisan : le PV est signé par le client');
select is(public.reception_document(current_setting('test.pv_a')::uuid) #>> '{reception,numero}',
  format('PV-%s-R01', current_setting('test.annee')), 'artisan : données du PV de son chantier');
select throws_ok($$ update public.receptions set with_reserves = false, reserves = null $$, '42501', null,
  'artisan : pas de modification directe du PV');
select throws_ok(format('select public.record_reception_signature(%L, now(), %L, null)',
    current_setting('test.reprise')::jsonb ->> 'request_id', 'x/pv.pdf'),
  '42501', null, 'artisan : enregistrement de la signature réservé au serveur');
reset role;
select pg_temp.connecter('b3200000-0000-4000-8000-000000000002', 'artisan');
set local role authenticated;
select is((select count(*)::int from public.receptions), 0, 'autre artisan : aucun PV visible');
reset role;
select pg_temp.connecter('b3300000-0000-4000-8000-000000000001', 'support');
set local role authenticated;
select is((select count(*)::int from public.receptions), 1, 'support : PV lisibles');
reset role;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
set local role anon;
select throws_ok('select 1 from public.receptions', '42501', null, 'visiteur : aucun accès');
reset role;

-- ---------- Signature (webhook) : PV avec réserves ----------
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
set local role service_role;
select is(public.record_reception_signature((current_setting('test.depart')::jsonb ->> 'request_id')::uuid, now(),
  'x/ancien.pdf', null), 'remplace', 'procédure remplacée : signature ignorée');
select is(public.record_reception_signature((current_setting('test.reprise')::jsonb ->> 'request_id')::uuid, now(),
  'b3400000-0000-4000-8000-000000000001/pv/pv-signe.pdf', 'b3400000-0000-4000-8000-000000000001/pv/preuve.pdf'),
  'signe', 'PV avec réserves signé');
select is(public.record_reception_signature((current_setting('test.reprise')::jsonb ->> 'request_id')::uuid, now(),
  'b3400000-0000-4000-8000-000000000001/pv/pv-signe.pdf', null), 'deja_signe', 'webhook rejoué : sans effet');
reset role;
select results_eq(
  $$ select c.status::text, r.status::text, r.signed_pdf_path, e.event::text, e.details ->> 'reserves'
     from public.chantiers c
     join public.receptions r on r.chantier_id = c.id
     join public.chantier_events e on e.chantier_id = c.id and e.event = 'pv_avec_reserves'
     where c.id = current_setting('test.chantier_a')::uuid $$,
  $$ values ('reserves_a_lever'::text, 'signe'::text, 'b3400000-0000-4000-8000-000000000001/pv/pv-signe.pdf'::text,
             'pv_avec_reserves'::text, 'Plinthe à repeindre dans le salon.'::text) $$,
  'PV avec réserves : réserves à lever, transition journalisée');
select results_eq(
  $$ select user_id, data - 'chantier_id' from public.notifications where type = 'reserves_emises' $$,
  $$ values ('b3200000-0000-4000-8000-000000000001'::uuid,
             format('{"titre":"Installation de prises","client":"Camille","numero":"PV-%s-R01","reserves":"Plinthe à repeindre dans le salon."}',
               current_setting('test.annee'))::jsonb) $$,
  'notification « réserves émises » à l''artisan');
select pg_temp.connecter('b3100000-0000-4000-8000-000000000001', 'particulier');
set local role authenticated;
select throws_ok(format('select public.particulier_start_reception(%L, null, %L)', current_setting('test.chantier_a'),
    current_setting('test.consentements')),
  '22023', 'La réception n''est pas possible à cette étape du chantier', 'PV signé : plus de nouvelle signature');
reset role;

-- ---------- Second chantier du même artisan : PV sans réserves, numéro suivant ----------
select set_config('test.chantier_b', pg_temp.jusqu_a_la_fin('b3600000-0000-4000-8000-000000000002',
  'b3100000-0000-4000-8000-000000000002', 'b')::text, true);
select pg_temp.connecter('b3100000-0000-4000-8000-000000000002', 'particulier');
set local role authenticated;
select set_config('test.depart_b', public.particulier_start_reception(current_setting('test.chantier_b')::uuid, '',
  current_setting('test.consentements')::jsonb)::text, true);
reset role;
select is(current_setting('test.depart_b')::jsonb ->> 'numero', format('PV-%s-R02', current_setting('test.annee')),
  'même artisan : numéro suivant');
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
set local role service_role;
select is(public.record_reception_signature((current_setting('test.depart_b')::jsonb ->> 'request_id')::uuid, now(),
  'b3400000-0000-4000-8000-000000000001/pv-b/pv-signe.pdf', null), 'signe', 'PV sans réserves signé');
reset role;
select results_eq(
  $$ select c.status::text, (select type::text from public.notifications n
       where n.type = 'pv_signe' and n.data ->> 'chantier_id' = c.id::text)
     from public.chantiers c where c.id = current_setting('test.chantier_b')::uuid $$,
  $$ values ('receptionne'::text, 'pv_signe'::text) $$,
  'PV sans réserves : chantier réceptionné, notification à l''artisan');

select * from finish();
rollback;
