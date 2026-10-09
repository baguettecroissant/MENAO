-- F-50 : validation des dossiers par les admins (double authentification), historique, audit.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

insert into auth.users (id, email, raw_app_meta_data, raw_user_meta_data) values
  ('e1e1e1e1-0000-4000-8000-000000000001', 'val.a@example.test', '{}', '{"account_type":"artisan","siret":"00000001800010"}'),
  ('e2e2e2e2-0000-4000-8000-000000000002', 'val.b@example.test', '{}', '{"account_type":"artisan","siret":"00000002600013"}'),
  ('e3e3e3e3-0000-4000-8000-000000000003', 'val.c@example.test', '{}', '{"account_type":"artisan","siret":"00000003400017"}'),
  ('e4e4e4e4-0000-4000-8000-000000000004', 'val.adm@example.test', '{"role":"admin"}', '{}'),
  ('e5e5e5e5-0000-4000-8000-000000000005', 'val.sup@example.test', '{"role":"support"}', '{}');

create function pg_temp.connecter(uid uuid, app_role text, aal text default 'aal1') returns void language sql as $$
  select set_config('request.jwt.claims', jsonb_build_object(
    'sub', uid, 'role', 'authenticated', 'aal', aal, 'app_metadata', jsonb_build_object('role', app_role)
  )::text, true);
$$;

-- Dossiers A et C envoyés (complets), B en brouillon. Écritures directes, hors RLS.
update public.artisans set status = 'en_verification', sirene_active = true, sirene_checked_at = now(),
  raison_sociale = 'EXEMPLE', assujetti_tva = false, submitted_at = now()
where user_id in ('e1e1e1e1-0000-4000-8000-000000000001', 'e3e3e3e3-0000-4000-8000-000000000003');
insert into public.artisan_documents (artisan_id, type, storage_path, mime_type, size_bytes, date_emission, date_fin)
select a.id, d.type::public.document_type, a.id || '/' || d.type || '.pdf', 'application/pdf', 1000, d.emission, d.fin
from public.artisans a,
  (values ('kbis', current_date - 10, null::date), ('decennale', null, current_date + 200),
          ('rc_pro', null, current_date + 200), ('identite', null, null)) as d (type, emission, fin)
where a.user_id = 'e1e1e1e1-0000-4000-8000-000000000001';
insert into public.certifications (artisan_id, type, numero, date_fin)
  select id, 'rge', 'E-0001', current_date + 300 from public.artisans where user_id = 'e1e1e1e1-0000-4000-8000-000000000001';

-- ---------- Sans droits ----------
select pg_temp.connecter('e4e4e4e4-0000-4000-8000-000000000004', 'admin', 'aal1');
set local role authenticated;
select throws_ok(
  $$ select public.admin_decide_artisan((select id from public.artisans limit 1), 'valide') $$, '42501', null,
  'admin sans double authentification : décision refusée');
select throws_ok(
  $$ select public.admin_review_document(gen_random_uuid(), 'valide') $$, '42501', null,
  'admin sans double authentification : vérification de document refusée');
select is_empty('select 1 from public.audit_logs', 'admin sans double authentification : journal d''audit invisible');
reset role;

select pg_temp.connecter('e5e5e5e5-0000-4000-8000-000000000005', 'support', 'aal2');
set local role authenticated;
select throws_ok(
  $$ select public.admin_review_document(gen_random_uuid(), 'valide') $$, '42501', null,
  'support : pas de décision sur les documents');
reset role;

select pg_temp.connecter('e1e1e1e1-0000-4000-8000-000000000001', 'artisan_en_attente');
set local role authenticated;
select throws_ok(
  $$ select public.admin_decide_artisan(app.my_artisan_id(), 'valide') $$, '42501', null,
  'artisan : ne peut pas valider son propre dossier');
reset role;

-- ---------- Admin (aal2) ----------
select pg_temp.connecter('e4e4e4e4-0000-4000-8000-000000000004', 'admin', 'aal2');
set local role authenticated;

select throws_ok(
  $$ select public.admin_decide_artisan((select id from public.artisans where user_id = 'e1e1e1e1-0000-4000-8000-000000000001'), 'valide') $$,
  '22023', 'Les 4 documents doivent être validés et en cours de validité.',
  'validation impossible tant que les documents ne sont pas validés');
