-- Assistant des pages Pro (F-69, ADR 0218).
-- - Demande de rappel « Être rappelé » : ticket rappel_pro pour l'équipe, sans compte, avec le
--   téléphone à rappeler (seule donnée nouvelle des tickets), à traiter sous 24 h.
-- - Journal ai_runs : métriques des réponses de l'assistant (jamais la question ni la réponse).

alter table public.tickets
  add column contact_phone text check (contact_phone ~ '^\+[1-9][0-9]{7,14}$');

alter table public.tickets drop constraint tickets_auteur_check;
alter table public.tickets add constraint tickets_auteur_check
  check (type in ('contact', 'rappel_pro') or user_id is not null);
alter table public.tickets add constraint tickets_rappel_pro_telephone_check
  check (type <> 'rappel_pro' or contact_phone is not null);

alter table public.ai_runs drop constraint ai_runs_function_name_check;
alter table public.ai_runs add constraint ai_runs_function_name_check
  check (function_name in (
    'analyze-need', 'transcribe', 'quote-from-voice', 'read-document', 'suggest-need',
    'describe-photo', 'read-expense', 'pro-assistant'
  ));

-- Mêmes règles que proCallbackSchema (packages/validation). 2 demandes par téléphone ou par
-- e-mail et par 24 h ; 30 par heure au total contre les envois automatisés.
create function public.request_pro_callback(
  p_first_name text,
  p_phone text,
  p_email text,
  p_trade text default null,
  p_city text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_first_name text := btrim(coalesce(p_first_name, ''));
  v_phone text := btrim(coalesce(p_phone, ''));
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_trade text := nullif(btrim(left(coalesce(p_trade, ''), 80)), '');
  v_city text := nullif(btrim(left(coalesce(p_city, ''), 100)), '');
begin
  if v_first_name = '' or char_length(v_first_name) > 60 then
    raise exception 'Prénom obligatoire' using errcode = '22023';
  end if;
  if v_phone !~ '^\+[1-9][0-9]{7,14}$' then
    raise exception 'Numéro de téléphone invalide' using errcode = '22023';
  end if;
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or char_length(v_email) > 254 then
    raise exception 'Adresse e-mail invalide' using errcode = '22023';
  end if;
  if (select count(*) from public.tickets
      where type = 'rappel_pro' and created_at > now() - interval '1 hour') >= 30 then
    raise exception 'Trop de demandes envoyées. Réessayez plus tard.' using errcode = '22023';
  end if;
  if (select count(*) from public.tickets
      where type = 'rappel_pro' and (contact_phone = v_phone or contact_email = v_email)
        and created_at > now() - interval '24 hours') >= 2 then
    raise exception 'Votre demande est déjà enregistrée : nous vous rappelons très vite.'
      using errcode = '22023';
  end if;
  insert into public.tickets (type, user_id, contact_email, contact_phone, subject, message, due_at)
  values (
    'rappel_pro', auth.uid(), v_email, v_phone, 'Demande de rappel (assistant des pages Pro)',
    concat_ws(E'\n', 'Prénom : ' || v_first_name, 'Métier : ' || v_trade, 'Commune : ' || v_city),
    now() + interval '1 day'
  );
end;
$$;
revoke execute on function public.request_pro_callback(text, text, text, text, text) from public;
grant execute on function public.request_pro_callback(text, text, text, text, text) to anon, authenticated;
