-- ADR 0217 : entreprise vérifiée au registre, fiche rangée comme Kbis validé, Kbis déposé conservé.
-- SIRET et personnes fictifs.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

insert into auth.users (id, email, raw_app_meta_data, raw_user_meta_data) values
  ('e1e1e1e1-0000-4000-8000-000000000001', 'reg.a1@example.test', '{}',
   '{"account_type":"artisan","siret":"00000001800010"}'),
  ('e2e2e2e2-0000-4000-8000-000000000002', 'reg.a2@example.test', '{}',
   '{"account_type":"artisan","siret":"00000002600013"}');

create function pg_temp.artisan(uid uuid) returns uuid language sql as $$
  select id from public.artisans where user_id = uid;
$$;
create function pg_temp.connecter(uid uuid, app_role text) returns void language sql as $$
  select set_config('request.jwt.claims', jsonb_build_object(
    'sub', uid, 'role', 'authenticated', 'app_metadata', jsonb_build_object('role', app_role)
  )::text, true);
$$;

-- ---------- Serveur (service_role) ----------
set local role service_role;

select is(
  public.record_registry_check(pg_temp.artisan('e1e1e1e1-0000-4000-8000-000000000001'), 'dirigeant_absent'),
  '{"resultat": "enregistre", "retires": []}'::jsonb,
  'contrôle sans succès : résultat enregistré, aucun document');
select results_eq(
  $$ select registre_statut, registre_verifie_le is not null from public.artisans
     where user_id = 'e1e1e1e1-0000-4000-8000-000000000001' $$,
  $$ values ('dirigeant_absent'::text, true) $$,
  'raison et date du contrôle sur la fiche de l''artisan');

select is(
  public.record_registry_check(pg_temp.artisan('e1e1e1e1-0000-4000-8000-000000000001'), 'verifie',
    '{"storage_path":"reg-a1/kbis-registre-1.pdf","size_bytes":4000}'),
  '{"resultat": "document", "retires": []}'::jsonb,
  'entreprise vérifiée : la fiche devient le Kbis');
select results_eq(
  $$ select type::text, source, status::text, date_emission = current_date, verified_at is not null, mime_type
     from public.artisan_documents
     where artisan_id = pg_temp.artisan('e1e1e1e1-0000-4000-8000-000000000001') $$,
  $$ values ('kbis'::text, 'registre'::text, 'valide'::text, true, true, 'application/pdf'::text) $$,
  'Kbis validé, d''origine « registre », daté du jour');

select is(
  public.record_registry_check(pg_temp.artisan('e1e1e1e1-0000-4000-8000-000000000001'), 'verifie',
    '{"storage_path":"reg-a1/kbis-registre-2.pdf","size_bytes":4100}'),
  '{"resultat": "document", "retires": ["reg-a1/kbis-registre-1.pdf"]}'::jsonb,
  'nouvelle vérification : l''ancienne fiche est remplacée, son fichier à effacer');
select is(
  (select count(*)::int from public.artisan_documents
   where artisan_id = pg_temp.artisan('e1e1e1e1-0000-4000-8000-000000000001')),
  1, 'un seul Kbis');

-- Kbis déposé par l'artisan : conservé.
insert into public.artisan_documents (artisan_id, type, storage_path, mime_type, size_bytes, date_emission)
values (pg_temp.artisan('e2e2e2e2-0000-4000-8000-000000000002'), 'kbis', 'reg-a2/kbis-depot.pdf',
  'application/pdf', 5000, current_date);
select is(
  public.record_registry_check(pg_temp.artisan('e2e2e2e2-0000-4000-8000-000000000002'), 'verifie',
    '{"storage_path":"reg-a2/kbis-registre.pdf","size_bytes":4000}'),
  '{"resultat": "conserve", "retires": []}'::jsonb,
  'Kbis déposé en attente : conservé');
select results_eq(
  $$ select source, storage_path from public.artisan_documents
     where artisan_id = pg_temp.artisan('e2e2e2e2-0000-4000-8000-000000000002') $$,
  $$ values ('depot'::text, 'reg-a2/kbis-depot.pdf'::text) $$,
  'aucune fiche ajoutée à côté du Kbis déposé');

-- Kbis déposé puis refusé : la fiche le remplace.
update public.artisan_documents set status = 'refuse', refusal_reason = 'Illisible'
where artisan_id = pg_temp.artisan('e2e2e2e2-0000-4000-8000-000000000002');
select is(
  public.record_registry_check(pg_temp.artisan('e2e2e2e2-0000-4000-8000-000000000002'), 'verifie',
    '{"storage_path":"reg-a2/kbis-registre.pdf","size_bytes":4000}'),
  '{"resultat": "document", "retires": ["reg-a2/kbis-depot.pdf"]}'::jsonb,
  'Kbis refusé : remplacé par la fiche');

-- Dossier envoyé : figé, seul le résultat est enregistré.
update public.artisans set status = 'en_verification'
where user_id = 'e2e2e2e2-0000-4000-8000-000000000002';
select is(
  public.record_registry_check(pg_temp.artisan('e2e2e2e2-0000-4000-8000-000000000002'), 'verifie',
    '{"storage_path":"reg-a2/kbis-registre-3.pdf","size_bytes":4000}'),
  '{"resultat": "enregistre", "retires": []}'::jsonb,
  'dossier en vérification : documents inchangés');

select throws_ok(
  $$ select public.record_registry_check(gen_random_uuid(), 'verifie') $$,
  'P0002', null, 'artisan inconnu refusé');
select throws_ok(
  $$ select public.record_registry_check(pg_temp.artisan('e1e1e1e1-0000-4000-8000-000000000001'), 'inconnu') $$,
  '23514', null, 'résultat hors liste refusé');

-- ---------- Artisan connecté ----------
reset role;
select pg_temp.connecter('e1e1e1e1-0000-4000-8000-000000000001', 'artisan_en_attente');
set local role authenticated;

select throws_ok(
  $$ select public.record_registry_check(pg_temp.artisan('e1e1e1e1-0000-4000-8000-000000000001'), 'verifie') $$,
  '42501', null, 'l''artisan ne peut pas écrire le résultat lui-même');
select throws_ok(
  $$ update public.artisans set registre_statut = 'verifie' where user_id = 'e1e1e1e1-0000-4000-8000-000000000001' $$,
  '42501', null, 'ni modifier la colonne du résultat');
select results_eq(
  $$ select registre_statut from public.artisans where user_id = 'e1e1e1e1-0000-4000-8000-000000000001' $$,
  $$ values ('verifie'::text) $$,
  'mais il lit le résultat de son contrôle');
select results_eq(
  $$ select source from public.artisan_documents where type = 'kbis' $$,
  $$ values ('registre'::text) $$,
  'et sa fiche, seulement la sienne (RLS)');

select * from finish();
rollback;
