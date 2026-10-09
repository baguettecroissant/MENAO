-- F-51 : renouvellement des documents, suspension et réactivation automatiques, tâche quotidienne.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

insert into auth.users (id, email, raw_app_meta_data, raw_user_meta_data) values
  ('f1f1f1f1-0000-4000-8000-000000000001', 'suivi.a@example.test', '{"role":"artisan"}', '{}'),
  ('f2f2f2f2-0000-4000-8000-000000000002', 'suivi.b@example.test', '{"role":"artisan"}', '{}'),
  ('f4f4f4f4-0000-4000-8000-000000000004', 'suivi.adm@example.test', '{"role":"admin"}', '{}');

-- Les comptes créés avec le rôle « artisan » n'ont pas de fiche : on la crée (validée).
insert into public.artisans (user_id, status) values
  ('f1f1f1f1-0000-4000-8000-000000000001', 'valide'),
  ('f2f2f2f2-0000-4000-8000-000000000002', 'suspendu');
update public.artisans set suspension_reason = 'decision_admin' where user_id = 'f2f2f2f2-0000-4000-8000-000000000002';

create function pg_temp.artisan(uid uuid) returns uuid language sql as $$
  select id from public.artisans where user_id = uid
$$;

insert into public.artisan_documents (artisan_id, type, storage_path, mime_type, size_bytes, date_fin, status)
select pg_temp.artisan('f1f1f1f1-0000-4000-8000-000000000001'), d.type::public.document_type, 'a/' || d.type || '.pdf',
  'application/pdf', 100, d.fin, 'valide'
from (values ('decennale', current_date + 10), ('rc_pro', current_date + 200)) as d (type, fin);

-- ---------- Contraintes ----------
select throws_ok(
  $$ insert into public.artisan_documents (artisan_id, type, storage_path, mime_type, size_bytes, date_fin, status)
     values (pg_temp.artisan('f1f1f1f1-0000-4000-8000-000000000001'), 'decennale', 'a/dec2.pdf', 'application/pdf', 100, current_date + 400, 'valide') $$,
  '23505', null, 'un seul document validé par type');
select lives_ok(
  $$ insert into public.artisan_documents (artisan_id, type, storage_path, mime_type, size_bytes, date_fin)
     values (pg_temp.artisan('f1f1f1f1-0000-4000-8000-000000000001'), 'decennale', 'a/dec-renouv.pdf', 'application/pdf', 100, current_date + 400) $$,
  'un renouvellement en attente coexiste avec le document validé');

-- ---------- Tâche quotidienne : rien à faire tant que les assurances sont valides ----------
select app.daily_compliance();
select is((select status::text from public.artisans where id = pg_temp.artisan('f1f1f1f1-0000-4000-8000-000000000001')),
  'valide', 'assurances valides : artisan toujours validé');

-- La décennale expire : suspension automatique au passage de la tâche.
update public.artisan_documents set date_fin = current_date - 1
where storage_path = 'a/decennale.pdf';
select app.daily_compliance();
select results_eq(
  $$ select status::text, suspension_reason from public.artisans where id = pg_temp.artisan('f1f1f1f1-0000-4000-8000-000000000001') $$,
  $$ values ('suspendu'::text, 'documents_expires'::text) $$, 'décennale expirée : suspension automatique');
select ok(exists (select 1 from public.audit_logs where action = 'artisan.suspendu_auto'
  and target_id = pg_temp.artisan('f1f1f1f1-0000-4000-8000-000000000001')), 'suspension tracée dans le journal d''audit');

-- ---------- L'admin valide le renouvellement : ancien document archivé, artisan réactivé ----------
select set_config('request.jwt.claims', jsonb_build_object('sub', 'f4f4f4f4-0000-4000-8000-000000000004',
  'role', 'authenticated', 'aal', 'aal2', 'app_metadata', jsonb_build_object('role', 'admin'))::text, true);
set local role authenticated;
select lives_ok(
  $$ select public.admin_review_document((select id from public.artisan_documents where storage_path = 'a/dec-renouv.pdf'), 'valide') $$,
  'renouvellement validé');
select throws_ok(
  $$ select public.admin_review_document((select id from public.artisan_documents where storage_path = 'a/decennale.pdf'), 'valide') $$,
  '22023', 'Document introuvable.', 'un document archivé ne peut plus être revu');
reset role;

select results_eq(
  $$ select storage_path, status::text from public.artisan_documents
     where artisan_id = pg_temp.artisan('f1f1f1f1-0000-4000-8000-000000000001') and type = 'decennale' order by storage_path $$,
  $$ values ('a/dec-renouv.pdf'::text, 'valide'::text), ('a/decennale.pdf', 'remplace') $$,
  'ancienne décennale archivée (« remplace »), nouvelle en cours');
select results_eq(
  $$ select status::text, suspension_reason from public.artisans where id = pg_temp.artisan('f1f1f1f1-0000-4000-8000-000000000001') $$,
  $$ values ('valide'::text, null::text) $$, 'assurances à jour : suspension levée automatiquement');

-- ---------- Une suspension décidée par un admin n'est jamais levée automatiquement ----------
insert into public.artisan_documents (artisan_id, type, storage_path, mime_type, size_bytes, date_fin, status)
select pg_temp.artisan('f2f2f2f2-0000-4000-8000-000000000002'), d.type::public.document_type, 'b/' || d.type || '.pdf',
  'application/pdf', 100, current_date + 100, 'valide'
from (values ('decennale'), ('rc_pro')) as d (type);
select app.daily_compliance();
select is((select status::text from public.artisans where id = pg_temp.artisan('f2f2f2f2-0000-4000-8000-000000000002')),
  'suspendu', 'suspension par décision admin maintenue');

-- ---------- Purge et planification ----------
insert into public.rate_limits (key, window_start, hits) values ('ancien', now() - interval '3 days', 1);
select app.daily_compliance();
select is_empty($$ select 1 from public.rate_limits where key = 'ancien' $$, 'fenêtres de limitation expirées purgées');
select is((select count(*)::int from cron.job where jobname = 'menao-conformite-quotidienne'), 1,
  'tâche quotidienne planifiée (pg_cron)');

-- ---------- Droits ----------
select set_config('request.jwt.claims', jsonb_build_object('sub', 'f1f1f1f1-0000-4000-8000-000000000001',
  'role', 'authenticated', 'app_metadata', jsonb_build_object('role', 'artisan'))::text, true);
set local role authenticated;
select throws_ok('select app.daily_compliance()', '42501', null, 'artisan : ne lance pas la tâche quotidienne');
select throws_ok(
  $$ update public.artisans set status = 'valide', suspension_reason = null $$, '42501', null,
  'artisan : ne lève pas lui-même une suspension');
reset role;

select * from finish();
rollback;
