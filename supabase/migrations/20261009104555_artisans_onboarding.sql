-- F-14 (partie 1) — inscription artisan, vérification Sirene, onboarding étapes 1 à 3.

-- ---------------------------------------------------------------------------
-- Fonctions utilitaires (miroir de packages/core/src/siret.ts, testées en pgTAP)
-- ---------------------------------------------------------------------------
create function app.is_valid_siret(value text)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare
  total int := 0;
  d int;
begin
  if value is null or value !~ '^[0-9]{14}$' then
    return false;
  end if;
  for i in 1..14 loop
    d := substr(value, 15 - i, 1)::int;
    if i % 2 = 0 then
      d := d * 2;
      if d > 9 then d := d - 9; end if;
    end if;
    total := total + d;
  end loop;
  if total % 10 = 0 then
    return true;
  end if;
  -- Exception INSEE : établissements de La Poste (somme des chiffres multiple de 5).
  if left(value, 9) = '356000000' then
    select sum(substr(value, i, 1)::int) into total from generate_series(1, 14) as i;
    return total % 5 = 0;
  end if;
  return false;
end;
$$;

create function app.french_vat_number(siren text)
returns text
language sql
immutable
set search_path = ''
as $$
  select 'FR' || lpad(((12 + 3 * (siren::bigint % 97)) % 97)::text, 2, '0') || siren
$$;

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------
create type public.artisan_status as enum ('brouillon', 'en_verification', 'valide', 'refuse', 'suspendu');
create type public.zone_mode as enum ('rayon', 'communes');
create type public.certification_type as enum (
  'rge', 'qualifelec', 'qualibat', 'qualipac', 'qualipv', 'qualisol', 'qualibois', 'autre'
);