select throws_ok(
  $$ select public.admin_review_document((select id from public.artisan_documents where type = 'kbis' limit 1), 'refuse') $$,
  '22023', 'Motif de refus obligatoire.', 'refus de document sans motif impossible');

select lives_ok(
  $$ select public.admin_review_document(d.id, 'valide') from public.artisan_documents d
     where d.artisan_id = (select id from public.artisans where user_id = 'e1e1e1e1-0000-4000-8000-000000000001') $$,
  'les 4 documents sont validés');
select results_eq(
  $$ select count(*)::int from public.artisan_documents
     where status = 'valide' and verified_by = 'e4e4e4e4-0000-4000-8000-000000000004' and verified_at is not null $$,
  array[4], 'documents validés avec l''auteur et la date de vérification');
select lives_ok(
  $$ select public.admin_verify_certification((select id from public.certifications limit 1), true) $$,
  'certification vérifiée');

select throws_ok(
  $$ select public.admin_decide_artisan((select id from public.artisans where user_id = 'e1e1e1e1-0000-4000-8000-000000000001'), 'refuse') $$,
  '22023', null, 'refus sans message impossible');

select lives_ok(
  $$ select public.admin_decide_artisan((select id from public.artisans where user_id = 'e1e1e1e1-0000-4000-8000-000000000001'), 'valide') $$,
  'dossier complet validé');
reset role;

select results_eq(
  $$ select a.status::text, u.raw_app_meta_data ->> 'role', p.role::text
     from public.artisans a join auth.users u on u.id = a.user_id join public.profiles p on p.user_id = a.user_id
     where a.user_id = 'e1e1e1e1-0000-4000-8000-000000000001' $$,
  $$ values ('valide'::text, 'artisan'::text, 'artisan'::text) $$,
  'dossier validé : statut « valide », rôle « artisan » (app_metadata et profil)');

select pg_temp.connecter('e4e4e4e4-0000-4000-8000-000000000004', 'admin', 'aal2');
set local role authenticated;
select throws_ok(
  $$ select public.admin_decide_artisan((select id from public.artisans where user_id = 'e1e1e1e1-0000-4000-8000-000000000001'), 'refuse', 'x') $$,
  '22023', null, 'pas de seconde décision sur un dossier déjà traité');
select throws_ok(
  $$ select public.admin_decide_artisan((select id from public.artisans where user_id = 'e2e2e2e2-0000-4000-8000-000000000002'), 'valide') $$,
  '22023', null, 'pas de décision sur un dossier en brouillon');
select lives_ok(
  $$ select public.admin_decide_artisan((select id from public.artisans where user_id = 'e3e3e3e3-0000-4000-8000-000000000003'),
     'complement', 'Merci de déposer une attestation décennale lisible.') $$,
  'demande de complément');
select results_eq(
  $$ select status::text, refusal_reason from public.artisans where user_id = 'e3e3e3e3-0000-4000-8000-000000000003' $$,
  $$ values ('brouillon'::text, 'Merci de déposer une attestation décennale lisible.'::text) $$,
  'complément : retour en brouillon avec le message pour l''artisan');
select ok(
  (select count(*) from public.audit_logs where actor_id = 'e4e4e4e4-0000-4000-8000-000000000004') = 7,
  'journal d''audit : 4 documents, 1 certification, 2 décisions');
select results_eq(
  $$ select decision::text from public.artisan_reviews order by created_at $$,
  $$ values ('valide'::text), ('complement') $$, 'historique des décisions');
reset role;

-- ---------- Visibilité de l'historique ----------
select pg_temp.connecter('e3e3e3e3-0000-4000-8000-000000000003', 'artisan_en_attente');
set local role authenticated;
select results_eq($$ select decision::text from public.artisan_reviews $$, $$ values ('complement'::text) $$,
  'artisan : voit les décisions sur son dossier uniquement');
select is_empty('select 1 from public.audit_logs', 'artisan : journal d''audit invisible');
select throws_ok($$ insert into public.audit_logs (action, target_type) values ('x', 'y') $$, '42501', null,
  'journal d''audit non modifiable');
reset role;

select * from finish();
rollback;
