-- Synchronisation avec le calendrier du téléphone (F-44, ADR 0203) : plages occupées lues par
-- l'application dans les calendriers choisis par l'artisan (iCloud, Google, Outlook… réunis par
-- le téléphone). Seulement le début et la fin : jamais le titre, le lieu ni les participants.
-- Elles apparaissent en « Occupé » dans l'agenda MENAO et comptent dans les avertissements des
-- rendez-vous ; elles ne sont pas reprises dans l'abonnement .ics (elles en viennent).

create table public.artisan_external_busy (
  id uuid primary key default gen_random_uuid(),
  artisan_id uuid not null references public.artisans (id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at and ends_at - starts_at <= interval '14 days')
);
create index artisan_external_busy_artisan_idx on public.artisan_external_busy (artisan_id, starts_at);
alter table public.artisan_external_busy enable row level security;
-- Écriture par les fonctions ci-dessous seulement ; lecture par l'artisan.
revoke all on public.artisan_external_busy from anon, authenticated;
grant select on public.artisan_external_busy to authenticated;
create policy "artisan_external_busy : lecture par l'artisan"
  on public.artisan_external_busy for select to authenticated
  using (artisan_id = (select app.my_artisan_id()));

-- Plages lues par le téléphone sur une période : elles remplacent celles déjà connues sur cette
-- période (événement supprimé ou déplacé dans le calendrier : il disparaît aussi de MENAO).
-- 500 plages au plus, période de 120 jours au plus, plages coupées à la période.
create function public.replace_external_busy(p_from timestamptz, p_to timestamptz, p_slots jsonb)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_artisan uuid := app.my_artisan_id();
  v_count integer;
begin
  if v_artisan is null then
    raise exception 'Réservé aux artisans' using errcode = '42501';
  end if;
  if p_from is null or p_to is null or p_to <= p_from or p_to - p_from > interval '120 days'
     or p_from < now() - interval '2 days' then
    raise exception 'Période invalide' using errcode = '22023';
  end if;
  if jsonb_typeof(coalesce(p_slots, '[]'::jsonb)) <> 'array' or jsonb_array_length(coalesce(p_slots, '[]'::jsonb)) > 500 then
    raise exception 'Trop de plages' using errcode = '22023';
  end if;

  delete from public.artisan_external_busy
  where artisan_id = v_artisan and starts_at < p_to and ends_at > p_from;

  insert into public.artisan_external_busy (artisan_id, starts_at, ends_at)
  select v_artisan, greatest(s.starts_at, p_from), least(s.ends_at, p_to, s.starts_at + interval '14 days')
  from jsonb_to_recordset(coalesce(p_slots, '[]'::jsonb)) as s (starts_at timestamptz, ends_at timestamptz)
  where s.starts_at is not null and s.ends_at is not null
    and least(s.ends_at, p_to, s.starts_at + interval '14 days') > greatest(s.starts_at, p_from);
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;
revoke execute on function public.replace_external_busy(timestamptz, timestamptz, jsonb) from public, anon;
grant execute on function public.replace_external_busy(timestamptz, timestamptz, jsonb) to authenticated;

-- « Ne plus tenir compte de mes autres rendez-vous » : toutes les plages sont oubliées.
create function public.clear_external_busy()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_artisan uuid := app.my_artisan_id();
begin
  if v_artisan is null then
    raise exception 'Réservé aux artisans' using errcode = '42501';
  end if;
  delete from public.artisan_external_busy where artisan_id = v_artisan;
end;
$$;
revoke execute on function public.clear_external_busy() from public, anon;
grant execute on function public.clear_external_busy() to authenticated;
