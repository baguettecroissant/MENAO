-- F-09, F-10 (phase 2b) — correspondance artisans ↔ projet, fiche artisan publique, disponibilité,
-- dossier « Envoyer mon dossier à MENAO » (début de F-56 Tickets). ADR 0013.

-- ---------------------------------------------------------------------------
-- Point de la commune du chantier : permet la correspondance « rayon » sans adresse exacte.
-- ---------------------------------------------------------------------------
alter table public.projects add column ville_location extensions.geography(point, 4326);
alter table public.projects add constraint projects_ville_location_check
  check (ville_location is null or ville_code_insee is not null);

drop function public.save_project_criteria(
  uuid, text, public.project_lieu_type, text[], text[], public.project_surface, text, text, text, text,
  double precision, double precision, public.project_date_mode, date
);

create function public.save_project_criteria(
  p_project_id uuid,
  p_trade_code text,
  p_lieu_type public.project_lieu_type,
  p_room_codes text[],
  p_work_type_codes text[],
  p_surface public.project_surface,
  p_ville_code_insee text,
  p_ville_nom text,
  p_code_postal text,
  p_ville_lon double precision,
  p_ville_lat double precision,
  p_adresse text,
  p_lon double precision,
  p_lat double precision,
  p_date_mode public.project_date_mode,
  p_date_souhaitee date
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_today date := (now() at time zone 'Europe/Paris')::date;
  v_rooms text[] := coalesce(p_room_codes, '{}');
  v_works text[] := coalesce(p_work_type_codes, '{}');
  v_current public.projects;
  v_keep_location boolean;
  v_keep_ville_location boolean;
begin
  select * into v_current from public.projects
  where id = p_project_id and user_id = auth.uid() and status in ('brouillon', 'criteres_valides');
  if not found then
    raise exception 'Projet introuvable ou non modifiable' using errcode = '42501';
  end if;
  -- Adresse ou ville inchangée : les coordonnées déjà enregistrées sont conservées.
  v_keep_location := p_lon is null and p_adresse is not null
    and p_adresse = v_current.adresse and p_ville_code_insee = v_current.ville_code_insee;
  v_keep_ville_location := p_ville_lon is null and p_ville_code_insee = v_current.ville_code_insee;

  if p_trade_code is not null
    and not exists (select 1 from public.trades where code = p_trade_code and active) then
    raise exception 'Métier inconnu' using errcode = '22023';
  end if;
  if exists (
    select 1 from unnest(v_rooms) c
    where not exists (select 1 from public.rooms r where r.code = c and r.active)
  ) then
    raise exception 'Pièce inconnue' using errcode = '22023';
  end if;
  if exists (
    select 1 from unnest(v_works) c
    where not exists (
      select 1 from public.work_types w
      where w.code = c and w.active and w.trade_code = p_trade_code
    )
  ) then
    raise exception 'Travaux incompatibles avec le métier' using errcode = '22023';
  end if;

  if p_adresse is not null and not v_keep_location
    and (p_ville_code_insee is null or p_lon is null or p_lat is null) then
    raise exception 'Adresse non géocodée' using errcode = '22023';
  end if;
  if (p_lon is not null and (p_lon not between -180 and 180 or p_lat not between -90 and 90))
    or (p_ville_lon is not null and (p_ville_lon not between -180 and 180 or p_ville_lat not between -90 and 90)) then
    raise exception 'Coordonnées invalides' using errcode = '22023';
  end if;
  if p_date_mode = 'date' and (p_date_souhaitee is null or p_date_souhaitee < v_today) then
    raise exception 'La date de début ne peut pas être passée' using errcode = '22023';
  end if;

  update public.projects set
    status = 'brouillon',
    criteria_validated_at = null,
    trade_code = p_trade_code,
    lieu_type = p_lieu_type,
    room_codes = (select coalesce(array_agg(distinct c), '{}') from unnest(v_rooms) c),
    work_type_codes = (select coalesce(array_agg(distinct c), '{}') from unnest(v_works) c),
    surface = p_surface,
    ville_code_insee = p_ville_code_insee,
    ville_nom = case when p_ville_code_insee is not null then nullif(btrim(p_ville_nom), '') end,
    code_postal = case when p_ville_code_insee is not null then p_code_postal end,
    ville_location = case
      when p_ville_code_insee is null then null
      when v_keep_ville_location then v_current.ville_location
      when p_ville_lon is not null and p_ville_lat is not null
        then extensions.st_setsrid(extensions.st_makepoint(p_ville_lon, p_ville_lat), 4326)::extensions.geography
    end,
    adresse = nullif(btrim(p_adresse), ''),
    location = case
      when v_keep_location then v_current.location
      when p_adresse is not null and p_lon is not null and p_lat is not null
        then extensions.st_setsrid(extensions.st_makepoint(p_lon, p_lat), 4326)::extensions.geography
    end,
    date_mode = coalesce(p_date_mode, 'inconnue'),
    date_souhaitee = case when p_date_mode = 'date' then p_date_souhaitee end
  where id = p_project_id;
end;
$$;
revoke execute on function public.save_project_criteria(
  uuid, text, public.project_lieu_type, text[], text[], public.project_surface, text, text, text,
  double precision, double precision, text, double precision, double precision, public.project_date_mode, date
) from public, anon;
grant execute on function public.save_project_criteria(
  uuid, text, public.project_lieu_type, text[], text[], public.project_surface, text, text, text,
  double precision, double precision, text, double precision, double precision, public.project_date_mode, date
) to authenticated;

-- ---------------------------------------------------------------------------
-- Disponibilité de l'artisan (F-09 : pause / congés, badge « Dispo immédiate »)
-- ---------------------------------------------------------------------------
alter table public.artisans
  add column paused boolean not null default false,
  add column available_from date;

create function public.set_artisan_availability(p_paused boolean, p_available_from date)
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
  update public.artisans set
    paused = coalesce(p_paused, false),
    -- Une date passée vaut « disponible tout de suite ».
    available_from = case
      when p_available_from > (now() at time zone 'Europe/Paris')::date then p_available_from
    end
  where id = v_artisan;
end;
$$;
revoke execute on function public.set_artisan_availability(boolean, date) from public, anon;
grant execute on function public.set_artisan_availability(boolean, date) to authenticated;

-- Commune de l'adresse de base (mode rayon) : extraite du libellé BAN « … 06000 Nice ».
-- L'adresse elle-même n'est jamais publiée (souvent le domicile de l'artisan).
create function app.base_commune(p_label text)
returns text
language sql
immutable
set search_path = ''
as $$
  select nullif(btrim(substring(p_label from '[0-9]{5} (.+)$')), '')
$$;

-- ---------------------------------------------------------------------------
-- Correspondance (F-09). Artisans visibles (validés, abonnés, paiements actifs), métier du
-- projet, chantier dans leur zone, pas en pause. Tri : disponibilité, distance, puis ordre
-- pseudo-aléatoire propre au projet (équité entre ex æquo). Le score MENAO s'ajoutera en tête
-- du tri avec les avis ; aucune mise en avant payante en V1 (ADR 0013).
-- ---------------------------------------------------------------------------
create function public.match_artisans(p_project_id uuid, p_limit int default 5)
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
  where app.artisan_is_visible(a.id)
    and not a.paused
    and exists (select 1 from public.artisan_trades t where t.artisan_id = a.id and t.trade_code = v.trade_code)
    and (
      (a.zone_mode = 'communes' and exists (
        select 1 from public.artisan_zones z where z.artisan_id = a.id and z.code_insee = v.ville_code_insee
      ))
      or (a.zone_mode = 'rayon' and v_point is not null and a.base_location is not null
        and extensions.st_dwithin(a.base_location, v_point, a.radius_km * 1000))
    )
  order by
    (a.available_from is null or a.available_from <= v_today) desc,
    a.available_from nulls first,
    case when a.zone_mode = 'rayon' and v_point is not null
      then extensions.st_distance(a.base_location, v_point) end nulls last,
    md5(p_project_id::text || a.id::text)
  limit least(greatest(coalesce(p_limit, 5), 1), 20);
end;
$$;
revoke execute on function public.match_artisans(uuid, int) from public, anon;
grant execute on function public.match_artisans(uuid, int) to authenticated;

-- ---------------------------------------------------------------------------
-- Fiche artisan publique (F-10) : champs non sensibles d'un artisan visible. Fonction plutôt
-- qu'une vue SECURITY DEFINER (signalée par Supabase). Jamais de téléphone, d'e-mail, de SIRET
-- ni d'adresse de base.
-- ---------------------------------------------------------------------------
create function public.artisan_public_profile(p_artisan_id uuid)
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
    'paused', a.paused,
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
    )
  )
  from public.artisans a
  left join public.profiles pr on pr.user_id = a.user_id
  where a.id = p_artisan_id and app.artisan_is_visible(a.id)
