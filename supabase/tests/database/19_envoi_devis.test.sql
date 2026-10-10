-- F-21 : envoi du devis (contrôles, numéro par artisan sans trou, données figées, échéancier),
-- réponse du client (demande de modification et nouvelle version, refus), notifications, droits
-- de chaque rôle (CLAUDE.md).
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

insert into auth.users (id, email, is_anonymous, email_confirmed_at, raw_app_meta_data, raw_user_meta_data) values
  ('a9100000-0000-4000-8000-000000000001', 'env.client@example.test', false, now(), '{}', '{"first_name":"Camille","last_name":"Exemple"}'),
  ('a9200000-0000-4000-8000-000000000001', 'env.x1@example.test', false, now(), '{"role":"artisan"}', '{"first_name":"Xavier"}'),
  ('a9200000-0000-4000-8000-000000000002', 'env.x2@example.test', false, now(), '{"role":"artisan"}', '{"first_name":"Yasmine"}'),
  ('a9300000-0000-4000-8000-000000000001', 'env.support@example.test', false, now(), '{"role":"support"}', '{}');

create function pg_temp.connecter(uid uuid, app_role text) returns void language sql as $$
  select set_config('request.jwt.claims', jsonb_build_object(
    'sub', uid, 'role', 'authenticated', 'aal', 'aal1', 'app_metadata', jsonb_build_object('role', app_role)
  )::text, true);
$$;

insert into public.artisans (id, user_id, status, siret, raison_sociale, forme_juridique_code, adresse_ligne,
  adresse_code_postal, adresse_commune, zone_mode, connect_charges_enabled, assujetti_tva) values
  ('a9400000-0000-4000-8000-000000000001', 'a9200000-0000-4000-8000-000000000001', 'valide', '00000002600013',
   'ARTISAN X1', '5710', '4 RUE DE LA PAIX', '75002', 'PARIS', 'communes', true, true),
  ('a9400000-0000-4000-8000-000000000002', 'a9200000-0000-4000-8000-000000000002', 'valide', '00000001800010',
   'ARTISAN X2', '1000', '8 RUE DU PORT', '06300', 'NICE', 'communes', true, true);
-- X1 : attestation décennale complète ; X2 : assureur manquant.
insert into public.artisan_documents (artisan_id, type, storage_path, mime_type, size_bytes, date_fin, numero, assureur, couverture, status) values
  ('a9400000-0000-4000-8000-000000000001', 'decennale', 'a9400000/decennale-x1.pdf', 'application/pdf', 1000,
   current_date + 200, 'DEC-123', 'Assurances Exemple', 'France métropolitaine', 'valide'),
  ('a9400000-0000-4000-8000-000000000002', 'decennale', 'a9400000/decennale-x2.pdf', 'application/pdf', 1000,
   current_date + 200, 'DEC-456', null, 'France métropolitaine', 'valide');
insert into public.projects (id, user_id, status, description, summary, trade_code, ville_code_insee, ville_nom,
  code_postal, adresse, location, criteria_validated_at) values
  ('a9500000-0000-4000-8000-000000000001', 'a9100000-0000-4000-8000-000000000001', 'demande_envoyee',
   'Ajouter des prises.', 'Installation de prises', 'electricien', '06088', 'Nice', '06000',
   '1 Rue de l''Exemple 06000 Nice', 'SRID=4326;POINT(7.26 43.70)', now());
insert into public.requests (id, project_id, artisan_id, particulier_id, contact_phone) values
  ('a9600000-0000-4000-8000-000000000001', 'a9500000-0000-4000-8000-000000000001',
   'a9400000-0000-4000-8000-000000000001', 'a9100000-0000-4000-8000-000000000001', '+33612345678'),
  ('a9600000-0000-4000-8000-000000000002', 'a9500000-0000-4000-8000-000000000001',
   'a9400000-0000-4000-8000-000000000002', 'a9100000-0000-4000-8000-000000000001', '+33612345678');
select set_config('test.annee', extract(year from (now() at time zone 'Europe/Paris'))::int::text, true);
select set_config('test.aujourdhui', ((now() at time zone 'Europe/Paris')::date)::text, true);

