-- Zone d'intervention par territoire (F-68, ADR 0213) : l'artisan couvre des départements, des
-- régions ou la France entière, en plus du rayon et de la liste de communes. Les zones région et
-- France passent après les artisans de proximité (critère public de classement).
-- TODO(legal) : critère de classement ajouté à la page publique, à relire avec le juriste.

-- ---------------------------------------------------------------------------
-- Référentiels (COG de l'INSEE), identiques à packages/core/src/zone-territories.ts
-- ---------------------------------------------------------------------------
create table public.regions (
  code text primary key check (code ~ '^[0-9]{2}$'),
  nom text not null unique check (char_length(nom) between 1 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.departements (
  code text primary key check (code ~ '^([0-9]{2,3}|2[AB])$'),
  nom text not null unique check (char_length(nom) between 1 and 100),
  region_code text not null references public.regions (code) on update cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index departements_region_code_idx on public.departements (region_code);

create trigger regions_set_updated_at before update on public.regions
  for each row execute function app.set_updated_at();
create trigger departements_set_updated_at before update on public.departements
  for each row execute function app.set_updated_at();

alter table public.regions enable row level security;
alter table public.departements enable row level security;
revoke all on public.regions, public.departements from anon, authenticated;
grant select on public.regions, public.departements to anon, authenticated;
create policy "regions : lecture publique" on public.regions
  for select to anon, authenticated using (true);
create policy "departements : lecture publique" on public.departements
  for select to anon, authenticated using (true);

insert into public.regions (code, nom) values
  ('01', 'Guadeloupe'),
  ('02', 'Martinique'),
  ('03', 'Guyane'),
  ('04', 'La Réunion'),
  ('06', 'Mayotte'),
  ('11', 'Île-de-France'),
  ('24', 'Centre-Val de Loire'),
  ('27', 'Bourgogne-Franche-Comté'),
  ('28', 'Normandie'),
  ('32', 'Hauts-de-France'),
  ('44', 'Grand Est'),
  ('52', 'Pays de la Loire'),
  ('53', 'Bretagne'),
  ('75', 'Nouvelle-Aquitaine'),
  ('76', 'Occitanie'),
  ('84', 'Auvergne-Rhône-Alpes'),
  ('93', 'Provence-Alpes-Côte d''Azur'),
  ('94', 'Corse');

insert into public.departements (code, nom, region_code) values
  ('01', 'Ain', '84'),
  ('02', 'Aisne', '32'),
  ('03', 'Allier', '84'),
  ('04', 'Alpes-de-Haute-Provence', '93'),
  ('05', 'Hautes-Alpes', '93'),
  ('06', 'Alpes-Maritimes', '93'),
  ('07', 'Ardèche', '84'),
  ('08', 'Ardennes', '44'),
  ('09', 'Ariège', '76'),
  ('10', 'Aube', '44'),
  ('11', 'Aude', '76'),
  ('12', 'Aveyron', '76'),
  ('13', 'Bouches-du-Rhône', '93'),
  ('14', 'Calvados', '28'),
  ('15', 'Cantal', '84'),
  ('16', 'Charente', '75'),
  ('17', 'Charente-Maritime', '75'),
  ('18', 'Cher', '24'),
  ('19', 'Corrèze', '75'),
  ('21', 'Côte-d''Or', '27'),
  ('22', 'Côtes-d''Armor', '53'),
  ('23', 'Creuse', '75'),
  ('24', 'Dordogne', '75'),
  ('25', 'Doubs', '27'),
  ('26', 'Drôme', '84'),
  ('27', 'Eure', '28'),
  ('28', 'Eure-et-Loir', '24'),
  ('29', 'Finistère', '53'),
  ('2A', 'Corse-du-Sud', '94'),
  ('2B', 'Haute-Corse', '94'),
  ('30', 'Gard', '76'),
  ('31', 'Haute-Garonne', '76'),
  ('32', 'Gers', '76'),
  ('33', 'Gironde', '75'),
  ('34', 'Hérault', '76'),
  ('35', 'Ille-et-Vilaine', '53'),
  ('36', 'Indre', '24'),
  ('37', 'Indre-et-Loire', '24'),
  ('38', 'Isère', '84'),
  ('39', 'Jura', '27'),
  ('40', 'Landes', '75'),
  ('41', 'Loir-et-Cher', '24'),
  ('42', 'Loire', '84'),
  ('43', 'Haute-Loire', '84'),
  ('44', 'Loire-Atlantique', '52'),
  ('45', 'Loiret', '24'),
  ('46', 'Lot', '76'),
  ('47', 'Lot-et-Garonne', '75'),
  ('48', 'Lozère', '76'),
  ('49', 'Maine-et-Loire', '52'),
  ('50', 'Manche', '28'),
  ('51', 'Marne', '44'),
  ('52', 'Haute-Marne', '44'),
  ('53', 'Mayenne', '52'),
  ('54', 'Meurthe-et-Moselle', '44'),
  ('55', 'Meuse', '44'),
  ('56', 'Morbihan', '53'),
  ('57', 'Moselle', '44'),
  ('58', 'Nièvre', '27'),
  ('59', 'Nord', '32'),
  ('60', 'Oise', '32'),
  ('61', 'Orne', '28'),
  ('62', 'Pas-de-Calais', '32'),
  ('63', 'Puy-de-Dôme', '84'),
  ('64', 'Pyrénées-Atlantiques', '75'),
  ('65', 'Hautes-Pyrénées', '76'),
  ('66', 'Pyrénées-Orientales', '76'),
  ('67', 'Bas-Rhin', '44'),
  ('68', 'Haut-Rhin', '44'),
  ('69', 'Rhône', '84'),
  ('70', 'Haute-Saône', '27'),
  ('71', 'Saône-et-Loire', '27'),
  ('72', 'Sarthe', '52'),
  ('73', 'Savoie', '84'),
  ('74', 'Haute-Savoie', '84'),
  ('75', 'Paris', '11'),
  ('76', 'Seine-Maritime', '28'),
  ('77', 'Seine-et-Marne', '11'),
  ('78', 'Yvelines', '11'),
  ('79', 'Deux-Sèvres', '75'),
  ('80', 'Somme', '32'),
  ('81', 'Tarn', '76'),
  ('82', 'Tarn-et-Garonne', '76'),
  ('83', 'Var', '93'),
  ('84', 'Vaucluse', '93'),
  ('85', 'Vendée', '52'),
  ('86', 'Vienne', '75'),
  ('87', 'Haute-Vienne', '75'),
  ('88', 'Vosges', '44'),
  ('89', 'Yonne', '27'),
  ('90', 'Territoire de Belfort', '27'),
  ('91', 'Essonne', '11'),
  ('92', 'Hauts-de-Seine', '11'),
  ('93', 'Seine-Saint-Denis', '11'),
  ('94', 'Val-de-Marne', '11'),
  ('95', 'Val-d''Oise', '11'),
  ('971', 'Guadeloupe', '01'),
  ('972', 'Martinique', '02'),
  ('973', 'Guyane', '03'),
  ('974', 'La Réunion', '04'),
  ('976', 'Mayotte', '06');

-- ---------------------------------------------------------------------------
-- Territoires choisis par l'artisan (écriture par set_artisan_zone et l'inscription)
-- ---------------------------------------------------------------------------
create table public.artisan_territories (
  id uuid primary key default gen_random_uuid(),
  artisan_id uuid not null references public.artisans (id) on delete cascade,
  departement_code text references public.departements (code) on update cascade,
  region_code text references public.regions (code) on update cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint artisan_territories_un_territoire check (num_nonnulls(departement_code, region_code) = 1),
  unique (artisan_id, departement_code),
  unique (artisan_id, region_code)
);
create index artisan_territories_departement_code_idx on public.artisan_territories (departement_code);
create index artisan_territories_region_code_idx on public.artisan_territories (region_code);

create trigger artisan_territories_set_updated_at before update on public.artisan_territories
  for each row execute function app.set_updated_at();

alter table public.artisan_territories enable row level security;
revoke all on public.artisan_territories from anon, authenticated;
grant select on public.artisan_territories to authenticated;
create policy "artisan_territories : lecture des siens, ou par l'équipe MENAO"
  on public.artisan_territories for select to authenticated
  using (artisan_id = (select app.my_artisan_id()) or (select app.is_staff()));

-- ---------------------------------------------------------------------------
-- Couverture et libellés
-- ---------------------------------------------------------------------------
-- Département d'une commune : 3 caractères outre-mer, 2 ailleurs (departementOfInsee en TypeScript).
create function app.departement_insee(p_code_insee text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case when p_code_insee like '97%' then left(p_code_insee, 3) else left(p_code_insee, 2) end
$$;
revoke execute on function app.departement_insee(text) from public, anon, authenticated;

-- Vrai si la zone en département, région ou France de l'artisan couvre la commune.
create function app.artisan_couvre_territoire(p_artisan uuid, p_mode public.zone_mode, p_code_insee text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case p_mode
    when 'france' then p_code_insee is not null
    when 'departements' then exists (
      select 1 from public.artisan_territories t
      where t.artisan_id = p_artisan and t.departement_code = app.departement_insee(p_code_insee)
    )
    when 'regions' then exists (
      select 1 from public.artisan_territories t
      join public.departements d on d.region_code = t.region_code
      where t.artisan_id = p_artisan and d.code = app.departement_insee(p_code_insee)
    )
    else false
  end
$$;
revoke execute on function app.artisan_couvre_territoire(uuid, public.zone_mode, text)
  from public, anon, authenticated;

-- Communes ou territoires affichés sur les cartes et les fiches.
create function app.artisan_zone_labels(p_artisan uuid, p_mode public.zone_mode)
returns text[]
language sql
stable
security definer
set search_path = ''
as $$
  select case p_mode
    when 'france' then array['France entière']
    when 'departements' then (
      select coalesce(array_agg(d.nom || ' (' || d.code || ')' order by d.code), '{}')
      from public.artisan_territories t
      join public.departements d on d.code = t.departement_code
      where t.artisan_id = p_artisan
    )
    when 'regions' then (
      select coalesce(array_agg(r.nom order by r.nom), '{}')
      from public.artisan_territories t
      join public.regions r on r.code = t.region_code
      where t.artisan_id = p_artisan
    )
    else (
      select coalesce(array_agg(z.nom order by z.nom), '{}')
      from public.artisan_zones z where z.artisan_id = p_artisan
    )
  end
$$;
revoke execute on function app.artisan_zone_labels(uuid, public.zone_mode)
  from public, anon, authenticated;

-- Remplace les territoires de l'artisan ; renvoie le nombre de codes reconnus.
create function app.replace_artisan_territories(p_artisan uuid, p_mode public.zone_mode, p_codes text[])
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count int := 0;
begin
  delete from public.artisan_territories where artisan_id = p_artisan;
  if p_mode = 'departements' then
    insert into public.artisan_territories (artisan_id, departement_code)
      select p_artisan, d.code from public.departements d where d.code = any (coalesce(p_codes, '{}'));
    get diagnostics v_count = row_count;
  elsif p_mode = 'regions' then
    insert into public.artisan_territories (artisan_id, region_code)
      select p_artisan, r.code from public.regions r where r.code = any (coalesce(p_codes, '{}'));
    get diagnostics v_count = row_count;
  end if;
  return v_count;
end;
$$;
revoke execute on function app.replace_artisan_territories(uuid, public.zone_mode, text[])
  from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Choix de la zone
-- ---------------------------------------------------------------------------
drop function public.set_artisan_zone(public.zone_mode, text, text, double precision, double precision, int, jsonb);
create function public.set_artisan_zone(
  p_mode public.zone_mode,
  p_base_label text default null,
  p_base_code_insee text default null,
  p_lon double precision default null,
  p_lat double precision default null,
  p_radius_km int default null,
  p_communes jsonb default '[]'::jsonb,
  p_territoires text[] default '{}'
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_artisan uuid := app.my_artisan_id();
  v_retenus int;
begin
  if v_artisan is null then
    raise exception 'Aucune fiche artisan pour cet utilisateur.' using errcode = '42501';
  end if;

  delete from public.artisan_zones where artisan_id = v_artisan;
  v_retenus := app.replace_artisan_territories(v_artisan, p_mode, p_territoires);

  if p_mode = 'rayon' then
    if p_radius_km is null then
      raise exception 'Rayon requis.' using errcode = '22023';
    end if;
    if p_lon is null or p_lat is null then
      -- Changement du rayon seul : l'adresse de base existante est conservée.
      if not exists (select 1 from public.artisans where id = v_artisan and base_location is not null) then
        raise exception 'Adresse de base requise.' using errcode = '22023';
      end if;
      update public.artisans set zone_mode = 'rayon', radius_km = p_radius_km where id = v_artisan;
    else
      if p_base_label is null then
        raise exception 'Adresse de base requise.' using errcode = '22023';
      end if;
      update public.artisans set
        zone_mode = 'rayon',
        base_label = p_base_label,
        base_code_insee = p_base_code_insee,
        base_location = extensions.st_setsrid(extensions.st_makepoint(p_lon, p_lat), 4326)::extensions.geography,
        radius_km = p_radius_km
      where id = v_artisan;
    end if;
  elsif p_mode = 'communes' then
    if jsonb_typeof(p_communes) is distinct from 'array' or jsonb_array_length(p_communes) = 0 then
      raise exception 'Au moins une commune est requise.' using errcode = '22023';
    end if;
    update public.artisans set
      zone_mode = 'communes', base_label = null, base_code_insee = null, base_location = null, radius_km = null
    where id = v_artisan;
    insert into public.artisan_zones (artisan_id, code_insee, nom)
      select distinct on (c.code) v_artisan, c.code, c.nom
      from jsonb_to_recordset(p_communes) as c (code text, nom text);
  else
    -- Territoires (ADR 0213) : tous les codes reconnus ; l'adresse de départ reste requise, elle
    -- sert à la distance et à la zone élargie.
    if p_mode <> 'france' and (
      v_retenus = 0
      or v_retenus <> (select count(distinct code) from unnest(p_territoires) as code)
    ) then
      raise exception 'Territoire invalide.' using errcode = '22023';
    end if;
    if p_lon is null or p_lat is null then
      if not exists (select 1 from public.artisans where id = v_artisan and base_location is not null) then
        raise exception 'Adresse de base requise.' using errcode = '22023';
      end if;
      update public.artisans set zone_mode = p_mode, radius_km = null where id = v_artisan;
    else
      if p_base_label is null then
        raise exception 'Adresse de base requise.' using errcode = '22023';
      end if;
      update public.artisans set
        zone_mode = p_mode,
        base_label = p_base_label,
        base_code_insee = p_base_code_insee,
        base_location = extensions.st_setsrid(extensions.st_makepoint(p_lon, p_lat), 4326)::extensions.geography,
        radius_km = null
      where id = v_artisan;
    end if;
  end if;
end;
$$;
revoke execute on function public.set_artisan_zone(public.zone_mode, text, text, double precision, double precision, int, jsonb, text[])
  from public, anon;
grant execute on function public.set_artisan_zone(public.zone_mode, text, text, double precision, double precision, int, jsonb, text[])
  to authenticated;

-- Inscription en un parcours : même contrôle que signupZoneSchema (@menao/validation).
create function app.apply_signup_territories(p_artisan uuid, p_zone jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_mode public.zone_mode := (p_zone ->> 'mode')::public.zone_mode;
  v_lon double precision;
  v_lat double precision;
  v_label text := nullif(left(btrim(coalesce(p_zone ->> 'base_label', '')), 300), '');
  v_insee text := p_zone ->> 'base_citycode';
  v_codes text[] := '{}';
begin
  if jsonb_typeof(p_zone -> 'lon') is distinct from 'number'
     or jsonb_typeof(p_zone -> 'lat') is distinct from 'number' then
    return;
  end if;
  v_lon := (p_zone ->> 'lon')::double precision;
  v_lat := (p_zone ->> 'lat')::double precision;
  if not (v_lon between -63 and 56 and v_lat between -22 and 52
          and v_label is not null and v_insee ~ '^([0-9]{5}|2[AB][0-9]{3})$') then
    return;
  end if;
  if jsonb_typeof(p_zone -> 'territoires') = 'array' then
    select coalesce(array_agg(c), '{}') into v_codes
    from jsonb_array_elements_text(p_zone -> 'territoires') as c;
  end if;
  if app.replace_artisan_territories(p_artisan, v_mode, v_codes) = 0 and v_mode <> 'france' then
    return;
  end if;
  update public.artisans set
    zone_mode = v_mode,
    base_label = v_label,
    base_code_insee = v_insee,
    base_location = extensions.st_setsrid(extensions.st_makepoint(v_lon, v_lat), 4326)::extensions.geography,
    radius_km = null
  where id = p_artisan;
end;
$$;
revoke execute on function app.apply_signup_territories(uuid, jsonb) from public, anon, authenticated;

create or replace function app.apply_artisan_signup(p_artisan uuid, p_signup jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_zone jsonb;
  v_radius numeric;
  v_lon double precision;
  v_lat double precision;
  v_label text;
  v_insee text;
  v_partner uuid;
  v_commercial uuid;
  v_tracking uuid;
begin
  if p_artisan is null or jsonb_typeof(p_signup) is distinct from 'object' then
    return;
  end if;

  if jsonb_typeof(p_signup -> 'trade_codes') = 'array' then
    insert into public.artisan_trades (artisan_id, trade_code)
    select distinct p_artisan, t.code
    from jsonb_array_elements(p_signup -> 'trade_codes') as c (value)
    join public.trades t on t.active and to_jsonb(t.code) = c.value
    on conflict (artisan_id, trade_code) do nothing;
  end if;

  update public.artisans set
    assujetti_tva = case
      when jsonb_typeof(p_signup -> 'assujetti_tva') = 'boolean'
      then (p_signup ->> 'assujetti_tva')::boolean else assujetti_tva end,
    is_dirigeant = case
      when jsonb_typeof(p_signup -> 'is_dirigeant') = 'boolean'
      then (p_signup ->> 'is_dirigeant')::boolean else is_dirigeant end
  where id = p_artisan;

  -- Programme Partenaires (F-59), commercial (F-65), code de suivi (F-66) ou parrainage (F-60) :
  -- inscription arrivée par un lien ou un code saisi.
  if jsonb_typeof(p_signup -> 'partner_code') = 'string' then
    v_partner := app.active_partner_id(p_signup ->> 'partner_code');
    if v_partner is not null then
      insert into public.partner_attributions (partner_id, artisan_id)
      values (v_partner, p_artisan)
      on conflict (artisan_id) do nothing;
    else
      select c.id into v_commercial
      from public.commercials c
      where c.code = lower(btrim(p_signup ->> 'partner_code')) and c.status = 'actif';
      if v_commercial is not null then
        insert into public.commercial_attributions (commercial_id, artisan_id)
        values (v_commercial, p_artisan)
        on conflict (artisan_id) do nothing;
      else
        -- Code de suivi actif (publicité, flyers, salon, code d'un associé : F-66, ADR 0209).
        select k.id into v_tracking
        from public.acquisition_codes k
        where k.code = lower(btrim(p_signup ->> 'partner_code')) and k.active;
        if v_tracking is not null then
          insert into public.acquisition_code_attributions (code_id, artisan_id)
          values (v_tracking, p_artisan)
          on conflict (artisan_id) do nothing;
        else
          -- Parrainage (F-60) : code d'un artisan validé, jamais le sien.
          insert into public.artisan_referrals (referrer_artisan_id, referred_artisan_id)
          select c.artisan_id, p_artisan
          from public.artisan_referral_codes c
          join public.artisans a on a.id = c.artisan_id and a.status = 'valide'
          where c.code = lower(btrim(p_signup ->> 'partner_code')) and c.artisan_id <> p_artisan
          on conflict (referred_artisan_id) do nothing;
        end if;
      end if;
    end if;
  end if;

  v_zone := case when jsonb_typeof(p_signup -> 'zone') = 'object' then p_signup -> 'zone' end;
  -- Zone par territoire (ADR 0213).
  if v_zone ->> 'mode' in ('departements', 'regions', 'france') then
    perform app.apply_signup_territories(p_artisan, v_zone);
    return;
  end if;
  if v_zone is null or v_zone ->> 'mode' is distinct from 'rayon'
     or jsonb_typeof(v_zone -> 'radius_km') is distinct from 'number'
     or jsonb_typeof(v_zone -> 'lon') is distinct from 'number'
     or jsonb_typeof(v_zone -> 'lat') is distinct from 'number' then
    return;
  end if;
  v_radius := (v_zone ->> 'radius_km')::numeric;
  v_lon := (v_zone ->> 'lon')::double precision;
  v_lat := (v_zone ->> 'lat')::double precision;
  v_label := nullif(left(btrim(coalesce(v_zone ->> 'base_label', '')), 300), '');
  v_insee := v_zone ->> 'base_citycode';
  -- Mêmes rayons et même boîte englobante que zoneStepSchema (@menao/validation).
  if v_radius in (10, 20, 30, 50, 75, 100)
     and v_lon between -63 and 56 and v_lat between -22 and 52
     and v_label is not null and v_insee ~ '^([0-9]{5}|2[AB][0-9]{3})$' then
    update public.artisans set
      zone_mode = 'rayon',
      base_label = v_label,
      base_code_insee = v_insee,
      base_location = extensions.st_setsrid(extensions.st_makepoint(v_lon, v_lat), 4326)::extensions.geography,
      radius_km = v_radius::int
    where id = p_artisan;
  end if;
end;
$$;

create or replace function app.onboarding_missing_steps(p_artisan_id uuid)
returns text[]
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  a public.artisans;
  v_missing text[] := '{}';
begin
  select * into a from public.artisans where id = p_artisan_id;
  if not found then
    return null;
  end if;

  if not (a.sirene_checked_at is not null and a.sirene_active and a.raison_sociale is not null
          and a.assujetti_tva is not null) then
    v_missing := array_append(v_missing, 'entreprise');
  end if;
  if not exists (select 1 from public.artisan_trades t where t.artisan_id = a.id) then
    v_missing := array_append(v_missing, 'metiers');
  end if;
  if not ((a.zone_mode = 'rayon' and a.base_location is not null and a.radius_km is not null)
          or (a.zone_mode = 'communes' and exists (select 1 from public.artisan_zones z where z.artisan_id = a.id))
          or (a.zone_mode = 'france' and a.base_location is not null)
          or (a.zone_mode in ('departements', 'regions') and a.base_location is not null
              and exists (select 1 from public.artisan_territories t where t.artisan_id = a.id))) then
    v_missing := array_append(v_missing, 'zone');
  end if;
  if not app.charter_signed(a.id) then
    v_missing := array_append(v_missing, 'charte');
  end if;
  if not app.documents_complete(a.id, array['en_attente', 'valide']::public.document_status[]) then
    v_missing := array_append(v_missing, 'documents');
  end if;
  if not (char_length(coalesce(a.presentation, '')) >= 100
          and exists (select 1 from public.profiles p where p.user_id = a.user_id and p.avatar_path is not null)) then
    v_missing := array_append(v_missing, 'profil');
  end if;
  return v_missing;
end;
$$;

create or replace function app.artisan_profile_json(p_artisan_id uuid)
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
    -- Score MENAO sur 100 et ses critères (ADR 0155), diplôme déclaré, avis Google vérifiés.
    'menao_score', (
      select jsonb_build_object('score', s.score, 'verifie', s.verifie, 'experience', s.experience,
        'diplomes', s.diplomes, 'profil', s.profil, 'reactivite', s.reactivite, 'avis', s.avis)
      from app.artisan_menao_score(a.id) s
    ),
    'diplome', a.diplome_metier,
    'google', case when a.google_checked_at is not null then jsonb_build_object(
      'rating', a.google_rating, 'count', a.google_review_count, 'url', a.google_url) end,
    'presentation', a.presentation,
    'paused', a.paused or app.artisan_absent(a.id, (now() at time zone 'Europe/Paris')::date),
    -- Temps de réponse moyen (F-10), publié à partir de 3 réponses.
    'response_minutes', (
      select s.minutes from app.artisan_response_stats(a.id) s where s.responses >= 3
    ),
    'available_from', a.available_from,
    'zone', jsonb_build_object(
      'mode', a.zone_mode,
      'radius_km', a.radius_km,
      'city', app.base_commune(a.base_label),
      'communes', to_jsonb(app.artisan_zone_labels(a.id, a.zone_mode))
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
    -- Badge « Assuré et vérifié » (ADR 0119).
    'verified', app.artisan_verified_badge(a.id),
    'decennale_exempt', a.decennale_non_soumis,
    'decennale', (
      select jsonb_build_object('valid_until', d.date_fin, 'insurer', d.assureur)
      from public.artisan_documents d
      where d.artisan_id = a.id and d.type = 'decennale' and d.status = 'valide'
      order by d.date_fin desc nulls last limit 1
    ),
    'rc_pro', (
      select jsonb_build_object('valid_until', d.date_fin, 'insurer', d.assureur)
      from public.artisan_documents d
      where d.artisan_id = a.id and d.type = 'rc_pro' and d.status = 'valide'
      order by d.date_fin desc nulls last limit 1
    ),
    'certifications', (
      select coalesce(jsonb_agg(jsonb_build_object('type', c.type, 'numero', c.numero, 'valid_until', c.date_fin) order by c.type), '[]')
      from public.certifications c
      where c.artisan_id = a.id and c.verified_at is not null
        and c.date_fin >= (now() at time zone 'Europe/Paris')::date
    ),
    -- Domaines RGE lus dans l'annuaire officiel (ADR 0118), encore valides, sans doublon.
    'rge', (
      select coalesce(jsonb_agg(jsonb_build_object('domain', q.domaine, 'category', q.meta_domaine, 'valid_until', q.date_fin) order by q.domaine), '[]')
      from (
        select distinct on (r.domaine) r.domaine, r.meta_domaine, r.date_fin
        from public.artisan_rge_qualifications r
        where r.artisan_id = a.id and r.date_fin >= (now() at time zone 'Europe/Paris')::date
        order by r.domaine, r.date_fin desc
      ) q
    ),
    'photos', (
      select coalesce(jsonb_agg(p.storage_path order by p.sort_order, p.created_at), '[]')
      from public.artisan_photos p where p.artisan_id = a.id
    ),
    -- Réseau du parrainage (ADR 0161) : filleuls visibles (« Artisans partenaires », 6 au plus) et
    -- parrain visible (« Recommandé par »), sous leur nom public.
    'partners', (
      select coalesce(jsonb_agg(jsonb_build_object('id', f.id, 'name', f.name, 'trade', f.trade, 'slug', f.slug)
        order by f.created_at), '[]')
      from (
        select fa.id, fa.slug, r.created_at,
          coalesce(app.artisan_public_name(fa.nom_commercial, fa.raison_sociale, fa.sirene_partial),
            nullif(btrim(fp.first_name), ''), 'Artisan') as name,
          (select t.label from public.artisan_trades at join public.trades t on t.code = at.trade_code
           where at.artisan_id = fa.id order by t.sort_order limit 1) as trade
        from public.artisan_referrals r
        join public.artisans fa on fa.id = r.referred_artisan_id
        left join public.profiles fp on fp.user_id = fa.user_id
        -- 6 : REFERRAL_PARTNERS_SHOWN (@menao/core).
        where r.referrer_artisan_id = a.id and r.status <> 'annule' and app.artisan_is_visible(fa.id)
        order by r.created_at
        limit 6
      ) f
    ),
    'recommended_by', (
      select jsonb_build_object('id', pa.id, 'slug', pa.slug,
        'name', coalesce(app.artisan_public_name(pa.nom_commercial, pa.raison_sociale, pa.sirene_partial),
          nullif(btrim(pp.first_name), ''), 'Artisan'))
      from public.artisan_referrals r
      join public.artisans pa on pa.id = r.referrer_artisan_id
      left join public.profiles pp on pp.user_id = pa.user_id
      where r.referred_artisan_id = a.id and r.status <> 'annule' and app.artisan_is_visible(pa.id)
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
  where a.id = p_artisan_id
$$;

create or replace function app.match_artisans_core(p_project_id uuid, p_limit int)
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
  specialties jsonb,
  verified boolean,
  menao_score smallint,
  hors_zone boolean
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
  where p.id = p_project_id;
  if not found then
    raise exception 'Projet introuvable' using errcode = '42501';
  end if;
  if v.trade_code is null or v.ville_code_insee is null then
    return;
  end if;
  v_point := coalesce(v.location, v.ville_location);

  return query
  with candidats as (
    select
      a.id,
      coalesce(pr.first_name, a.nom_commercial, a.raison_sociale) as nom,
      pr.avatar_path as avatar,
      a.experience_years as experience,
      a.zone_mode as mode,
      a.radius_km as rayon,
      app.base_commune(a.base_label) as commune,
      app.artisan_zone_labels(a.id, a.zone_mode) as communes,
      (a.available_from is null or a.available_from <= v_today) as dispo,
      a.available_from as dispo_le,
      case when a.zone_mode = 'rayon' and v_point is not null
        then extensions.st_distance(a.base_location, v_point) end as distance_m,
      (
        select coalesce(jsonb_agg(jsonb_build_object('code', w.code, 'label', w.label) order by w.sort_order), '[]')
        from public.artisan_work_types aw
        join public.work_types w on w.code = aw.work_type_code
        where aw.artisan_id = a.id and w.trade_code = v.trade_code and w.active
      ) as specialites,
      app.artisan_verified_badge(a.id) as verifie,
      ms.score,
      app.artisan_is_newcomer(a.id) as nouveau,
      md5(p_project_id::text || a.id::text) as tirage,
      (
        (a.zone_mode = 'communes' and exists (
          select 1 from public.artisan_zones z where z.artisan_id = a.id and z.code_insee = v.ville_code_insee
        ))
        or (a.zone_mode = 'rayon' and v_point is not null and a.base_location is not null
          and extensions.st_dwithin(a.base_location, v_point, a.radius_km * 1000))
        or app.artisan_couvre_territoire(a.id, a.zone_mode, v.ville_code_insee)
      ) as en_zone,
      -- Zones région et France : après les artisans de proximité (ADR 0213).
      a.zone_mode in ('regions', 'france') as large,
      case when v_point is not null and a.base_location is not null
        then extensions.st_distance(a.base_location, v_point) end as distance_base
    from public.artisans a
    left join public.profiles pr on pr.user_id = a.user_id
    cross join lateral app.artisan_menao_score(a.id) ms
    where app.artisan_is_visible(a.id)
      and not a.paused
      and not app.artisan_absent(a.id, v_today)
      -- Budget minimum de l'artisan (ADR 0164) : seulement si la demande annonce un budget.
      and (v.budget is null or a.budget_minimum is null or v.budget >= a.budget_minimum)
      and exists (select 1 from public.artisan_trades t where t.artisan_id = a.id and t.trade_code = v.trade_code)
      and (
        (a.zone_mode = 'communes' and exists (
          select 1 from public.artisan_zones z where z.artisan_id = a.id and z.code_insee = v.ville_code_insee
        ))
        or (a.zone_mode = 'rayon' and v_point is not null and a.base_location is not null
          and extensions.st_dwithin(a.base_location, v_point, a.radius_km * 1000))
        or app.artisan_couvre_territoire(a.id, a.zone_mode, v.ville_code_insee)
        -- Zone élargie (ADR 0165) : jusqu'à 20 km au-delà de sa zone (ZONE_WIDENING_KM).
        or (v_point is not null and a.base_location is not null
          and extensions.st_dwithin(a.base_location, v_point,
            ((case when a.zone_mode = 'rayon' then coalesce(a.radius_km, 0) else 0 end) + 20) * 1000))
      )
  ),
  -- Artisans de proximité d'abord (ADR 0213), puis ordre au mérite : disponibles tout de suite
  -- d'abord, Score MENAO (ADR 0155), date de disponibilité, distance et tirage propre au projet.
  merite as (
    select c.*, row_number() over (
      order by c.large, c.dispo desc, c.score desc, c.dispo_le nulls first, c.distance_base nulls last, c.tirage
    ) as rang
    from candidats c
    where c.en_zone
  ),
  -- Place réservée (MAX_SEARCH_RESULTS = 5, NEWCOMER.position = 3) : seulement si aucun nouveau
  -- n'est déjà parmi les 5 premiers.
  place as (
    select m.id from merite m
    where m.nouveau and m.rang > 5
      and not exists (select 1 from merite x where x.nouveau and x.rang <= 5)
    order by m.dispo desc, m.tirage
    limit 1
  ),
  -- Hors de leur zone : après tous ceux de la zone, les plus proches d'abord.
  proches as (
    select c.*, row_number() over (
      order by c.distance_base, c.dispo desc, c.score desc, c.tirage
    ) as rang
    from candidats c
    where not c.en_zone
  ),
  liste as (
    select m.id, m.nom, m.avatar, m.experience, m.mode, m.rayon, m.commune, m.communes, m.dispo,
      m.dispo_le, round((m.distance_m / 1000)::numeric, 1) as km, m.specialites, m.verifie, m.score,
      false as hz, (case when m.id = (select p.id from place p) then 2.5 else m.rang end)::numeric as ordre
    from merite m
    union all
    select x.id, x.nom, x.avatar, x.experience, x.mode, x.rayon, x.commune, x.communes, x.dispo,
      x.dispo_le, round((x.distance_base / 1000)::numeric, 1), x.specialites, x.verifie, x.score,
      true, (1000000 + x.rang)::numeric
    from proches x
  )
  select l.id, l.nom, l.avatar, l.experience, l.mode, l.rayon, l.commune, l.communes, l.dispo, l.dispo_le,
    l.km, l.specialites, l.verifie, l.score, l.hz
  from liste l
  order by l.ordre
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
  specialties jsonb,
  verified boolean
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
    app.artisan_zone_labels(a.id, a.zone_mode),
    (a.available_from is null or a.available_from <= v_today),
    a.available_from,
    (
      select coalesce(jsonb_agg(jsonb_build_object('code', w.code, 'label', w.label) order by w.sort_order), '[]')
      from public.artisan_work_types aw
      join public.work_types w on w.code = aw.work_type_code
      where aw.artisan_id = a.id and w.trade_code = p_trade_code and w.active
    ),
    app.artisan_verified_badge(a.id)
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
      or app.artisan_couvre_territoire(a.id, a.zone_mode, p_code_insee)
    )
  order by
    a.zone_mode in ('regions', 'france'),
    (a.available_from is null or a.available_from <= v_today) desc,
    a.available_from nulls first,
    md5(p_trade_code || p_code_insee || a.id::text)
  limit least(greatest(coalesce(p_limit, 12), 1), 50);
end;
$$;

create or replace function public.my_zone_demand()
returns json
language sql
stable
security definer
set search_path = ''
as $$
  with artisan as (
    select a.id, a.zone_mode, a.base_location, a.radius_km
    from public.artisans a
    where a.user_id = (select auth.uid())
  ),
  searches as (
    select p.trade_code
    from public.projects p, artisan a
    where p.created_at >= now() - interval '30 days'
      and p.trade_code in (select t.trade_code from public.artisan_trades t where t.artisan_id = a.id)
      and (
        (a.zone_mode = 'rayon' and a.base_location is not null and a.radius_km is not null
          and extensions.st_dwithin(
            coalesce(p.location, p.ville_location), a.base_location, a.radius_km * 1000
          ))
        or (a.zone_mode = 'communes' and p.ville_code_insee in (
          select z.code_insee from public.artisan_zones z where z.artisan_id = a.id
        ))
        or app.artisan_couvre_territoire(a.id, a.zone_mode, p.ville_code_insee)
      )
  )
  select json_build_object(
    'jours', 30,
    'recherches', (select count(*) from searches),
    'metiers', (
      select coalesce(json_agg(json_build_object('metier', m.trade_code, 'recherches', m.n)
        order by m.n desc, m.trade_code), '[]'::json)
      from (select s.trade_code, count(*) as n from searches s group by s.trade_code) m
    )
  )
$$;

create or replace function public.admin_launch_coverage()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_result jsonb;
begin
  perform app.require_admin();
  select jsonb_build_object(
    'seuil', coalesce((select s.seuil_couverture from public.launch_settings s), 3),
    'communes', (
      select coalesce(jsonb_agg(jsonb_build_object('code_insee', c.code_insee, 'nom', c.nom)
        order by c.ordre, c.nom), '[]'::jsonb)
      from public.communes c
      where c.pilote
    ),
    'trades', (
      select coalesce(jsonb_agg(jsonb_build_object('code', t.code, 'label', t.label)
        order by t.sort_order, t.label), '[]'::jsonb)
      from public.trades t
      where t.active
    ),
    'cells', (
      select coalesce(jsonb_agg(jsonb_build_object('trade', x.trade, 'code_insee', x.code_insee, 'n', x.n)
        order by x.sort_order, x.ordre, x.code_insee), '[]'::jsonb)
      from (
        select t.code as trade, t.sort_order, c.code_insee, c.ordre, count(distinct a.id) as n
        from public.artisans a
        join public.artisan_trades atr on atr.artisan_id = a.id
        join public.trades t on t.code = atr.trade_code and t.active
        join public.communes c on c.pilote and (
          (a.zone_mode = 'communes' and exists (
            select 1 from public.artisan_zones z where z.artisan_id = a.id and z.code_insee = c.code_insee
          ))
          or (a.zone_mode = 'rayon' and a.base_location is not null
            and extensions.st_dwithin(a.base_location, c.location, a.radius_km * 1000))
          or app.artisan_couvre_territoire(a.id, a.zone_mode, c.code_insee)
        )
        where a.status = 'valide'
        group by t.code, t.sort_order, c.code_insee, c.ordre
      ) x
    )
  ) into v_result;
  return v_result;
end;
$$;
