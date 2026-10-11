-- F-44 (agenda et disponibilités) — l'artisan règle ses disponibilités et tient son agenda :
-- horaires de travail de la semaine, absences sur des journées entières (congés, fermetures),
-- créneaux bloqués sur une journée, et abonnement .ics personnel pour Google Agenda, Apple
-- Calendrier ou Outlook. Pendant une absence, l'artisan n'est plus proposé dans les recherches et
-- sa fiche l'indique indisponible (spec F-09 : « pas en pause / congés »). Les horaires ne sont
-- pas publiés : ils servent aux créneaux de rendez-vous proposés et à l'agenda. Écritures par les
-- fonctions ci-dessous, avec les contrôles de packages/core/src/agenda.ts. ADR 0036.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

-- Horaires : trois plages disjointes par jour au plus (1 = lundi … 7 = dimanche).
create table public.artisan_hours (
  id uuid primary key default gen_random_uuid(),
  artisan_id uuid not null references public.artisans (id) on delete cascade,
  weekday smallint not null check (weekday between 1 and 7),
  start_time time not null,
  end_time time not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (artisan_id, weekday, start_time),
  check (start_time < end_time)
);
create trigger artisan_hours_set_updated_at before update on public.artisan_hours
  for each row execute function app.set_updated_at();

-- Absences sur des journées entières, bornes incluses (congés, formation, fermeture…).
create table public.artisan_absences (
  id uuid primary key default gen_random_uuid(),
  artisan_id uuid not null references public.artisans (id) on delete cascade,
  starts_on date not null,
  ends_on date not null,
  label text check (char_length(label) between 1 and 80),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Un an au plus.
  check (ends_on >= starts_on and ends_on - starts_on < 365)
);
create index artisan_absences_artisan_idx on public.artisan_absences (artisan_id, ends_on);
create trigger artisan_absences_set_updated_at before update on public.artisan_absences
  for each row execute function app.set_updated_at();

-- Créneaux bloqués sur une journée (rendez-vous personnel, chantier hors MENAO…).
create table public.artisan_blocked_slots (
  id uuid primary key default gen_random_uuid(),
  artisan_id uuid not null references public.artisans (id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  label text check (char_length(label) between 1 and 80),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at and ends_at - starts_at <= interval '24 hours')
);
create index artisan_blocked_slots_artisan_idx on public.artisan_blocked_slots (artisan_id, starts_at);
create trigger artisan_blocked_slots_set_updated_at before update on public.artisan_blocked_slots
  for each row execute function app.set_updated_at();

