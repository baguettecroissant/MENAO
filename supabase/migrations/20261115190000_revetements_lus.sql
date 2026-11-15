-- Revêtements lus sur le plan (F-159, lot 6, PR B, ADR 0331).
-- La lecture des notes relève ce que le plan écrit pour le sol, les murs et le plafond de chaque
-- pièce. Ces notes sont gardées avec la pièce et pré-remplissent l'étape « Revêtements », qui dit
-- pour chaque choix s'il est lu sur le plan ou proposé par MENAO. Deux sols de plus : un sol
-- existant conservé (« existant_nettoyer », « parquet_poncer ») ne reçoit pas de revêtement neuf.

alter table public.tender_rooms
  add column floor_note text check (floor_note is null or char_length(floor_note) <= 200),
  add column walls_note text check (walls_note is null or char_length(walls_note) <= 200),
  add column ceiling_note text check (ceiling_note is null or char_length(ceiling_note) <= 200);

alter table public.tender_rooms drop constraint tender_rooms_floor_check;
alter table public.tender_rooms add constraint tender_rooms_floor_check
  check (floor is null or floor in ('carrelage', 'parquet', 'sol_souple', 'existant_nettoyer',
    'parquet_poncer', 'aucun'));

-- Notes et revêtements lus, par rang de pièce :
-- [{ position, floorNote, wallsNote, ceilingNote, floor, walls, ceiling, tileHeightMm }].
-- Appelée après la lecture des plans : un revêtement que la note ne dit pas reste à choisir.
create function public.artisan_import_plan_finishes(p_tender_id uuid, p_finishes jsonb)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  t public.tenders := app.my_plan_tender(p_tender_id);
  v_count integer;
begin
  if p_finishes is null or jsonb_typeof(p_finishes) <> 'array' or jsonb_array_length(p_finishes) > 200 then
    raise exception 'Revêtements invalides.' using errcode = '22023';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_finishes) f
    where coalesce(f ->> 'position', '') !~ '^[1-9]\d{0,2}$'
      or (f ->> 'floor' is not null and f ->> 'floor' not in ('carrelage', 'parquet', 'sol_souple',
        'existant_nettoyer', 'parquet_poncer'))
      or (f ->> 'walls' is not null and f ->> 'walls' not in ('peinture', 'faience'))
      or (f ->> 'ceiling' is not null and f ->> 'ceiling' not in ('peinture', 'plaque'))
      or (f ->> 'tileHeightMm' is not null and case
        when (f ->> 'tileHeightMm') !~ '^\d{3,4}$' then true
        else (f ->> 'tileHeightMm')::integer not between 100 and 4000
      end)
  ) then
    raise exception 'Revêtements invalides.' using errcode = '22023';
  end if;
  update public.tender_rooms r
  set floor_note = left(nullif(btrim(coalesce(f ->> 'floorNote', '')), ''), 200),
    walls_note = left(nullif(btrim(coalesce(f ->> 'wallsNote', '')), ''), 200),
    ceiling_note = left(nullif(btrim(coalesce(f ->> 'ceilingNote', '')), ''), 200),
    floor = f ->> 'floor',
    walls = f ->> 'walls',
    ceiling = f ->> 'ceiling',
    tile_height_mm = case when f ->> 'walls' = 'faience' then (f ->> 'tileHeightMm')::integer end
  from jsonb_array_elements(p_finishes) f
  where r.tender_id = t.id and r.position = (f ->> 'position')::integer;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- Revêtements choisis par l'artisan : les deux sols existants conservés sont acceptés.
