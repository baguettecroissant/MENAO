-- Suggestions pendant la saisie de la recherche (ADR 0177) : Edge Function suggest-need.
-- Journal des appels à l'IA : métriques de la nouvelle fonction (jamais le texte saisi).
alter table public.ai_runs drop constraint ai_runs_function_name_check;
alter table public.ai_runs add constraint ai_runs_function_name_check
  check (function_name in ('analyze-need', 'transcribe', 'quote-from-voice', 'read-document', 'suggest-need'));
