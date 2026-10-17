-- F-14 partie 2 : stockage, documents, photos, profil, envoi en vérification.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

insert into auth.users (id, email, raw_app_meta_data, raw_user_meta_data) values
  ('d1d1d1d1-0000-4000-8000-000000000001', 'doc.a1@example.test', '{}', '{"account_type":"artisan","siret":"00000001800010"}'),
  ('d2d2d2d2-0000-4000-8000-000000000002', 'doc.a2@example.test', '{}', '{"account_type":"artisan","siret":"00000002600013"}'),
  ('d3d3d3d3-0000-4000-8000-000000000003', 'doc.sup@example.test', '{"role":"support"}', '{}'),
  ('d4d4d4d4-0000-4000-8000-000000000004', 'doc.adm@example.test', '{"role":"admin"}', '{}');

create function pg_temp.connecter(uid uuid, app_role text, aal text default 'aal1') returns void language sql as $$
  select set_config('request.jwt.claims', jsonb_build_object(
    'sub', uid, 'role', 'authenticated', 'aal', aal, 'app_metadata', jsonb_build_object('role', app_role)
  )::text, true);
$$;

-- Fiche A1 complète sauf documents et profil (écrite directement, hors RLS).
update public.artisans set
  sirene_checked_at = now(), sirene_active = true, raison_sociale = 'EXEMPLE', assujetti_tva = true,
  zone_mode = 'communes'
where user_id = 'd1d1d1d1-0000-4000-8000-000000000001';

-- Charte qualité signée (ADR 0104) : testée à part (51_charte_qualite).
insert into public.artisan_charter_acceptances (artisan_id, version, rules_count, signer_name, company, siret, signature_path)
select id, 'V5', 25, 'Alex Exemple', 'EXEMPLE', '00000001800010', 'M 10 10 L 200 80 L 400 40'
from public.artisans where user_id = 'd1d1d1d1-0000-4000-8000-000000000001';
insert into public.artisan_trades (artisan_id, trade_code)
  select id, 'peintre' from public.artisans where user_id = 'd1d1d1d1-0000-4000-8000-000000000001';
insert into public.artisan_zones (artisan_id, code_insee, nom)
  select id, '06088', 'Nice' from public.artisans where user_id = 'd1d1d1d1-0000-4000-8000-000000000001';

