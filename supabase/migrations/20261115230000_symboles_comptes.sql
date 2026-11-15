-- Symboles comptés sur les plans (F-159, lot 7, ADR 0336).
-- La lecture des plans liste les symboles électriques (points lumineux, spots, prises,
-- interrupteurs…) avec leur position sur l'image du plan et leur pièce. Ils sont gardés avec
-- l'appel d'offres : le DPGF reprend leur nombre (origine « compte », ou « compte_verif » quand
-- deux lectures ne s'accordent pas sur un groupe), et l'écran les montrera sur le plan.

alter table public.tenders
  -- [{ file, page, type, x, y, room, doubt }], 3 000 au plus.
  add column plan_symbols jsonb not null default '[]'::jsonb
    check (jsonb_typeof(plan_symbols) = 'array' and jsonb_array_length(plan_symbols) <= 3000),
  -- Convention de dessin reconnue par page : [{ file, page, lines }].
  add column plan_symbol_legend jsonb not null default '[]'::jsonb
    check (jsonb_typeof(plan_symbol_legend) = 'array'
      and jsonb_array_length(plan_symbol_legend) <= 50);

alter table public.tender_lines drop constraint tender_lines_quantity_source_check;
alter table public.tender_lines add constraint tender_lines_quantity_source_check
  check (quantity_source is null
    or quantity_source in ('plan', 'calcul', 'photo', 'manque', 'saisi', 'estime', 'trace',
      'partiel', 'compte', 'compte_verif'));

-- Symboles (JSON) remis en forme : type connu, page de plan, position entière, pièce.
create function app.plan_symbols(p_symbols jsonb)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
      'file', (s.v ->> 'file')::integer,
      'page', (s.v ->> 'page')::integer,
      'type', s.v ->> 'type',
      'x', round((s.v ->> 'x')::numeric)::integer,
      'y', round((s.v ->> 'y')::numeric)::integer,
      'room', left(nullif(btrim(coalesce(s.v ->> 'room', '')), ''), 80),
      'doubt', coalesce((s.v ->> 'doubt')::boolean, false)
    ) order by s.ord), '[]'::jsonb)
  from jsonb_array_elements(
    case when jsonb_typeof(p_symbols) = 'array' then p_symbols else '[]'::jsonb end
  ) with ordinality as s (v, ord)
  where s.ord <= 3000
    and coalesce(s.v ->> 'file', '') ~ '^(10|[1-9])$'
    and coalesce(s.v ->> 'page', '') ~ '^[1-9]\d{0,2}$'
    and s.v ->> 'type' in ('point_lumineux', 'spot', 'applique', 'prise', 'prise_specialisee',
      'interrupteur', 'detecteur', 'commande_volet', 'prise_rj45_tv', 'tableau', 'vmc',
      'radiateur', 'wc', 'lavabo', 'douche', 'baignoire', 'evier', 'porte', 'fenetre')
    and coalesce(s.v ->> 'x', '') ~ '^\d{1,5}(\.\d+)?$'
    and coalesce(s.v ->> 'y', '') ~ '^\d{1,5}(\.\d+)?$'
    and coalesce(s.v ->> 'doubt', 'false') in ('true', 'false')
$$;

-- Convention de dessin par page remise en forme : 12 lignes de 160 caractères au plus.
create function app.plan_symbol_legend(p_legend jsonb)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
      'file', (l.v ->> 'file')::integer,
      'page', (l.v ->> 'page')::integer,
      'lines', (
        select coalesce(jsonb_agg(left(btrim(x.t), 160) order by x.n), '[]'::jsonb)
        from jsonb_array_elements_text(
          case when jsonb_typeof(l.v -> 'lines') = 'array' then l.v -> 'lines' else '[]'::jsonb end
        ) with ordinality as x (t, n)
        where x.n <= 12 and btrim(x.t) <> ''
      )
    ) order by l.ord), '[]'::jsonb)
  from jsonb_array_elements(
    case when jsonb_typeof(p_legend) = 'array' then p_legend else '[]'::jsonb end
  ) with ordinality as l (v, ord)
  where l.ord <= 50
    and coalesce(l.v ->> 'file', '') ~ '^(10|[1-9])$'
    and coalesce(l.v ->> 'page', '') ~ '^[1-9]\d{0,2}$'
$$;

-- Symboles d'une lecture des plans : remplacent ceux d'une lecture précédente.
create function public.artisan_import_plan_symbols(
  p_tender_id uuid,
  p_symbols jsonb,
  p_legend jsonb default '[]'::jsonb
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  t public.tenders := app.my_plan_tender(p_tender_id);
  v_symbols jsonb;
begin
  if p_symbols is null or jsonb_typeof(p_symbols) <> 'array'
    or jsonb_array_length(p_symbols) > 3000 then
    raise exception 'Symboles invalides (3 000 au plus).' using errcode = '22023';
  end if;
  v_symbols := app.plan_symbols(p_symbols);
  update public.tenders
  set plan_symbols = v_symbols,
    plan_symbol_legend = app.plan_symbol_legend(coalesce(p_legend, '[]'::jsonb))
  where id = t.id;
  return jsonb_array_length(v_symbols);
end;
$$;

-- Lignes du DPGF : un nombre compté sur le plan garde son origine.
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
      when l.v ->> 'source' in ('plan', 'calcul', 'photo', 'manque', 'saisi', 'estime', 'trace',
        'partiel', 'compte', 'compte_verif')
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

revoke execute on function app.plan_symbols(jsonb) from public, anon;
revoke execute on function app.plan_symbol_legend(jsonb) from public, anon;
revoke execute on function public.artisan_import_plan_symbols(uuid, jsonb, jsonb) from public, anon;
grant execute on function public.artisan_import_plan_symbols(uuid, jsonb, jsonb) to authenticated;
