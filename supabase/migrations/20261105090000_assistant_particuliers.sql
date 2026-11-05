-- Assistant des particuliers (F-71, ADR 0220) : le journal ai_runs accepte ses métriques (jamais
-- le message ni la réponse).
alter table public.ai_runs drop constraint ai_runs_function_name_check;
alter table public.ai_runs add constraint ai_runs_function_name_check
  check (function_name in (
    'analyze-need', 'transcribe', 'quote-from-voice', 'read-document', 'suggest-need',
    'describe-photo', 'read-expense', 'pro-assistant', 'client-assistant'
  ));
