-- F-50, F-51 : notifications de l'artisan (décision sur le dossier, relances d'échéance à J-30 et
-- J-7 pour l'artisan et l'équipe, suspension et levée, document refusé), droits (CLAUDE.md).
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

insert into auth.users (id, email, raw_app_meta_data, raw_user_meta_data) values
  ('ae000000-0000-4000-8000-000000000001', 'notifart.a@example.test', '{"role":"artisan_en_attente"}', '{}'),
  ('ae000000-0000-4000-8000-000000000002', 'notifart.b@example.test', '{"role":"artisan_en_attente"}', '{}'),
  ('ae000000-0000-4000-8000-000000000003', 'notifart.c@example.test', '{"role":"artisan_en_attente"}', '{}'),
  ('ae000000-0000-4000-8000-000000000004', 'notifart.d@example.test', '{"role":"artisan"}', '{}'),
  ('ae000000-0000-4000-8000-000000000005', 'notifart.e@example.test', '{"role":"artisan"}', '{}'),
  ('ae000000-0000-4000-8000-000000000006', 'notifart.f@example.test', '{"role":"artisan_en_attente"}', '{}'),
  ('ae000000-0000-4000-8000-000000000009', 'notifart.adm@example.test', '{"role":"admin"}', '{}');

create function pg_temp.connecter(uid uuid, app_role text, aal text default 'aal1') returns void language sql as $$
  select set_config('request.jwt.claims', jsonb_build_object(
    'sub', uid, 'role', 'authenticated', 'aal', aal, 'app_metadata', jsonb_build_object('role', app_role)
  )::text, true);
$$;
create function pg_temp.artisan(uid uuid) returns uuid language sql as $$
  select id from public.artisans where user_id = uid
$$;
create function pg_temp.notifs(uid uuid) returns setof public.notifications language sql as $$
  select * from public.notifications where user_id = uid order by created_at, id
$$;

-- A, B, C, F : fiches créées à l'inscription (rôle artisan_en_attente), dossiers en vérification.
update public.artisans set status = 'en_verification', raison_sociale = 'NOTIF ' || right(user_id::text, 1),
  sirene_active = true, sirene_checked_at = now(), assujetti_tva = false, submitted_at = now()
where user_id in ('ae000000-0000-4000-8000-000000000001', 'ae000000-0000-4000-8000-000000000002',
  'ae000000-0000-4000-8000-000000000003', 'ae000000-0000-4000-8000-000000000006');
-- D, E : artisans validés (rôle artisan : fiche créée ici).
insert into public.artisans (user_id, status, raison_sociale) values
  ('ae000000-0000-4000-8000-000000000004', 'valide', 'NOTIF EXEMPLE'),
  ('ae000000-0000-4000-8000-000000000005', 'valide', 'NOTIF E');

-- A : les 5 documents validés (dossier validable).
insert into public.artisan_documents (artisan_id, type, storage_path, mime_type, size_bytes, date_emission, date_fin, status)
select pg_temp.artisan('ae000000-0000-4000-8000-000000000001'), d.type::public.document_type, 'na/' || d.type || '.pdf',
  'application/pdf', 1000, d.emission, d.fin, 'valide'
from (values ('kbis', current_date - 10, null::date), ('decennale', null, current_date + 200),
             ('rc_pro', null, current_date + 200), ('identite', null, null),
             ('urssaf', current_date - 20, null)) as d (type, emission, fin);
-- D : décennale à J-20, RC Pro à J-200, pièce d'identité à J-5.
insert into public.artisan_documents (artisan_id, type, storage_path, mime_type, size_bytes, date_fin, status)
select pg_temp.artisan('ae000000-0000-4000-8000-000000000004'), d.type::public.document_type, 'nd/' || d.type || '.pdf',
  'application/pdf', 1000, d.fin, 'valide'
from (values ('decennale', current_date + 20), ('rc_pro', current_date + 200), ('identite', current_date + 5)) as d (type, fin);
-- E : décennale à J-10 déjà renouvelée (en attente de vérification), RC Pro à jour.
insert into public.artisan_documents (artisan_id, type, storage_path, mime_type, size_bytes, date_fin, status)
select pg_temp.artisan('ae000000-0000-4000-8000-000000000005'), d.type::public.document_type, d.path,
  'application/pdf', 1000, d.fin, d.status::public.document_status