-- Document de A2 (pour vérifier l'isolement).
insert into public.artisan_documents (artisan_id, type, storage_path, mime_type, size_bytes, date_fin)
  select id, 'rc_pro', id || '/rc.pdf', 'application/pdf', 1000, current_date + 100
  from public.artisans where user_id = 'd2d2d2d2-0000-4000-8000-000000000002';

-- ---------- Espaces de stockage ----------
select results_eq(
  $$ select id, public from storage.buckets where id in ('uploads', 'artisan-documents', 'avatars', 'portfolio') order by id $$,
  $$ values ('artisan-documents'::text, false), ('avatars', true), ('portfolio', true), ('uploads', false) $$,
  'espaces de stockage : documents et dépôts privés, avatars et réalisations publics');

-- ---------- Artisan A1 ----------
select pg_temp.connecter('d1d1d1d1-0000-4000-8000-000000000001', 'artisan_en_attente');
set local role authenticated;

select lives_ok(
  $$ insert into storage.objects (bucket_id, name) values ('uploads', 'd1d1d1d1-0000-4000-8000-000000000001/f.pdf') $$,
  'dépôt dans son propre dossier « uploads »');
select throws_ok(
  $$ insert into storage.objects (bucket_id, name) values ('uploads', 'd2d2d2d2-0000-4000-8000-000000000002/f.pdf') $$,
  '42501', null, 'dépôt refusé dans le dossier d''un autre utilisateur');
select throws_ok(
  $$ insert into storage.objects (bucket_id, name) values ('artisan-documents', (select app.my_artisan_id()) || '/k.pdf') $$,
  '42501', null, 'écriture directe dans « artisan-documents » interdite');
select throws_ok(
  $$ insert into storage.objects (bucket_id, name) values ('avatars', 'd1d1d1d1-0000-4000-8000-000000000001/a.jpg') $$,
  '42501', null, 'écriture directe dans « avatars » interdite');

select is_empty('select 1 from public.artisan_documents', 'artisan : ne voit pas les documents des autres');
select throws_ok(
  $$ insert into public.artisan_documents (artisan_id, type, storage_path, mime_type, size_bytes)
     values (app.my_artisan_id(), 'kbis', 'x/k.pdf', 'application/pdf', 10) $$,
  '42501', null, 'documents enregistrés par le serveur uniquement');

select throws_ok(
  $$ update public.profiles set avatar_path = 'autre/photo.jpg' $$, '42501', null,
  'photo de profil non modifiable directement');
select results_eq(
  $$ update public.artisans set presentation = repeat('Peintre en bâtiment. ', 6) returning char_length(presentation) $$,
  $$ values (126) $$, 'présentation modifiable par l''artisan');

select throws_ok($$ select public.submit_artisan_onboarding() $$, '22023', 'Étapes incomplètes : documents, profil',
  'envoi refusé : documents et profil incomplets');

reset role;

-- Le serveur enregistre documents et photo (comme process-upload).
insert into public.artisan_documents (artisan_id, type, storage_path, mime_type, size_bytes, date_emission, date_fin)
select a.id, d.type::public.document_type, a.id || '/' || d.type || '.pdf', 'application/pdf', 1000, d.emission, d.fin
from public.artisans a,
  (values ('kbis', current_date - 10, null::date), ('decennale', null, current_date + 200),
          ('rc_pro', null, current_date + 200), ('identite', null, null),
          ('urssaf', current_date - 20, null)) as d (type, emission, fin)
where a.user_id = 'd1d1d1d1-0000-4000-8000-000000000001';
update public.profiles set avatar_path = 'd1d1d1d1-0000-4000-8000-000000000001/a.jpg'
where user_id = 'd1d1d1d1-0000-4000-8000-000000000001';
insert into public.artisan_photos (artisan_id, storage_path)
  select id, id || '/p1.jpg' from public.artisans where user_id = 'd1d1d1d1-0000-4000-8000-000000000001';

-- Attestation URSSAF (ADR 0115) : valable 6 mois après son émission.
select is(
  (select date_fin from public.artisan_documents where type = 'urssaf'
     and artisan_id = (select id from public.artisans where user_id = 'd1d1d1d1-0000-4000-8000-000000000001')),
  (current_date - 20 + interval '6 months')::date, 'URSSAF : date de fin calculée (6 mois)');

-- Kbis trop ancien : envoi refusé.
update public.artisan_documents set date_emission = current_date - 100
where type = 'kbis' and artisan_id = (select id from public.artisans where user_id = 'd1d1d1d1-0000-4000-8000-000000000001');

select pg_temp.connecter('d1d1d1d1-0000-4000-8000-000000000001', 'artisan_en_attente');
set local role authenticated;
select is((select count(*)::int from public.artisan_documents), 5, 'artisan : voit ses 5 documents');
select is((select count(*)::int from public.artisan_photos), 1, 'artisan : voit ses photos');
select throws_ok($$ select public.submit_artisan_onboarding() $$, '22023', 'Étapes incomplètes : documents',
  'Kbis de plus de 3 mois : envoi refusé');
reset role;

update public.artisan_documents set date_emission = current_date - 10
where type = 'kbis' and artisan_id = (select id from public.artisans where user_id = 'd1d1d1d1-0000-4000-8000-000000000001');

select pg_temp.connecter('d1d1d1d1-0000-4000-8000-000000000001', 'artisan_en_attente');
set local role authenticated;
select lives_ok($$ select public.submit_artisan_onboarding() $$, 'dossier complet : envoi accepté');
select results_eq($$ select status::text, submitted_at is not null from public.artisans $$,
  $$ values ('en_verification'::text, true) $$, 'statut « en_verification » et date d''envoi');
select throws_ok($$ select public.submit_artisan_onboarding() $$, '22023', 'Le dossier a déjà été envoyé.',
  'pas de second envoi');
select lives_ok($$ delete from public.artisan_photos $$, 'artisan : peut supprimer ses photos');
reset role;

-- ---------- Support : pas d'accès aux documents (spec F-43 : propriétaire + admin) ----------
select pg_temp.connecter('d3d3d3d3-0000-4000-8000-000000000003', 'support');
set local role authenticated;
select is_empty($$ select 1 from public.artisan_documents $$, 'support : aucun accès aux documents');
select is_empty(
  $$ select 1 from storage.objects where bucket_id = 'artisan-documents' $$,
  'support : aucun accès aux fichiers des documents');
reset role;

-- ---------- Admin ----------
select pg_temp.connecter('d4d4d4d4-0000-4000-8000-000000000004', 'admin', 'aal2');
set local role authenticated;
select ok((select count(*) from public.artisan_documents where artisan_id in (
  select id from public.artisans where user_id in ('d1d1d1d1-0000-4000-8000-000000000001', 'd2d2d2d2-0000-4000-8000-000000000002'))) = 6,
  'admin : voit les documents des artisans (5 de A1, 1 de A2)');
reset role;

-- ---------- Visiteur ----------
set local role anon;
select throws_ok('select 1 from public.artisan_documents', '42501', null, 'visiteur : aucun document');
select throws_ok($$ select public.submit_artisan_onboarding() $$, '42501', null, 'visiteur : pas d''envoi');
reset role;

select * from finish();
rollback;
