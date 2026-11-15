-- Zones agrandies des plans pour la seconde lecture des symboles (F-159, lot 7, PR A2, ADR 0338).
-- Au dépôt, le navigateur découpe chaque image de plan (photo, page de PDF rendue) en quatre zones
-- qui se chevauchent, agrandies : une seconde lecture y sépare les symboles serrés. Chaque plan de
-- tenders.plan_files peut porter « symbolZones » : [{ path, page, x, y, w, h }], le rectangle étant
-- en pixels de l'image du plan. Ce sont des fichiers du dossier de l'entreprise, rendus à la
-- suppression.

-- Zones (JSON) remises en forme : chemins du dossier de l'entreprise, rectangles entiers.
create function app.plan_symbol_zones(p_zones jsonb, p_artisan uuid)
returns jsonb
language plpgsql
immutable
set search_path = ''
as $$
begin
  if p_zones is null or jsonb_typeof(p_zones) = 'null' then
    return '[]'::jsonb;
  end if;
  if jsonb_typeof(p_zones) <> 'array' then
    raise exception 'Fichier invalide.' using errcode = '22023';
  end if;
  if jsonb_array_length(p_zones) > 48 or exists (
    select 1 from jsonb_array_elements(p_zones) z
    where coalesce(z ->> 'path', '') !~ ('^' || p_artisan::text || '/[0-9a-f-]{36}\.jpg$')
      or coalesce(z ->> 'page', '') !~ '^[1-9]\d{0,2}$'
      or coalesce(z ->> 'x', '') !~ '^\d{1,5}$'
      or coalesce(z ->> 'y', '') !~ '^\d{1,5}$'
      or coalesce(z ->> 'w', '') !~ '^[1-9]\d{0,4}$'
      or coalesce(z ->> 'h', '') !~ '^[1-9]\d{0,4}$'
  ) then
    raise exception 'Fichier invalide.' using errcode = '22023';
  end if;
  return (
    select coalesce(jsonb_agg(jsonb_build_object(
        'path', z.v ->> 'path',
        'page', (z.v ->> 'page')::integer,
        'x', (z.v ->> 'x')::integer,
        'y', (z.v ->> 'y')::integer,
        'w', (z.v ->> 'w')::integer,
        'h', (z.v ->> 'h')::integer
      ) order by z.ord), '[]'::jsonb)
    from jsonb_array_elements(p_zones) with ordinality as z (v, ord)
  );
end;
$$;
revoke execute on function app.plan_symbol_zones(jsonb, uuid) from public, anon;

-- Création d'un appel d'offres depuis les plans : les zones agrandies sont gardées avec chaque plan.
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
      end,
      -- Zones agrandies pour la seconde lecture des symboles (ADR 0338).
      'symbolZones', app.plan_symbol_zones(f.v -> 'symbolZones', v_artisan)
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
      union all
      select z ->> 'path' from jsonb_array_elements(v_files) f,
        jsonb_array_elements(f -> 'symbolZones') z
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

-- Suppression : chemins du DPGF de l'architecte, des plans, de leurs zones, de leurs pages et
-- des zones agrandies des symboles.
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
             || case when jsonb_typeof(f.v -> 'symbolZones') = 'array' then f.v -> 'symbolZones'
               else '[]'::jsonb end
           ) with ordinality as z (v, ord)
       ) p), '{}'
    )),
    null
  );
end;
$$;