-- ---------- Artisan X1 : brouillon de la maquette (300 € HT, 330 € TTC), puis envoi ----------
select pg_temp.connecter('a9200000-0000-4000-8000-000000000001', 'artisan');
set local role authenticated;
select set_config('test.chantier',
  public.artisan_fix_appointment('a9600000-0000-4000-8000-000000000001', current_date + 2, '10:00')::text, true);
select set_config('test.v1', public.artisan_save_quote_draft(current_setting('test.chantier')::uuid, $$[
  {"type":"materiel","designation":"Prise de courant","quantityMilli":4000,"unit":"u","unitPriceHtCents":2250,"vatRateBp":1000},
  {"type":"main_oeuvre","designation":"Pose et raccordement","quantityMilli":3000,"unit":"h","unitPriceHtCents":5500,"vatRateBp":1000},
  {"type":"autre","designation":"Forfait déplacement","quantityMilli":1000,"unit":"forfait","unitPriceHtCents":4500,"vatRateBp":1000}
]$$::jsonb)::text, true);

select throws_ok(format('select public.artisan_send_quote(%L, 0, %L, 2)', current_setting('test.v1'), current_date + 10),
  '22023', 'L''acompte doit être compris entre 1 et 99 %', 'acompte de 0 % refusé');
select throws_ok(format('select public.artisan_send_quote(%L, 30, %L, 2)', current_setting('test.v1'), current_setting('test.aujourdhui')),
  '22023', 'Choisissez une date de début à venir, dans l''année', 'début le jour même refusé');
select throws_ok(format('select public.artisan_send_quote(%L, 30, %L, 0)', current_setting('test.v1'), current_date + 10),
  '22023', 'La durée estimée doit être comprise entre 1 et 365 jours', 'durée nulle refusée');

select is(public.artisan_send_quote(current_setting('test.v1')::uuid, 30, current_date + 10, 2),
  format('DEVIS-%s-0001', current_setting('test.annee')), 'premier devis de l''année : DEVIS-AAAA-0001');
select results_eq(
  $$ select status::text, valid_until - current_setting('test.aujourdhui')::date, start_date - current_date,
       duration_days::int, payment_schedule
     from public.quotes where id = current_setting('test.v1')::uuid $$,
  $$ values ('envoye'::text, 30, 10, 2, '[{"percent":30,"trigger":"signature","amount_cents":9900},
                                         {"percent":70,"trigger":"reception","amount_cents":23100}]'::jsonb) $$,
  'devis envoyé : validité 30 jours, modalités, 30 % d''acompte et solde à la réception');
select is(
  (select document -> 'terms' from public.quotes where id = current_setting('test.v1')::uuid),
  jsonb_build_object('valid_until', current_setting('test.aujourdhui')::date + 30, 'start_date', current_date + 10,
    'duration_days', 2,
    'schedule', '[{"percent":30,"trigger":"signature","amount_cents":9900},{"percent":70,"trigger":"reception","amount_cents":23100}]'::jsonb),
  'données figées : modalités du devis');
select is(
  (select document -> 'quote' ->> 'numero' from public.quotes where id = current_setting('test.v1')::uuid),
  format('DEVIS-%s-0001', current_setting('test.annee')), 'données figées : numéro');
select is((select status::text from public.chantiers where id = current_setting('test.chantier')::uuid),
  'devis_envoye', 'chantier : devis envoyé');
select throws_ok(format('select public.artisan_send_quote(%L, 30, %L, 2)', current_setting('test.v1'), current_date + 10),
  '22023', 'Ce devis a déjà été envoyé', 'pas de second envoi');
select is((select count(*)::int from public.quote_number_counters), 0, 'X1 : compteurs non lisibles');
select is((public.quote_document(current_setting('test.v1')::uuid) -> 'quote' ->> 'status'), 'envoye',
  'X1 : son devis envoyé, depuis les données figées');

-- ---------- Artisan X2 : assurance incomplète, puis séquence propre ----------
reset role;
select pg_temp.connecter('a9200000-0000-4000-8000-000000000002', 'artisan');
set local role authenticated;
select is(public.quote_document(current_setting('test.v1')::uuid), null, 'X2 : devis d''autrui illisible');
select throws_ok(format('select public.artisan_send_quote(%L, 30, %L, 2)', current_setting('test.v1'), current_date + 10),
  '42501', null, 'X2 : envoi du devis d''autrui refusé');
