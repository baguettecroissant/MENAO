-- F-12 : « Mes chantiers » du client (liste et détail, prochaine intervention, devis, acompte),
-- fichier agenda du démarrage, nouveautés du journal regroupées et envoyées en différé, droits de
-- chaque rôle (CLAUDE.md).
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

insert into auth.users (id, email, is_anonymous, email_confirmed_at, raw_app_meta_data, raw_user_meta_data) values
  ('b2100000-0000-4000-8000-000000000001', 'mc.client@example.test', false, now(), '{}', '{"first_name":"Camille","last_name":"Exemple"}'),
  ('b2100000-0000-4000-8000-000000000002', 'mc.autre@example.test', false, now(), '{}', '{"first_name":"Alex"}'),
  ('b2200000-0000-4000-8000-000000000001', 'mc.artisan@example.test', false, now(), '{"role":"artisan"}', '{"first_name":"Xavier","phone":"+33600000001"}');

create function pg_temp.connecter(uid uuid, app_role text) returns void language sql as $$
  select set_config('request.jwt.claims', jsonb_build_object(
    'sub', uid, 'role', 'authenticated', 'aal', 'aal1', 'app_metadata', jsonb_build_object('role', app_role)
  )::text, true);
$$;

insert into public.artisans (id, user_id, status, siret, raison_sociale, forme_juridique_code, adresse_ligne,
  adresse_code_postal, adresse_commune, zone_mode, connect_charges_enabled, stripe_account_id, assujetti_tva) values
  ('b2400000-0000-4000-8000-000000000001', 'b2200000-0000-4000-8000-000000000001', 'valide', '00000002600013',
   'ARTISAN MC', '5710', '4 RUE DE LA PAIX', '75002', 'PARIS', 'communes', true, 'acct_mc', true);
insert into public.artisan_documents (artisan_id, type, storage_path, mime_type, size_bytes, date_fin, numero, assureur, couverture, status)
values ('b2400000-0000-4000-8000-000000000001', 'decennale', 'b2400000-0000-4000-8000-000000000001/decennale.pdf',
  'application/pdf', 1000, current_date + 200, 'DEC-1', 'Assurances Exemple', 'France métropolitaine', 'valide');
insert into public.projects (id, user_id, status, description, summary, trade_code, ville_code_insee, ville_nom,
  code_postal, adresse, location, criteria_validated_at) values
  ('b2500000-0000-4000-8000-000000000001', 'b2100000-0000-4000-8000-000000000001', 'demande_envoyee',
   'Ajouter quatre prises dans la cuisine.', 'Installation de prises', 'electricien', '06088', 'Nice', '06000',
   '1 Rue de l''Exemple 06000 Nice', 'SRID=4326;POINT(7.26 43.70)', now());
insert into public.project_photos (project_id, storage_path, sort_order) values
  ('b2500000-0000-4000-8000-000000000001', 'b2500000-0000-4000-8000-000000000001/cuisine.jpg', 0);
insert into public.requests (id, project_id, artisan_id, particulier_id, contact_phone) values
  ('b2600000-0000-4000-8000-000000000001', 'b2500000-0000-4000-8000-000000000001',
   'b2400000-0000-4000-8000-000000000001', 'b2100000-0000-4000-8000-000000000001', '+33612345678');
select set_config('test.aujourdhui', ((now() at time zone 'Europe/Paris')::date)::text, true);

-- ---------- Rendez-vous fixé : chantier au stade de la signature ----------
select pg_temp.connecter('b2200000-0000-4000-8000-000000000001', 'artisan');
set local role authenticated;
select set_config('test.chantier',
  public.artisan_fix_appointment('b2600000-0000-4000-8000-000000000001', current_date + 2, '10:00')::text, true);
reset role;
select pg_temp.connecter('b2100000-0000-4000-8000-000000000001', 'particulier');
set local role authenticated;
select results_eq(
  $$ select status::text, title, description, photo_path, artisan_name, artisan_phone, trade_label,
       appointment_at is not null, quote_id is null
     from public.particulier_chantiers() $$,
  $$ values ('rdv_planifie'::text, 'Installation de prises'::text, 'Ajouter quatre prises dans la cuisine.'::text,
             'b2500000-0000-4000-8000-000000000001/cuisine.jpg'::text, 'Xavier'::text, '+33600000001'::text,
             'Électricien'::text, true, true) $$,
  'particulier : son chantier, l''artisan (coordonnées après acceptation) et le rendez-vous');
