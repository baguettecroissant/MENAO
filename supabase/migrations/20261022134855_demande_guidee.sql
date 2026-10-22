-- Demande guidée (lot 7 du plan V1.1, ADR 0163, d'après le « Plan anti-problèmes V2 », point A2 :
-- demande vague) :
-- - budget approximatif (facultatif) dans les critères, repris de la description quand le
--   particulier le donne, jamais estimé par l'IA ;
-- - demande reformulée par l'IA pour l'artisan (`artisan_brief`), montrée dans le détail de la
--   demande, sans coordonnées ;
-- - photos conseillées quand la description reste vague (`photosAdvised`, @menao/core) : un
--   conseil, l'obligation reste à trancher.
-- Mêmes valeurs dans packages/core/src/project.ts (BUDGET_TRANCHES, ARTISAN_BRIEF_MAX_LENGTH).

create type public.project_budget as enum ('moins_1000', '1000_5000', '5000_15000', '15000_50000', 'plus_50000');
alter table public.projects
  add column budget public.project_budget,
  add column artisan_brief text check (char_length(artisan_brief) <= 800);

-- Enregistrement des critères : budget en plus (dernier paramètre, facultatif).
drop function public.save_project_criteria(
  uuid, text, public.project_lieu_type, text[], text[], public.project_surface, text, text, text,
  double precision, double precision, text, double precision, double precision, public.project_date_mode, date
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
  p_date_souhaitee date,
  p_budget public.project_budget default null
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
    date_souhaitee = case when p_date_mode = 'date' then p_date_souhaitee end,
    budget = p_budget
  where id = p_project_id;
end;
$$;
revoke execute on function public.save_project_criteria(
  uuid, text, public.project_lieu_type, text[], text[], public.project_surface, text, text, text,
  double precision, double precision, text, double precision, double precision, public.project_date_mode, date,
  public.project_budget
) from public, anon;
grant execute on function public.save_project_criteria(
  uuid, text, public.project_lieu_type, text[], text[], public.project_surface, text, text, text,
  double precision, double precision, text, double precision, double precision, public.project_date_mode, date,
  public.project_budget
) to authenticated;

-- Détail de la demande pour l'artisan : reformulation et budget.
create or replace function public.artisan_request_detail(p_request_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', r.id,
    'status', r.status,
    'created_at', r.created_at,
    'expires_at', r.expires_at,
    'refusal_reason', r.refusal_reason,
    'callback_mode', r.callback_mode,
    'callback_from', to_char(r.callback_from, 'HH24:MI'),
    'callback_to', to_char(r.callback_to, 'HH24:MI'),
    'message', case when r.status = 'acceptee' then r.message else app.scrub_contacts(r.message) end,
    'description', case when r.status = 'acceptee' then p.description else app.scrub_contacts(p.description) end,
    'summary', app.scrub_contacts(p.summary),
    -- Demande reformulée par l'IA et budget approximatif (ADR 0163).
    'artisan_brief', app.scrub_contacts(p.artisan_brief),
    'budget', p.budget,
    'trade', t.label,
    'lieu_type', p.lieu_type,
    'surface', p.surface,
    'rooms', (select coalesce(jsonb_agg(ro.label order by ro.sort_order), '[]') from public.rooms ro where ro.code = any (p.room_codes)),
    'work_types', (select coalesce(jsonb_agg(w.label order by w.sort_order), '[]') from public.work_types w where w.code = any (p.work_type_codes)),
    'urgence', p.urgence,
    'date_mode', p.date_mode,
    'date_souhaitee', p.date_souhaitee,
    'ville_nom', p.ville_nom,
    'code_postal', p.code_postal,
    -- Adresse exacte et coordonnées : après acceptation seulement.
    'adresse', case when r.status = 'acceptee' then p.adresse end,
    'lat', case when r.status = 'acceptee' then extensions.st_y(coalesce(p.location, p.ville_location)::extensions.geometry) end,
    'lon', case when r.status = 'acceptee' then extensions.st_x(coalesce(p.location, p.ville_location)::extensions.geometry) end,
    'photos', (select coalesce(jsonb_agg(ph.storage_path order by ph.sort_order, ph.created_at), '[]') from public.project_photos ph where ph.project_id = p.id),
    'client', jsonb_build_object(
      'first_name', cp.first_name,
      'last_name', case when r.status = 'acceptee' then cp.last_name end,
      'phone', case when r.status = 'acceptee' then r.contact_phone end,
      'email', case when r.status = 'acceptee' then u.email::text end
    ),
    'chantier_id', (select ch.id from public.chantiers ch where ch.request_id = r.id)
  )
  from public.requests r
  join public.projects p on p.id = r.project_id
  left join public.trades t on t.code = p.trade_code
  left join public.profiles cp on cp.user_id = r.particulier_id
  left join auth.users u on u.id = r.particulier_id
  where r.id = p_request_id and r.artisan_id = app.my_artisan_id() and r.status <> 'a_verifier'
$$;
