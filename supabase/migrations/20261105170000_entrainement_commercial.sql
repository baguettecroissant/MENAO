-- Simulateur d'entraînement des commerciaux (F-74, ADR 0224) : l'IA joue un artisan, un coach note
-- l'échange sur 20. Seuls la note, l'artisan choisi et le nombre de messages sont gardés, pour le
-- commercial (ses dernières séances) et l'équipe (progression) ; jamais la conversation.

create table public.commercial_trainings (
  id uuid primary key default gen_random_uuid(),
  commercial_id uuid not null references public.commercials (id) on delete cascade,
  persona text not null check (persona in ('mefiant', 'presse', 'autre_plateforme', 'debutant', 'patron')),
  score int not null check (score between 0 and 20),
  turns int not null check (turns between 1 and 12),
  created_at timestamptz not null default now()
);

create index commercial_trainings_commercial_idx on public.commercial_trainings (commercial_id, created_at desc);

alter table public.commercial_trainings enable row level security;
revoke all on public.commercial_trainings from anon, authenticated;
grant select on public.commercial_trainings to authenticated;

create policy "commercial_trainings : lecture par le commercial ou un admin"
  on public.commercial_trainings for select to authenticated
  using (commercial_id = (select app.my_commercial_id()) or (select app.is_admin()));

-- Enregistrer la note d'une séance (appelée par l'Edge Function avec le jeton du commercial).
create function public.commercial_save_training(p_persona text, p_score int, p_turns int)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := app.my_commercial_id();
  v_id uuid;
begin
  if v_me is null then
    raise exception 'Réservé aux commerciaux' using errcode = '42501';
  end if;
  if p_persona is null or p_persona not in ('mefiant', 'presse', 'autre_plateforme', 'debutant', 'patron')
    or p_score is null or p_score not between 0 and 20
    or p_turns is null or p_turns not between 1 and 12 then
    raise exception 'Séance invalide.' using errcode = '22023';
  end if;
  insert into public.commercial_trainings (commercial_id, persona, score, turns)
  values (v_me, p_persona, p_score, p_turns)
  returning id into v_id;
  return v_id;
end;
$$;
revoke execute on function public.commercial_save_training(text, int, int) from public, anon;
grant execute on function public.commercial_save_training(text, int, int) to authenticated;