-- Abonnement .ics : lien secret propre à l'artisan. Le renouveler désactive l'ancien lien.
create table public.artisan_calendar_feeds (
  id uuid primary key default gen_random_uuid(),
  artisan_id uuid not null unique references public.artisans (id) on delete cascade,
  token text not null unique check (token ~ '^[0-9a-f]{48}$'),
  -- Dernière lecture par une application d'agenda (notée toutes les 15 minutes au plus).
  last_read_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger artisan_calendar_feeds_set_updated_at before update on public.artisan_calendar_feeds
  for each row execute function app.set_updated_at();

-- ---------------------------------------------------------------------------
-- Droits : lecture directe, écriture par les fonctions ci-dessous seulement
-- ---------------------------------------------------------------------------
alter table public.artisan_hours enable row level security;
alter table public.artisan_absences enable row level security;
alter table public.artisan_blocked_slots enable row level security;
alter table public.artisan_calendar_feeds enable row level security;
revoke all on public.artisan_hours, public.artisan_absences, public.artisan_blocked_slots,
  public.artisan_calendar_feeds from anon, authenticated;
grant select on public.artisan_hours, public.artisan_absences, public.artisan_blocked_slots,
  public.artisan_calendar_feeds to authenticated;

-- Horaires et absences : l'artisan et l'équipe (qui explique, au besoin, pourquoi un artisan
-- n'apparaît pas dans les recherches).
create policy "artisan_hours : lecture par l'artisan ou l'équipe"
  on public.artisan_hours for select to authenticated
  using (artisan_id = (select app.my_artisan_id()) or (select app.is_staff()));
create policy "artisan_absences : lecture par l'artisan ou l'équipe"
  on public.artisan_absences for select to authenticated
  using (artisan_id = (select app.my_artisan_id()) or (select app.is_staff()));
-- Créneaux bloqués (notes personnelles) et lien d'abonnement (secret) : l'artisan seul.
create policy "artisan_blocked_slots : lecture par l'artisan"
  on public.artisan_blocked_slots for select to authenticated
  using (artisan_id = (select app.my_artisan_id()));
create policy "artisan_calendar_feeds : lecture par l'artisan"
  on public.artisan_calendar_feeds for select to authenticated
  using (artisan_id = (select app.my_artisan_id()));

-- Artisan absent ce jour-là (recherche, fiche publique).
create function app.artisan_absent(p_artisan_id uuid, p_day date)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.artisan_absences a
    where a.artisan_id = p_artisan_id and p_day between a.starts_on and a.ends_on
  )
$$;
revoke execute on function app.artisan_absent(uuid, date) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Horaires : remplacement complet, en une fois.
-- p_hours : [{"weekday": 1, "start": "08:00", "end": "12:00"}, …]
-- ---------------------------------------------------------------------------
create function public.set_artisan_hours(p_hours jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_artisan uuid := app.my_artisan_id();
begin
  if v_artisan is null then
    raise exception 'Fiche artisan introuvable' using errcode = '42501';
  end if;
  if p_hours is null or jsonb_typeof(p_hours) <> 'array' then
    raise exception 'Horaires invalides' using errcode = '22023';
  end if;
  if jsonb_array_length(p_hours) > 21 or exists (
      select 1 from jsonb_array_elements(p_hours) e
      where jsonb_typeof(e) <> 'object'
        or coalesce(e ->> 'weekday', '') !~ '^[1-7]$'
        or coalesce(e ->> 'start', '') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
        or coalesce(e ->> 'end', '') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
    ) then
    raise exception 'Horaires invalides' using errcode = '22023';
  end if;
  if exists (select 1 from jsonb_array_elements(p_hours) e where e ->> 'start' >= e ->> 'end') then
    raise exception 'Chaque plage doit commencer avant de finir' using errcode = '22023';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_hours) e group by e ->> 'weekday' having count(*) > 3
  ) then
    raise exception 'Trois plages par jour au plus' using errcode = '22023';
  end if;
  if exists (
    select 1 from (
      select e ->> 'start' as start_time,
        lag(e ->> 'end') over (partition by e ->> 'weekday' order by e ->> 'start') as previous_end
      from jsonb_array_elements(p_hours) e
    ) x
    where x.start_time < x.previous_end
  ) then
    raise exception 'Les plages d''une même journée ne doivent pas se chevaucher' using errcode = '22023';
  end if;

  delete from public.artisan_hours where artisan_id = v_artisan;
  insert into public.artisan_hours (artisan_id, weekday, start_time, end_time)
  select v_artisan, (e ->> 'weekday')::smallint, (e ->> 'start')::time, (e ->> 'end')::time
  from jsonb_array_elements(p_hours) e;
