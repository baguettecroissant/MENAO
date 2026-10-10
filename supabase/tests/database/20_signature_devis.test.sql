-- F-13 : signature du devis (cases cochées, procédure, enregistrement par le webhook), droits de
-- chaque rôle (CLAUDE.md).
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

insert into auth.users (id, email, is_anonymous, email_confirmed_at, raw_app_meta_data, raw_user_meta_data) values
  ('aa100000-0000-4000-8000-000000000001', 'sig.client@example.test', false, now(), '{}', '{"first_name":"Camille","last_name":"Exemple"}'),
  ('aa200000-0000-4000-8000-000000000001', 'sig.x1@example.test', false, now(), '{"role":"artisan"}', '{"first_name":"Xavier"}'),
  ('aa200000-0000-4000-8000-000000000002', 'sig.x2@example.test', false, now(), '{"role":"artisan"}', '{"first_name":"Yasmine"}'),
  ('aa300000-0000-4000-8000-000000000001', 'sig.support@example.test', false, now(), '{"role":"support"}', '{}');

create function pg_temp.connecter(uid uuid, app_role text) returns void language sql as $$
  select set_config('request.jwt.claims', jsonb_build_object(
    'sub', uid, 'role', 'authenticated', 'aal', 'aal1', 'app_metadata', jsonb_build_object('role', app_role)
  )::text, true);
$$;

insert into public.artisans (id, user_id, status, siret, raison_sociale, forme_juridique_code, adresse_ligne,
  adresse_code_postal, adresse_commune, zone_mode, connect_charges_enabled, assujetti_tva) values
  ('aa400000-0000-4000-8000-000000000001', 'aa200000-0000-4000-8000-000000000001', 'valide', '00000002600013',
   'ARTISAN X1', '5710', '4 RUE DE LA PAIX', '75002', 'PARIS', 'communes', true, true),
  ('aa400000-0000-4000-8000-000000000002', 'aa200000-0000-4000-8000-000000000002', 'valide', '00000001800010',
   'ARTISAN X2', '1000', '8 RUE DU PORT', '06300', 'NICE', 'communes', true, true);
insert into public.artisan_documents (artisan_id, type, storage_path, mime_type, size_bytes, date_fin, numero, assureur, couverture, status)
select a, 'decennale', a || '/decennale.pdf', 'application/pdf', 1000, current_date + 200, 'DEC-1', 'Assurances Exemple',
  'France métropolitaine', 'valide'
from unnest(array['aa400000-0000-4000-8000-000000000001', 'aa400000-0000-4000-8000-000000000002']::uuid[]) a;
insert into public.projects (id, user_id, status, description, summary, trade_code, ville_code_insee, ville_nom,
  code_postal, adresse, location, criteria_validated_at) values
  ('aa500000-0000-4000-8000-000000000001', 'aa100000-0000-4000-8000-000000000001', 'demande_envoyee',
   'Ajouter des prises.', 'Installation de prises', 'electricien', '06088', 'Nice', '06000',
   '1 Rue de l''Exemple 06000 Nice', 'SRID=4326;POINT(7.26 43.70)', now());
insert into public.requests (id, project_id, artisan_id, particulier_id, contact_phone) values
  ('aa600000-0000-4000-8000-000000000001', 'aa500000-0000-4000-8000-000000000001',
   'aa400000-0000-4000-8000-000000000001', 'aa100000-0000-4000-8000-000000000001', '+33612345678'),
  ('aa600000-0000-4000-8000-000000000002', 'aa500000-0000-4000-8000-000000000001',
   'aa400000-0000-4000-8000-000000000002', 'aa100000-0000-4000-8000-000000000001', '+33612345678');
select set_config('test.cases', '{"document":true,"cgu_prestataire":true,"cgu_menao":true,"echeancier":true,
  "versions":{"cgu":"2026-10-09-brouillon","confidentialite":"2026-10-09-brouillon"}}', true);

-- ---------- Artisans : devis envoyés (330 € TTC pour X1) ----------
select pg_temp.connecter('aa200000-0000-4000-8000-000000000001', 'artisan');
set local role authenticated;
select set_config('test.chantier',
  public.artisan_fix_appointment('aa600000-0000-4000-8000-000000000001', current_date + 2, '10:00')::text, true);
select set_config('test.devis', public.artisan_save_quote_draft(current_setting('test.chantier')::uuid, $$[
  {"type":"materiel","designation":"Prise de courant","quantityMilli":4000,"unit":"u","unitPriceHtCents":2250,"vatRateBp":1000},
  {"type":"main_oeuvre","designation":"Pose","quantityMilli":3000,"unit":"h","unitPriceHtCents":5500,"vatRateBp":1000},
  {"type":"autre","designation":"Déplacement","quantityMilli":1000,"unit":"forfait","unitPriceHtCents":4500,"vatRateBp":1000}
]$$::jsonb)::text, true);
select set_config('test.numero',
  public.artisan_send_quote(current_setting('test.devis')::uuid, 30, current_date + 10, 2), true);