select results_eq(
  $$ select kind, starts_at = (select appointment_at from public.particulier_chantiers())
     from public.chantier_appointment(current_setting('test.chantier')::uuid) $$,
  $$ values ('rendez_vous'::text, true) $$,
  'agenda : rendez-vous à venir');
reset role;

-- Autres comptes : rien.
select pg_temp.connecter('b2100000-0000-4000-8000-000000000002', 'particulier');
set local role authenticated;
select is((select count(*)::int from public.particulier_chantiers()), 0, 'autre particulier : aucun chantier');
select is((select count(*)::int from public.particulier_chantiers(current_setting('test.chantier')::uuid)), 0,
  'autre particulier : chantier d''autrui invisible');
reset role;
select pg_temp.connecter('b2200000-0000-4000-8000-000000000001', 'artisan');
set local role authenticated;
select is((select count(*)::int from public.particulier_chantiers()), 0, 'artisan : liste réservée aux clients');
reset role;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
set local role anon;
select throws_ok('select * from public.particulier_chantiers()', '42501', null, 'visiteur : aucun accès');
reset role;

-- ---------- Devis envoyé, signé, acompte payé ----------
select pg_temp.connecter('b2200000-0000-4000-8000-000000000001', 'artisan');
set local role authenticated;
select set_config('test.devis', public.artisan_save_quote_draft(current_setting('test.chantier')::uuid, $$[
  {"type":"materiel","designation":"Prise de courant","quantityMilli":4000,"unit":"u","unitPriceHtCents":2250,"vatRateBp":1000},
  {"type":"main_oeuvre","designation":"Pose","quantityMilli":3000,"unit":"h","unitPriceHtCents":5500,"vatRateBp":1000},
  {"type":"autre","designation":"Déplacement","quantityMilli":1000,"unit":"forfait","unitPriceHtCents":4500,"vatRateBp":1000}
]$$::jsonb)::text, true);
select public.artisan_send_quote(current_setting('test.devis')::uuid, 30, current_date + 10, 2);
reset role;
select pg_temp.connecter('b2100000-0000-4000-8000-000000000001', 'particulier');
set local role authenticated;
select results_eq(
  $$ select status::text, quote_id::text, quote_status::text, quote_total_ttc_cents, deposit_cents, deposit_status is null
     from public.particulier_chantiers(current_setting('test.chantier')::uuid) $$,
  $$ values ('devis_envoye'::text, current_setting('test.devis'), 'envoye'::text, 33000::bigint, 9900::bigint, true) $$,
  'devis envoyé : montant et acompte prévu (30 %) de l''échéancier figé');
reset role;
select public.transition_chantier(current_setting('test.chantier')::uuid, 'devis_signe');
update public.quotes set status = 'signe', signed_at = now(), signed_pdf_path = artisan_id || '/signe.pdf'
where id = current_setting('test.devis')::uuid;
select pg_temp.connecter('b2100000-0000-4000-8000-000000000001', 'particulier');
set local role authenticated;
select public.particulier_start_deposit(current_setting('test.devis')::uuid);
select is((select deposit_status::text from public.particulier_chantiers()), 'en_attente', 'acompte demandé');
reset role;
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
set local role service_role;
select is(public.record_payment(current_setting('test.devis')::uuid, 'acompte', 'acct_mc', 'cs_mc', 'pi_mc', 9900, 'paye'),
  'paye', 'acompte encaissé');
reset role;

-- ---------- Date de démarrage : agenda du démarrage ----------
select pg_temp.connecter('b2200000-0000-4000-8000-000000000001', 'artisan');
set local role authenticated;
select public.artisan_confirm_start(current_setting('test.chantier')::uuid,
  current_setting('test.aujourdhui')::date + 5, '08:30');
select results_eq(
  $$ select kind, starts_at = ((current_setting('test.aujourdhui')::date + 5) + time '08:30') at time zone 'Europe/Paris'
     from public.chantier_appointment(current_setting('test.chantier')::uuid) $$,
  $$ values ('demarrage'::text, true) $$,
  'agenda de l''artisan : démarrage des travaux');
