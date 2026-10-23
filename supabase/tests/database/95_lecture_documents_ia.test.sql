-- Lecture automatique des documents (ADR 0176) : journal ai_runs de read-document, et fichiers
-- bruts de « uploads » lisibles et supprimables par leur seul propriétaire. Données fictives.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

insert into auth.users (id, email, is_anonymous, email_confirmed_at, raw_app_meta_data, raw_user_meta_data) values
  ('e9500000-0000-4000-8000-000000000001', 'lecture95.a@example.test', false, now(), '{"role":"artisan"}', '{}'),
  ('e9500000-0000-4000-8000-000000000002', 'lecture95.b@example.test', false, now(), '{"role":"artisan"}', '{}');

-- Fichiers bruts déposés (écrits directement, hors RLS).
insert into storage.objects (bucket_id, name) values
  ('uploads', 'e9500000-0000-4000-8000-000000000001/a.pdf'),
  ('uploads', 'e9500000-0000-4000-8000-000000000002/b.pdf');

select lives_ok(
  $$ insert into public.ai_runs (function_name, model, outcome, latency_ms)
     values ('read-document', 'claude-haiku-5-5', 'ok', 1800) $$,
  'journal : read-document accepté'
);
select throws_ok(
  $$ insert into public.ai_runs (function_name, model, outcome, latency_ms)
     values ('autre-fonction', 'claude-haiku-5-5', 'ok', 10) $$,
  '23514', null, 'journal : fonction inconnue refusée'
);

select set_config('request.jwt.claims', jsonb_build_object(
  'sub', 'e9500000-0000-4000-8000-000000000001', 'role', 'authenticated',
  'app_metadata', jsonb_build_object('role', 'artisan')
)::text, true);
set local role authenticated;
select results_eq(
  $$ select name from storage.objects where bucket_id = 'uploads' order by name $$,
  $$ values ('e9500000-0000-4000-8000-000000000001/a.pdf'::text) $$,
  'uploads : chacun ne voit que ses propres fichiers bruts'
);
reset role;

set local role anon;
select is_empty(
  $$ select 1 from storage.objects where bucket_id = 'uploads' $$,
  'uploads : rien pour un visiteur'
);
reset role;

select policy_cmd_is('storage', 'objects', 'uploads : suppression dans son propre dossier', 'DELETE',
  'uploads : règle de suppression');
select policy_roles_are('storage', 'objects', 'uploads : suppression dans son propre dossier',
  array['authenticated'], 'uploads : suppression réservée aux comptes connectés');
select ok(
  (select qual like '%uploads%' and qual like '%auth.uid()%' from pg_policies
   where schemaname = 'storage' and tablename = 'objects'
     and policyname = 'uploads : suppression dans son propre dossier'),
  'uploads : suppression limitée à son propre dossier'
);

select * from finish();
rollback;
