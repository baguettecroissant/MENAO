-- Pages de PDF rendues en images (F-159, lot 4, ADR 0328).
-- Le navigateur rend chaque page d'un PDF de plans en image à l'envoi : la page peut alors être
-- tracée (mesure à l'échelle), affichée avec ses contours et mesurée à la main, comme une photo.
-- Chaque PDF de `tenders.plan_files` peut porter « pages » : [{ "path", "page" }]. Les pages sont
-- des fichiers du dossier de l'entreprise, rendus à la suppression. Une mesure tracée à la main
-- garde sa page.

-- Pages d'un PDF (JSON) remises en forme : chemins du dossier de l'entreprise, numéros de page.
create function app.plan_pdf_pages(p_pages jsonb, p_artisan uuid)
returns jsonb
language plpgsql
immutable
set search_path = ''
as $$
begin
  if p_pages is null or jsonb_typeof(p_pages) = 'null' then
    return '[]'::jsonb;
  end if;
  if jsonb_typeof(p_pages) <> 'array' then
    raise exception 'Fichier invalide.' using errcode = '22023';
  end if;
  if jsonb_array_length(p_pages) > 12 or exists (
    select 1 from jsonb_array_elements(p_pages) z
    where coalesce(z ->> 'path', '') !~ ('^' || p_artisan::text || '/[0-9a-f-]{36}\.jpg$')
      or coalesce(z ->> 'page', '') !~ '^[1-9]\d{0,2}$'
  ) then
    raise exception 'Fichier invalide.' using errcode = '22023';
  end if;
  return (
    select coalesce(jsonb_agg(jsonb_build_object(
        'path', z.v ->> 'path',
        'page', (z.v ->> 'page')::integer
      ) order by z.ord), '[]'::jsonb)
    from jsonb_array_elements(p_pages) with ordinality as z (v, ord)
  );
end;
$$;
revoke execute on function app.plan_pdf_pages(jsonb, uuid) from public, anon;

create or replace function public.artisan_create_plan_tender(
  p_name text,
  p_files jsonb,
  p_trades text[],
  p_client_name text default null,
  p_due_on date default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_artisan uuid := app.tender_artisan();
  v_files jsonb;
  v_trades text[];
  v_id uuid;
begin
  if nullif(btrim(coalesce(p_name, '')), '') is null then
    raise exception 'Nom du projet obligatoire.' using errcode = '22023';
  end if;
  if p_files is null or jsonb_typeof(p_files) <> 'array'
    or jsonb_array_length(p_files) not between 1 and 10 then
    raise exception 'Déposez de 1 à 10 plans.' using errcode = '22023';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_files) f
    where coalesce(f ->> 'path', '') !~ ('^' || v_artisan::text || '/[0-9a-f-]{36}\.(pdf|jpg|png)$')
  ) then
    raise exception 'Fichier invalide.' using errcode = '22023';
  end if;
  select coalesce(jsonb_agg(jsonb_build_object(
      'path', f.v ->> 'path',
      'name', left(coalesce(nullif(btrim(coalesce(f.v ->> 'name', '')), ''), 'Plan'), 200),
      'kind', substring(f.v ->> 'path' from '\.(pdf|jpg|png)$'),
      -- Zones agrandies : seulement pour une photo.
      'tiles', case
        when f.v ->> 'path' ~ '\.pdf$' then '[]'::jsonb
        else app.plan_tiles(f.v -> 'tiles', v_artisan)
      end,
      -- Pages rendues en images : seulement pour un PDF.
      'pages', case
        when f.v ->> 'path' ~ '\.pdf$' then app.plan_pdf_pages(f.v -> 'pages', v_artisan)
        else '[]'::jsonb
      end
    ) order by f.ord), '[]'::jsonb)
  into v_files
  from jsonb_array_elements(p_files) with ordinality as f (v, ord);

  -- Un même fichier ne sert qu'une fois : plans, zones et pages confondus.
  if exists (
    select 1
    from (
      select f ->> 'path' as path from jsonb_array_elements(v_files) f
      union all
      select z ->> 'path' from jsonb_array_elements(v_files) f, jsonb_array_elements(f -> 'tiles') z
      union all
      select z ->> 'path' from jsonb_array_elements(v_files) f, jsonb_array_elements(f -> 'pages') z
    ) p
    group by p.path having count(*) > 1
  ) then
    raise exception 'Fichier invalide.' using errcode = '22023';
  end if;

  select coalesce(array_agg(distinct c), '{}') into v_trades from unnest(p_trades) c;
  if cardinality(v_trades) not between 1 and 20 or exists (
    select 1 from unnest(v_trades) c
    where not exists (select 1 from public.trades tr where tr.code = c and tr.active)
  ) then
    raise exception 'Choisissez au moins un métier.' using errcode = '22023';
  end if;

  insert into public.tenders (artisan_id, name, client_name, due_on, source_kind, plan_files,
    plan_trades, vat_rate_bp)
  select v_artisan, btrim(p_name), nullif(btrim(coalesce(p_client_name, '')), ''), p_due_on,
    'plan', v_files, v_trades, case when a.assujetti_tva is false then 0 else 2000 end
  from public.artisans a where a.id = v_artisan
  returning id into v_id;
  return v_id;
