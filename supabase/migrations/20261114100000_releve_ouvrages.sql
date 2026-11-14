-- Relevé d'un plan de terrain : ouvrages mesurés (F-158, ADR 0322).
-- La lecture des plans ne relevait que des pièces : un plan de masse, une coupe de terrain ou un
-- plan de réseaux étaient refusés. Le relevé garde désormais aussi des ouvrages mesurés (surface,
-- linéaire, volume, nombre), chacun avec son origine (écrit sur le plan, calculé avec des valeurs
-- lues, compté, lu sur une photo, saisi) et le lot du métier concerné. Le type de chaque page et
-- les altitudes lues sont gardés pour le résumé. Les calculs sont faits par packages/core.

alter table public.tenders
  -- Type reconnu de chaque page : [{ "file", "page", "type" }].
  add column plan_pages jsonb not null default '[]'::jsonb
    check (jsonb_typeof(plan_pages) = 'array' and jsonb_array_length(plan_pages) <= 100),
  -- Altitudes lues (terrain naturel, plateforme…) : [{ "name", "altitudeMm" }].
  add column plan_levels jsonb not null default '[]'::jsonb
    check (jsonb_typeof(plan_levels) = 'array' and jsonb_array_length(plan_levels) <= 20);

-- Ouvrages mesurés. Quantité en millièmes de l'unité (m², ml, m³, u) ; null : à compléter.
create table public.tender_works (
  id uuid primary key default gen_random_uuid(),
  tender_id uuid not null references public.tenders (id) on delete cascade,
  position smallint not null check (position between 1 and 200),
  name text not null check (char_length(btrim(name)) between 1 and 120),
  kind text not null check (kind in ('surface', 'lineaire', 'volume', 'nombre')),
  quantity_milli bigint check (quantity_milli is null or quantity_milli between 1 and 10000000000),
  -- Écrite sur le plan, calculée avec des valeurs lues, comptée, lue sur une photo, ou saisie.
  source text not null check (source in ('plan', 'calcul', 'compte', 'photo', 'saisi')),
  -- Calcul affiché d'une quantité calculée (« 186,00 m² × 0,30 m »).
  detail text check (detail is null or char_length(detail) <= 300),
  -- Métier du lot où va l'ouvrage ; null : repère, dans aucun lot.
  trade_code text references public.trades (code),
  file_index smallint check (file_index is null or file_index between 1 and 10),
  page smallint check (page is null or page between 1 and 999),
  uncertain boolean not null default false,
  unique (tender_id, position)
);

alter table public.tender_works enable row level security;

-- Lecture comme les pièces : l'entreprise (patron ou chef d'équipe) et les admins.
-- Aucune écriture directe : tout passe par les fonctions ci-dessous.
create policy "tender_works : lecture par l'entreprise ou un admin"
  on public.tender_works for select to authenticated
  using (exists (
    select 1 from public.tenders t
    where t.id = tender_works.tender_id
      and (t.artisan_id = (select app.my_manager_artisan_id()) or (select app.is_admin()))
  ));

-- ---------------------------------------------------------------------------
-- Aides
-- ---------------------------------------------------------------------------
-- Types de pages remis en forme : fichier, page et type connus.
create function app.plan_pages(p_pages jsonb)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
      'file', (p.v ->> 'file')::integer,
      'page', (p.v ->> 'page')::integer,
      'type', p.v ->> 'type'
    ) order by p.ord), '[]'::jsonb)
  from jsonb_array_elements(
    case when jsonb_typeof(p_pages) = 'array' then p_pages else '[]'::jsonb end
  ) with ordinality as p (v, ord)
  where p.ord <= 100
    and coalesce(p.v ->> 'file', '') ~ '^(10|[1-9])$'
    and coalesce(p.v ->> 'page', '') ~ '^[1-9]\d{0,2}$'
    and p.v ->> 'type' in ('niveau', 'coupe', 'facade', 'toiture', 'masse', 'coupe_terrain',
      'reseaux', 'autre')
$$;

-- Altitudes remises en forme : nom et altitude entière en mm.
create function app.plan_levels(p_levels jsonb)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
      'name', left(btrim(l.v ->> 'name'), 60),
      'altitudeMm', (l.v ->> 'altitudeMm')::integer
    ) order by l.ord), '[]'::jsonb)
  from jsonb_array_elements(
    case when jsonb_typeof(p_levels) = 'array' then p_levels else '[]'::jsonb end
  ) with ordinality as l (v, ord)
  where l.ord <= 20
    and nullif(btrim(coalesce(l.v ->> 'name', '')), '') is not null
    and coalesce(l.v ->> 'altitudeMm', '') ~ '^-?\d{1,7}$'
