-- Mesure à l'échelle sur les plans (F-159, lot 2, ADR 0326).
-- Quand une pièce n'a ni surface ni cotes exploitables, MENAO trace son contour sur l'image du
-- plan, cale l'échelle sur des cotes lues et calcule surface et périmètre (packages/core). La
-- pièce prend l'origine « estime » ; le tracé (contours, cotes d'ancrage, échelle) est gardé pour
-- l'afficher sur le plan et contrôler l'écart avec les pièces mesurées par leurs cotes.

alter table public.tender_rooms drop constraint tender_rooms_source_check;
alter table public.tender_rooms add constraint tender_rooms_source_check
  check (source in ('plan', 'cotes', 'photo', 'saisi', 'estime'));

alter table public.tender_lines drop constraint tender_lines_quantity_source_check;
alter table public.tender_lines add constraint tender_lines_quantity_source_check
  check (quantity_source is null
    or quantity_source in ('plan', 'calcul', 'photo', 'manque', 'saisi', 'estime'));

alter table public.tenders
  -- Tracés : [{ "file", "width", "height", "umPerPx", "spreadBp", "anchors", "rooms" }].
  add column plan_traces jsonb not null default '[]'::jsonb
    check (jsonb_typeof(plan_traces) = 'array' and jsonb_array_length(plan_traces) <= 4);

-- Tracés enregistrés après la lecture des plans, et pièces sans surface estimées avec eux.
-- Une pièce qui a déjà une surface (lue, calculée ou saisie) n'est jamais remplacée.
create function public.artisan_import_plan_traces(
  p_tender_id uuid,
  p_traces jsonb,
  p_estimates jsonb default '[]'::jsonb
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  t public.tenders := app.my_plan_tender(p_tender_id);
  v_count integer;
begin
  if p_traces is null or jsonb_typeof(p_traces) <> 'array' then
    raise exception 'Tracés invalides.' using errcode = '22023';
  end if;
  if jsonb_array_length(p_traces) > 4 or octet_length(p_traces::text) > 200000 then
    raise exception 'Tracés invalides.' using errcode = '22023';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_traces) x
    where coalesce(x ->> 'file', '') !~ '^(10|[1-9])$'
      or coalesce(x ->> 'width', '') !~ '^[1-9]\d{2,3}$'
      or coalesce(x ->> 'height', '') !~ '^[1-9]\d{2,3}$'
      or coalesce(x ->> 'umPerPx', '') !~ '^[1-9]\d{1,6}$'
      or jsonb_typeof(x -> 'rooms') is distinct from 'array'
      or jsonb_array_length(case when jsonb_typeof(x -> 'rooms') = 'array' then x -> 'rooms'
        else '[]'::jsonb end) > 60
  ) then
    raise exception 'Tracés invalides.' using errcode = '22023';
  end if;
  if p_estimates is null or jsonb_typeof(p_estimates) <> 'array' then
    raise exception 'Estimations invalides.' using errcode = '22023';
  end if;
  if jsonb_array_length(p_estimates) > 200
    or exists (
      select 1 from jsonb_array_elements(p_estimates) e
      where coalesce(e ->> 'position', '') !~ '^[1-9]\d{0,2}$'
        or coalesce(e ->> 'areaCm2', '') !~ '^[1-9]\d{0,8}$'
        or coalesce(e ->> 'perimeterMm', '') !~ '^[1-9]\d{0,6}$'
    ) then
    raise exception 'Estimations invalides.' using errcode = '22023';
  end if;

  update public.tender_rooms r
  set area_cm2 = (e ->> 'areaCm2')::integer,
    perimeter_mm = coalesce(r.perimeter_mm, (e ->> 'perimeterMm')::integer),
    source = 'estime',
    uncertain = false
  from jsonb_array_elements(p_estimates) e
  where r.tender_id = t.id
    and r.position = (e ->> 'position')::smallint
    and r.area_cm2 is null
    and (e ->> 'areaCm2')::bigint between 1 and 100000000
    and (e ->> 'perimeterMm')::bigint between 1 and 2000000;
  get diagnostics v_count = row_count;

  update public.tenders set plan_traces = p_traces where id = t.id;
  return v_count;
end;
$$;

-- Lignes du DPGF : une quantité tirée d'une pièce estimée garde l'origine « estime ».
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
      when l.v ->> 'source' in ('plan', 'calcul', 'photo', 'manque', 'saisi', 'estime')
        then l.v ->> 'source'
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

revoke execute on function public.artisan_import_plan_traces(uuid, jsonb, jsonb) from public, anon;
grant execute on function public.artisan_import_plan_traces(uuid, jsonb, jsonb) to authenticated;
