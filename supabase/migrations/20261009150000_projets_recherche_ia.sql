-- F-05 à F-07 — projet de travaux d'un particulier : saisie, analyse IA, vérification des critères.
-- Le projet peut être créé par un visiteur en session anonyme (Supabase Auth, ADR 0012) : il est
-- rattaché à son compte quand il s'inscrit (même identifiant d'utilisateur).

-- ---------------------------------------------------------------------------
-- Référentiel des pièces (F-07 carte 2)
-- ---------------------------------------------------------------------------
create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[a-z0-9-]{1,60}$'),
  label text not null check (char_length(label) between 1 and 100),
  sort_order smallint not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger rooms_set_updated_at before update on public.rooms
  for each row execute function app.set_updated_at();
alter table public.rooms enable row level security;
create policy "rooms : lecture publique" on public.rooms for select to anon, authenticated using (true);

insert into public.rooms (code, label, sort_order) values
  ('cuisine', 'Cuisine', 10),
  ('salle-de-bain', 'Salle de bain', 20),
  ('wc', 'WC', 30),
  ('salon', 'Salon / séjour', 40),
  ('chambre', 'Chambre', 50),
  ('bureau', 'Bureau', 60),
  ('entree', 'Entrée / couloir', 70),
  ('escalier', 'Escalier', 80),
  ('buanderie', 'Buanderie', 90),
  ('cave', 'Cave / sous-sol', 100),
  ('garage', 'Garage', 110),
  ('combles', 'Combles / grenier', 120),
  ('toiture', 'Toiture', 130),
  ('facade', 'Façade', 140),
  ('terrasse', 'Terrasse / balcon', 150),
  ('jardin', 'Jardin / extérieur', 160),
  ('piscine', 'Piscine', 170),
  ('local-pro', 'Local professionnel', 180),
  ('parties-communes', 'Parties communes', 190),
  ('logement-entier', 'Logement entier', 200);

-- ---------------------------------------------------------------------------
-- Projets
-- ---------------------------------------------------------------------------
create type public.project_status as enum ('brouillon', 'criteres_valides');
create type public.project_lieu_type as enum ('appartement', 'maison', 'jardin', 'entreprise');
create type public.project_surface as enum ('moins_10', '10_20', '20_50', 'plus_50');
create type public.project_date_mode as enum ('des_que_possible', 'date', 'inconnue');

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  status public.project_status not null default 'brouillon',
  description text not null check (char_length(description) between 1 and 5000),
  -- Sortie brute (validée) du modèle, pour l'amélioration des prompts. Jamais montrée aux artisans.
  ai_analysis jsonb,
  ai_model text check (char_length(ai_model) <= 100),
  ai_confidence numeric(3, 2) check (ai_confidence between 0 and 1),
  analyzed_at timestamptz,
  summary text check (char_length(summary) <= 300),
  trade_code text references public.trades (code) on update cascade,
  lieu_type public.project_lieu_type,
  room_codes text[] not null default '{}' check (cardinality(room_codes) <= 20),
  work_type_codes text[] not null default '{}' check (cardinality(work_type_codes) <= 20),
  surface public.project_surface,
  ville_code_insee text check (ville_code_insee ~ '^[0-9][0-9AB][0-9]{3}$'),
  ville_nom text check (char_length(ville_nom) between 1 and 100),
  code_postal text check (code_postal ~ '^[0-9]{5}$'),
  adresse text check (char_length(adresse) between 1 and 200),
  location extensions.geography(point, 4326),
  date_mode public.project_date_mode not null default 'inconnue',
  date_souhaitee date,
  urgence boolean not null default false,
  criteria_validated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((date_mode = 'date') = (date_souhaitee is not null)),
  check (adresse is null or (location is not null and ville_code_insee is not null)),
  check (ville_nom is null or ville_code_insee is not null)
);
create index projects_user_id_idx on public.projects (user_id);
create index projects_location_idx on public.projects using gist (location);
create trigger projects_set_updated_at before update on public.projects
  for each row execute function app.set_updated_at();
alter table public.projects enable row level security;

-- Création par l'Edge Function analyze-need (service_role) ; modification par les fonctions
-- ci-dessous uniquement (validation des référentiels). Le propriétaire lit et supprime.
create policy "projects : lecture par le propriétaire ou l'équipe"
  on public.projects for select to authenticated
  using (user_id = (select auth.uid()) or (select app.is_staff()));
create policy "projects : suppression par le propriétaire"
  on public.projects for delete to authenticated
  using (user_id = (select auth.uid()));

create table public.project_photos (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  storage_path text not null unique check (char_length(storage_path) <= 300),
  sort_order smallint not null default 0,
  created_at timestamptz not null default now()
);
create index project_photos_project_id_idx on public.project_photos (project_id);
alter table public.project_photos enable row level security;

create function app.owns_project(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.projects p where p.id = p_project_id and p.user_id = auth.uid()
  )
$$;
revoke execute on function app.owns_project(uuid) from public, anon;
grant execute on function app.owns_project(uuid) to authenticated;

-- Variante pour les chemins de stockage « <project_id>/… » : comparaison textuelle, sans
-- conversion en uuid (qui échouerait sur les chemins des autres espaces).
create function app.owns_project_folder(p_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.projects p
    where p.id::text = (storage.foldername(p_name))[1] and p.user_id = auth.uid()
  )
