-- F-19 (phase 3d) — dictée intelligente du devis : dictées sauvegardées par l'artisan (texte
-- transcrit, l'audio n'est pas conservé) et journal des appels à quote-from-voice. ADR 0019.

-- Journal des appels aux modèles (métriques seulement, ADR 0012) : nouvelle fonction.
alter table public.ai_runs drop constraint ai_runs_function_name_check;
alter table public.ai_runs add constraint ai_runs_function_name_check
  check (function_name in ('analyze-need', 'transcribe', 'quote-from-voice'));

-- « Sauvegarder cet enregistrement » : une dictée par chantier, pour générer le devis plus tard.
create table public.quote_dictations (
  id uuid primary key default gen_random_uuid(),
  chantier_id uuid not null unique references public.chantiers (id) on delete cascade,
  artisan_id uuid not null references public.artisans (id) on delete cascade,
  transcript text not null check (char_length(transcript) between 1 and 5000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index quote_dictations_artisan_idx on public.quote_dictations (artisan_id);
create trigger quote_dictations_set_updated_at before update on public.quote_dictations
  for each row execute function app.set_updated_at();
alter table public.quote_dictations enable row level security;
revoke all on public.quote_dictations from anon, authenticated;
grant select on public.quote_dictations to authenticated;

create policy "quote_dictations : lecture par l'artisan"
  on public.quote_dictations for select to authenticated
  using (artisan_id = (select app.my_artisan_id()));

create function public.artisan_save_dictation(p_chantier_id uuid, p_transcript text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.chantiers;
  v_text text := btrim(coalesce(p_transcript, ''));
begin
  select * into v from public.chantiers
  where id = p_chantier_id and artisan_id = app.my_artisan_id();
  if not found then
    raise exception 'Chantier introuvable' using errcode = '42501';
  end if;
  if v.status not in ('rdv_planifie', 'devis_en_revision') then
    raise exception 'Ce chantier n''attend pas de devis' using errcode = '22023';
  end if;
  if char_length(v_text) not between 1 and 5000 then
    raise exception 'Dictée vide ou trop longue (5 000 caractères au plus)' using errcode = '22023';
  end if;
  insert into public.quote_dictations (chantier_id, artisan_id, transcript)
  values (p_chantier_id, v.artisan_id, v_text)
  on conflict (chantier_id) do update set transcript = excluded.transcript;
end;
$$;
revoke execute on function public.artisan_save_dictation(uuid, text) from public, anon;
grant execute on function public.artisan_save_dictation(uuid, text) to authenticated;

create function public.artisan_delete_dictation(p_chantier_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.quote_dictations
  where chantier_id = p_chantier_id and artisan_id = app.my_artisan_id()
$$;
revoke execute on function public.artisan_delete_dictation(uuid) from public, anon;
grant execute on function public.artisan_delete_dictation(uuid) to authenticated;
