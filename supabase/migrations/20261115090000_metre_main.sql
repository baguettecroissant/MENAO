-- Métré à la main sur le plan (F-159, lot 3, ADR 0327).
-- L'artisan trace lui-même une surface, une longueur ou un comptage sur l'image d'un plan ;
-- packages/core calcule la mesure. Une surface devient une pièce (nouvelle, ou surface d'une pièce
-- existante), une longueur ou un comptage devient un ouvrage dans le lot choisi. L'origine est
-- « trace » (« Tracé à la main »), gardée dans le DPGF. Les tracés sont gardés pour les réafficher.

alter table public.tender_rooms drop constraint tender_rooms_source_check;
alter table public.tender_rooms add constraint tender_rooms_source_check
  check (source in ('plan', 'cotes', 'photo', 'saisi', 'estime', 'trace'));

alter table public.tender_works drop constraint tender_works_source_check;
alter table public.tender_works add constraint tender_works_source_check
  check (source in ('plan', 'calcul', 'compte', 'photo', 'saisi', 'trace'));

alter table public.tender_lines drop constraint tender_lines_quantity_source_check;
alter table public.tender_lines add constraint tender_lines_quantity_source_check
  check (quantity_source is null
    or quantity_source in ('plan', 'calcul', 'photo', 'manque', 'saisi', 'estime', 'trace'));

alter table public.tenders
  -- Tracés à la main : [{ "kind", "name", "file", "points" }], dans l'ordre d'ajout.
  add column plan_marks jsonb not null default '[]'::jsonb
    check (jsonb_typeof(plan_marks) = 'array' and jsonb_array_length(plan_marks) <= 300);

-- Mesures tracées à la main ajoutées au relevé.
create function public.artisan_add_plan_measures(p_tender_id uuid, p_measures jsonb)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  t public.tenders := app.my_plan_tender(p_tender_id);
  m jsonb;
  v_count integer := 0;
  v_marks jsonb := t.plan_marks;
  v_position integer;
  v_trade text;
begin
  if p_measures is null or jsonb_typeof(p_measures) <> 'array' then
    raise exception 'Mesures invalides.' using errcode = '22023';
  end if;
  if jsonb_array_length(p_measures) not between 1 and 100 then
    raise exception 'Mesures invalides.' using errcode = '22023';
  end if;
  if jsonb_array_length(v_marks) + jsonb_array_length(p_measures) > 300 then
    raise exception 'Trop de mesures tracées sur cet appel d''offres.' using errcode = '22023';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_measures) x
    where coalesce(x ->> 'kind', '') not in ('surface', 'longueur', 'comptage')
      or nullif(btrim(coalesce(x ->> 'name', '')), '') is null
      or coalesce(x ->> 'file', '') !~ '^(10|[1-9])$'
      or char_length(coalesce(x ->> 'points', '')) > 4000
      or coalesce(x ->> 'points', '') !~ '^-?\d{1,5},-?\d{1,5}( -?\d{1,5},-?\d{1,5})*$'
      or case x ->> 'kind'
        when 'surface' then coalesce(x ->> 'areaCm2', '') !~ '^[1-9]\d{0,7}$'
          or coalesce(x ->> 'perimeterMm', '') !~ '^[1-9]\d{0,5}$'
        when 'comptage' then coalesce(x ->> 'quantityMilli', '') !~ '^[1-9]\d{0,4}000$'
        else coalesce(x ->> 'quantityMilli', '') !~ '^[1-9]\d{0,9}$'
      end
  ) then
    raise exception 'Mesures invalides.' using errcode = '22023';
  end if;

  for m in select x from jsonb_array_elements(p_measures) with ordinality as e (x, ord) order by e.ord
  loop
    if m ->> 'kind' = 'surface' and (m ->> 'roomId') ~ '^[0-9a-f-]{36}$' then
      -- Surface d'une pièce existante (contour corrigé, ou pièce restée vide).
      update public.tender_rooms
      set area_cm2 = (m ->> 'areaCm2')::integer,
        perimeter_mm = (m ->> 'perimeterMm')::integer,
        source = 'trace',
        uncertain = false
      where id = (m ->> 'roomId')::uuid and tender_id = t.id;
      if not found then
        raise exception 'Pièce introuvable.' using errcode = '22023';
      end if;
    elsif m ->> 'kind' = 'surface' then
      select coalesce(max(position), 0) + 1 into v_position
      from public.tender_rooms where tender_id = t.id;
      if v_position > 200 then
        raise exception 'Pièces invalides (200 au plus).' using errcode = '22023';
      end if;
      -- Hauteur sous plafond reprise de la première pièce du relevé, modifiable ensuite.
      insert into public.tender_rooms (tender_id, position, name, area_cm2, perimeter_mm,
        height_mm, source, file_index)
      values (t.id, v_position, left(btrim(m ->> 'name'), 80), (m ->> 'areaCm2')::integer,
        (m ->> 'perimeterMm')::integer,
        (select r.height_mm from public.tender_rooms r where r.tender_id = t.id
         order by r.position limit 1),
        'trace', (m ->> 'file')::smallint);
    else
      select coalesce(max(position), 0) + 1 into v_position
      from public.tender_works where tender_id = t.id;
      if v_position > 200 then
        raise exception 'Ouvrages invalides (200 au plus).' using errcode = '22023';
      end if;
      v_trade := case when m ->> 'trade' = any (t.plan_trades) then m ->> 'trade' end;
      insert into public.tender_works (tender_id, position, name, kind, quantity_milli, source,
        trade_code, file_index)
      values (t.id, v_position, left(btrim(m ->> 'name'), 120),
        case when m ->> 'kind' = 'longueur' then 'lineaire' else 'nombre' end,
        (m ->> 'quantityMilli')::bigint, 'trace', v_trade, (m ->> 'file')::smallint);
    end if;
    v_marks := v_marks || jsonb_build_array(jsonb_build_object(
      'kind', m ->> 'kind',
      'name', left(btrim(m ->> 'name'), 120),
      'file', (m ->> 'file')::integer,
      'points', m ->> 'points'
    ));
    v_count := v_count + 1;
  end loop;

  update public.tenders set plan_marks = v_marks where id = t.id;
  return v_count;
end;
$$;

-- Lignes du DPGF : une quantité tracée à la main garde l'origine « trace ».
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
      when l.v ->> 'source' in ('plan', 'calcul', 'photo', 'manque', 'saisi', 'estime', 'trace')
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

revoke execute on function public.artisan_add_plan_measures(uuid, jsonb) from public, anon;
grant execute on function public.artisan_add_plan_measures(uuid, jsonb) to authenticated;
