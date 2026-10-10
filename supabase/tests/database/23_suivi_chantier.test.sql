-- F-22 : suivi du chantier par l'artisan (date de démarrage, démarrage à la date prévue, journal de
-- messages et de photos, fin des travaux), notifications du client, droits de chaque rôle (CLAUDE.md).
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

insert into auth.users (id, email, is_anonymous, email_confirmed_at, raw_app_meta_data, raw_user_meta_data) values
  ('af100000-0000-4000-8000-000000000001', 'suivi.client@example.test', false, now(), '{}', '{"first_name":"Camille","last_name":"Exemple"}'),
  ('af200000-0000-4000-8000-000000000001', 'suivi.x1@example.test', false, now(), '{"role":"artisan"}', '{"first_name":"Xavier"}'),
  ('af200000-0000-4000-8000-000000000002', 'suivi.x2@example.test', false, now(), '{"role":"artisan"}', '{"first_name":"Yasmine"}'),
  ('af300000-0000-4000-8000-000000000001', 'suivi.support@example.test', false, now(), '{"role":"support"}', '{}');

create function pg_temp.connecter(uid uuid, app_role text) returns void language sql as $$
  select set_config('request.jwt.claims', jsonb_build_object(
    'sub', uid, 'role', 'authenticated', 'aal', 'aal1', 'app_metadata', jsonb_build_object('role', app_role)
  )::text, true);
$$;

insert into public.artisans (id, user_id, status, siret, raison_sociale, forme_juridique_code, adresse_ligne,
  adresse_code_postal, adresse_commune, zone_mode, connect_charges_enabled, stripe_account_id, assujetti_tva) values
  ('af400000-0000-4000-8000-000000000001', 'af200000-0000-4000-8000-000000000001', 'valide', '00000002600013',
   'ARTISAN X1', '5710', '4 RUE DE LA PAIX', '75002', 'PARIS', 'communes', true, 'acct_suivi_x1', true),
  ('af400000-0000-4000-8000-000000000002', 'af200000-0000-4000-8000-000000000002', 'valide', '00000001800010',
   'ARTISAN X2', '1000', '8 RUE DU PORT', '06300', 'NICE', 'communes', true, 'acct_suivi_x2', true);
insert into public.artisan_documents (artisan_id, type, storage_path, mime_type, size_bytes, date_fin, numero, assureur, couverture, status)
select a, 'decennale', a || '/decennale.pdf', 'application/pdf', 1000, current_date + 200, 'DEC-1', 'Assurances Exemple',
  'France métropolitaine', 'valide'
from unnest(array['af400000-0000-4000-8000-000000000001', 'af400000-0000-4000-8000-000000000002']::uuid[]) a;
insert into public.projects (id, user_id, status, description, summary, trade_code, ville_code_insee, ville_nom,
  code_postal, adresse, location, criteria_validated_at) values
  ('af500000-0000-4000-8000-000000000001', 'af100000-0000-4000-8000-000000000001', 'demande_envoyee',
   'Ajouter des prises.', 'Installation de prises', 'electricien', '06088', 'Nice', '06000',
   '1 Rue de l''Exemple 06000 Nice', 'SRID=4326;POINT(7.26 43.70)', now());
insert into public.requests (id, project_id, artisan_id, particulier_id, contact_phone) values
  ('af600000-0000-4000-8000-000000000001', 'af500000-0000-4000-8000-000000000001',
   'af400000-0000-4000-8000-000000000001', 'af100000-0000-4000-8000-000000000001', '+33612345678'),
  ('af600000-0000-4000-8000-000000000002', 'af500000-0000-4000-8000-000000000001',
   'af400000-0000-4000-8000-000000000002', 'af100000-0000-4000-8000-000000000001', '+33612345678');
select set_config('test.aujourdhui', ((now() at time zone 'Europe/Paris')::date)::text, true);
select set_config('test.demarrage',
  ((((now() at time zone 'Europe/Paris')::date + 5) + time '08:00') at time zone 'Europe/Paris')::text, true);

-- ---------- Devis envoyés et signés ; acompte payé pour X1 ----------
select pg_temp.connecter('af200000-0000-4000-8000-000000000001', 'artisan');
set local role authenticated;
select set_config('test.chantier',
  public.artisan_fix_appointment('af600000-0000-4000-8000-000000000001', current_date + 2, '10:00')::text, true);
