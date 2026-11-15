-- Ouvrages écrits sur les plans (F-159, lot 6, ADR 0330).
-- Les notes de l'architecte (cloisons, faux plafonds, déposes, équipements) et les menuiseries à
-- repère deviennent des ouvrages du relevé, rangés par métier. Un ouvrage garde la pièce où il se
-- trouve et dit s'il s'agit d'une dépose (lot « Démolition » à part). Origine « unite » : une
-- unité par note écrite. Les lots que les plans demandent s'ajoutent à ceux de l'appel d'offres
-- (`plan_trades`, où « demolition » désigne le lot des déposes), et l'artisan les décoche.

alter table public.tender_works
  -- Pièce écrite sur le plan pour cet ouvrage.
  add column room text check (room is null or char_length(room) <= 80),
  -- Dépose ou démolition : va dans le lot « Démolition ».
  add column removal boolean not null default false;

alter table public.tender_works drop constraint tender_works_source_check;
alter table public.tender_works add constraint tender_works_source_check
  check (source in ('plan', 'calcul', 'compte', 'photo', 'saisi', 'trace', 'unite'));

-- Métiers actifs : lots possibles d'un ouvrage, que le lot soit coché ou non.
create function app.active_trades()
returns text[]
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(array_agg(code), '{}') from public.trades where active
$$;

-- Ouvrages d'un relevé (JSON) vérifiés et numérotés : désormais avec la pièce et la dépose.
drop function app.plan_works_rows(jsonb, text[]);
create function app.plan_works_rows(p_works jsonb, p_trades text[])
returns table (
  ord integer, work_id uuid, name text, kind text, quantity_milli bigint, source text,
  detail text, trade_code text, file_index smallint, page smallint, uncertain boolean,
  room text, removal boolean
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
      when w.v ->> 'source' in ('plan', 'calcul', 'compte', 'photo', 'unite') then w.v ->> 'source'
      else 'saisi'
    end,
    left(nullif(btrim(coalesce(w.v ->> 'detail', '')), ''), 300),
    case when w.v ->> 'trade' = any (p_trades) then w.v ->> 'trade' end,
    (w.v ->> 'file')::smallint,
    (w.v ->> 'page')::smallint,
    coalesce((w.v ->> 'uncertain')::boolean, false),
    left(nullif(btrim(coalesce(w.v ->> 'room', '')), ''), 80),
    coalesce((w.v ->> 'removal')::boolean, false)
  from jsonb_array_elements(p_works) with ordinality as w (v, ord);
end;
$$;

-- Ouvrages écrits ajoutés au relevé, après la lecture des pièces et des ouvrages mesurés. Les lots
-- qu'ils demandent rejoignent ceux de l'appel d'offres (20 au plus).
create function public.artisan_import_plan_notes(p_tender_id uuid, p_works jsonb)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  t public.tenders := app.my_plan_tender(p_tender_id);
  v_base integer;
  v_count integer;
  v_lots text[];
begin
  select coalesce(max(position), 0) into v_base from public.tender_works where tender_id = t.id;
  insert into public.tender_works (tender_id, position, name, kind, quantity_milli, source,
    detail, trade_code, file_index, page, uncertain, room, removal)
  select t.id, (v_base + w.ord)::smallint, w.name, w.kind, w.quantity_milli,
    case when w.source = 'saisi' then 'plan' else w.source end,
    case when w.source = 'calcul' then w.detail end, w.trade_code, w.file_index, w.page,
    w.uncertain, w.room, w.removal
  from app.plan_works_rows(coalesce(p_works, '[]'::jsonb), app.active_trades()) w
  where v_base + w.ord <= 200;
  get diagnostics v_count = row_count;

  -- Lots déjà choisis, puis ceux des ouvrages écrits ; les déposes demandent le lot « demolition ».
  select array_agg(x.code order by x.rank, x.code) into v_lots
  from (
    select code, min(rank) as rank
    from (
      select unnest(t.plan_trades) as code, 0 as rank
      union all
      select case when w.removal then 'demolition' else w.trade_code end, 1
      from public.tender_works w
      where w.tender_id = t.id and w.position > v_base and (w.removal or w.trade_code is not null)
    ) c
    group by code
  ) x;
  update public.tenders
  set plan_trades = coalesce(v_lots[1:20], plan_trades)
  where id = t.id;
  return v_count;
end;
$$;

-- Lots de l'appel d'offres, cochés par l'artisan : métiers actifs, et « demolition ».
create function public.artisan_set_plan_trades(p_tender_id uuid, p_trades text[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  t public.tenders := app.my_plan_tender(p_tender_id);
  v_trades text[];
begin
  select coalesce(array_agg(distinct c), '{}') into v_trades from unnest(p_trades) c;
  if cardinality(v_trades) not between 1 and 20 or exists (
    select 1 from unnest(v_trades) c
    where c <> 'demolition' and c <> all (app.active_trades())
  ) then
    raise exception 'Gardez au moins un lot.' using errcode = '22023';
  end if;
  update public.tenders set plan_trades = v_trades where id = t.id;
end;
$$;

-- Ouvrages corrigés par l'artisan : la pièce et la dépose d'un ouvrage sont gardées, et un ouvrage
-- garde son métier même si son lot est décoché.
create or replace function public.artisan_save_plan_works(p_tender_id uuid, p_works jsonb)
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
      'uncertain', o.uncertain, 'room', o.room, 'removal', coalesce(o.removal, false)
    ) order by w.ord), '[]'::jsonb)
  into v_rows
  from app.plan_works_rows(p_works, app.active_trades()) w
  left join public.tender_works o on o.id = w.work_id and o.tender_id = t.id;

  delete from public.tender_works where tender_id = t.id;
  insert into public.tender_works (tender_id, position, name, kind, quantity_milli, source,
    detail, trade_code, file_index, page, uncertain, room, removal)
  select t.id, (v ->> 'ord')::smallint, v ->> 'name', v ->> 'kind', (v ->> 'quantity')::bigint,
    case when (v ->> 'changed')::boolean then 'saisi' else v ->> 'source' end,
    case when (v ->> 'changed')::boolean then null else v ->> 'detail' end,
    v ->> 'trade', (v ->> 'file')::smallint, (v ->> 'page')::smallint,
    case when (v ->> 'changed')::boolean then false else (v ->> 'uncertain')::boolean end,
    v ->> 'room', (v ->> 'removal')::boolean
  from jsonb_array_elements(v_rows) v;
end;
$$;

revoke execute on function app.active_trades() from public, anon;
revoke execute on function app.plan_works_rows(jsonb, text[]) from public, anon;
revoke execute on function public.artisan_import_plan_notes(uuid, jsonb) from public, anon;
revoke execute on function public.artisan_set_plan_trades(uuid, text[]) from public, anon;
grant execute on function public.artisan_import_plan_notes(uuid, jsonb) to authenticated;
grant execute on function public.artisan_set_plan_trades(uuid, text[]) to authenticated;