reset role;
select pg_temp.connecter('b2100000-0000-4000-8000-000000000001', 'particulier');
set local role authenticated;
select results_eq(
  $$ select status::text, deposit_status::text,
       start_at = ((current_setting('test.aujourdhui')::date + 5) + time '08:30') at time zone 'Europe/Paris'
     from public.particulier_chantiers() $$,
  $$ values ('planifie'::text, 'paye'::text, true) $$,
  'chantier planifié : acompte payé, date de démarrage');
select is((select kind from public.chantier_appointment(current_setting('test.chantier')::uuid)), 'demarrage',
  'agenda du client : démarrage des travaux');
reset role;

-- ---------- Nouveautés du journal : une notification par fenêtre de 10 minutes ----------
select set_config('request.jwt.claims', '', true);
select is(app.start_due_chantiers(now() + interval '8 days'), 1, 'travaux commencés');
select pg_temp.connecter('b2100000-0000-4000-8000-000000000001', 'particulier');
set local role authenticated;
select is((select count(*)::int from public.chantier_appointment(current_setting('test.chantier')::uuid)), 0,
  'travaux commencés : plus d''intervention à venir');
reset role;
select pg_temp.connecter('b2200000-0000-4000-8000-000000000001', 'artisan');
set local role authenticated;
select ok(public.artisan_add_chantier_message(current_setting('test.chantier')::uuid, 'Saignées rebouchées.') is not null,
  'message publié');
reset role;
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
set local role service_role;
select is(public.record_chantier_photo(current_setting('test.chantier')::uuid, 'b2200000-0000-4000-8000-000000000001',
  current_setting('test.chantier') || '/p1.jpg'), 'ok', 'photo 1');
select is(public.record_chantier_photo(current_setting('test.chantier')::uuid, 'b2200000-0000-4000-8000-000000000001',
  current_setting('test.chantier') || '/p2.jpg'), 'ok', 'photo 2');
reset role;
select results_eq(
  $$ select user_id, data - 'chantier_id', send_after > now() + interval '9 minutes', status::text
     from public.notifications where type = 'chantier_nouveautes' $$,
  $$ values ('b2100000-0000-4000-8000-000000000001'::uuid,
             '{"titre":"Installation de prises","artisan":"Xavier","photos":2,"messages":1}'::jsonb, true, 'a_envoyer'::text) $$,
  'une seule notification au client : 2 photos et 1 message, envoyée dans 10 minutes');
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
set local role service_role;
select is((select count(*)::int from public.claim_notifications(100) where type = 'chantier_nouveautes'), 0,
  'pas encore envoyée : fenêtre de regroupement en cours');
reset role;
update public.notifications set send_after = now() - interval '1 minute' where type = 'chantier_nouveautes';
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
set local role service_role;
select results_eq(
  $$ select type::text, email, data ->> 'photos' from public.claim_notifications(100) where type = 'chantier_nouveautes' $$,
  $$ values ('chantier_nouveautes'::text, 'mc.client@example.test'::text, '2'::text) $$,
  'fenêtre écoulée : notification envoyée au client');
-- Ajout pendant l'envoi : nouvelle notification.
select is(public.record_chantier_photo(current_setting('test.chantier')::uuid, 'b2200000-0000-4000-8000-000000000001',
  current_setting('test.chantier') || '/p3.jpg'), 'ok', 'photo 3');
reset role;
select results_eq(
  $$ select status::text, data ->> 'photos' from public.notifications where type = 'chantier_nouveautes' order by created_at $$,
  $$ values ('en_cours'::text, '2'::text), ('a_envoyer'::text, '1'::text) $$,
  'photo ajoutée pendant l''envoi : nouvelle notification');
select pg_temp.connecter('b2100000-0000-4000-8000-000000000001', 'particulier');
set local role authenticated;
select is((select count(*)::int from public.notifications where type = 'chantier_nouveautes'), 2,
  'particulier : ses notifications');
reset role;

-- ---------- Fin des travaux ----------
select pg_temp.connecter('b2200000-0000-4000-8000-000000000001', 'artisan');
set local role authenticated;
select public.artisan_declare_finished(current_setting('test.chantier')::uuid);
reset role;
select pg_temp.connecter('b2100000-0000-4000-8000-000000000001', 'particulier');
set local role authenticated;
select results_eq(
  $$ select status::text, finished_at is not null, closed_at is null from public.particulier_chantiers() $$,
  $$ values ('travaux_termines'::text, true, true) $$,
  'travaux terminés : date de fin, chantier pas encore clôturé');
reset role;

select * from finish();
rollback;
