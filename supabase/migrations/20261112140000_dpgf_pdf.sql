-- Appels d'offres, PDF (F-137, ADR 0288) : un DPGF en PDF est lu par un modèle de langage dans
-- l'Edge Function tender-sheet. Journal ai_runs : métriques de ces lectures (jamais le document).
alter table public.ai_runs drop constraint ai_runs_function_name_check;
alter table public.ai_runs add constraint ai_runs_function_name_check
  check (function_name in (
    'analyze-need', 'transcribe', 'quote-from-voice', 'read-document', 'suggest-need',
    'describe-photo', 'read-expense', 'pro-assistant', 'client-assistant', 'commercial-copilot',
    'voice-assistant', 'artisan-assistant', 'read-dpgf'
  ));
