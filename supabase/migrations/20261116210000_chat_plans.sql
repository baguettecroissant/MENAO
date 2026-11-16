-- « Demander à MENAO », le chat sur les plans (F-160, maquette du lot 59, ADR 0346).
-- L'artisan pose une question sur les plans d'un appel d'offres ; la fonction serveur plan-chat
-- répond avec les calculs de packages/core et enregistre l'échange ici. Formule Entreprise ;
-- nombre de questions par mois en réglage (décision à valider : 40 par défaut).

create table public.tender_chat_messages (
  id uuid primary key default gen_random_uuid(),
  tender_id uuid not null references public.tenders (id) on delete cascade,
  artisan_id uuid not null references public.artisans (id) on delete cascade,
  author_id uuid references auth.users (id) on delete set null,
  role text not null check (role in ('artisan', 'menao')),
  content text not null check (char_length(btrim(content)) between 1 and 6000),
  -- Réponse de MENAO : métré, fournitures, étapes de calcul, ou question de précision.
  result jsonb check (result is null or (jsonb_typeof(result) = 'object' and pg_column_size(result) <= 200000)),
  created_at timestamptz not null default now()
);
create index tender_chat_messages_tender_idx on public.tender_chat_messages (tender_id, created_at);
create index tender_chat_messages_artisan_idx on public.tender_chat_messages (artisan_id, created_at);

alter table public.tender_chat_messages enable row level security;
revoke all on public.tender_chat_messages from anon, authenticated;
grant select on public.tender_chat_messages to authenticated;
-- Lecture par l'entreprise (patron, chef d'équipe) ou un admin ; écriture par les fonctions.
create policy "tender_chat_messages : lecture par l'entreprise ou un admin"
  on public.tender_chat_messages for select to authenticated
  using (artisan_id = (select app.my_manager_artisan_id()) or (select app.is_admin()));

insert into public.platform_settings (key, value) values ('plan_chat_questions_mois', '40')
  on conflict (key) do nothing;

alter table public.ai_runs drop constraint ai_runs_function_name_check;
alter table public.ai_runs add constraint ai_runs_function_name_check
  check (function_name in (
    'analyze-need', 'transcribe', 'quote-from-voice', 'read-document', 'suggest-need',
    'describe-photo', 'read-expense', 'pro-assistant', 'client-assistant', 'commercial-copilot',
    'voice-assistant', 'artisan-assistant', 'read-dpgf', 'read-plan', 'read-catalog', 'plan-chat'
  ));

-- Questions posées ce mois-ci (heure de Paris) par l'entreprise, et le nombre inclus.
create function app.plan_chat_quota(p_artisan uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'used', (
      select count(*)::int from public.tender_chat_messages m
      where m.artisan_id = p_artisan and m.role = 'artisan'
        and m.created_at >= (date_trunc('month', now() at time zone 'Europe/Paris') at time zone 'Europe/Paris')
    ),
    'limit', coalesce((
      select (s.value #>> '{}')::int from public.platform_settings s
      where s.key = 'plan_chat_questions_mois' and jsonb_typeof(s.value) = 'number'
    ), 40)
  )
$$;
revoke execute on function app.plan_chat_quota(uuid) from public, anon, authenticated;

create function public.artisan_plan_chat_quota()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  return app.plan_chat_quota(app.tender_artisan());
end;
$$;
revoke execute on function public.artisan_plan_chat_quota() from public, anon;
grant execute on function public.artisan_plan_chat_quota() to authenticated;

-- Une question et la réponse de MENAO, dans la limite du mois.
create function public.artisan_save_plan_chat(
  p_tender_id uuid,
  p_question text,
  p_answer text,
  p_result jsonb default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  t public.tenders := app.my_plan_tender(p_tender_id);
  v_quota jsonb := app.plan_chat_quota(t.artisan_id);
  v_id uuid;
begin
  if (v_quota ->> 'used')::int >= (v_quota ->> 'limit')::int then
    raise exception 'Questions du mois épuisées.' using errcode = '53400';
  end if;
  if p_question is null or char_length(btrim(p_question)) not between 1 and 2000
    or p_answer is null or char_length(btrim(p_answer)) not between 1 and 6000 then
    raise exception 'Message invalide.' using errcode = '22023';
  end if;
  if p_result is not null and jsonb_typeof(p_result) <> 'object' then
    raise exception 'Résultat invalide.' using errcode = '22023';
  end if;
  insert into public.tender_chat_messages (tender_id, artisan_id, author_id, role, content)
  values (t.id, t.artisan_id, (select auth.uid()), 'artisan', btrim(p_question));
  insert into public.tender_chat_messages (tender_id, artisan_id, role, content, result, created_at)
  values (t.id, t.artisan_id, 'menao', btrim(p_answer), p_result, now() + interval '1 millisecond')
  returning id into v_id;
  return v_id;
end;
$$;
revoke execute on function public.artisan_save_plan_chat(uuid, text, text, jsonb) from public, anon;
grant execute on function public.artisan_save_plan_chat(uuid, text, text, jsonb) to authenticated;