-- ---------------------------------------------------------------------------
-- Référentiels (lecture publique, écriture réservée au back-office plus tard : F-57)
-- ---------------------------------------------------------------------------
create table public.trades (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[a-z0-9-]{1,60}$'),
  label text not null check (char_length(label) between 1 and 100),
  sort_order smallint not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.work_types (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[a-z0-9-]{1,60}$'),
  trade_code text not null references public.trades (code) on update cascade,
  label text not null check (char_length(label) between 1 and 100),
  sort_order smallint not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index work_types_trade_code_idx on public.work_types (trade_code);

-- Codes APE considérés comme « bâtiment » (F-14, [À VALIDER]) : préfixes de la nomenclature NAF.
-- Hors liste = avertissement pour l'admin, pas de refus automatique.
create table public.ape_codes_btp (
  id uuid primary key default gen_random_uuid(),
  code_prefix text not null unique check (code_prefix ~ '^[0-9]{2}(\.[0-9]{2}[A-Z]?)?$'),
  label text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trades_set_updated_at before update on public.trades
  for each row execute function app.set_updated_at();
create trigger work_types_set_updated_at before update on public.work_types
  for each row execute function app.set_updated_at();
create trigger ape_codes_btp_set_updated_at before update on public.ape_codes_btp
  for each row execute function app.set_updated_at();

alter table public.trades enable row level security;
alter table public.work_types enable row level security;
alter table public.ape_codes_btp enable row level security;

revoke all on public.trades, public.work_types, public.ape_codes_btp from anon, authenticated;
grant select on public.trades, public.work_types to anon, authenticated;
grant select on public.ape_codes_btp to authenticated;

create policy "trades : lecture publique des métiers actifs"
  on public.trades for select to anon, authenticated using (active or (select app.is_staff()));
create policy "work_types : lecture publique des spécialités actives"
  on public.work_types for select to anon, authenticated using (active or (select app.is_staff()));
create policy "ape_codes_btp : lecture par les utilisateurs connectés"
  on public.ape_codes_btp for select to authenticated using (true);

insert into public.trades (code, label, sort_order) values
  ('electricien', 'Électricien', 10),
  ('plombier', 'Plombier', 20),
  ('chauffagiste', 'Chauffagiste', 30),
  ('climaticien', 'Climaticien', 40),
  ('macon', 'Maçon', 50),
  ('peintre', 'Peintre', 60),
  ('plaquiste', 'Plaquiste', 70),
  ('carreleur', 'Carreleur', 80),
  ('menuisier', 'Menuisier', 90),
  ('charpentier', 'Charpentier', 100),
  ('couvreur', 'Couvreur', 110),
  ('facadier', 'Façadier', 120),
  ('serrurier', 'Serrurier', 130),
  ('terrassier', 'Terrassier', 140),
  ('paysagiste', 'Paysagiste', 150);

insert into public.work_types (code, trade_code, label, sort_order) values
  ('tableau-electrique', 'electricien', 'Tableau électrique', 10),
  ('mise-aux-normes-electriques', 'electricien', 'Mise aux normes', 20),
  ('eclairage', 'electricien', 'Éclairage', 30),
  ('borne-recharge', 'electricien', 'Borne de recharge', 40),
  ('recherche-fuite', 'plombier', 'Recherche et réparation de fuite', 10),
  ('sanitaires', 'plombier', 'Installation de sanitaires', 20),
  ('chauffe-eau', 'plombier', 'Chauffe-eau', 30),
  ('pompe-a-chaleur', 'chauffagiste', 'Pompe à chaleur', 10),
  ('chaudiere', 'chauffagiste', 'Chaudière', 20),
  ('climatisation', 'climaticien', 'Climatisation', 10),
  ('gros-oeuvre', 'macon', 'Gros œuvre', 10),
  ('extension', 'macon', 'Extension', 20),
  ('ouverture-mur-porteur', 'macon', 'Ouverture de mur porteur', 30),
  ('peinture-interieure', 'peintre', 'Peinture intérieure', 10),
  ('peinture-exterieure', 'peintre', 'Peinture extérieure', 20),
  ('cloisons', 'plaquiste', 'Cloisons et doublages', 10),
  ('faux-plafond', 'plaquiste', 'Faux plafonds', 20),
  ('carrelage-sol', 'carreleur', 'Carrelage de sol', 10),
  ('faience', 'carreleur', 'Faïence murale', 20),
  ('fenetres', 'menuisier', 'Fenêtres', 10),
  ('portes', 'menuisier', 'Portes', 20),
  ('agencement', 'menuisier', 'Placards et agencement', 30),
  ('charpente', 'charpentier', 'Charpente', 10),
  ('toiture', 'couvreur', 'Réfection de toiture', 10),
  ('gouttieres', 'couvreur', 'Gouttières', 20),
  ('ravalement', 'facadier', 'Ravalement de façade', 10),
  ('isolation-exterieure', 'facadier', 'Isolation par l''extérieur', 20),
  ('serrures', 'serrurier', 'Serrures et blindage', 10),
  ('terrassement', 'terrassier', 'Terrassement', 10),
  ('vrd', 'terrassier', 'Voirie et réseaux divers', 20),
  ('amenagement-jardin', 'paysagiste', 'Aménagement de jardin', 10),
  ('clotures', 'paysagiste', 'Clôtures', 20);

insert into public.ape_codes_btp (code_prefix, label) values
  ('41', 'Construction de bâtiments'),
  ('42', 'Génie civil'),
  ('43', 'Travaux de construction spécialisés'),
  ('81.30Z', 'Services d''aménagement paysager');

-- ---------------------------------------------------------------------------
-- artisans
-- ---------------------------------------------------------------------------
create table public.artisans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  status public.artisan_status not null default 'brouillon',
  siret text unique check (siret is null or app.is_valid_siret(siret)),
  siren text generated always as (left(siret, 9)) stored,
  -- Données issues de Sirene (écrites par l'Edge Function sirene-check).
  raison_sociale text check (char_length(raison_sociale) between 1 and 200),
  forme_juridique_code text check (forme_juridique_code ~ '^[0-9]{4}$'),
  ape_code text check (char_length(ape_code) <= 10),
  ape_eligible boolean,
  adresse_ligne text check (char_length(adresse_ligne) <= 300),
  adresse_code_postal text check (adresse_code_postal ~ '^[0-9]{5}$'),
  adresse_commune text check (char_length(adresse_commune) <= 100),
  adresse_code_insee text check (adresse_code_insee ~ '^([0-9]{5}|2[AB][0-9]{3})$'),
  sirene_checked_at timestamptz,
  sirene_active boolean,
  sirene_partial boolean not null default false,
  -- Saisies par l'artisan.
  nom_commercial text check (char_length(nom_commercial) between 1 and 120),
  assujetti_tva boolean,
  tva_intracom text generated always as (
    case when assujetti_tva and siret is not null then app.french_vat_number(left(siret, 9)) end
  ) stored,
  experience_years smallint check (experience_years between 0 and 80),
  zone_mode public.zone_mode,
  base_label text check (char_length(base_label) <= 300),
  base_code_insee text check (base_code_insee ~ '^([0-9]{5}|2[AB][0-9]{3})$'),
  base_location extensions.geography(point, 4326),
  radius_km smallint check (radius_km between 1 and 150),
  refusal_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint artisans_zone_rayon_complete check (
    zone_mode is distinct from 'rayon' or (base_location is not null and radius_km is not null)
  )
);

comment on column public.artisans.ape_eligible is
  'Code APE dans public.ape_codes_btp. Faux = avertissement pour l''admin, pas de refus automatique.';

create index artisans_status_idx on public.artisans (status);
create index artisans_base_location_idx on public.artisans using gist (base_location);

create trigger artisans_set_updated_at before update on public.artisans
  for each row execute function app.set_updated_at();

-- Identifiant de la fiche artisan de l'utilisateur courant (NULL s'il n'en a pas).
create function app.my_artisan_id()
returns uuid
language sql
stable
security invoker
set search_path = ''
as $$
  select id from public.artisans where user_id = (select auth.uid())
$$;

-- Garde-fous des modifications faites par l'artisan lui-même.
create function app.artisans_guard_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;

  if new.siret is distinct from old.siret then
    if old.status <> 'brouillon' then
      raise exception 'Le SIRET ne peut plus être modifié après l''envoi en vérification.'
        using errcode = '42501';
    end if;
    -- Nouveau SIRET : les données Sirene précédentes ne valent plus.
    new.raison_sociale := null;
    new.forme_juridique_code := null;
    new.ape_code := null;
    new.ape_eligible := null;
    new.adresse_ligne := null;
    new.adresse_code_postal := null;
    new.adresse_commune := null;
    new.adresse_code_insee := null;
    new.sirene_checked_at := null;
    new.sirene_active := null;
    new.sirene_partial := false;
  elsif new.raison_sociale is distinct from old.raison_sociale and not old.sirene_partial then
    raise exception 'La raison sociale provient de Sirene et ne peut pas être modifiée.'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

create trigger artisans_guard_update before update on public.artisans
  for each row execute function app.artisans_guard_update();

alter table public.artisans enable row level security;

revoke all on public.artisans from anon, authenticated;
grant select on public.artisans to authenticated;
grant update (siret, raison_sociale, nom_commercial, assujetti_tva) on public.artisans to authenticated;

create policy "artisans : lecture de sa fiche, ou par l'équipe MENAO"
  on public.artisans for select to authenticated
  using (user_id = (select auth.uid()) or (select app.is_staff()));

create policy "artisans : modification de sa fiche"
  on public.artisans for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Métiers, spécialités, zone, certifications de l'artisan
-- ---------------------------------------------------------------------------
create table public.artisan_trades (
  id uuid primary key default gen_random_uuid(),
  artisan_id uuid not null references public.artisans (id) on delete cascade,
  trade_code text not null references public.trades (code) on update cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (artisan_id, trade_code)
);
create index artisan_trades_trade_code_idx on public.artisan_trades (trade_code);

create table public.artisan_work_types (
  id uuid primary key default gen_random_uuid(),
  artisan_id uuid not null references public.artisans (id) on delete cascade,
  work_type_code text not null references public.work_types (code) on update cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (artisan_id, work_type_code)
);
create index artisan_work_types_work_type_code_idx on public.artisan_work_types (work_type_code);

create table public.artisan_zones (
  id uuid primary key default gen_random_uuid(),
  artisan_id uuid not null references public.artisans (id) on delete cascade,
  code_insee text not null check (code_insee ~ '^([0-9]{5}|2[AB][0-9]{3})$'),
  nom text not null check (char_length(nom) between 1 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (artisan_id, code_insee)
);
create index artisan_zones_code_insee_idx on public.artisan_zones (code_insee);

create table public.certifications (
  id uuid primary key default gen_random_uuid(),
  artisan_id uuid not null references public.artisans (id) on delete cascade,
  type public.certification_type not null,
  numero text not null check (char_length(numero) between 1 and 50),
  date_fin date not null,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index certifications_artisan_id_idx on public.certifications (artisan_id);
create index certifications_date_fin_idx on public.certifications (date_fin);

create trigger artisan_trades_set_updated_at before update on public.artisan_trades
  for each row execute function app.set_updated_at();
create trigger artisan_work_types_set_updated_at before update on public.artisan_work_types
  for each row execute function app.set_updated_at();
create trigger artisan_zones_set_updated_at before update on public.artisan_zones
  for each row execute function app.set_updated_at();
create trigger certifications_set_updated_at before update on public.certifications
  for each row execute function app.set_updated_at();

alter table public.artisan_trades enable row level security;
alter table public.artisan_work_types enable row level security;
alter table public.artisan_zones enable row level security;
alter table public.certifications enable row level security;

revoke all on public.artisan_trades, public.artisan_work_types, public.artisan_zones, public.certifications
  from anon, authenticated;
-- Écriture uniquement via set_artisan_trades / set_artisan_zone.
grant select on public.artisan_trades, public.artisan_work_types, public.artisan_zones to authenticated;
grant select, delete on public.certifications to authenticated;
-- verified_at n'est jamais fixé par l'artisan.
grant insert (artisan_id, type, numero, date_fin) on public.certifications to authenticated;

create policy "artisan_trades : lecture des siens, ou par l'équipe MENAO"
  on public.artisan_trades for select to authenticated
  using (artisan_id = (select app.my_artisan_id()) or (select app.is_staff()));

create policy "artisan_work_types : lecture des siens, ou par l'équipe MENAO"
  on public.artisan_work_types for select to authenticated
  using (artisan_id = (select app.my_artisan_id()) or (select app.is_staff()));

create policy "artisan_zones : lecture des siennes, ou par l'équipe MENAO"
  on public.artisan_zones for select to authenticated
  using (artisan_id = (select app.my_artisan_id()) or (select app.is_staff()));

create policy "certifications : lecture des siennes, ou par l'équipe MENAO"
  on public.certifications for select to authenticated
  using (artisan_id = (select app.my_artisan_id()) or (select app.is_staff()));
create policy "certifications : ajout pour soi"
  on public.certifications for insert to authenticated
  with check (artisan_id = (select app.my_artisan_id()));
create policy "certifications : suppression des siennes"
  on public.certifications for delete to authenticated
  using (artisan_id = (select app.my_artisan_id()));

-- ---------------------------------------------------------------------------
-- Fonctions d'écriture atomiques appelées par l'artisan. SECURITY DEFINER : elles écrivent
-- des colonnes non modifiables directement, mais uniquement sur la fiche de l'appelant.
-- ---------------------------------------------------------------------------

-- Étape 2 : métiers, spécialités (appartenant aux métiers choisis) et expérience.
create function public.set_artisan_trades(
  p_trade_codes text[],
  p_work_type_codes text[],
  p_experience_years int
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_artisan uuid := app.my_artisan_id();
begin
  if v_artisan is null then
    raise exception 'Aucune fiche artisan pour cet utilisateur.' using errcode = '42501';
  end if;
  if coalesce(cardinality(p_trade_codes), 0) = 0 then
    raise exception 'Au moins un métier est requis.' using errcode = '22023';
  end if;
  if exists (
    select 1 from unnest(p_trade_codes) as c
    where not exists (select 1 from public.trades t where t.code = c and t.active)
  ) then
    raise exception 'Métier inconnu.' using errcode = '22023';
  end if;
  if exists (
    select 1 from unnest(coalesce(p_work_type_codes, '{}')) as c
    where not exists (
      select 1 from public.work_types w
      where w.code = c and w.active and w.trade_code = any (p_trade_codes)
    )
  ) then
    raise exception 'Spécialité inconnue ou hors des métiers choisis.' using errcode = '22023';
  end if;

  delete from public.artisan_work_types where artisan_id = v_artisan;
  delete from public.artisan_trades where artisan_id = v_artisan;
  insert into public.artisan_trades (artisan_id, trade_code)
    select distinct v_artisan, c from unnest(p_trade_codes) as c;
  insert into public.artisan_work_types (artisan_id, work_type_code)
    select distinct v_artisan, c from unnest(coalesce(p_work_type_codes, '{}')) as c;
  update public.artisans set experience_years = p_experience_years where id = v_artisan;
end;
$$;

-- Étape 3 : zone d'intervention (rayon autour d'une adresse, ou liste de communes).
create function public.set_artisan_zone(
  p_mode public.zone_mode,
  p_base_label text default null,
  p_base_code_insee text default null,
  p_lon double precision default null,
  p_lat double precision default null,
  p_radius_km int default null,
  p_communes jsonb default '[]'::jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_artisan uuid := app.my_artisan_id();
begin
  if v_artisan is null then
    raise exception 'Aucune fiche artisan pour cet utilisateur.' using errcode = '42501';
  end if;

  delete from public.artisan_zones where artisan_id = v_artisan;

  if p_mode = 'rayon' then
    if p_lon is null or p_lat is null or p_radius_km is null or p_base_label is null then
      raise exception 'Adresse de base et rayon requis.' using errcode = '22023';
    end if;
    update public.artisans set
      zone_mode = 'rayon',
      base_label = p_base_label,
      base_code_insee = p_base_code_insee,
      base_location = extensions.st_setsrid(extensions.st_makepoint(p_lon, p_lat), 4326)::extensions.geography,
      radius_km = p_radius_km
    where id = v_artisan;
  else
    if jsonb_typeof(p_communes) is distinct from 'array' or jsonb_array_length(p_communes) = 0 then
      raise exception 'Au moins une commune est requise.' using errcode = '22023';
    end if;
    update public.artisans set
      zone_mode = 'communes', base_label = null, base_code_insee = null, base_location = null, radius_km = null
    where id = v_artisan;
    insert into public.artisan_zones (artisan_id, code_insee, nom)
      select distinct on (c.code) v_artisan, c.code, c.nom
      from jsonb_to_recordset(p_communes) as c (code text, nom text);
  end if;
end;
$$;

revoke execute on function public.set_artisan_trades(text[], text[], int) from public, anon;
revoke execute on function public.set_artisan_zone(public.zone_mode, text, text, double precision, double precision, int, jsonb)
  from public, anon;
grant execute on function public.set_artisan_trades(text[], text[], int) to authenticated;
grant execute on function public.set_artisan_zone(public.zone_mode, text, text, double precision, double precision, int, jsonb)
  to authenticated;

-- ---------------------------------------------------------------------------
-- Réservé au serveur (clé service_role, Edge Functions)
-- ---------------------------------------------------------------------------

-- Enregistre le résultat d'une vérification Sirene (forme : SireneEtablissement de packages/core).
-- Ignoré si le SIRET a changé entre-temps.
create function public.record_sirene_result(p_artisan_id uuid, p_siret text, p_result jsonb)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_partial boolean := coalesce((p_result ->> 'partialDiffusion')::boolean, false);
  v_ape text := nullif(p_result ->> 'apeCode', '');
begin
  update public.artisans set
    sirene_checked_at = now(),
    sirene_active = coalesce((p_result ->> 'active')::boolean, false),
    sirene_partial = v_partial,
    raison_sociale = coalesce(nullif(p_result ->> 'raisonSociale', ''), case when v_partial then raison_sociale end),
    forme_juridique_code = nullif(p_result ->> 'formeJuridiqueCode', ''),
    ape_code = v_ape,
    ape_eligible = exists (
      select 1 from public.ape_codes_btp a where v_ape like a.code_prefix || '%'
    ),
    adresse_ligne = nullif(p_result -> 'adresse' ->> 'ligne', ''),
    adresse_code_postal = nullif(p_result -> 'adresse' ->> 'codePostal', ''),
    adresse_commune = nullif(p_result -> 'adresse' ->> 'commune', ''),
    adresse_code_insee = nullif(p_result -> 'adresse' ->> 'codeInsee', '')
  where id = p_artisan_id and siret = p_siret;
end;
$$;

-- Limitation de débit générique (fenêtre fixe). Vrai si l'appel est autorisé.
-- TODO : purge des fenêtres expirées par pg_cron (phase 2, avec les autres tâches planifiées).
create table public.rate_limits (
  id uuid primary key default gen_random_uuid(),
  key text not null check (char_length(key) between 1 and 200),
  window_start timestamptz not null,
  hits int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (key, window_start)
);
alter table public.rate_limits enable row level security;
revoke all on public.rate_limits from anon, authenticated;

create function public.consume_rate_limit(p_key text, p_max int, p_window_seconds int)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_window timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  v_hits int;
begin
  insert into public.rate_limits (key, window_start, hits)
  values (p_key, v_window, 1)
  on conflict (key, window_start) do update set hits = public.rate_limits.hits + 1, updated_at = now()
  returning hits into v_hits;
  return v_hits <= p_max;
end;
$$;

revoke execute on function public.record_sirene_result(uuid, text, jsonb) from public, anon, authenticated;
revoke execute on function public.consume_rate_limit(text, int, int) from public, anon, authenticated;
grant execute on function public.record_sirene_result(uuid, text, jsonb) to service_role;
grant execute on function public.consume_rate_limit(text, int, int) to service_role;

-- ---------------------------------------------------------------------------
-- Inscription : rôle artisan_en_attente et fiche artisan
-- ---------------------------------------------------------------------------

-- Choix du type de compte à l'inscription : seules deux issues possibles,
-- « particulier » (défaut) ou « artisan_en_attente » (account_type = artisan). ADR 0006.
create or replace function app.before_auth_user_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested text := nullif(new.raw_app_meta_data ->> 'role', '');
begin
  if requested is null then
    new.raw_app_meta_data := coalesce(new.raw_app_meta_data, '{}'::jsonb) || jsonb_build_object(
      'role',
      case when new.raw_user_meta_data ->> 'account_type' = 'artisan' then 'artisan_en_attente' else 'particulier' end
    );
  elsif not app.is_valid_role(requested) then
    raise exception 'Rôle inconnu : %', requested using errcode = '22023';
  end if;
  return new;
end;
$$;

create or replace function app.after_auth_user_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  phone text := meta ->> 'phone';
  v_siret text := meta ->> 'siret';
  v_role public.app_role := (new.raw_app_meta_data ->> 'role')::public.app_role;
begin
  insert into public.profiles (user_id, role, first_name, last_name, phone, marketing_opt_in)
  values (
    new.id,
    v_role,
    nullif(left(btrim(meta ->> 'first_name'), 100), ''),
    nullif(left(btrim(meta ->> 'last_name'), 100), ''),
    case when phone ~ '^\+[1-9][0-9]{7,14}$' then phone end,
    coalesce(meta -> 'marketing_opt_in' = 'true'::jsonb, false)
  );

  insert into public.legal_acceptances (user_id, document, version)
  select new.id, d.key::public.legal_document, left(btrim(d.value), 50)
  from jsonb_each_text(
    case when jsonb_typeof(meta -> 'legal') = 'object' then meta -> 'legal' else '{}'::jsonb end
  ) as d
  where d.key = any (enum_range(null::public.legal_document)::text[])
    and nullif(btrim(d.value), '') is not null;

  -- Fiche artisan en brouillon. Un SIRET invalide ou déjà utilisé n'est pas repris :
  -- l'artisan le saisira à l'étape « Entreprise ».
  if v_role = 'artisan_en_attente' then
    insert into public.artisans (user_id, siret)
    values (
      new.id,
      case
        when app.is_valid_siret(v_siret)
          and not exists (select 1 from public.artisans a where a.siret = v_siret)
        then v_siret
      end
    );
  end if;

  update auth.users
  set raw_user_meta_data = raw_user_meta_data
    - array['phone', 'marketing_opt_in', 'legal', 'siret', 'account_type']
  where id = new.id
    and raw_user_meta_data ?| array['phone', 'marketing_opt_in', 'legal', 'siret', 'account_type'];

  return null;
end;
$$;
