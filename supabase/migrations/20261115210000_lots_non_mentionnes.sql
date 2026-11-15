-- Lots que les plans ne mentionnent pas (F-159, lot 6, ADR 0333).
-- Quand les plans portent des ouvrages écrits, un lot choisi par l'artisan sans rien sur les plans
-- (climatisation…) est décoché par défaut : il reste proposé dans « Lots proposés d'après vos
-- plans », où l'artisan le recoche. `plan_lots_idle` garde ces lots proposés mais décochés.

alter table public.tenders
  add column plan_lots_idle text[] not null default '{}'
    check (cardinality(plan_lots_idle) <= 20);

-- Ouvrages écrits ajoutés au relevé ; `p_idle` : lots choisis à décocher (calculés par
-- packages/core). Au moins un lot reste coché.
drop function public.artisan_import_plan_notes(uuid, jsonb);
create function public.artisan_import_plan_notes(
  p_tender_id uuid,
  p_works jsonb,
  p_idle text[] default '{}'
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  t public.tenders := app.my_plan_tender(p_tender_id);
  v_base integer;
  v_count integer;
  v_kept text[];
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

  -- Lots choisis gardés, puis ceux des ouvrages écrits ; les déposes demandent « demolition ».
  select coalesce(array_agg(c), '{}') into v_kept
  from unnest(t.plan_trades) c
  where c <> all (coalesce(p_idle, '{}'));
  select array_agg(x.code order by x.rank, x.code) into v_lots
  from (
    select code, min(rank) as rank
    from (
      select unnest(v_kept) as code, 0 as rank
      union all
      select case when w.removal then 'demolition' else w.trade_code end, 1
      from public.tender_works w
      where w.tender_id = t.id and w.position > v_base and (w.removal or w.trade_code is not null)
    ) c
    group by code
  ) x;
  if coalesce(cardinality(v_lots), 0) = 0 then
    v_lots := t.plan_trades;
  end if;
  update public.tenders
  set plan_trades = v_lots[1:20],
    plan_lots_idle = coalesce((
      select array_agg(c) from unnest(t.plan_trades) c where c <> all (v_lots[1:20])
    ), '{}')
  where id = t.id;
  return v_count;
end;
$$;

-- Lots cochés par l'artisan : un lot décoché reste proposé (plan_lots_idle).
create or replace function public.artisan_set_plan_trades(p_tender_id uuid, p_trades text[])
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
  update public.tenders
  set plan_trades = v_trades,
    plan_lots_idle = coalesce((
      select array_agg(distinct c)
      from unnest(t.plan_trades || t.plan_lots_idle) c
      where c <> all (v_trades)
    ), '{}')
  where id = t.id;
end;
$$;

revoke execute on function public.artisan_import_plan_notes(uuid, jsonb, text[]) from public, anon;
grant execute on function public.artisan_import_plan_notes(uuid, jsonb, text[]) to authenticated;