end;
$$;
revoke execute on function public.set_artisan_hours(jsonb) from public, anon;
grant execute on function public.set_artisan_hours(jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- Absences : pas encore terminées, un an au plus, au plus un an à l'avance, sans chevauchement,
-- trente à venir au plus.
-- ---------------------------------------------------------------------------
create function public.add_artisan_absence(p_starts_on date, p_ends_on date, p_label text default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_artisan uuid := app.my_artisan_id();
  v_today date := (now() at time zone 'Europe/Paris')::date;
  v_label text := nullif(btrim(p_label), '');
  v_id uuid;
begin
  if v_artisan is null then
    raise exception 'Fiche artisan introuvable' using errcode = '42501';
  end if;
  if p_starts_on is null or p_ends_on is null then
    raise exception 'Indiquez le premier et le dernier jour de l''absence' using errcode = '22023';
  end if;
  if p_ends_on < p_starts_on then
    raise exception 'Le dernier jour doit suivre le premier' using errcode = '22023';
  end if;
  if p_ends_on < v_today then
    raise exception 'Cette absence est déjà terminée' using errcode = '22023';
  end if;
  if p_ends_on - p_starts_on >= 365 then
    raise exception 'Une absence dure un an au plus' using errcode = '22023';
  end if;
  if p_starts_on - v_today > 365 then
    raise exception 'Une absence se déclare au plus un an à l''avance' using errcode = '22023';
  end if;
  if char_length(v_label) > 80 then
    raise exception 'Motif trop long (80 caractères au plus)' using errcode = '22023';
  end if;
  -- Verrou de la fiche : deux ajouts simultanés ne peuvent pas se chevaucher.
  perform 1 from public.artisans where id = v_artisan for update;
  if exists (
    select 1 from public.artisan_absences a
    where a.artisan_id = v_artisan and a.starts_on <= p_ends_on and p_starts_on <= a.ends_on
  ) then
    raise exception 'Cette absence chevauche une absence déjà prévue' using errcode = '22023';
  end if;
  if (select count(*) from public.artisan_absences a
      where a.artisan_id = v_artisan and a.ends_on >= v_today) >= 30 then
    raise exception 'Trente absences à venir au plus' using errcode = '22023';
  end if;
  insert into public.artisan_absences (artisan_id, starts_on, ends_on, label)
  values (v_artisan, p_starts_on, p_ends_on, v_label)
  returning id into v_id;
  return v_id;
end;
$$;
revoke execute on function public.add_artisan_absence(date, date, text) from public, anon;
grant execute on function public.add_artisan_absence(date, date, text) to authenticated;

create function public.delete_artisan_absence(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.artisan_absences where id = p_id and artisan_id = app.my_artisan_id();
  if not found then
    raise exception 'Absence introuvable' using errcode = '42501';
  end if;
end;
$$;
revoke execute on function public.delete_artisan_absence(uuid) from public, anon;
grant execute on function public.delete_artisan_absence(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Créneaux bloqués : heures saisies à Paris, pas encore terminés, au plus un an à l'avance,
-- deux cents à venir au plus.
-- ---------------------------------------------------------------------------
create function public.add_artisan_blocked_slot(p_date date, p_start time, p_end time, p_label text default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_artisan uuid := app.my_artisan_id();
  v_label text := nullif(btrim(p_label), '');
  v_start timestamptz;
  v_end timestamptz;
  v_id uuid;
begin
  if v_artisan is null then
    raise exception 'Fiche artisan introuvable' using errcode = '42501';
  end if;
  if p_date is null or p_start is null or p_end is null then
    raise exception 'Indiquez la date et les heures du créneau' using errcode = '22023';
  end if;
  if p_end <= p_start then
    raise exception 'L''heure de fin doit suivre l''heure de début' using errcode = '22023';
  end if;
  v_start := (p_date + p_start) at time zone 'Europe/Paris';
  v_end := (p_date + p_end) at time zone 'Europe/Paris';
  if v_end <= now() then
    raise exception 'Ce créneau est déjà passé' using errcode = '22023';
  end if;
  if v_start > now() + interval '365 days' then
    raise exception 'Un créneau se bloque au plus un an à l''avance' using errcode = '22023';
  end if;
  if char_length(v_label) > 80 then
    raise exception 'Motif trop long (80 caractères au plus)' using errcode = '22023';
  end if;
  if (select count(*) from public.artisan_blocked_slots b
      where b.artisan_id = v_artisan and b.ends_at > now()) >= 200 then
    raise exception 'Deux cents créneaux bloqués à venir au plus' using errcode = '22023';
  end if;
  insert into public.artisan_blocked_slots (artisan_id, starts_at, ends_at, label)
  values (v_artisan, v_start, v_end, v_label)
  returning id into v_id;
  return v_id;
end;
$$;
revoke execute on function public.add_artisan_blocked_slot(date, time, time, text) from public, anon;
grant execute on function public.add_artisan_blocked_slot(date, time, time, text) to authenticated;

create function public.delete_artisan_blocked_slot(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.artisan_blocked_slots where id = p_id and artisan_id = app.my_artisan_id();
  if not found then
    raise exception 'Créneau introuvable' using errcode = '42501';
  end if;
end;
$$;
revoke execute on function public.delete_artisan_blocked_slot(uuid) from public, anon;
grant execute on function public.delete_artisan_blocked_slot(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Abonnement .ics
-- ---------------------------------------------------------------------------

-- Crée le lien d'abonnement, ou le remplace : l'ancien lien cesse aussitôt de fonctionner.
create function public.renew_artisan_calendar_feed()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_artisan uuid := app.my_artisan_id();
  v_token text := encode(extensions.gen_random_bytes(24), 'hex');
begin
  if v_artisan is null then
    raise exception 'Fiche artisan introuvable' using errcode = '42501';
  end if;
  insert into public.artisan_calendar_feeds (artisan_id, token) values (v_artisan, v_token)
  on conflict (artisan_id) do update set token = excluded.token, last_read_at = null;
  return v_token;
end;
$$;
revoke execute on function public.renew_artisan_calendar_feed() from public, anon;
grant execute on function public.renew_artisan_calendar_feed() to authenticated;

create function public.disable_artisan_calendar_feed()
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.artisan_calendar_feeds where artisan_id = app.my_artisan_id()
$$;
revoke execute on function public.disable_artisan_calendar_feed() from public, anon;
grant execute on function public.disable_artisan_calendar_feed() to authenticated;

-- Événements lus par l'application d'agenda (sans session) : rendez-vous planifiés, démarrages,
-- créneaux bloqués et absences, des 60 derniers jours et à venir. Commune du chantier seulement :
-- ni adresse ni nom du client dans un lien qui peut circuler (la fiche du chantier les donne).
create function public.artisan_calendar_events(p_token text)
returns table (
  kind text,
  item_id uuid,
  starts_at timestamptz,
  ends_at timestamptz,
  starts_on date,
  ends_on date,
  title text,
  place text
)
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_artisan uuid;
  v_since timestamptz := now() - interval '60 days';
begin
  if p_token is null or p_token !~ '^[0-9a-f]{48}$' then
    return;
  end if;
  select f.artisan_id into v_artisan from public.artisan_calendar_feeds f where f.token = p_token;
  if v_artisan is null then
    return;
  end if;
  update public.artisan_calendar_feeds f set last_read_at = now()
  where f.artisan_id = v_artisan and (f.last_read_at is null or f.last_read_at < now() - interval '15 minutes');

  return query
  select 'visite'::text, ap.id, ap.starts_at, null::timestamptz, null::date, null::date, c.title,
    nullif(concat_ws(' ', c.code_postal, c.ville_nom), '')
  from public.chantiers c
  join public.appointments ap on ap.chantier_id = c.id and ap.status = 'planifie'
  where c.artisan_id = v_artisan and c.status <> 'annule' and ap.starts_at >= v_since
  union all
  select 'demarrage'::text, c.id, c.start_at, null::timestamptz, null::date, null::date, c.title,
    nullif(concat_ws(' ', c.code_postal, c.ville_nom), '')
  from public.chantiers c
  where c.artisan_id = v_artisan and c.status <> 'annule' and c.start_at >= v_since
  union all
  select 'creneau'::text, b.id, b.starts_at, b.ends_at, null::date, null::date, b.label, null::text
  from public.artisan_blocked_slots b
  where b.artisan_id = v_artisan and b.ends_at >= v_since
  union all
  select 'absence'::text, a.id, null::timestamptz, null::timestamptz, a.starts_on, a.ends_on, a.label, null::text
  from public.artisan_absences a
  where a.artisan_id = v_artisan and a.ends_on >= (v_since at time zone 'Europe/Paris')::date;
end;
$$;
revoke execute on function public.artisan_calendar_events(text) from public;
grant execute on function public.artisan_calendar_events(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Recherche et fiche publique : un artisan absent aujourd'hui n'est plus proposé (comme en
-- pause) ; sa fiche l'indique indisponible. Il réapparaît de lui-même au lendemain de son absence.
-- ---------------------------------------------------------------------------
create or replace function public.match_artisans(p_project_id uuid, p_limit int default 5)
returns table (
  artisan_id uuid,
  display_name text,
  avatar_path text,
  experience_years smallint,
  zone_mode public.zone_mode,
  zone_radius_km smallint,
  zone_city text,
  zone_communes text[],
  available_now boolean,
  available_from date,
  distance_km numeric,
  specialties jsonb
)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v public.projects;
  v_point extensions.geography;
  v_today date := (now() at time zone 'Europe/Paris')::date;
begin
  select * into v from public.projects p
  where p.id = p_project_id and (p.user_id = auth.uid() or app.is_staff());
  if not found then
    raise exception 'Projet introuvable' using errcode = '42501';
  end if;
  if v.trade_code is null or v.ville_code_insee is null then
    return;
  end if;
  v_point := coalesce(v.location, v.ville_location);

  return query
  select
    a.id,
    coalesce(pr.first_name, a.nom_commercial, a.raison_sociale),
    pr.avatar_path,
    a.experience_years,
    a.zone_mode,
    a.radius_km,
    app.base_commune(a.base_label),
    (select coalesce(array_agg(z.nom order by z.nom), '{}') from public.artisan_zones z where z.artisan_id = a.id),
    (a.available_from is null or a.available_from <= v_today),
    a.available_from,
    case when a.zone_mode = 'rayon' and v_point is not null
      then round((extensions.st_distance(a.base_location, v_point) / 1000)::numeric, 1)
    end,
    (
      select coalesce(jsonb_agg(jsonb_build_object('code', w.code, 'label', w.label) order by w.sort_order), '[]')
      from public.artisan_work_types aw
      join public.work_types w on w.code = aw.work_type_code
      where aw.artisan_id = a.id and w.trade_code = v.trade_code and w.active
    )
  from public.artisans a
  left join public.profiles pr on pr.user_id = a.user_id
  left join public.artisan_scores sc on sc.artisan_id = a.id
  where app.artisan_is_visible(a.id)
    and not a.paused
    and not app.artisan_absent(a.id, v_today)
    and exists (select 1 from public.artisan_trades t where t.artisan_id = a.id and t.trade_code = v.trade_code)
    and (
      (a.zone_mode = 'communes' and exists (
        select 1 from public.artisan_zones z where z.artisan_id = a.id and z.code_insee = v.ville_code_insee
      ))
      or (a.zone_mode = 'rayon' and v_point is not null and a.base_location is not null
        and extensions.st_dwithin(a.base_location, v_point, a.radius_km * 1000))
    )
  order by
    sc.global_score desc nulls last,
    (a.available_from is null or a.available_from <= v_today) desc,
    a.available_from nulls first,
    case when a.zone_mode = 'rayon' and v_point is not null
      then extensions.st_distance(a.base_location, v_point) end nulls last,
    md5(p_project_id::text || a.id::text)
  limit least(greatest(coalesce(p_limit, 5), 1), 20);
end;
$$;

create or replace function public.public_artisans_for_commune(p_trade_code text, p_code_insee text, p_limit int default 12)
returns table (
  artisan_id uuid,
  display_name text,
  avatar_path text,
  experience_years smallint,
  zone_mode public.zone_mode,
  zone_radius_km smallint,
  zone_city text,
  zone_communes text[],
  available_now boolean,
  available_from date,
  specialties jsonb
)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_point extensions.geography;
  v_today date := (now() at time zone 'Europe/Paris')::date;
begin
  select c.location into v_point from public.communes c where c.code_insee = p_code_insee;
  return query
  select
    a.id,
    coalesce(pr.first_name, a.nom_commercial, a.raison_sociale),
    pr.avatar_path,
    a.experience_years,
    a.zone_mode,
    a.radius_km,
    app.base_commune(a.base_label),
    (select coalesce(array_agg(z.nom order by z.nom), '{}') from public.artisan_zones z where z.artisan_id = a.id),
    (a.available_from is null or a.available_from <= v_today),
    a.available_from,
    (
      select coalesce(jsonb_agg(jsonb_build_object('code', w.code, 'label', w.label) order by w.sort_order), '[]')
      from public.artisan_work_types aw
      join public.work_types w on w.code = aw.work_type_code
      where aw.artisan_id = a.id and w.trade_code = p_trade_code and w.active
    )
  from public.artisans a
  left join public.profiles pr on pr.user_id = a.user_id
  where app.artisan_is_visible(a.id)
    and not a.paused
    and not app.artisan_absent(a.id, v_today)
    and exists (select 1 from public.artisan_trades t where t.artisan_id = a.id and t.trade_code = p_trade_code)
    and (
      (a.zone_mode = 'communes' and exists (
        select 1 from public.artisan_zones z where z.artisan_id = a.id and z.code_insee = p_code_insee
      ))
      or (a.zone_mode = 'rayon' and v_point is not null and a.base_location is not null
        and extensions.st_dwithin(a.base_location, v_point, a.radius_km * 1000))
    )
  order by
    (a.available_from is null or a.available_from <= v_today) desc,
    a.available_from nulls first,
    md5(p_trade_code || p_code_insee || a.id::text)
  limit least(greatest(coalesce(p_limit, 12), 1), 50);
end;
$$;

create or replace function public.artisan_public_profile(p_artisan_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', a.id,
    'display_name', coalesce(pr.first_name, a.nom_commercial, a.raison_sociale),
    'company_name', coalesce(a.nom_commercial, a.raison_sociale),
    'avatar_path', pr.avatar_path,
    'experience_years', a.experience_years,
    'presentation', a.presentation,
    'paused', a.paused or app.artisan_absent(a.id, (now() at time zone 'Europe/Paris')::date),
    'available_from', a.available_from,
    'zone', jsonb_build_object(
      'mode', a.zone_mode,
      'radius_km', a.radius_km,
      'city', app.base_commune(a.base_label),
      'communes', (select coalesce(jsonb_agg(z.nom order by z.nom), '[]') from public.artisan_zones z where z.artisan_id = a.id)
    ),
    'trades', (
      select coalesce(jsonb_agg(jsonb_build_object('code', t.code, 'label', t.label) order by t.sort_order), '[]')
      from public.artisan_trades at join public.trades t on t.code = at.trade_code
      where at.artisan_id = a.id
    ),
    'work_types', (
      select coalesce(jsonb_agg(jsonb_build_object('code', w.code, 'label', w.label, 'trade', w.trade_code) order by w.sort_order), '[]')
      from public.artisan_work_types aw join public.work_types w on w.code = aw.work_type_code
      where aw.artisan_id = a.id and w.active
    ),
    'decennale', (
      select jsonb_build_object('valid_until', d.date_fin, 'insurer', d.assureur)
      from public.artisan_documents d
      where d.artisan_id = a.id and d.type = 'decennale' and d.status = 'valide'
      order by d.date_fin desc nulls last limit 1
    ),
    'certifications', (
      select coalesce(jsonb_agg(jsonb_build_object('type', c.type, 'numero', c.numero, 'valid_until', c.date_fin) order by c.type), '[]')
      from public.certifications c
      where c.artisan_id = a.id and c.verified_at is not null
        and c.date_fin >= (now() at time zone 'Europe/Paris')::date
    ),
    'photos', (
      select coalesce(jsonb_agg(p.storage_path order by p.sort_order, p.created_at), '[]')
      from public.artisan_photos p where p.artisan_id = a.id
    ),
    'score', (
      select jsonb_build_object(
        'review_count', s.review_count,
        'quality', s.quality,
        'delays', s.delays,
        'communication', s.communication,
        'value_for_money', s.value_for_money,
        'global', s.global_score
      )
      from public.artisan_scores s where s.artisan_id = a.id
    )
  )
  from public.artisans a
  left join public.profiles pr on pr.user_id = a.user_id
  where a.id = p_artisan_id and app.artisan_is_visible(a.id)
$$;
