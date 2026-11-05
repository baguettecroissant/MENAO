-- Secrétaire vocale « Camille » (F-75, ADR 0225) : assistante IA vocale (Vapi) qui répond aux
-- artisans. Ses outils passent par l'Edge Function voice-assistant (rôle service), jamais par le
-- navigateur : les deux fonctions ci-dessous ne sont ouvertes qu'au rôle service.
-- - État du dossier d'un artisan d'après l'adresse e-mail de son compte : l'Edge Function l'envoie
--   à cette adresse, rien n'est dit au téléphone (l'appelant n'est pas identifié).
-- - Demande de rappel : ticket rappel_pro pour l'équipe, comme le bouton « Être rappelé » des pages
--   Pro (ADR 0218), avec le motif et le meilleur moment.
-- - Journal ai_runs : durée des appels (jamais la transcription).

alter table public.ai_runs drop constraint ai_runs_function_name_check;
alter table public.ai_runs add constraint ai_runs_function_name_check
  check (function_name in (
    'analyze-need', 'transcribe', 'quote-from-voice', 'read-document', 'suggest-need',
    'describe-photo', 'read-expense', 'pro-assistant', 'client-assistant', 'commercial-copilot',
    'voice-assistant'
  ));

-- Statut, étapes manquantes et prénom de l'artisan dont le compte a cette adresse ; null sinon.
create function public.voice_dossier_for_email(p_email text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'prenom', nullif(btrim(p.first_name), ''),
    'statut', a.status,
    'manque_inscription', to_jsonb(coalesce(app.onboarding_missing_steps(a.id), '{}'::text[])),
    'manque_activation', to_jsonb(coalesce(app.activation_missing_steps(a.id), '{}'::text[]))
  )
  from auth.users u
  join public.artisans a on a.user_id = u.id
  left join public.profiles p on p.user_id = u.id
  where lower(u.email) = lower(btrim(coalesce(p_email, '')))
    and btrim(coalesce(p_email, '')) <> ''
  limit 1
$$;
revoke execute on function public.voice_dossier_for_email(text) from public, anon, authenticated;
grant execute on function public.voice_dossier_for_email(text) to service_role;

-- Demande de rappel dictée à Camille. Mêmes limites que request_pro_callback : 2 par téléphone ou
-- par e-mail et par 24 h, 30 par heure au total.
create function public.voice_request_callback(
  p_first_name text,
  p_phone text,
  p_email text,
  p_reason text,
  p_moment text default null,
  p_trade text default null,
  p_city text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_first_name text := btrim(coalesce(p_first_name, ''));
  v_phone text := btrim(coalesce(p_phone, ''));
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_reason text := nullif(btrim(left(coalesce(p_reason, ''), 300)), '');
  v_moment text := nullif(btrim(left(coalesce(p_moment, ''), 100)), '');
  v_trade text := nullif(btrim(left(coalesce(p_trade, ''), 80)), '');
  v_city text := nullif(btrim(left(coalesce(p_city, ''), 100)), '');
  v_id uuid;
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
  if v_reason is null then
    raise exception 'Motif obligatoire' using errcode = '22023';
  end if;
  if (select count(*) from public.tickets
      where type = 'rappel_pro' and created_at > now() - interval '1 hour') >= 30 then
    raise exception 'Trop de demandes envoyées' using errcode = '22023';
  end if;
  if (select count(*) from public.tickets
      where type = 'rappel_pro' and (contact_phone = v_phone or contact_email = v_email)
        and created_at > now() - interval '24 hours') >= 2 then
    raise exception 'Demande déjà enregistrée' using errcode = '22023';
  end if;
  insert into public.tickets (type, user_id, contact_email, contact_phone, subject, message, due_at)
  values (
    'rappel_pro', null, v_email, v_phone, 'Demande de rappel (secrétaire vocale Camille)',
    concat_ws(E'\n',
      'Prénom : ' || v_first_name,
      'Motif : ' || v_reason,
      'Meilleur moment : ' || v_moment,
      'Métier : ' || v_trade,
      'Commune : ' || v_city
    ),
    now() + interval '1 day'
  )
  returning id into v_id;
  return v_id;
end;
$$;
revoke execute on function public.voice_request_callback(text, text, text, text, text, text, text)
  from public, anon, authenticated;
grant execute on function public.voice_request_callback(text, text, text, text, text, text, text)
  to service_role;