$$;

-- Ouvrages d'un relevé (JSON) vérifiés et numérotés, prêts à insérer. Un métier qui n'est pas
-- parmi ceux de l'appel d'offres est ignoré (ouvrage hors lot).
create function app.plan_works_rows(p_works jsonb, p_trades text[])
returns table (
  ord integer, work_id uuid, name text, kind text, quantity_milli bigint, source text,
  detail text, trade_code text, file_index smallint, page smallint, uncertain boolean
)
language plpgsql
immutable
set search_path = ''
as $$
begin
  if p_works is null or jsonb_typeof(p_works) <> 'array' or jsonb_array_length(p_works) > 200 then
    raise exception 'Ouvrages invalides (200 au plus).' using errcode = '22023';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_works) w
    where nullif(btrim(coalesce(w ->> 'name', '')), '') is null
      or coalesce(w ->> 'kind', '') not in ('surface', 'lineaire', 'volume', 'nombre')
  ) then
    raise exception 'Chaque ouvrage doit avoir un nom et une mesure.' using errcode = '22023';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_works) w
    where w ->> 'quantityMilli' is not null
      and case
        when (w ->> 'quantityMilli') !~ '^\d{1,11}$' then true
        else (w ->> 'quantityMilli')::bigint not between 1 and 10000000000
          or (w ->> 'kind' = 'nombre' and (w ->> 'quantityMilli')::bigint % 1000 <> 0)
      end
  ) then
    raise exception 'Quantité invalide.' using errcode = '22023';
  end if;
  return query
  select w.ord::integer,
    case when (w.v ->> 'id') ~ '^[0-9a-f-]{36}$' then (w.v ->> 'id')::uuid end,
    left(btrim(w.v ->> 'name'), 120),
    w.v ->> 'kind',
    (w.v ->> 'quantityMilli')::bigint,
    case
      when w.v ->> 'source' in ('plan', 'calcul', 'compte', 'photo') then w.v ->> 'source'
      else 'saisi'
    end,
    left(nullif(btrim(coalesce(w.v ->> 'detail', '')), ''), 300),
    case when w.v ->> 'trade' = any (p_trades) then w.v ->> 'trade' end,
    (w.v ->> 'file')::smallint,
    (w.v ->> 'page')::smallint,
    coalesce((w.v ->> 'uncertain')::boolean, false)
  from jsonb_array_elements(p_works) with ordinality as w (v, ord);
end;
$$;