create or replace function public.artisan_save_plan_finishes(p_tender_id uuid, p_finishes jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  t public.tenders := app.my_plan_tender(p_tender_id);
begin
  if p_finishes is null or jsonb_typeof(p_finishes) <> 'array' or jsonb_array_length(p_finishes) > 200 then
    raise exception 'Revêtements invalides.' using errcode = '22023';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_finishes) f
    where coalesce(f ->> 'floor', '') not in ('carrelage', 'parquet', 'sol_souple',
        'existant_nettoyer', 'parquet_poncer', 'aucun')
      or coalesce(f ->> 'walls', '') not in ('peinture', 'faience', 'aucun')
      or coalesce(f ->> 'ceiling', '') not in ('peinture', 'plaque', 'aucun')
      or coalesce(f ->> 'id', '') !~ '^[0-9a-f-]{36}$'
  ) then
    raise exception 'Revêtements invalides.' using errcode = '22023';
  end if;
  update public.tender_rooms r
  set floor = f ->> 'floor',
    walls = f ->> 'walls',
    ceiling = f ->> 'ceiling',
    tile_height_mm = case when f ->> 'walls' = 'faience' then (f ->> 'tileHeightMm')::integer end
  from jsonb_array_elements(p_finishes) f
  where r.tender_id = t.id and r.id = (f ->> 'id')::uuid;
end;
$$;

-- Relevé corrigé : les notes lues sur le plan sont gardées avec les revêtements.
create or replace function public.artisan_save_plan_rooms(p_tender_id uuid, p_rooms jsonb, p_counts jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  t public.tenders := app.my_plan_tender(p_tender_id);
  v_rows jsonb;
begin
  select coalesce(jsonb_agg(jsonb_build_object(
      'ord', r.ord, 'level', r.level, 'name', r.name, 'area', r.area_cm2,
      'perimeter', r.perimeter_mm, 'height', r.height_mm, 'wet', r.wet, 'habitable', r.habitable,
      'changed', o.id is null or (o.level, o.name, o.area_cm2, o.perimeter_mm, o.height_mm, o.wet,
        o.habitable) is distinct from (r.level, r.name, r.area_cm2, r.perimeter_mm, r.height_mm,
        r.wet, r.habitable),
      'source', o.source, 'file', o.file_index, 'page', o.page, 'uncertain', o.uncertain,
      'floor', o.floor, 'walls', o.walls, 'ceiling', o.ceiling, 'tile', o.tile_height_mm,
      'floorNote', o.floor_note, 'wallsNote', o.walls_note, 'ceilingNote', o.ceiling_note
    ) order by r.ord), '[]'::jsonb)
  into v_rows
  from app.plan_rooms_rows(p_rooms) r
  left join public.tender_rooms o on o.id = r.room_id and o.tender_id = t.id;

  delete from public.tender_rooms where tender_id = t.id;
  insert into public.tender_rooms (tender_id, position, level, name, area_cm2, perimeter_mm,
    height_mm, wet, habitable, source, file_index, page, uncertain, floor, walls, ceiling,
    tile_height_mm, floor_note, walls_note, ceiling_note)
  select t.id, (v ->> 'ord')::smallint, v ->> 'level', v ->> 'name', (v ->> 'area')::integer,
    (v ->> 'perimeter')::integer, (v ->> 'height')::integer, (v ->> 'wet')::boolean,
    (v ->> 'habitable')::boolean,
    case when (v ->> 'changed')::boolean then 'saisi' else v ->> 'source' end,
    (v ->> 'file')::smallint, (v ->> 'page')::smallint,
    case when (v ->> 'changed')::boolean then false else (v ->> 'uncertain')::boolean end,
    v ->> 'floor', v ->> 'walls', v ->> 'ceiling', (v ->> 'tile')::integer,
    v ->> 'floorNote', v ->> 'wallsNote', v ->> 'ceilingNote'
  from jsonb_array_elements(v_rows) v;

  update public.tenders
  set plan_counts = app.plan_counts(coalesce(p_counts, '{}'::jsonb))
  where id = t.id;
end;
$$;

revoke execute on function public.artisan_import_plan_finishes(uuid, jsonb) from public, anon;
grant execute on function public.artisan_import_plan_finishes(uuid, jsonb) to authenticated;