select set_config('test.devis', public.artisan_save_quote_draft(current_setting('test.chantier')::uuid, $$[
  {"type":"materiel","designation":"Prise de courant","quantityMilli":4000,"unit":"u","unitPriceHtCents":2250,"vatRateBp":1000},
  {"type":"main_oeuvre","designation":"Pose","quantityMilli":3000,"unit":"h","unitPriceHtCents":5500,"vatRateBp":1000},
  {"type":"autre","designation":"Déplacement","quantityMilli":1000,"unit":"forfait","unitPriceHtCents":4500,"vatRateBp":1000}
]$$::jsonb)::text, true);
select public.artisan_send_quote(current_setting('test.devis')::uuid, 30, current_date + 10, 2);
reset role;
select pg_temp.connecter('af200000-0000-4000-8000-000000000002', 'artisan');
set local role authenticated;
select set_config('test.chantier2',
  public.artisan_fix_appointment('af600000-0000-4000-8000-000000000002', current_date + 2, '14:00')::text, true);
select set_config('test.devis2', public.artisan_save_quote_draft(current_setting('test.chantier2')::uuid,
  '[{"type":"materiel","designation":"Prise","quantityMilli":1000,"unit":"u","unitPriceHtCents":1500,"vatRateBp":2000}]')::text, true);
select public.artisan_send_quote(current_setting('test.devis2')::uuid, 30, current_date + 10, 1);
reset role;
select public.transition_chantier(c, 'devis_signe')
from unnest(array[current_setting('test.chantier'), current_setting('test.chantier2')]::uuid[]) c;
update public.quotes set status = 'signe', signed_at = now(), signed_pdf_path = artisan_id || '/signe.pdf'
where id in (current_setting('test.devis')::uuid, current_setting('test.devis2')::uuid);
select pg_temp.connecter('af100000-0000-4000-8000-000000000001', 'particulier');
set local role authenticated;
select public.particulier_start_deposit(current_setting('test.devis')::uuid);
select public.particulier_start_deposit(current_setting('test.devis2')::uuid);
reset role;
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
set local role service_role;
select is(public.record_payment(current_setting('test.devis')::uuid, 'acompte', 'acct_suivi_x1', 'cs_1', 'pi_1', 9900, 'paye'),
  'paye', 'acompte de X1 encaissé');
reset role;

-- ---------- Date de démarrage (F-22) ----------
select pg_temp.connecter('af200000-0000-4000-8000-000000000002', 'artisan');
set local role authenticated;
select throws_ok(format('select public.artisan_confirm_start(%L, %L, %L)', current_setting('test.chantier2'),
    current_setting('test.aujourdhui')::date + 5, '08:00'),
  '22023', 'La date de démarrage se confirme après le paiement de l''acompte',
  'acompte non payé : pas encore de date de démarrage');
select throws_ok(format('select public.artisan_confirm_start(%L, %L, %L)', current_setting('test.chantier'),
    current_setting('test.aujourdhui')::date + 5, '08:00'),
  '42501', 'Chantier introuvable', 'X2 : chantier d''autrui');
reset role;
select pg_temp.connecter('af100000-0000-4000-8000-000000000001', 'particulier');
set local role authenticated;
select throws_ok(format('select public.artisan_confirm_start(%L, %L, %L)', current_setting('test.chantier'),
    current_setting('test.aujourdhui')::date + 5, '08:00'),
  '42501', 'Chantier introuvable', 'particulier : pas de date de démarrage');
reset role;

select pg_temp.connecter('af200000-0000-4000-8000-000000000001', 'artisan');
set local role authenticated;
select throws_ok(format('select public.artisan_confirm_start(%L, %L, %L)', current_setting('test.chantier'),
    current_setting('test.aujourdhui')::date - 1, '08:00'),
  '22023', 'Choisissez une date et une heure à venir', 'date passée refusée');
select throws_ok(format('select public.artisan_confirm_start(%L, %L, %L)', current_setting('test.chantier'),
    current_setting('test.aujourdhui')::date + 400, '08:00'),
  '22023', 'Le démarrage doit avoir lieu dans les 12 prochains mois', 'date à plus d''un an refusée');
select throws_ok(format('select public.artisan_confirm_start(%L, null, %L)', current_setting('test.chantier'), '08:00'),
  '22023', 'Indiquez la date et l''heure de démarrage', 'date obligatoire');
select lives_ok(format('select public.artisan_confirm_start(%L, %L, %L)', current_setting('test.chantier'),
    current_setting('test.aujourdhui')::date + 5, '08:00'), 'X1 confirme la date de démarrage');
