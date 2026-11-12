-- Bibliothèque d'ouvrages et marge, lot 1, PR 2 (F-141, ADR 0294) : le coût de chaque ligne de
-- devis (privé), le prix courant des ouvrages pour les appels d'offres, et l'origine
-- « bibliothèque » des prix d'un DPGF.

-- ---------------------------------------------------------------------------
-- Coût des lignes de devis : jamais lisible par le client
-- ---------------------------------------------------------------------------
-- Une ligne par position du devis (les lignes de devis sont réécrites à chaque enregistrement) :
-- coût unitaire (même unité que la ligne) et ouvrage d'origine.
create table public.quote_line_costs (
  quote_id uuid not null references public.quotes (id) on delete cascade,
  position smallint not null check (position between 1 and 200),
  unit_cost_cents integer not null check (unit_cost_cents between 0 and 100000000),
  work_id uuid references public.artisan_works (id) on delete set null,
  primary key (quote_id, position)
);

alter table public.quote_line_costs enable row level security;
revoke all on public.quote_line_costs from anon, authenticated;
grant select on public.quote_line_costs to authenticated;

-- Lecture : l'entreprise du devis (patron et chef d'équipe) seulement ; ni le client, ni l'équipe
-- MENAO.
create policy "quote_line_costs : l'entreprise seule"
  on public.quote_line_costs for select to authenticated
  using (exists (
    select 1 from public.quotes q
    where q.id = quote_line_costs.quote_id
      and q.artisan_id = (select app.my_manager_artisan_id())
  ));