from (values ('decennale', 'ne/dec.pdf', current_date + 10, 'valide'), ('decennale', 'ne/dec2.pdf', current_date + 400, 'en_attente'),
             ('rc_pro', 'ne/rc.pdf', current_date + 200, 'valide')) as d (type, path, fin, status);
-- F : un document en attente de vérification.
insert into public.artisan_documents (artisan_id, type, storage_path, mime_type, size_bytes, date_fin)
values (pg_temp.artisan('ae000000-0000-4000-8000-000000000006'), 'rc_pro', 'nf/rc.pdf', 'application/pdf', 1000, current_date + 200);

-- ---------- Décision sur le dossier ----------
select pg_temp.connecter('ae000000-0000-4000-8000-000000000009', 'admin', 'aal2');
set local role authenticated;
select lives_ok($$ select public.admin_decide_artisan(pg_temp.artisan('ae000000-0000-4000-8000-000000000001'), 'valide') $$,
  'dossier A validé');
select lives_ok($$ select public.admin_decide_artisan(pg_temp.artisan('ae000000-0000-4000-8000-000000000002'), 'refuse',
  'Kbis illisible') $$, 'dossier B refusé');
select lives_ok($$ select public.admin_decide_artisan(pg_temp.artisan('ae000000-0000-4000-8000-000000000003'), 'complement',
  'Ajoutez votre attestation RC Pro à jour') $$, 'complément demandé pour C');
select lives_ok($$ select public.admin_review_document((select id from public.artisan_documents where storage_path = 'nf/rc.pdf'),
  'refuse', 'Attestation illisible', 'illisible') $$, 'document de F refusé pendant la vérification');
reset role;

select results_eq($$ select type::text, data from pg_temp.notifs('ae000000-0000-4000-8000-000000000001') $$,
  $$ values ('dossier_valide'::text, '{"abonnement": false, "paiements": false}'::jsonb) $$,
  'dossier validé : l''artisan est prévenu, avec les étapes restantes pour être visible');
select results_eq($$ select type::text, data from pg_temp.notifs('ae000000-0000-4000-8000-000000000002') $$,
  $$ values ('dossier_refuse'::text, '{"motif": "Kbis illisible"}'::jsonb) $$, 'dossier refusé : motif transmis');
select results_eq($$ select type::text, data from pg_temp.notifs('ae000000-0000-4000-8000-000000000003') $$,
  $$ values ('dossier_complement'::text, '{"motif": "Ajoutez votre attestation RC Pro à jour"}'::jsonb) $$,
  'complément demandé : message transmis');
select is_empty($$ select * from pg_temp.notifs('ae000000-0000-4000-8000-000000000006') $$,
  'document refusé pendant la vérification : la décision sur le dossier suffit');
select results_eq(
  $$ select app.notification_category(t::public.notification_type) from unnest(array['dossier_valide', 'dossier_refuse',
     'dossier_complement', 'document_refuse', 'document_a_renouveler', 'document_a_renouveler_equipe', 'compte_suspendu',
     'compte_reactive']) t $$,
  $$ select 'transactionnel'::text from generate_series(1, 8) $$,
  'notifications transactionnelles : jamais désactivables');

-- ---------- Relances avant expiration ----------
-- Isolement : les documents du seed (dont une décennale à J-10) sont considérés comme relancés.
update public.artisan_documents set renewal_reminder_days = 7 where storage_path not like 'n_/%';
select is(app.remind_expiring_documents(current_date), 2,
  'relances : décennale à J-20 (seuil 30) et pièce d''identité à J-5 (seuil 7) ; renouvellement déposé ignoré');
select results_eq(
  $$ select data ->> 'document', (data ->> 'jours')::int, data ->> 'date_fin' = (current_date + (data ->> 'jours')::int)::text
     from pg_temp.notifs('ae000000-0000-4000-8000-000000000004') where type = 'document_a_renouveler' order by 2 $$,
  $$ values ('identite'::text, 5, true), ('decennale', 20, true) $$, 'artisan : document, jours restants et date de fin');
select is_empty($$ select * from pg_temp.notifs('ae000000-0000-4000-8000-000000000005') $$,
  'renouvellement déjà déposé : pas de relance');
select is((select count(*)::int from public.notifications where type = 'document_a_renouveler_equipe'),
  (select count(*)::int from public.profiles where role = 'admin'),
  'équipe : une relance par admin, pour l''assurance seulement');