select set_config('test.chantier2',
  public.artisan_fix_appointment('a9600000-0000-4000-8000-000000000002', current_date + 2, '14:00')::text, true);
select set_config('test.x2', public.artisan_save_quote_draft(current_setting('test.chantier2')::uuid,
  '[{"type":"materiel","designation":"Prise","quantityMilli":1000,"unit":"u","unitPriceHtCents":1500,"vatRateBp":2000}]')::text, true);
select throws_ok(format('select public.artisan_send_quote(%L, 30, %L, 2)', current_setting('test.x2'), current_date + 10),
  '22023', 'Complétez votre assurance décennale (assureur, numéro, couverture, validité) avant d''envoyer un devis',
  'assurance décennale incomplète : envoi refusé');
reset role;
update public.artisan_documents set assureur = 'Assurances Exemple'
where artisan_id = 'a9400000-0000-4000-8000-000000000002';
select pg_temp.connecter('a9200000-0000-4000-8000-000000000002', 'artisan');
set local role authenticated;
select is(public.artisan_send_quote(current_setting('test.x2')::uuid, 50, current_date + 5, 1),
  format('DEVIS-%s-0001', current_setting('test.annee')), 'X2 : sa propre séquence (numéro unique par artisan)');

-- ---------- Particulier : lecture, demande de modification ----------
reset role;
select is(
  (select data from public.notifications
   where user_id = 'a9100000-0000-4000-8000-000000000001' and type = 'devis_recu'
     and data ->> 'quote_id' = current_setting('test.v1')),
  jsonb_build_object('chantier_id', current_setting('test.chantier'), 'titre', 'Installation de prises',
    'artisan', 'Xavier', 'quote_id', current_setting('test.v1'),
    'numero', format('DEVIS-%s-0001', current_setting('test.annee')), 'montant_ttc', 33000),
  'notification « devis reçu » au particulier');
