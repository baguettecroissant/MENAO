-- Portes et appareils sanitaires comptés sur les plans (F-159, lot 7, ADR 0339).
-- La lecture des symboles compte aussi les portes intérieures, les menuiseries extérieures et les
-- appareils sanitaires (WC, lavabos, douches, baignoires, éviers). Ces comptes remplissent les
-- cases restées vides du relevé (« Aussi relevé sur les plans ») ; un compte déjà lu ou saisi
-- n'est jamais remplacé.

drop function public.artisan_import_plan_symbols(uuid, jsonb, jsonb);
create function public.artisan_import_plan_symbols(
  p_tender_id uuid,
  p_symbols jsonb,
  p_legend jsonb default '[]'::jsonb,
  p_counts jsonb default '{}'::jsonb
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
    plan_counts = app.plan_counts(coalesce(t.plan_counts, '{}'::jsonb) || v_added)
  where id = t.id;
  return jsonb_array_length(v_symbols);
end;
$$;

revoke execute on function public.artisan_import_plan_symbols(uuid, jsonb, jsonb, jsonb) from public, anon;
grant execute on function public.artisan_import_plan_symbols(uuid, jsonb, jsonb, jsonb) to authenticated;