-- Coûts du brouillon, remplacés en entier : [{ position, unitCostCents, workId }].
create function public.artisan_save_quote_costs(p_quote_id uuid, p_costs jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_artisan uuid := app.library_artisan();
begin
  if not exists (
    select 1 from public.quotes q
    where q.id = p_quote_id and q.artisan_id = v_artisan and q.status = 'brouillon'
  ) then
    raise exception 'Devis introuvable.' using errcode = '22023';
  end if;
  if p_costs is null or jsonb_typeof(p_costs) <> 'array' or jsonb_array_length(p_costs) > 200 then
    raise exception 'Coûts invalides.' using errcode = '22023';
  end if;
  delete from public.quote_line_costs where quote_id = p_quote_id;
  insert into public.quote_line_costs (quote_id, position, unit_cost_cents, work_id)
  select p_quote_id, (c ->> 'position')::smallint, (c ->> 'unitCostCents')::integer,
    w.id
  from jsonb_array_elements(p_costs) c
  left join public.artisan_works w
    on w.id::text = c ->> 'workId' and w.artisan_id = v_artisan
  where c ->> 'unitCostCents' is not null
  on conflict (quote_id, position) do nothing;
end;
$$;

-- ---------------------------------------------------------------------------
-- Prix courant des ouvrages (calculé par le site avec packages/core)
-- ---------------------------------------------------------------------------
-- Prix retenu de l'ouvrage (fixé à la main ou calculé par sa composition), tenu à jour par le
-- site quand l'ouvrage, les réglages ou les fournitures changent. Sert aux appels d'offres.
alter table public.artisan_works
  add column price_cents integer check (price_cents is null or price_cents between 0 and 100000000);

-- [{ id, priceCents }] : ouvrages de l'entreprise seulement.
create function public.artisan_set_work_prices(p_prices jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_artisan uuid := app.library_artisan();
begin
  if p_prices is null or jsonb_typeof(p_prices) <> 'array' or jsonb_array_length(p_prices) > 5000 then
    raise exception 'Prix invalides.' using errcode = '22023';
  end if;
  update public.artisan_works w
  set price_cents = (p ->> 'priceCents')::integer
  from jsonb_array_elements(p_prices) p
  where w.artisan_id = v_artisan and w.id::text = p ->> 'id'
    and w.price_cents is distinct from (p ->> 'priceCents')::integer;
end;
$$;

-- ---------------------------------------------------------------------------
-- Appels d'offres : les prix de la bibliothèque d'abord
-- ---------------------------------------------------------------------------
alter table public.tender_lines drop constraint tender_lines_price_source_check;
alter table public.tender_lines add constraint tender_lines_price_source_check
  check (price_source is null or price_source in ('devis', 'manuel', 'bibliotheque'));

-- Prix pratiqués : ouvrages de la bibliothèque (datés du jour, pour passer devant à ressemblance
-- égale), puis la dernière ligne des devis par désignation et unité.
drop function public.artisan_price_history();
create function public.artisan_price_history()
returns table (designation text, unit public.quote_unit, unit_price_ht_cents integer, used_on date,
  source text)
language sql
stable
security definer
set search_path = ''
as $$
  (
    select btrim(w.designation), w.unit, coalesce(w.price_cents, w.manual_price_cents),
      (now() at time zone 'Europe/Paris')::date, 'bibliotheque'
    from public.artisan_works w
    where w.artisan_id = app.my_manager_artisan_id()
      and coalesce(w.price_cents, w.manual_price_cents) > 0
    limit 2000
  )
  union all
  (
    select distinct on (lower(btrim(l.designation)), l.unit)
      btrim(l.designation), l.unit, l.unit_price_ht_cents,
      (coalesce(q.sent_at, q.created_at) at time zone 'Europe/Paris')::date, 'devis'
    from public.quote_lines l
    join public.quotes q on q.id = l.quote_id
    where q.artisan_id = app.my_manager_artisan_id() and l.unit_price_ht_cents > 0
    order by lower(btrim(l.designation)), l.unit, coalesce(q.sent_at, q.created_at) desc
    limit 2000
  )
$$;
revoke execute on function public.artisan_price_history() from public, anon;
grant execute on function public.artisan_price_history() to authenticated;

-- Lignes lues dans le DPGF : l'origine du prix proposé (devis ou bibliothèque) est gardée.
create or replace function public.artisan_import_tender_lines(p_tender_id uuid, p_sheet jsonb, p_lines jsonb)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  t public.tenders := app.my_tender(p_tender_id);
  v_count integer;
begin
  if jsonb_typeof(p_lines) <> 'array' or jsonb_array_length(p_lines) > 1000 then
    raise exception 'Lignes invalides (1 000 au plus).' using errcode = '22023';
  end if;
  delete from public.tender_lines where tender_id = t.id;
  insert into public.tender_lines (tender_id, position, kind, lot, code, designation, unit_label, unit,
    architect_quantity_milli, quantity_milli, unit_price_ht_cents, price_source, price_reference, sheet_row)
  select t.id, l.ord::smallint, l.v ->> 'kind', left(l.v ->> 'lot', 300), left(l.v ->> 'code', 40),
    left(l.v ->> 'designation', 500), left(l.v ->> 'unitLabel', 20), (l.v ->> 'unit')::public.quote_unit,
    (l.v ->> 'quantityMilli')::bigint, (l.v ->> 'quantityMilli')::bigint,
    (l.v ->> 'unitPriceHtCents')::integer,
    case
      when l.v ->> 'unitPriceHtCents' is null then null
      when l.v ->> 'priceSource' = 'bibliotheque' then 'bibliotheque'
      else 'devis'
    end,
    left(l.v ->> 'priceReference', 200), (l.v ->> 'sheetRow')::integer
  from jsonb_array_elements(p_lines) with ordinality as l (v, ord);
  get diagnostics v_count = row_count;
  update public.tenders
  set sheet = coalesce(p_sheet, '{}'::jsonb), imported_at = now()
  where id = t.id;
  return v_count;
end;
$$;

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
      when l.v ->> 'source' in ('plan', 'calcul', 'photo', 'manque') then l.v ->> 'source'
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

revoke execute on function public.artisan_save_quote_costs(uuid, jsonb) from public, anon;
revoke execute on function public.artisan_set_work_prices(jsonb) from public, anon;
grant execute on function public.artisan_save_quote_costs(uuid, jsonb) to authenticated;
grant execute on function public.artisan_set_work_prices(jsonb) to authenticated;