end;
$$;

-- Suppression : chemins du DPGF de l'architecte, des plans, de leurs zones et de leurs pages.
create or replace function public.artisan_delete_tender(p_tender_id uuid)
returns text[]
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_path text;
  v_files jsonb;
begin
  delete from public.tenders
  where id = p_tender_id and artisan_id = app.my_manager_artisan_id()
  returning source_path, plan_files into v_path, v_files;
  if not found then
    raise exception 'Appel d''offres introuvable.' using errcode = '22023';
  end if;
  return array_remove(
    array_prepend(v_path, coalesce(
      (select array_agg(p.path order by p.ord, p.sub)
       from (
         select f.v ->> 'path' as path, f.ord, 0::bigint as sub
         from jsonb_array_elements(v_files) with ordinality as f (v, ord)
         union all
         select z.v ->> 'path', f.ord, z.ord
         from jsonb_array_elements(v_files) with ordinality as f (v, ord),
           jsonb_array_elements(
             case when jsonb_typeof(f.v -> 'tiles') = 'array' then f.v -> 'tiles' else '[]'::jsonb end
             || case when jsonb_typeof(f.v -> 'pages') = 'array' then f.v -> 'pages' else '[]'::jsonb end
           ) with ordinality as z (v, ord)
       ) p), '{}'
    )),
    null
  );
end;
$$;

-- Mesures tracées à la main : la page mesurée est gardée (pièce, ouvrage et tracé).
create or replace function public.artisan_add_plan_measures(p_tender_id uuid, p_measures jsonb)
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
      or coalesce(x ->> 'page', '1') !~ '^[1-9]\d{0,2}$'
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
        height_mm, source, file_index, page)
      values (t.id, v_position, left(btrim(m ->> 'name'), 80), (m ->> 'areaCm2')::integer,
        (m ->> 'perimeterMm')::integer,
        (select r.height_mm from public.tender_rooms r where r.tender_id = t.id
         order by r.position limit 1),
        'trace', (m ->> 'file')::smallint, coalesce(m ->> 'page', '1')::smallint);
    else
      select coalesce(max(position), 0) + 1 into v_position
      from public.tender_works where tender_id = t.id;
      if v_position > 200 then
        raise exception 'Ouvrages invalides (200 au plus).' using errcode = '22023';
      end if;
      v_trade := case when m ->> 'trade' = any (t.plan_trades) then m ->> 'trade' end;
      insert into public.tender_works (tender_id, position, name, kind, quantity_milli, source,
        trade_code, file_index, page)
      values (t.id, v_position, left(btrim(m ->> 'name'), 120),
        case when m ->> 'kind' = 'longueur' then 'lineaire' else 'nombre' end,
        (m ->> 'quantityMilli')::bigint, 'trace', v_trade, (m ->> 'file')::smallint,
        coalesce(m ->> 'page', '1')::smallint);
    end if;
    v_marks := v_marks || jsonb_build_array(jsonb_build_object(
      'kind', m ->> 'kind',
      'name', left(btrim(m ->> 'name'), 120),
      'file', (m ->> 'file')::integer,
      'page', coalesce(m ->> 'page', '1')::integer,
      'points', m ->> 'points'
    ));
    v_count := v_count + 1;
  end loop;

  update public.tenders set plan_marks = v_marks where id = t.id;
  return v_count;
end;
$$;
