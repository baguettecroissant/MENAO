-- Motifs de refus en liste (ADR 0120) : un refus exige un motif de la liste et un message ;
-- le code est gardé avec le message, et dans le journal ; une validation l'efface ; réservé aux
-- admins. Données fictives.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

insert into auth.users (id, email, is_anonymous, email_confirmed_at, raw_app_meta_data, raw_user_meta_data) values
  ('c6400000-0000-4000-8000-000000000001', 'motif64.artisan@example.test', false, now(), '{}', '{"account_type":"artisan"}'),
  ('c6400000-0000-4000-8000-000000000002', 'motif64.admin@example.test', false, now(), '{"role":"admin"}', '{}');

create function pg_temp.connecter(uid uuid, app_role text, aal text default 'aal2') returns void language sql as $$
  select set_config('request.jwt.claims', jsonb_build_object(
    'sub', uid, 'role', 'authenticated', 'aal', aal, 'app_metadata', jsonb_build_object('role', app_role)
  )::text, true);
$$;

insert into public.artisan_documents (artisan_id, type, storage_path, mime_type, size_bytes, date_emission)
select id, 'kbis', 'motif64/kbis.pdf', 'application/pdf', 1000, current_date - 10
from public.artisans where user_id = 'c6400000-0000-4000-8000-000000000001';
create function pg_temp.kbis() returns uuid language sql as $$
  select id from public.artisan_documents where storage_path = 'motif64/kbis.pdf'
$$;
grant execute on function pg_temp.kbis() to authenticated;

-- ---------- Réservé aux admins ----------
select pg_temp.connecter('c6400000-0000-4000-8000-000000000001', 'artisan_en_attente', 'aal1');
set local role authenticated;
select throws_ok($$ select public.admin_review_document(pg_temp.kbis(), 'refuse', 'Illisible', 'illisible') $$,
  '42501', null, 'artisan : décision impossible');
reset role;

-- ---------- Refus : motif de la liste et message ----------
select pg_temp.connecter('c6400000-0000-4000-8000-000000000002', 'admin');
set local role authenticated;
select throws_ok($$ select public.admin_review_document(pg_temp.kbis(), 'refuse', 'Document illisible') $$,
  '22023', 'Motif de refus obligatoire.', 'refus sans motif de la liste : impossible');
select throws_ok($$ select public.admin_review_document(pg_temp.kbis(), 'refuse', ' ', 'illisible') $$,
  '22023', 'Motif de refus obligatoire.', 'refus sans message : impossible');
select throws_ok($$ select public.admin_review_document(pg_temp.kbis(), 'refuse', 'Motif', 'inconnu') $$,
  '23514', null, 'motif hors liste : refusé par la base');
select lives_ok($$ select public.admin_review_document(pg_temp.kbis(), 'refuse',
  'Document illisible : reprenez la photo à plat, bien éclairée.', 'illisible') $$, 'refus avec motif');
reset role;

select results_eq(
  $$ select status::text, refusal_code, refusal_reason from public.artisan_documents where id = pg_temp.kbis() $$,
  $$ values ('refuse'::text, 'illisible'::text, 'Document illisible : reprenez la photo à plat, bien éclairée.'::text) $$,
  'motif et message enregistrés');
select is(
  (select data ->> 'code' from public.audit_logs where target_id = pg_temp.kbis() and action = 'document.refuse'),
  'illisible', 'motif inscrit au journal');

-- ---------- Validation : plus de motif ----------
select pg_temp.connecter('c6400000-0000-4000-8000-000000000002', 'admin');
set local role authenticated;
select lives_ok($$ select public.admin_review_document(pg_temp.kbis(), 'valide') $$, 'validation après correction');
reset role;
select results_eq(
  $$ select status::text, refusal_code, refusal_reason from public.artisan_documents where id = pg_temp.kbis() $$,
  $$ values ('valide'::text, null::text, null::text) $$,
  'document validé : motif effacé');

select * from finish();
rollback;
