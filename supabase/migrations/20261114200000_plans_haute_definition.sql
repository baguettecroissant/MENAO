-- Lecture haute définition des photos de plans (F-159, ADR 0325).
-- Une photo de plan est désormais déposée avec ses zones agrandies (découpées par le navigateur),
-- lues en plus de la vue d'ensemble. Chaque plan de `tenders.plan_files` peut porter
-- « tiles » : [{ "path", "col", "row", "cols", "rows" }]. Les zones sont des fichiers du même
-- dossier que les plans ; la suppression de l'appel d'offres rend aussi leurs chemins.

-- Zones d'un plan (JSON) remises en forme : chemins du dossier de l'entreprise, grille plausible.
create function app.plan_tiles(p_tiles jsonb, p_artisan uuid)
returns jsonb
language plpgsql
immutable
set search_path = ''
as $$
begin
  if p_tiles is null or jsonb_typeof(p_tiles) = 'null' then
    return '[]'::jsonb;
  end if;
  if jsonb_typeof(p_tiles) <> 'array' or jsonb_array_length(p_tiles) > 6 then
    raise exception 'Fichier invalide.' using errcode = '22023';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_tiles) z
    where coalesce(z ->> 'path', '') !~ ('^' || p_artisan::text || '/[0-9a-f-]{36}\.jpg$')
      or coalesce(z ->> 'cols', '') !~ '^[1-3]$'
      or coalesce(z ->> 'rows', '') !~ '^[1-3]$'
      or coalesce(z ->> 'col', '') !~ '^[1-3]$'
      or coalesce(z ->> 'row', '') !~ '^[1-3]$'
  ) then
    raise exception 'Fichier invalide.' using errcode = '22023';
  end if;
  return (
    select coalesce(jsonb_agg(jsonb_build_object(
        'path', z.v ->> 'path',
        'col', (z.v ->> 'col')::integer,
        'row', (z.v ->> 'row')::integer,
        'cols', (z.v ->> 'cols')::integer,
        'rows', (z.v ->> 'rows')::integer
      ) order by z.ord), '[]'::jsonb)
    from jsonb_array_elements(p_tiles) with ordinality as z (v, ord)
  );
end;
$$;
revoke execute on function app.plan_tiles(jsonb, uuid) from public, anon;

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
      end
    ) order by f.ord), '[]'::jsonb)
  into v_files
  from jsonb_array_elements(p_files) with ordinality as f (v, ord);

  -- Un même fichier ne sert qu'une fois, plans et zones confondus.
  if exists (
    select 1
    from (
      select f ->> 'path' as path from jsonb_array_elements(v_files) f
      union all
      select z ->> 'path' from jsonb_array_elements(v_files) f, jsonb_array_elements(f -> 'tiles') z
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

-- Suppression : chemins du DPGF de l'architecte, des plans et de leurs zones, que le site supprime
-- ensuite du bucket.
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
           ) with ordinality as z (v, ord)
       ) p), '{}'
    )),
    null
  );
end;
$$;
