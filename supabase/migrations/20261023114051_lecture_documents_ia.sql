-- Lecture automatique des documents de l'artisan par l'IA (ADR 0176) : Edge Function read-document.

-- Journal des appels à l'IA : métriques de la nouvelle fonction (jamais le contenu du document).
alter table public.ai_runs drop constraint ai_runs_function_name_check;
alter table public.ai_runs add constraint ai_runs_function_name_check
  check (function_name in ('analyze-need', 'transcribe', 'quote-from-voice', 'read-document'));

-- Le document est déposé dès qu'il est choisi, pour être lu. S'il est remplacé avant l'envoi,
-- l'utilisateur retire l'ancien fichier brut de son propre dossier (l'API Storage demande les
-- droits de lecture et de suppression).
create policy "uploads : lecture de son propre dossier"
  on storage.objects for select to authenticated
  using (bucket_id = 'uploads' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "uploads : suppression dans son propre dossier"
  on storage.objects for delete to authenticated
  using (bucket_id = 'uploads' and (storage.foldername(name))[1] = (select auth.uid())::text);