-- ---------------------------------------------------------------------------
-- Relevé importé : pièces, éléments comptés, échelle, et désormais ouvrages, pages et altitudes
-- ---------------------------------------------------------------------------
drop function public.artisan_import_plan_reading(uuid, jsonb, jsonb, text);
create function public.artisan_import_plan_reading(
  p_tender_id uuid,
  p_rooms jsonb,
  p_counts jsonb,
  p_scale text default null,
  p_works jsonb default '[]'::jsonb,
  p_pages jsonb default '[]'::jsonb,
  p_levels jsonb default '[]'::jsonb
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  t public.tenders := app.my_plan_tender(p_tender_id);
  v_rooms integer;
  v_works integer;
begin
  delete from public.tender_rooms where tender_id = t.id;
  insert into public.tender_rooms (tender_id, position, level, name, area_cm2, perimeter_mm,
    height_mm, wet, habitable, source, file_index, page, uncertain)
  select t.id, r.ord::smallint, r.level, r.name, r.area_cm2, r.perimeter_mm, r.height_mm, r.wet,
    r.habitable, case when r.source = 'saisi' then 'plan' else r.source end, r.file_index, r.page,
    r.uncertain
  from app.plan_rooms_rows(p_rooms) r;
  get diagnostics v_rooms = row_count;

  delete from public.tender_works where tender_id = t.id;
  insert into public.tender_works (tender_id, position, name, kind, quantity_milli, source,
    detail, trade_code, file_index, page, uncertain)
  select t.id, w.ord::smallint, w.name, w.kind, w.quantity_milli,
    case when w.source = 'saisi' then 'plan' else w.source end,
    case when w.source = 'calcul' then w.detail end, w.trade_code, w.file_index, w.page,
    w.uncertain
  from app.plan_works_rows(coalesce(p_works, '[]'::jsonb), t.plan_trades) w;
  get diagnostics v_works = row_count;

  update public.tenders
  set plan_counts = app.plan_counts(coalesce(p_counts, '{}'::jsonb)),
    plan_scale = left(nullif(btrim(coalesce(p_scale, '')), ''), 40),
    plan_pages = app.plan_pages(p_pages),
    plan_levels = app.plan_levels(p_levels),
    imported_at = now()
  where id = t.id;
  return v_rooms + v_works;
end;
$$;

-- Ouvrages corrigés par l'artisan : un ouvrage ajouté, ou dont la mesure ou la quantité change,
-- passe en « saisi » (son calcul n'a plus cours) ; le nom et le lot se changent librement.
create function public.artisan_save_plan_works(p_tender_id uuid, p_works jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  t public.tenders := app.my_plan_tender(p_tender_id);
  v_rows jsonb;
begin
  -- Ouvrages fusionnés avec l'existant, gardés en mémoire avant de remplacer le relevé.
  select coalesce(jsonb_agg(jsonb_build_object(
      'ord', w.ord, 'name', w.name, 'kind', w.kind, 'quantity', w.quantity_milli,
      'trade', w.trade_code,
      'changed', o.id is null
        or (o.kind, o.quantity_milli) is distinct from (w.kind, w.quantity_milli),
      'source', o.source, 'detail', o.detail, 'file', o.file_index, 'page', o.page,
      'uncertain', o.uncertain
    ) order by w.ord), '[]'::jsonb)
  into v_rows
  from app.plan_works_rows(p_works, t.plan_trades) w
  left join public.tender_works o on o.id = w.work_id and o.tender_id = t.id;

  delete from public.tender_works where tender_id = t.id;
  insert into public.tender_works (tender_id, position, name, kind, quantity_milli, source,
    detail, trade_code, file_index, page, uncertain)
  select t.id, (v ->> 'ord')::smallint, v ->> 'name', v ->> 'kind', (v ->> 'quantity')::bigint,
    case when (v ->> 'changed')::boolean then 'saisi' else v ->> 'source' end,
    case when (v ->> 'changed')::boolean then null else v ->> 'detail' end,
    v ->> 'trade', (v ->> 'file')::smallint, (v ->> 'page')::smallint,
    case when (v ->> 'changed')::boolean then false else (v ->> 'uncertain')::boolean end
  from jsonb_array_elements(v_rows) v;
end;
$$;

-- Lignes du DPGF : une quantité saisie dans le relevé garde l'origine « saisi ».
create or replace function public.artisan_import_plan_lines(p_tender_id uuid, p_lines jsonb)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  t public.tenders := app.my_plan_tender(p_tender_id);
  v_count integer;
begin
  if p_lines is null or jsonb_typeof(p_lines) <> 'array' or jsonb_array_length(p_lines) > 1000 then
    raise exception 'Lignes invalides (1 000 au plus).' using errcode = '22023';
  end if;
  delete from public.tender_lines where tender_id = t.id;
  insert into public.tender_lines (tender_id, position, kind, lot, code, designation, unit_label,
    unit, quantity_milli, unit_price_ht_cents, price_source, price_reference, quantity_source,
    quantity_detail)
  select t.id, l.ord::smallint, l.v ->> 'kind', left(l.v ->> 'lot', 300), left(l.v ->> 'code', 40),
    left(l.v ->> 'designation', 500), left(l.v ->> 'unitLabel', 20),
    (l.v ->> 'unit')::public.quote_unit, (l.v ->> 'quantityMilli')::bigint,
    (l.v ->> 'unitPriceHtCents')::integer,
    case
      when l.v ->> 'unitPriceHtCents' is null then null
      when l.v ->> 'priceSource' = 'bibliotheque' then 'bibliotheque'
      else 'devis'
    end,
    left(l.v ->> 'priceReference', 200),
    case
      when l.v ->> 'kind' <> 'poste' then null
      when l.v ->> 'source' in ('plan', 'calcul', 'photo', 'manque', 'saisi') then l.v ->> 'source'
      else 'manque'
    end,
    left(l.v ->> 'detail', 1000)
  from jsonb_array_elements(p_lines) with ordinality as l (v, ord);
  get diagnostics v_count = row_count;
  update public.tenders
  set imported_at = now(), quantities_checked_at = null
  where id = t.id;
  return v_count;
end;
$$;

revoke execute on function app.plan_pages(jsonb) from public, anon;
revoke execute on function app.plan_levels(jsonb) from public, anon;
revoke execute on function app.plan_works_rows(jsonb, text[]) from public, anon;
revoke execute on function public.artisan_import_plan_reading(uuid, jsonb, jsonb, text, jsonb, jsonb, jsonb) from public, anon;
revoke execute on function public.artisan_save_plan_works(uuid, jsonb) from public, anon;
grant execute on function public.artisan_import_plan_reading(uuid, jsonb, jsonb, text, jsonb, jsonb, jsonb) to authenticated;
grant execute on function public.artisan_save_plan_works(uuid, jsonb) to authenticated;