select is((select start_at from public.artisan_chantiers() where chantier_id = current_setting('test.chantier')::uuid),
  current_setting('test.demarrage')::timestamptz, 'date et heure de Paris enregistrées');
select is((public.artisan_chantier_detail(current_setting('test.chantier')::uuid) #>> '{chantier,start_at}')::timestamptz,
  current_setting('test.demarrage')::timestamptz, 'fiche du chantier : date de démarrage');
reset role;

select results_eq(
  $$ select c.status::text, e.event::text, e.from_status::text, e.actor_role,
       (e.details ->> 'demarrage')::timestamptz = current_setting('test.demarrage')::timestamptz
     from public.chantiers c
     join public.chantier_events e on e.chantier_id = c.id and e.event = 'date_confirmee'
     where c.id = current_setting('test.chantier')::uuid $$,
  $$ values ('planifie'::text, 'date_confirmee'::text, 'acompte_paye'::text, 'artisan'::text, true) $$,
  'acompte payé → planifié, transition journalisée');
select results_eq(
  $$ select user_id, data - 'chantier_id' - 'demarrage',
       (data ->> 'demarrage')::timestamptz = current_setting('test.demarrage')::timestamptz
     from public.notifications where type = 'chantier_planifie' $$,
  $$ values ('af100000-0000-4000-8000-000000000001'::uuid,
             '{"titre":"Installation de prises","artisan":"Xavier"}'::jsonb, true) $$,
  'notification « chantier planifié » au client, avec la date');

-- Modification de la date tant que les travaux n'ont pas commencé : le client est prévenu.
select pg_temp.connecter('af200000-0000-4000-8000-000000000001', 'artisan');
set local role authenticated;
select lives_ok(format('select public.artisan_confirm_start(%L, %L, %L)', current_setting('test.chantier'),
    current_setting('test.aujourdhui')::date + 6, '09:30'), 'X1 déplace le démarrage');
select lives_ok(format('select public.artisan_confirm_start(%L, %L, %L)', current_setting('test.chantier'),
    current_setting('test.aujourdhui')::date + 6, '09:30'), 'même date : sans effet');
reset role;
select results_eq(
  $$ select c.status::text, c.start_at = ((current_setting('test.aujourdhui')::date + 6) + time '09:30') at time zone 'Europe/Paris',
       (select count(*)::int from public.notifications where type = 'demarrage_modifie'),
       (select count(*)::int from public.chantier_events e where e.chantier_id = c.id and e.event = 'date_confirmee')
     from public.chantiers c where c.id = current_setting('test.chantier')::uuid $$,
  $$ values ('planifie'::text, true, 1, 1) $$,
  'date déplacée, chantier toujours planifié, une seule notification « démarrage modifié »');
select pg_temp.connecter('af100000-0000-4000-8000-000000000001', 'particulier');
set local role authenticated;
select is((select chantier_start_at from public.particulier_requests() where chantier_id = current_setting('test.chantier')::uuid),
  ((current_setting('test.aujourdhui')::date + 6) + time '09:30') at time zone 'Europe/Paris',
  'suivi du client : date de démarrage');
reset role;

-- ---------- Journal fermé avant le début des travaux (F-22, maquettes) ----------
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
set local role service_role;
select is(public.record_payment(current_setting('test.devis2')::uuid, 'acompte', 'acct_suivi_x2', 'cs_2', 'pi_2', 540, 'paye'),
  'paye', 'acompte de X2 encaissé (date de démarrage non confirmée)');
reset role;
select pg_temp.connecter('af200000-0000-4000-8000-000000000001', 'artisan');
set local role authenticated;
select throws_ok(format('select public.artisan_add_chantier_message(%L, %L)', current_setting('test.chantier'), 'Bonjour'),
  '22023', 'Le journal du chantier n''est pas ouvert à cette étape', 'chantier planifié : journal fermé');
reset role;
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
set local role service_role;
select is(public.record_chantier_photo(current_setting('test.chantier')::uuid, 'af200000-0000-4000-8000-000000000001',
  current_setting('test.chantier') || '/p0.jpg'), 'locked', 'chantier planifié : photo refusée');
reset role;

-- ---------- Démarrage à la date prévue (tâche planifiée) ----------
select is((select schedule from cron.job where jobname = 'menao-demarrage-chantiers'), '*/15 * * * *',
  'tâche planifiée toutes les 15 minutes');
select set_config('request.jwt.claims', '', true);
select is(app.start_due_chantiers(now()), 0, 'date de démarrage à venir : rien ne démarre');
select is(app.start_due_chantiers(now() + interval '8 days'), 1, 'date atteinte : le chantier démarre');
select is(app.start_due_chantiers(now() + interval '8 days'), 0, 'tâche relancée : sans effet');
select results_eq(
  $$ select c.status::text, e.from_status::text, e.actor_id is null, e.actor_role
     from public.chantiers c
     join public.chantier_events e on e.chantier_id = c.id and e.event = 'demarrage'
     where c.id = current_setting('test.chantier')::uuid $$,
  $$ values ('en_cours'::text, 'planifie'::text, true, 'systeme'::text) $$,
  'planifié → en cours, journalisé par le système');
select pg_temp.connecter('af100000-0000-4000-8000-000000000001', 'particulier');
set local role authenticated;
select throws_ok('select app.start_due_chantiers()', '42501', null, 'particulier : pas de démarrage manuel');
reset role;

-- ---------- Journal : messages ----------
select pg_temp.connecter('af200000-0000-4000-8000-000000000001', 'artisan');
set local role authenticated;
select ok(public.artisan_add_chantier_message(current_setting('test.chantier')::uuid,
  '  Matériel commandé, livraison lundi.  ') is not null, 'X1 ajoute un message');
select throws_ok(format('select public.artisan_add_chantier_message(%L, %L)', current_setting('test.chantier'), '   '),
  '22023', 'Écrivez votre message', 'message vide refusé');
select throws_ok(format('select public.artisan_add_chantier_message(%L, %L)', current_setting('test.chantier'), repeat('x', 2001)),
  '22023', 'Votre message dépasse 2 000 caractères', 'message trop long refusé');
select throws_ok(format($$ insert into public.chantier_updates (chantier_id, kind, message) values (%L, 'message', 'x') $$,
    current_setting('test.chantier')),
  '42501', null, 'artisan : pas d''écriture directe dans le journal');
reset role;
select pg_temp.connecter('af200000-0000-4000-8000-000000000002', 'artisan');
set local role authenticated;
select throws_ok(format('select public.artisan_add_chantier_message(%L, %L)', current_setting('test.chantier'), 'Bonjour'),
  '42501', 'Chantier introuvable', 'X2 : journal d''autrui');
select throws_ok(format('select public.artisan_add_chantier_message(%L, %L)', current_setting('test.chantier2'), 'Bonjour'),
  '22023', 'Le journal du chantier n''est pas ouvert à cette étape', 'journal fermé avant la date de démarrage');
reset role;
select is((select message from public.chantier_updates where kind = 'message'),
  'Matériel commandé, livraison lundi.', 'message enregistré sans espaces superflus');

-- ---------- Journal : photos (enregistrées par process-upload) ----------
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
set local role service_role;
select is(public.record_chantier_photo(current_setting('test.chantier')::uuid, 'af200000-0000-4000-8000-000000000001',
  current_setting('test.chantier') || '/p1.jpg'), 'ok', 'photo de X1 enregistrée');
select is(public.record_chantier_photo(current_setting('test.chantier')::uuid, 'af200000-0000-4000-8000-000000000002',
  current_setting('test.chantier') || '/p2.jpg'), 'forbidden', 'X2 : pas de photo sur le chantier d''autrui');
select is(public.record_chantier_photo(current_setting('test.chantier2')::uuid, 'af200000-0000-4000-8000-000000000002',
  current_setting('test.chantier2') || '/p3.jpg'), 'locked', 'journal fermé : photo refusée');
select throws_ok(format('select public.record_chantier_photo(%L, %L, %L)', current_setting('test.chantier'),
    'af200000-0000-4000-8000-000000000001', 'autre-dossier/p4.jpg'),
  '23514', null, 'photo rangée hors du dossier du chantier refusée');
reset role;
insert into public.chantier_updates (chantier_id, author_id, kind, storage_path)
select current_setting('test.chantier')::uuid, 'af200000-0000-4000-8000-000000000001', 'photo',
  current_setting('test.chantier') || '/lot-' || n || '.jpg'
from generate_series(1, 98) n;
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
set local role service_role;
select is(public.record_chantier_photo(current_setting('test.chantier')::uuid, 'af200000-0000-4000-8000-000000000001',
  current_setting('test.chantier') || '/p100.jpg'), 'ok', '100e photo acceptée');
select is(public.record_chantier_photo(current_setting('test.chantier')::uuid, 'af200000-0000-4000-8000-000000000001',
  current_setting('test.chantier') || '/p101.jpg'), 'limit', '101e photo refusée');
reset role;
select pg_temp.connecter('af200000-0000-4000-8000-000000000001', 'artisan');
set local role authenticated;
select throws_ok(format('select public.record_chantier_photo(%L, %L, %L)', current_setting('test.chantier'),
    'af200000-0000-4000-8000-000000000001', current_setting('test.chantier') || '/p5.jpg'),
  '42501', null, 'artisan : photo enregistrée par le serveur seulement');
reset role;

-- ---------- Lecture du journal et des photos ----------
insert into storage.objects (bucket_id, name) values ('chantier-photos', current_setting('test.chantier') || '/p1.jpg');
select pg_temp.connecter('af100000-0000-4000-8000-000000000001', 'particulier');
set local role authenticated;
select is((select count(*)::int from public.chantier_updates), 101, 'particulier : journal de son chantier');
select is((select count(*)::int from storage.objects where bucket_id = 'chantier-photos'), 1,
  'particulier : photos de son chantier (URL signées)');
reset role;
select pg_temp.connecter('af200000-0000-4000-8000-000000000002', 'artisan');
set local role authenticated;
select is_empty($$ select 1 from public.chantier_updates $$, 'X2 : journal d''autrui illisible');
select is_empty($$ select 1 from storage.objects where bucket_id = 'chantier-photos' $$, 'X2 : photos d''autrui illisibles');
reset role;
select pg_temp.connecter('af300000-0000-4000-8000-000000000001', 'support');
set local role authenticated;
select is((select count(*)::int from public.chantier_updates), 101, 'support : journal lisible');
select is((select count(*)::int from storage.objects where bucket_id = 'chantier-photos'), 1, 'support : photos lisibles');
reset role;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
set local role anon;
select throws_ok('select 1 from public.chantier_updates', '42501', null, 'visiteur : aucun accès au journal');
select throws_ok(format('select public.artisan_confirm_start(%L, %L, %L)', current_setting('test.chantier'),
    current_setting('test.aujourdhui')::date + 5, '08:00'), '42501', null, 'visiteur : aucune action');
reset role;

-- ---------- Fin des travaux ----------
select pg_temp.connecter('af200000-0000-4000-8000-000000000001', 'artisan');
set local role authenticated;
select throws_ok(format('select public.artisan_confirm_start(%L, %L, %L)', current_setting('test.chantier'),
    current_setting('test.aujourdhui')::date + 9, '08:00'),
  '22023', 'La date de démarrage ne peut plus être modifiée', 'travaux commencés : date figée');
reset role;
select pg_temp.connecter('af200000-0000-4000-8000-000000000002', 'artisan');
set local role authenticated;
select throws_ok(format('select public.artisan_declare_finished(%L)', current_setting('test.chantier')),
  '42501', 'Chantier introuvable', 'X2 : pas de fin sur le chantier d''autrui');
select throws_ok(format('select public.artisan_declare_finished(%L)', current_setting('test.chantier2')),
  '22023', 'Seul un chantier en cours peut être déclaré terminé', 'chantier non commencé : pas de fin');
reset role;
select pg_temp.connecter('af200000-0000-4000-8000-000000000001', 'artisan');
set local role authenticated;
select lives_ok(format('select public.artisan_declare_finished(%L)', current_setting('test.chantier')),
  'X1 déclare le chantier terminé');
select throws_ok(format('select public.artisan_declare_finished(%L)', current_setting('test.chantier')),
  '22023', 'Seul un chantier en cours peut être déclaré terminé', 'fin déjà déclarée');
select ok(public.artisan_add_chantier_message(current_setting('test.chantier')::uuid, 'Chantier nettoyé.') is not null,
  'journal toujours ouvert après la fin des travaux');
reset role;
select results_eq(
  $$ select c.status::text, e.from_status::text, (e.details ->> 'photos')::int
     from public.chantiers c
     join public.chantier_events e on e.chantier_id = c.id and e.event = 'fin_declaree'
     where c.id = current_setting('test.chantier')::uuid $$,
  $$ values ('travaux_termines'::text, 'en_cours'::text, 100) $$,
  'en cours → travaux terminés, avec le nombre de photos');
select results_eq(
  $$ select user_id, data - 'chantier_id' from public.notifications where type = 'travaux_termines' $$,
  $$ values ('af100000-0000-4000-8000-000000000001'::uuid,
             '{"titre":"Installation de prises","artisan":"Xavier","photos":100}'::jsonb) $$,
  'notification « travaux terminés » au client');

select * from finish();
rollback;