select pg_temp.connecter('a9100000-0000-4000-8000-000000000001', 'particulier');
set local role authenticated;
select is((public.quote_document(current_setting('test.v1')::uuid) #>> '{quote,numero}'),
  format('DEVIS-%s-0001', current_setting('test.annee')), 'particulier : devis envoyé lisible');
select is((select count(*)::int from public.quote_number_counters), 0, 'particulier : compteurs non lisibles');
select throws_ok(format('select public.particulier_request_quote_revision(%L, %L)', current_setting('test.v1'), 'Court'),
  '22023', 'Décrivez la modification souhaitée (10 à 1 000 caractères)', 'demande de modification trop courte');
select set_config('test.v2', public.particulier_request_quote_revision(current_setting('test.v1')::uuid,
  'Pouvez-vous ajouter une prise dans le couloir ?')::text, true);
select throws_ok(format('select public.particulier_refuse_quote(%L, %L)', current_setting('test.v1'), 'trop_cher'),
  '22023', 'Ce devis n''attend plus de réponse', 'devis en révision : plus de refus possible');
select is(public.quote_document(current_setting('test.v2')::uuid), null, 'particulier : nouvelle version en brouillon illisible');
reset role;
select results_eq(
  $$ select status::text, client_message from public.quotes where id = current_setting('test.v1')::uuid $$,
  $$ values ('revision_demandee'::text, 'Pouvez-vous ajouter une prise dans le couloir ?'::text) $$,
  'devis : modification demandée, message du client');
select results_eq(
  $$ select status::text, version::int, supersedes_id::text, total_ttc_cents,
       (select count(*)::int from public.quote_lines where quote_id = q.id)
     from public.quotes q where id = current_setting('test.v2')::uuid $$,
  $$ values ('brouillon'::text, 2, current_setting('test.v1'), 33000::bigint, 3) $$,
  'nouvelle version en brouillon, lignes reprises');
select is((select status::text from public.chantiers where id = current_setting('test.chantier')::uuid),
  'devis_en_revision', 'chantier : devis en révision');
select is(
  (select data ->> 'message' from public.notifications
   where user_id = 'a9200000-0000-4000-8000-000000000001' and type = 'devis_modification'),
  'Pouvez-vous ajouter une prise dans le couloir ?', 'notification « modification demandée » à l''artisan');

-- ---------- Artisan X1 : envoi de la version 2 (acompte de 40 %, enregistré par défaut) ----------
select pg_temp.connecter('a9200000-0000-4000-8000-000000000001', 'artisan');
set local role authenticated;
select is(public.artisan_send_quote(current_setting('test.v2')::uuid, 40, current_date + 12, 3, true),
  format('DEVIS-%s-0001-v2', current_setting('test.annee')), 'version 2 : numéro d''origine suivi de l''indice');
reset role;
select results_eq(
  $$ select status::text from public.quotes where id in (current_setting('test.v1')::uuid, current_setting('test.v2')::uuid)
     order by version $$,
  $$ values ('remplace'::text), ('envoye'::text) $$,
  'version 1 remplacée, version 2 envoyée');
select is((select payment_schedule from public.quotes where id = current_setting('test.v2')::uuid),
  '[{"percent":40,"trigger":"signature","amount_cents":13200},{"percent":60,"trigger":"reception","amount_cents":19800}]'::jsonb,
  'échéancier personnalisé : 40 % / 60 %');
select is((select default_deposit_percent::int from public.artisans where id = 'a9400000-0000-4000-8000-000000000001'),
  40, 'pourcentage enregistré comme échéancier par défaut');
select is((select last_number from public.quote_number_counters where artisan_id = 'a9400000-0000-4000-8000-000000000001'),
  1, 'nouvelle version : aucun numéro consommé');

-- ---------- Particulier : refus de la version 2 ----------
select pg_temp.connecter('a9100000-0000-4000-8000-000000000001', 'particulier');
set local role authenticated;
select throws_ok(format('select public.particulier_refuse_quote(%L, %L, %L)', current_setting('test.v2'), 'trop_cher', repeat('x', 501)),
  '22023', 'Commentaire trop long (500 caractères au plus)', 'commentaire de refus trop long');
select lives_ok(format('select public.particulier_refuse_quote(%L, %L, %L)', current_setting('test.v2'), 'trop_cher', '  Budget dépassé.  '),
  'refus du devis avec motif et commentaire');
reset role;
select results_eq(
  $$ select status::text, refusal_reason::text, client_message from public.quotes where id = current_setting('test.v2')::uuid $$,
  $$ values ('refuse'::text, 'trop_cher'::text, 'Budget dépassé.'::text) $$,
  'devis refusé : motif et commentaire');
select is((select status::text from public.chantiers where id = current_setting('test.chantier')::uuid),
  'devis_refuse', 'chantier : devis refusé');
select is(
  (select data - 'chantier_id' from public.notifications
   where user_id = 'a9200000-0000-4000-8000-000000000001' and type = 'devis_refuse'),
  jsonb_build_object('titre', 'Installation de prises', 'client', 'Camille',
    'numero', format('DEVIS-%s-0001-v2', current_setting('test.annee')), 'motif', 'trop_cher', 'message', 'Budget dépassé.'),
  'notification « devis refusé » à l''artisan');

-- ---------- Artisan sur les fonctions du client, équipe, visiteur ----------
select pg_temp.connecter('a9200000-0000-4000-8000-000000000002', 'artisan');
set local role authenticated;
select throws_ok(format('select public.particulier_refuse_quote(%L, %L)', current_setting('test.x2'), 'autre'),
  '42501', null, 'artisan : pas de réponse à la place du client');
reset role;

select pg_temp.connecter('a9300000-0000-4000-8000-000000000001', 'support');
set local role authenticated;
select is((public.quote_document(current_setting('test.v2')::uuid) #>> '{quote,status}'), 'refuse',
  'support : devis envoyé lisible, statut courant');
select is((select count(*)::int from public.quote_number_counters), 2, 'support : compteurs lisibles');
reset role;

select set_config('request.jwt.claims', '{"role":"anon"}', true);
set local role anon;
select throws_ok(format('select public.artisan_send_quote(%L, 30, %L, 2)', current_setting('test.x2'), current_date + 10),
  '42501', null, 'visiteur : pas d''envoi');
select throws_ok(format('select public.particulier_request_quote_revision(%L, %L)', current_setting('test.x2'), 'Message assez long'),
  '42501', null, 'visiteur : pas de demande de modification');
select throws_ok('select 1 from public.quote_number_counters', '42501', null, 'visiteur : aucun accès aux compteurs');
reset role;

select * from finish();
rollback;
