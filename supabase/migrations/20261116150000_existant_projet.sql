-- Existant et projet (F-159, ADR 0340).
-- La lecture des notes donne le type de chaque plan (« démolition », « cloisons et menuiseries »…).
-- Un plan de l'existant sert aux déposes, pas aux surfaces, aux tracés ni aux comptes. Le type et
-- le rôle de chaque plan lu sont gardés pour le résumé : [{ file, page, label, role }].

alter table public.tenders
  add column plan_page_labels jsonb not null default '[]'::jsonb
    check (jsonb_typeof(plan_page_labels) = 'array' and jsonb_array_length(plan_page_labels) <= 100);

-- Types de plans remis en forme : 80 caractères au plus, rôle connu.
create function app.plan_page_labels(p_labels jsonb)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
      'file', (l.v ->> 'file')::integer,
      'page', (l.v ->> 'page')::integer,
      'label', left(btrim(coalesce(l.v ->> 'label', '')), 80),
      'role', l.v ->> 'role'
    ) order by l.ord), '[]'::jsonb)
  from jsonb_array_elements(
    case when jsonb_typeof(p_labels) = 'array' then p_labels else '[]'::jsonb end
  ) with ordinality as l (v, ord)
  where l.ord <= 100
    and coalesce(l.v ->> 'file', '') ~ '^(10|[1-9])$'
    and coalesce(l.v ->> 'page', '') ~ '^[1-9]\d{0,2}$'
    and l.v ->> 'role' in ('existant', 'projet', 'inconnu')
$$;

drop function public.artisan_import_plan_symbols(uuid, jsonb, jsonb, jsonb);
create function public.artisan_import_plan_symbols(
  p_tender_id uuid,
  p_symbols jsonb,
  p_legend jsonb default '[]'::jsonb,
  p_counts jsonb default '{}'::jsonb,
  p_page_labels jsonb default '[]'::jsonb
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  t public.tenders := app.my_plan_tender(p_tender_id);
  v_symbols jsonb;
  v_added jsonb;
begin
  if p_symbols is null or jsonb_typeof(p_symbols) <> 'array'
    or jsonb_array_length(p_symbols) > 3000 then
    raise exception 'Symboles invalides (3 000 au plus).' using errcode = '22023';
  end if;
  v_symbols := app.plan_symbols(p_symbols);
  -- Comptes des symboles, seulement là où le relevé n'a rien.
  select coalesce(jsonb_object_agg(e.key, e.value), '{}'::jsonb) into v_added
  from jsonb_each(app.plan_counts(
    case when jsonb_typeof(p_counts) = 'object' then p_counts else '{}'::jsonb end
  )) e
  where jsonb_typeof(e.value) = 'number'
    and (e.value)::text::integer > 0
    and coalesce(jsonb_typeof(t.plan_counts -> e.key), 'null') = 'null';
  update public.tenders
  set plan_symbols = v_symbols,
    plan_symbol_legend = app.plan_symbol_legend(coalesce(p_legend, '[]'::jsonb)),
    plan_counts = app.plan_counts(coalesce(t.plan_counts, '{}'::jsonb) || v_added),
    plan_page_labels = app.plan_page_labels(coalesce(p_page_labels, '[]'::jsonb))
  where id = t.id;
  return jsonb_array_length(v_symbols);
end;
$$;

revoke execute on function app.plan_page_labels(jsonb) from public, anon;
revoke execute on function public.artisan_import_plan_symbols(uuid, jsonb, jsonb, jsonb, jsonb) from public, anon;
grant execute on function public.artisan_import_plan_symbols(uuid, jsonb, jsonb, jsonb, jsonb) to authenticated;
