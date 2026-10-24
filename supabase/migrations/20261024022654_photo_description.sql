-- Photo → description de la recherche (ADR 0180) : Edge Function describe-photo.
-- Journal des appels à l'IA : métriques de la nouvelle fonction (jamais la photo ni le texte).
alter table public.ai_runs drop constraint ai_runs_function_name_check;
alter table public.ai_runs add constraint ai_runs_function_name_check
  check (function_name in (
    'analyze-need', 'transcribe', 'quote-from-voice', 'read-document', 'suggest-need', 'describe-photo'
  ));