select is((select data from public.notifications
  where type = 'document_a_renouveler_equipe' and user_id = 'ae000000-0000-4000-8000-000000000009'),
  jsonb_build_object('document', 'decennale', 'date_fin', current_date + 20, 'jours', 20, 'entreprise', 'NOTIF EXEMPLE'),
  'équipe : entreprise, document et échéance');
select is(app.remind_expiring_documents(current_date), 0, 'pas de deuxième relance pour un même seuil');
select is(app.remind_expiring_documents(current_date + 14), 1, 'décennale à J-6 : relance du seuil 7');
select is(app.remind_expiring_documents(current_date + 15), 0, 'seuil 7 déjà relancé');

-- ---------- Suspension automatique, refus du renouvellement, levée ----------
update public.artisan_documents set date_fin = current_date - 1 where storage_path = 'nd/decennale.pdf';
select app.daily_compliance();
select results_eq(
  $$ select status::text from public.artisans where id = pg_temp.artisan('ae000000-0000-4000-8000-000000000004') $$,
  $$ values ('suspendu'::text) $$, 'décennale expirée : suspension');
select results_eq(
  $$ select data from pg_temp.notifs('ae000000-0000-4000-8000-000000000004') where type = 'compte_suspendu' $$,
  $$ values ('{"documents": ["decennale"]}'::jsonb) $$, 'suspension : l''artisan est prévenu, assurance nommée');

insert into public.artisan_documents (artisan_id, type, storage_path, mime_type, size_bytes, date_fin) values
  (pg_temp.artisan('ae000000-0000-4000-8000-000000000004'), 'decennale', 'nd/dec-renouv.pdf', 'application/pdf', 1000, current_date + 365);
select pg_temp.connecter('ae000000-0000-4000-8000-000000000009', 'admin', 'aal2');
set local role authenticated;
select lives_ok($$ select public.admin_review_document((select id from public.artisan_documents where storage_path = 'nd/dec-renouv.pdf'),
  'refuse', 'Attestation illisible', 'illisible') $$, 'renouvellement refusé');
reset role;
select results_eq(
  $$ select data from pg_temp.notifs('ae000000-0000-4000-8000-000000000004') where type = 'document_refuse' $$,
  $$ values ('{"document": "decennale", "motif": "Attestation illisible"}'::jsonb) $$,
  'renouvellement refusé : l''artisan est prévenu, avec le motif');

update public.artisan_documents set status = 'remplace' where storage_path = 'nd/dec-renouv.pdf';
insert into public.artisan_documents (artisan_id, type, storage_path, mime_type, size_bytes, date_fin) values
  (pg_temp.artisan('ae000000-0000-4000-8000-000000000004'), 'decennale', 'nd/dec-renouv2.pdf', 'application/pdf', 1000, current_date + 365);
select pg_temp.connecter('ae000000-0000-4000-8000-000000000009', 'admin', 'aal2');
set local role authenticated;
select lives_ok($$ select public.admin_review_document((select id from public.artisan_documents where storage_path = 'nd/dec-renouv2.pdf'),
  'valide') $$, 'nouveau renouvellement validé');
reset role;
select results_eq(
  $$ select status::text from public.artisans where id = pg_temp.artisan('ae000000-0000-4000-8000-000000000004') $$,
  $$ values ('valide'::text) $$, 'assurances à jour : suspension levée');
select results_eq(
  $$ select data from pg_temp.notifs('ae000000-0000-4000-8000-000000000004') where type = 'compte_reactive' $$,
  $$ values ('{"visible": false}'::jsonb) $$, 'levée : l''artisan est prévenu (pas encore visible sans abonnement)');

-- ---------- Droits ----------
select pg_temp.connecter('ae000000-0000-4000-8000-000000000004', 'artisan');
set local role authenticated;
select results_eq(
  $$ select distinct type::text from public.my_notifications() order by 1 $$,
  $$ values ('compte_reactive'::text), ('compte_suspendu'), ('document_a_renouveler'), ('document_refuse') $$,
  'artisan : ses notifications dans son espace, sans celles de l''équipe');
select throws_ok($$ select app.remind_expiring_documents() $$, '42501', null, 'relances : réservées à la tâche planifiée');
reset role;

select * from finish();
rollback;