$$;
revoke execute on function app.owns_project_folder(text) from public, anon;
grant execute on function app.owns_project_folder(text) to authenticated;

create policy "project_photos : lecture par le propriétaire ou l'équipe"
  on public.project_photos for select to authenticated
  using ((select app.owns_project(project_id)) or (select app.is_staff()));
create policy "project_photos : suppression par le propriétaire"
  on public.project_photos for delete to authenticated
  using ((select app.owns_project(project_id)));

-- Photos du projet : privées (propriétaire, équipe ; artisans destinataires en phase 2c),
-- servies par URL signées. Rangées par process-upload dans « <project_id>/<fichier> ».
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('project-photos', 'project-photos', false, 10485760, array['image/jpeg', 'image/png'])
on conflict (id) do nothing;

create policy "project-photos : lecture par le propriétaire ou l'équipe"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'project-photos'
    and ((select app.owns_project_folder(name)) or (select app.is_staff()))
  );
create policy "project-photos : suppression par le propriétaire"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'project-photos'
    and (select app.owns_project_folder(name))
  );

-- ---------------------------------------------------------------------------
-- Journal des appels IA (F-06) : métriques sans données personnelles. Le texte du projet
-- n'y est pas recopié (il reste dans projects, supprimé avec lui).
-- ---------------------------------------------------------------------------
create table public.ai_runs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects (id) on delete cascade,
  function_name text not null check (function_name in ('analyze-need', 'transcribe')),
  model text not null check (char_length(model) <= 100),
  outcome text not null check (outcome in ('ok', 'invalide', 'peu_sur', 'refus', 'erreur')),
  latency_ms int not null check (latency_ms >= 0),
  input_tokens int check (input_tokens >= 0),
  output_tokens int check (output_tokens >= 0),
  audio_seconds numeric(6, 1) check (audio_seconds >= 0),
  confidence numeric(3, 2) check (confidence between 0 and 1),
  created_at timestamptz not null default now()
);
create index ai_runs_project_id_idx on public.ai_runs (project_id);
create index ai_runs_created_at_idx on public.ai_runs (created_at);
alter table public.ai_runs enable row level security;
create policy "ai_runs : lecture par un admin"
  on public.ai_runs for select to authenticated using ((select app.is_admin()));

-- ---------------------------------------------------------------------------
-- Enregistrement des critères (F-07). Chaque carte renvoie l'ensemble des critères.
-- ---------------------------------------------------------------------------
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
begin
  if not exists (
    select 1 from public.projects
    where id = p_project_id and user_id = auth.uid() and status in ('brouillon', 'criteres_valides')
  ) then
    raise exception 'Projet introuvable ou non modifiable' using errcode = '42501';
  end if;

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
  -- Les travaux doivent appartenir au métier choisi.
  if exists (
    select 1 from unnest(v_works) c
    where not exists (
      select 1 from public.work_types w
      where w.code = c and w.active and w.trade_code = p_trade_code
    )
  ) then
    raise exception 'Travaux incompatibles avec le métier' using errcode = '22023';
  end if;

  if p_adresse is not null and (p_ville_code_insee is null or p_lon is null or p_lat is null) then
    raise exception 'Adresse non géocodée' using errcode = '22023';
  end if;
  if p_lon is not null and (p_lon not between -180 and 180 or p_lat not between -90 and 90) then
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
    adresse = nullif(btrim(p_adresse), ''),
    location = case
      when p_lon is not null and p_lat is not null
        then extensions.st_setsrid(extensions.st_makepoint(p_lon, p_lat), 4326)::extensions.geography
    end,
    date_mode = coalesce(p_date_mode, 'inconnue'),
    date_souhaitee = case when p_date_mode = 'date' then p_date_souhaitee end
  where id = p_project_id;
end;
$$;
revoke execute on function public.save_project_criteria(
  uuid, text, public.project_lieu_type, text[], text[], public.project_surface, text, text, text, text,
  double precision, double precision, public.project_date_mode, date
) from public, anon;
grant execute on function public.save_project_criteria(
  uuid, text, public.project_lieu_type, text[], text[], public.project_surface, text, text, text, text,
  double precision, double precision, public.project_date_mode, date
) to authenticated;

-- « Trouver l'artisan idéal » (F-07) : métier et ville obligatoires.
create function public.validate_project_criteria(p_project_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.projects;
begin
  select * into v from public.projects where id = p_project_id and user_id = auth.uid();
  if not found or v.status not in ('brouillon', 'criteres_valides') then
    raise exception 'Projet introuvable ou non modifiable' using errcode = '42501';
  end if;
  if v.trade_code is null or v.ville_code_insee is null then
    raise exception 'Métier et ville obligatoires' using errcode = '22023';
  end if;
  if v.date_mode = 'date' and v.date_souhaitee < (now() at time zone 'Europe/Paris')::date then
    raise exception 'La date de début ne peut pas être passée' using errcode = '22023';
  end if;
  update public.projects
  set status = 'criteres_valides', criteria_validated_at = now()
  where id = p_project_id;
end;
$$;
revoke execute on function public.validate_project_criteria(uuid) from public, anon;
grant execute on function public.validate_project_criteria(uuid) to authenticated;
