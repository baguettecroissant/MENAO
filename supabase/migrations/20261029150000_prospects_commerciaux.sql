-- Espace commercial, lot 2 (F-65, ADR 0206) : suivi des prospects des commerciaux de terrain.
-- - La base de prospects est importée par un admin depuis son navigateur (API publique
--   « Recherche d'entreprises »), lot par lot, avec admin_import_prospects : seules les
--   entreprises du bâtiment ouvertes et diffusibles y entrent ; un import met à jour les fiches
--   déjà connues et note qu'elles ont été revues (seen_at).
-- - Tout commercial actif voit toute la base ; un prospect n'est suivi que par un seul
--   commercial, et seul celui-ci en voit l'étape, la prochaine action, le téléphone et les notes.
-- - « Ne plus contacter » est définitif : la fiche est supprimée et seul son SIRET est gardé,
--   pour qu'un import ne la fasse jamais revenir.
-- - Purge quotidienne : suivis inactifs depuis 3 ans, fiches que plus aucun import n'a revues
--   depuis 13 mois (et sans suivi).

create type public.prospect_status as enum ('a_contacter', 'rdv_pris', 'demo_faite', 'pas_interesse');

create table public.prospects (
  id uuid primary key default gen_random_uuid(),
  siret text not null unique check (siret ~ '^[0-9]{14}$'),
  siren text generated always as (left(siret, 9)) stored,
  denomination text not null check (char_length(denomination) between 1 and 200),
  enseigne text check (char_length(enseigne) <= 200),
  ape_code text check (char_length(ape_code) <= 10),
  nature_juridique text check (nature_juridique ~ '^[0-9]{4}$'),
  date_creation date,
  tranche_effectif text check (char_length(tranche_effectif) <= 4),
  adresse text check (char_length(adresse) <= 300),
  code_postal text check (code_postal ~ '^[0-9]{5}$'),
  commune text check (char_length(commune) <= 100),
  code_insee text check (code_insee ~ '^([0-9]{5}|2[AB][0-9]{3})$'),
  departement text not null check (departement ~ '^([0-9]{2,3}|2[AB])$'),
  location extensions.geography(point, 4326),
  rge boolean not null default false,
  est_siege boolean not null default false,
  -- Dernier import qui a vu l'établissement ouvert et diffusible.
  seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index prospects_departement_idx on public.prospects (departement, code_postal);
create index prospects_siren_idx on public.prospects (siren);

create trigger prospects_set_updated_at before update on public.prospects
  for each row execute function app.set_updated_at();

-- « Ne plus contacter » : vaut pour toute l'entreprise (ou la personne, pour un entrepreneur
-- individuel), donc pour tous ses établissements. Seul le SIREN est gardé, aucune autre donnée.
create table public.prospect_opt_outs (
  siren text primary key check (siren ~ '^[0-9]{9}$'),
  created_at timestamptz not null default now()
);

-- Suivi d'un prospect : un seul commercial par prospect.
create table public.prospect_follows (
  prospect_id uuid primary key references public.prospects (id) on delete cascade,
  commercial_id uuid not null references public.commercials (id) on delete cascade,
  status public.prospect_status not null default 'a_contacter',
  next_action_at timestamptz,
  phone text check (phone ~ '^\+[1-9][0-9]{7,14}$'),
  notes text check (char_length(notes) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index prospect_follows_commercial_idx on public.prospect_follows (commercial_id, next_action_at);

create trigger prospect_follows_set_updated_at before update on public.prospect_follows
  for each row execute function app.set_updated_at();

-- Étape MENAO d'un prospect : recherche des artisans par SIREN.
create index artisans_siren_idx on public.artisans (siren);

alter table public.prospects enable row level security;
alter table public.prospect_opt_outs enable row level security;
alter table public.prospect_follows enable row level security;
revoke all on public.prospects, public.prospect_opt_outs, public.prospect_follows from anon, authenticated;
grant select on public.prospects, public.prospect_follows to authenticated;

create policy "prospects : lecture par un commercial actif ou un admin"
  on public.prospects for select to authenticated
  using ((select app.my_commercial_id()) is not null or (select app.is_admin()));

create policy "prospect_follows : lecture par le commercial qui suit ou un admin"
  on public.prospect_follows for select to authenticated
  using (commercial_id = (select app.my_commercial_id()) or (select app.is_admin()));

-- Étape MENAO de l'entreprise : 'abonne' (abonnement en cours : essai, actif ou impayé),
-- 'valide' (dossier validé), 'inscrit' (fiche artisan créée), sinon null.
create function app.prospect_stage(p_siren text)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when exists (
      select 1
      from public.artisans a
      join public.subscriptions s on s.artisan_id = a.id
      where a.siren = p_siren and s.status in ('trialing', 'active', 'past_due')
    ) then 'abonne'
    when exists (select 1 from public.artisans a where a.siren = p_siren and a.status = 'valide') then 'valide'
    when exists (select 1 from public.artisans a where a.siren = p_siren) then 'inscrit'
  end
$$;
revoke execute on function app.prospect_stage(text) from public, anon, authenticated;

-- Espace commercial : liste des prospects. Filtres : 'tous', 'miens' (suivis par moi), 'relances'
-- (miens dont la prochaine action tombe avant demain, heure de Paris), 'libres' (aucun suivi).
-- Étape et prochaine action : seulement pour mes suivis.
create function public.commercial_prospects(
  p_search text default null,
  p_filter text default 'tous',
  p_limit int default 50,
  p_offset int default 0
)
returns table (
  id uuid,
  nom text,
  ape_code text,
  commune text,
  code_postal text,
  lon double precision,
  lat double precision,
  rge boolean,
  mine boolean,
  followed_by_other boolean,
  status public.prospect_status,
  next_action_at timestamptz,
  stage text,
  total bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_me uuid := app.my_commercial_id();
  v_filter text := case when p_filter in ('miens', 'relances', 'libres') then p_filter else 'tous' end;
  v_like text := app.admin_like(left(p_search, 100));
  v_cp text := case when btrim(coalesce(p_search, '')) ~ '^[0-9]{1,5}$' then btrim(p_search) end;
  v_tomorrow timestamptz := (date_trunc('day', now() at time zone 'Europe/Paris') + interval '1 day')
    at time zone 'Europe/Paris';
begin
  if v_me is null then
    raise exception 'Réservé aux commerciaux' using errcode = '42501';
  end if;
  return query
  with filtered as (
    select p.id as pid, coalesce(p.enseigne, p.denomination) as pnom, p.ape_code as pape,
      p.commune as pcommune, p.code_postal as pcp, p.location as ploc, p.rge as prge, p.siren as psiren,
      f.commercial_id as fcom, f.status as fstatus, f.next_action_at as fnext
    from public.prospects p
    left join public.prospect_follows f on f.prospect_id = p.id
    where (
        v_like is null
        or p.denomination ilike v_like
        or p.enseigne ilike v_like
        or p.commune ilike v_like
        or p.code_postal like v_cp || '%'
      )
      and case v_filter
        when 'miens' then f.commercial_id = v_me
        when 'relances' then f.commercial_id = v_me and f.next_action_at < v_tomorrow
        when 'libres' then f.prospect_id is null
        else true
      end
  ),
  page as (
    select x.*,
      count(*) over () as cnt,
      row_number() over (order by
        case when v_filter in ('miens', 'relances') then x.fnext end asc nulls last,
        case when v_filter not in ('miens', 'relances') then x.pcommune end asc nulls last,
        x.pnom, x.pid) as rn
    from filtered x
    order by rn
    limit greatest(1, least(coalesce(p_limit, 50), 500))
    offset greatest(coalesce(p_offset, 0), 0)
  )
  select pg.pid, pg.pnom, pg.pape, pg.pcommune, pg.pcp,
    extensions.st_x(pg.ploc::extensions.geometry), extensions.st_y(pg.ploc::extensions.geometry),
    pg.prge,
    coalesce(pg.fcom = v_me, false),
    coalesce(pg.fcom <> v_me, false),
    case when pg.fcom = v_me then pg.fstatus end,
    case when pg.fcom = v_me then pg.fnext end,
    app.prospect_stage(pg.psiren),
    pg.cnt
  from page pg
  order by pg.rn;
end;
$$;
revoke execute on function public.commercial_prospects(text, text, int, int) from public, anon;
grant execute on function public.commercial_prospects(text, text, int, int) to authenticated;

-- Espace commercial : fiche d'un prospect (téléphone et notes seulement s'il est suivi par moi).
create function public.commercial_prospect(p_id uuid)
returns table (
  id uuid,
  siret text,
  nom text,
  denomination text,
  enseigne text,
  ape_code text,
  nature_juridique text,
  date_creation date,
  tranche_effectif text,
  adresse text,
  code_postal text,
  commune text,
  lon double precision,
  lat double precision,
  rge boolean,
  est_siege boolean,
  mine boolean,
  followed_by_other boolean,
  status public.prospect_status,
  next_action_at timestamptz,
  phone text,
  notes text,
  stage text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_me uuid := app.my_commercial_id();
begin
  if v_me is null then
    raise exception 'Réservé aux commerciaux' using errcode = '42501';
  end if;
  return query
  select p.id, p.siret, coalesce(p.enseigne, p.denomination), p.denomination, p.enseigne, p.ape_code,
    p.nature_juridique, p.date_creation, p.tranche_effectif, p.adresse, p.code_postal, p.commune,
    extensions.st_x(p.location::extensions.geometry), extensions.st_y(p.location::extensions.geometry),
    p.rge, p.est_siege,
    coalesce(f.commercial_id = v_me, false),
    coalesce(f.commercial_id <> v_me, false),
    case when f.commercial_id = v_me then f.status end,
    case when f.commercial_id = v_me then f.next_action_at end,
    case when f.commercial_id = v_me then f.phone end,
    case when f.commercial_id = v_me then f.notes end,
    app.prospect_stage(p.siren)
  from public.prospects p
  left join public.prospect_follows f on f.prospect_id = p.id
  where p.id = p_id;
end;
$$;
revoke execute on function public.commercial_prospect(uuid) from public, anon;
grant execute on function public.commercial_prospect(uuid) to authenticated;

-- Suivre un prospect libre (sans effet s'il est déjà le mien).
create function public.commercial_follow_prospect(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := app.my_commercial_id();
  v_owner uuid;
begin
  if v_me is null then
    raise exception 'Réservé aux commerciaux' using errcode = '42501';
  end if;
  perform 1 from public.prospects p where p.id = p_id for key share;
  if not found then
    raise exception 'Prospect introuvable.' using errcode = '22023';
  end if;
  insert into public.prospect_follows (prospect_id, commercial_id)
  values (p_id, v_me)
  on conflict (prospect_id) do nothing;
  select f.commercial_id into v_owner from public.prospect_follows f where f.prospect_id = p_id;
  if v_owner is distinct from v_me then
    raise exception 'Déjà suivi par un collègue.' using errcode = '22023';
  end if;
end;
$$;
revoke execute on function public.commercial_follow_prospect(uuid) from public, anon;
grant execute on function public.commercial_follow_prospect(uuid) to authenticated;

-- Mettre à jour mon suivi : étape, prochaine action, téléphone (format international) et notes.
create function public.commercial_update_prospect(
  p_id uuid,
  p_status public.prospect_status,
  p_next_action_at timestamptz default null,
  p_phone text default null,
  p_notes text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := app.my_commercial_id();
  v_phone text := nullif(regexp_replace(coalesce(p_phone, ''), '[\s.-]', '', 'g'), '');
  -- Retours à la ligne envoyés par le navigateur en CRLF : comptés une seule fois.
  v_notes text := nullif(btrim(replace(coalesce(p_notes, ''), E'\r\n', E'\n')), '');
begin
  if v_me is null then
    raise exception 'Réservé aux commerciaux' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.prospect_follows f where f.prospect_id = p_id and f.commercial_id = v_me
  ) then
    raise exception 'Suivez d''abord ce prospect.' using errcode = '22023';
  end if;
  if v_phone is not null and v_phone !~ '^\+[1-9][0-9]{7,14}$' then
    raise exception 'Téléphone invalide : format international, par exemple +33612345678.' using errcode = '22023';
  end if;
  if char_length(v_notes) > 2000 then
    raise exception 'Notes trop longues : 2 000 caractères au plus.' using errcode = '22023';
  end if;
  update public.prospect_follows f set
    status = coalesce(p_status, f.status),
    next_action_at = p_next_action_at,
    phone = v_phone,
    notes = v_notes
  where f.prospect_id = p_id and f.commercial_id = v_me;
end;
$$;
revoke execute on function public.commercial_update_prospect(uuid, public.prospect_status, timestamptz, text, text)
  from public, anon;
grant execute on function public.commercial_update_prospect(uuid, public.prospect_status, timestamptz, text, text)
  to authenticated;

-- Ne plus suivre un prospect : mon suivi est supprimé, notes comprises.
create function public.commercial_release_prospect(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := app.my_commercial_id();
begin
  if v_me is null then
    raise exception 'Réservé aux commerciaux' using errcode = '42501';
  end if;
  delete from public.prospect_follows f where f.prospect_id = p_id and f.commercial_id = v_me;
end;
$$;
revoke execute on function public.commercial_release_prospect(uuid) from public, anon;
grant execute on function public.commercial_release_prospect(uuid) to authenticated;

-- « Ne plus contacter » (définitif) : le SIRET est gardé, la fiche et son suivi sont supprimés.
-- Ouvert à tout commercial actif, que le prospect soit suivi ou non.
create function public.commercial_do_not_contact(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := app.my_commercial_id();
  v_siren text;
begin
  if v_me is null then
    raise exception 'Réservé aux commerciaux' using errcode = '42501';
  end if;
  select p.siren into v_siren from public.prospects p where p.id = p_id for update;
  if v_siren is null then
    raise exception 'Prospect introuvable.' using errcode = '22023';
  end if;
  insert into public.prospect_opt_outs (siren) values (v_siren) on conflict (siren) do nothing;
  -- Tous les établissements de l'entreprise, et leurs suivis.
  delete from public.prospects p where p.siren = v_siren;
end;
$$;
revoke execute on function public.commercial_do_not_contact(uuid) from public, anon;
grant execute on function public.commercial_do_not_contact(uuid) to authenticated;

-- « Ma journée » : mes suivis dont la prochaine action tombe avant demain (heure de Paris).
-- 'rdv' : rendez-vous pris pour aujourd'hui ; 'relance' : tout le reste (y compris en retard).
create function public.commercial_day()
returns table (
  id uuid,
  nom text,
  commune text,
  status public.prospect_status,
  next_action_at timestamptz,
  phone text,
  kind text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_me uuid := app.my_commercial_id();
  v_today timestamptz := date_trunc('day', now() at time zone 'Europe/Paris') at time zone 'Europe/Paris';
  v_tomorrow timestamptz := (date_trunc('day', now() at time zone 'Europe/Paris') + interval '1 day')
    at time zone 'Europe/Paris';
begin
  if v_me is null then
    raise exception 'Réservé aux commerciaux' using errcode = '42501';
  end if;
  return query
  select p.id, coalesce(p.enseigne, p.denomination), p.commune, f.status, f.next_action_at, f.phone,
    case when f.status = 'rdv_pris' and f.next_action_at >= v_today then 'rdv' else 'relance' end
  from public.prospect_follows f
  join public.prospects p on p.id = f.prospect_id
  where f.commercial_id = v_me and f.next_action_at < v_tomorrow
  order by f.next_action_at, p.id;
end;
$$;
revoke execute on function public.commercial_day() from public, anon;
grant execute on function public.commercial_day() to authenticated;

-- Back-office : import d'un lot de prospects (au plus 1 000), préparé par le navigateur de
-- l'admin (parseCompanySearch, @menao/core). Ligne ignorée si le SIRET, la dénomination ou le
-- département est invalide, ou si le SIRET a demandé à ne plus être contacté ; un champ facultatif
-- invalide est laissé vide, sans jamais faire échouer le lot. Retourne le nombre de lignes écrites.
create function public.admin_import_prospects(p_rows jsonb)
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count int;
begin
  perform app.require_admin();
  if jsonb_typeof(p_rows) is distinct from 'array' then
    raise exception 'Lot invalide.' using errcode = '22023';
  end if;
  if jsonb_array_length(p_rows) > 1000 then
    raise exception 'Lot trop gros.' using errcode = '22023';
  end if;

  with src as (
    select e.value as r, e.ord
    from jsonb_array_elements(p_rows) with ordinality as e (value, ord)
    where jsonb_typeof(e.value) = 'object'
  ),
  raw as (
    select s.ord,
      btrim(s.r ->> 'siret') as siret,
      btrim(s.r ->> 'denomination') as denomination,
      upper(btrim(s.r ->> 'departement')) as departement,
      nullif(btrim(s.r ->> 'enseigne'), '') as enseigne,
      nullif(btrim(s.r ->> 'ape_code'), '') as ape_code,
      btrim(s.r ->> 'nature_juridique') as nature_juridique,
      btrim(s.r ->> 'date_creation') as date_creation,
      nullif(btrim(s.r ->> 'tranche_effectif'), '') as tranche_effectif,
      nullif(btrim(s.r ->> 'adresse'), '') as adresse,
      btrim(s.r ->> 'code_postal') as code_postal,
      nullif(btrim(s.r ->> 'commune'), '') as commune,
      upper(btrim(s.r ->> 'code_insee')) as code_insee,
      btrim(s.r ->> 'lon') as lon,
      btrim(s.r ->> 'lat') as lat,
      coalesce(s.r -> 'rge' = 'true'::jsonb, false) as rge,
      coalesce(s.r -> 'est_siege' = 'true'::jsonb, false) as est_siege
    from src s
  ),
  clean as (
    -- Même SIRET deux fois dans le lot : la dernière ligne l'emporte.
    select distinct on (w.siret)
      w.siret,
      w.denomination,
      w.departement,
      case when char_length(w.enseigne) <= 200 then w.enseigne end as enseigne,
      case when char_length(w.ape_code) <= 10 then w.ape_code end as ape_code,
      case when w.nature_juridique ~ '^[0-9]{4}$' then w.nature_juridique end as nature_juridique,
      -- Date AAAA-MM-JJ réelle (jamais de conversion qui échoue : 2023-02-30 est ignorée).
      case when w.date_creation ~ '^[12][0-9]{3}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$' then
        case when substr(w.date_creation, 9, 2)::int <= extract(day from
            (left(w.date_creation, 7) || '-01')::date + interval '1 month' - interval '1 day')::int
          then w.date_creation::date
        end
      end as date_creation,
      case when char_length(w.tranche_effectif) <= 4 then w.tranche_effectif end as tranche_effectif,
      case when char_length(w.adresse) <= 300 then w.adresse end as adresse,
      case when w.code_postal ~ '^[0-9]{5}$' then w.code_postal end as code_postal,
      case when char_length(w.commune) <= 100 then w.commune end as commune,
      case when w.code_insee ~ '^([0-9]{5}|2[AB][0-9]{3})$' then w.code_insee end as code_insee,
      -- Même boîte englobante que les zones des artisans (métropole et outre-mer).
      case when w.lon ~ '^-?[0-9]{1,3}(\.[0-9]+)?$' and w.lat ~ '^-?[0-9]{1,3}(\.[0-9]+)?$' then
        case when w.lon::double precision between -63 and 56 and w.lat::double precision between -22 and 52 then
          extensions.st_setsrid(
            extensions.st_makepoint(w.lon::double precision, w.lat::double precision), 4326
          )::extensions.geography
        end
      end as location,
      w.rge,
      w.est_siege
    from raw w
    where w.siret ~ '^[0-9]{14}$'
      and char_length(w.denomination) between 1 and 200
      and w.departement ~ '^([0-9]{2,3}|2[AB])$'
      and not exists (select 1 from public.prospect_opt_outs o where o.siren = left(w.siret, 9))
    order by w.siret, w.ord desc
  )
  insert into public.prospects (siret, denomination, enseigne, ape_code, nature_juridique, date_creation,
    tranche_effectif, adresse, code_postal, commune, code_insee, departement, location, rge, est_siege, seen_at)
  select c.siret, c.denomination, c.enseigne, c.ape_code, c.nature_juridique, c.date_creation,
    c.tranche_effectif, c.adresse, c.code_postal, c.commune, c.code_insee, c.departement, c.location, c.rge,
    c.est_siege, now()
  from clean c
  on conflict (siret) do update set
    denomination = excluded.denomination,
    enseigne = excluded.enseigne,
    ape_code = excluded.ape_code,
    nature_juridique = excluded.nature_juridique,
    date_creation = excluded.date_creation,
    tranche_effectif = excluded.tranche_effectif,
    adresse = excluded.adresse,
    code_postal = excluded.code_postal,
    commune = excluded.commune,
    code_insee = excluded.code_insee,
    departement = excluded.departement,
    location = excluded.location,
    rge = excluded.rge,
    est_siege = excluded.est_siege,
    seen_at = now();
  get diagnostics v_count = row_count;

  perform app.audit('prospects.import', 'prospects', null, jsonb_build_object('count', v_count));
  return v_count;
end;
$$;
revoke execute on function public.admin_import_prospects(jsonb) from public, anon;
grant execute on function public.admin_import_prospects(jsonb) to authenticated;

-- Back-office : chiffres de la base de prospects.
create function public.admin_prospects_summary()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform app.require_admin();
  return jsonb_build_object(
    'total', (select count(*) from public.prospects),
    'followed', (select count(*) from public.prospect_follows),
    'opt_outs', (select count(*) from public.prospect_opt_outs),
    'last_seen_at', (select max(p.seen_at) from public.prospects p),
    'by_departement', (
      select coalesce(jsonb_agg(jsonb_build_object('departement', d.departement, 'count', d.n)
        order by d.departement), '[]'::jsonb)
      from (
        select p.departement, count(*) as n from public.prospects p group by p.departement
      ) d
    )
  );
end;
$$;
revoke execute on function public.admin_prospects_summary() from public, anon;
grant execute on function public.admin_prospects_summary() to authenticated;

-- Purge quotidienne (pg_cron) : suivis non modifiés depuis 3 ans, puis prospects qu'aucun import
-- n'a revus depuis 13 mois (fermés ou devenus non diffusibles) et que personne ne suit.
create function app.purge_prospects()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- TODO(legal): durée de conservation des données de prospection, recommandation CNIL 3 ans.
  delete from public.prospect_follows f where f.updated_at < now() - interval '3 years';
  delete from public.prospects p
  where p.seen_at < now() - interval '13 months'
    and not exists (select 1 from public.prospect_follows f where f.prospect_id = p.id);
end;
$$;
revoke all on function app.purge_prospects() from public, anon, authenticated;

select cron.schedule('menao-purge-prospects', '45 3 * * *', 'select app.purge_prospects()');