$$;
revoke execute on function public.artisan_public_profile(uuid) from public;
grant execute on function public.artisan_public_profile(uuid) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Tickets (début de F-56) : « Envoyer mon dossier à MENAO », réponse sous 7 jours.
-- ---------------------------------------------------------------------------
create type public.ticket_type as enum ('dossier_recherche');
create type public.ticket_status as enum ('ouvert', 'en_cours', 'resolu');

create table public.tickets (
  id uuid primary key default gen_random_uuid(),
  type public.ticket_type not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  project_id uuid references public.projects (id) on delete cascade,
  contact_email text not null check (contact_email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' and char_length(contact_email) <= 254),
  message text check (char_length(message) <= 2000),
  status public.ticket_status not null default 'ouvert',
  due_at timestamptz not null default now() + interval '7 days',
  resolved_at timestamptz,
  handled_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index tickets_status_due_idx on public.tickets (status, due_at);
create unique index tickets_un_dossier_ouvert_par_projet
  on public.tickets (project_id) where status <> 'resolu' and type = 'dossier_recherche';
create trigger tickets_set_updated_at before update on public.tickets
  for each row execute function app.set_updated_at();
alter table public.tickets enable row level security;

create policy "tickets : lecture par l'auteur ou l'équipe"
  on public.tickets for select to authenticated
  using (user_id = (select auth.uid()) or (select app.is_staff()));

-- Un visiteur anonyme n'a pas d'e-mail de compte : il en indique un pour être recontacté.
create function public.send_project_to_menao(p_project_id uuid, p_message text, p_contact_email text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ticket uuid;
  v_email text;
begin
  if not exists (select 1 from public.projects where id = p_project_id and user_id = auth.uid()) then
    raise exception 'Projet introuvable' using errcode = '42501';
  end if;
  select id into v_ticket from public.tickets
  where project_id = p_project_id and type = 'dossier_recherche' and status <> 'resolu';
  if found then
    return v_ticket;
  end if;
  v_email := coalesce(
    nullif(btrim(p_contact_email), ''),
    (select u.email from auth.users u where u.id = auth.uid() and not u.is_anonymous)
  );
  if v_email is null or v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'Adresse e-mail obligatoire' using errcode = '22023';
  end if;
  insert into public.tickets (type, user_id, project_id, contact_email, message)
  values ('dossier_recherche', auth.uid(), p_project_id, lower(v_email), nullif(btrim(left(p_message, 2000)), ''))
  returning id into v_ticket;
  return v_ticket;
end;
$$;
revoke execute on function public.send_project_to_menao(uuid, text, text) from public, anon;
grant execute on function public.send_project_to_menao(uuid, text, text) to authenticated;

create function public.staff_set_ticket_status(p_ticket_id uuid, p_status public.ticket_status)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not app.is_staff() then
    raise exception 'Réservé à l''équipe MENAO' using errcode = '42501';
  end if;
  update public.tickets set
    status = p_status,
    handled_by = auth.uid(),
    resolved_at = case when p_status = 'resolu' then now() end
  where id = p_ticket_id;
  if not found then
    raise exception 'Ticket introuvable' using errcode = '22023';
  end if;
end;
$$;
revoke execute on function public.staff_set_ticket_status(uuid, public.ticket_status) from public, anon;
grant execute on function public.staff_set_ticket_status(uuid, public.ticket_status) to authenticated;
