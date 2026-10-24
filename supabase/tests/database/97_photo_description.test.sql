-- Photo → description (ADR 0180) : le journal ai_runs accepte describe-photo, et reste invisible
-- pour un visiteur. Données fictives.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

select lives_ok(
  $$ insert into public.ai_runs (function_name, model, outcome, latency_ms)
     values ('describe-photo', 'claude-haiku-5-5', 'ok', 2100) $$,
  'journal : describe-photo accepté'
);
select lives_ok(
  $$ insert into public.ai_runs (function_name, model, outcome, latency_ms)
     values ('suggest-need', 'claude-haiku-5-5', 'ok', 900) $$,
  'journal : suggest-need toujours accepté'
);
select throws_ok(
  $$ insert into public.ai_runs (function_name, model, outcome, latency_ms)
     values ('autre-fonction', 'claude-haiku-5-5', 'ok', 10) $$,
  '23514', null, 'journal : fonction inconnue refusée'
);

select set_config('request.jwt.claims', jsonb_build_object(
  'sub', 'e9700000-0000-4000-8000-000000000001', 'role', 'authenticated', 'is_anonymous', true
)::text, true);
set local role authenticated;
select is((select count(*)::int from public.ai_runs), 0, 'journal : invisible pour un visiteur');
reset role;

select * from finish();
rollback;