select throws_ok(format('select public.particulier_start_signature(%L, %L)', current_setting('test.devis'), current_setting('test.cases')),
  '42501', null, 'artisan : pas de signature à la place du client');
reset role;

select pg_temp.connecter('aa200000-0000-4000-8000-000000000002', 'artisan');
set local role authenticated;
select set_config('test.chantier2',
  public.artisan_fix_appointment('aa600000-0000-4000-8000-000000000002', current_date + 2, '14:00')::text, true);
select set_config('test.devis2', public.artisan_save_quote_draft(current_setting('test.chantier2')::uuid,
  '[{"type":"materiel","designation":"Prise","quantityMilli":1000,"unit":"u","unitPriceHtCents":1500,"vatRateBp":2000}]')::text, true);
select public.artisan_send_quote(current_setting('test.devis2')::uuid, 30, current_date + 10, 1);
reset role;

-- ---------- Particulier : cases à cocher, validité, procédure reprise ----------
select pg_temp.connecter('aa100000-0000-4000-8000-000000000001', 'particulier');
set local role authenticated;
select throws_ok(format('select public.particulier_start_signature(%L, %L)', current_setting('test.devis'),
    '{"document":true,"cgu_prestataire":true,"cgu_menao":true}'),
  '22023', 'Cochez toutes les cases pour signer le devis', 'une case manquante : signature refusée');
select throws_ok(format('select public.particulier_start_signature(%L, %L)', current_setting('test.devis'),
    '{"document":true,"cgu_prestataire":true,"cgu_menao":true,"echeancier":"oui"}'),
  '22023', 'Cochez toutes les cases pour signer le devis', 'case mal renseignée : signature refusée');
reset role;
update public.quotes set valid_until = current_date - 1 where id = current_setting('test.devis')::uuid;
select pg_temp.connecter('aa100000-0000-4000-8000-000000000001', 'particulier');
set local role authenticated;
select throws_ok(format('select public.particulier_start_signature(%L, %L)', current_setting('test.devis'), current_setting('test.cases')),
  '22023', 'Ce devis n''est plus valable : demandez une nouvelle version à l''artisan', 'devis échu : signature refusée');
reset role;
update public.quotes set valid_until = current_date + 30 where id = current_setting('test.devis')::uuid;
select pg_temp.connecter('aa100000-0000-4000-8000-000000000001', 'particulier');
set local role authenticated;
select set_config('test.debut',
  public.particulier_start_signature(current_setting('test.devis')::uuid, current_setting('test.cases')::jsonb)::text, true);
select is(current_setting('test.debut')::jsonb - 'request_id' - 'valid_until',
  '{"signing_url":null,"signer":{"name":"Camille Exemple","email":"sig.client@example.test","phone":"+33612345678"}}'::jsonb,
  'procédure ouverte : signataire (nom, e-mail, téléphone de la demande), lien à créer');
select is(public.particulier_start_signature(current_setting('test.devis')::uuid, current_setting('test.cases')::jsonb) ->> 'request_id',
  current_setting('test.debut')::jsonb ->> 'request_id', 'procédure en cours reprise');
select is((select count(*)::int from public.signature_requests), 1, 'particulier : sa procédure lisible');
select throws_ok('update public.signature_requests set status = ''signee''', '42501', null,
  'particulier : aucune écriture directe');
reset role;
select is(
  (select consents - 'acceptees_le' from public.signature_requests
   where id = (current_setting('test.debut')::jsonb ->> 'request_id')::uuid),
  jsonb_build_object('cases', '["document","cgu_prestataire","cgu_menao","echeancier"]'::jsonb,
    'versions', '{"cgu":"2026-10-09-brouillon","confidentialite":"2026-10-09-brouillon"}'::jsonb,
    'echeancier', '[{"percent":30,"trigger":"signature","amount_cents":9900},{"percent":70,"trigger":"reception","amount_cents":23100}]'::jsonb),
  'cases cochées enregistrées avec les versions et l''échéancier accepté');

-- Le serveur enregistre la demande créée chez le prestataire : le lien est ensuite repris.
update public.signature_requests set external_submission_id = '5', external_submitter_id = '7',
  signing_url = 'https://docuseal.eu/s/abc'
where id = (current_setting('test.debut')::jsonb ->> 'request_id')::uuid;
select pg_temp.connecter('aa100000-0000-4000-8000-000000000001', 'particulier');
set local role authenticated;
select is(public.particulier_start_signature(current_setting('test.devis')::uuid, current_setting('test.cases')::jsonb) ->> 'signing_url',
  'https://docuseal.eu/s/abc', 'lien de signature repris');
select set_config('test.debut2',
  public.particulier_start_signature(current_setting('test.devis2')::uuid, current_setting('test.cases')::jsonb)::text, true);
reset role;

-- ---------- Autres rôles ----------
select pg_temp.connecter('aa200000-0000-4000-8000-000000000001', 'artisan');
set local role authenticated;
select is((select count(*)::int from public.signature_requests), 1, 'X1 : procédure de son devis lisible');
select throws_ok(format('select public.record_quote_signature(%L, now(), %L, %L)',
    current_setting('test.debut')::jsonb ->> 'request_id', 'x.pdf', 'y.pdf'),
  '42501', null, 'artisan : enregistrement de signature réservé au serveur');
reset role;
select pg_temp.connecter('aa300000-0000-4000-8000-000000000001', 'support');
set local role authenticated;
select is((select count(*)::int from public.signature_requests), 2, 'support : procédures lisibles');
reset role;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
set local role anon;
select throws_ok('select 1 from public.signature_requests', '42501', null, 'visiteur : aucun accès');
reset role;

-- ---------- Serveur (webhook) : signature enregistrée, idempotente ----------
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
set local role service_role;
select is(public.record_quote_signature((current_setting('test.debut')::jsonb ->> 'request_id')::uuid, now(),
  'aa400000/devis-signe.pdf', 'aa400000/preuve.pdf'), 'signe', 'signature enregistrée');
select is(public.record_quote_signature((current_setting('test.debut')::jsonb ->> 'request_id')::uuid, now(),
  'aa400000/devis-signe.pdf', 'aa400000/preuve.pdf'), 'deja_signe', 'second appel sans effet');
reset role;
select results_eq(
  $$ select q.status::text, q.signed_at is not null, q.signed_pdf_path, q.signature_proof_path, c.status::text, r.status::text
     from public.quotes q
     join public.chantiers c on c.id = q.chantier_id
     join public.signature_requests r on r.quote_id = q.id
     where q.id = current_setting('test.devis')::uuid $$,
  $$ values ('signe'::text, true, 'aa400000/devis-signe.pdf'::text, 'aa400000/preuve.pdf'::text, 'devis_signe'::text, 'signee'::text) $$,
  'devis signé, chantier « devis signé », procédure terminée');
select is(
  (select data - 'chantier_id' from public.notifications
   where user_id = 'aa200000-0000-4000-8000-000000000001' and type = 'devis_signe'),
  jsonb_build_object('titre', 'Installation de prises', 'client', 'Camille',
    'numero', current_setting('test.numero'), 'montant_ttc', 33000),
  'notification « devis signé » à l''artisan');

select pg_temp.connecter('aa100000-0000-4000-8000-000000000001', 'particulier');
set local role authenticated;
select is((public.quote_document(current_setting('test.devis')::uuid) -> 'quote') - 'id' - 'artisan_id'
    - 'issued_on' - 'total_ht_cents' - 'total_tva_cents' - 'total_ttc_cents' - 'vat_breakdown' - 'version' - 'signed_at',
  jsonb_build_object('status', 'signe', 'numero', current_setting('test.numero'), 'signed_pdf_path', 'aa400000/devis-signe.pdf'),
  'particulier : devis signé, avec le PDF signé');
select throws_ok(format('select public.particulier_start_signature(%L, %L)', current_setting('test.devis'), current_setting('test.cases')),
  '22023', 'Ce devis ne peut plus être signé', 'devis signé : plus de nouvelle signature');
reset role;

-- Chantier annulé avant la fin de la signature : procédure abandonnée, devis inchangé.
select pg_temp.connecter('aa200000-0000-4000-8000-000000000002', 'artisan');
set local role authenticated;
select public.artisan_cancel_chantier(current_setting('test.chantier2')::uuid, null);
reset role;
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
set local role service_role;
select is(public.record_quote_signature((current_setting('test.debut2')::jsonb ->> 'request_id')::uuid, now(),
  'aa400000/x.pdf', 'aa400000/y.pdf'), 'non_signable', 'chantier annulé : signature non enregistrée');
reset role;
select results_eq(
  $$ select q.status::text, r.status::text from public.quotes q join public.signature_requests r on r.quote_id = q.id
     where q.id = current_setting('test.devis2')::uuid $$,
  $$ values ('envoye'::text, 'abandonnee'::text) $$,
  'devis inchangé, procédure abandonnée');

select * from finish();
rollback;
