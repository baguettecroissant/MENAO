-- Bibliothèque MENAO, PR 2 (F-147, ADR 0307) : prix retenu sur les devis quand un ouvrage n'a qu'une
-- fourchette indicative (prix publics des fournitures) : le bas, le milieu (par défaut) ou le haut.
-- Un prix fixé à la main reste prioritaire.
alter table public.artisan_works
  add column price_pick text not null default 'milieu' check (price_pick in ('bas', 'milieu', 'haut'));

-- Enregistrement d'un ouvrage : avec le prix retenu dans la fourchette (pricePick), le reste inchangé.
create or replace function public.artisan_save_work(p_work jsonb, p_components jsonb, p_work_id uuid default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_artisan uuid := app.library_artisan();
  v_id uuid;
begin
  if nullif(btrim(coalesce(p_work ->> 'designation', '')), '') is null then
    raise exception 'Indiquez la désignation de l''ouvrage.' using errcode = '22023';
  end if;
  if p_components is null or jsonb_typeof(p_components) <> 'array'
    or jsonb_array_length(p_components) > 100 then
    raise exception 'Composition invalide (100 éléments au plus).' using errcode = '22023';
  end if;
  if coalesce(p_work ->> 'pricePick', 'milieu') not in ('bas', 'milieu', 'haut') then
    raise exception 'Prix retenu invalide.' using errcode = '22023';
  end if;
  -- Fournitures de cette entreprise seulement.
  if exists (
    select 1 from jsonb_array_elements(p_components) c
    where c ->> 'supplyId' is not null and not exists (
      select 1 from public.artisan_supplies s
      where s.id::text = c ->> 'supplyId' and s.artisan_id = v_artisan
    )
  ) then
    raise exception 'Fourniture introuvable.' using errcode = '22023';
  end if;

  begin
    if p_work_id is null then
      insert into public.artisan_works (artisan_id, designation, description, unit, line_type,
        vat_rate_bp, detailed, manual_price_cents, source, price_pick)
      values (v_artisan, btrim(p_work ->> 'designation'),
        nullif(btrim(coalesce(p_work ->> 'description', '')), ''),
        coalesce((p_work ->> 'unit')::public.quote_unit, 'u'),
        coalesce((p_work ->> 'lineType')::public.quote_line_type, 'autre'),
        coalesce((p_work ->> 'vatRateBp')::smallint, 2000),
        coalesce((p_work ->> 'detailed')::boolean, false),
        (p_work ->> 'manualPriceCents')::integer, 'manuel',
        coalesce(p_work ->> 'pricePick', 'milieu'))
      returning id into v_id;
    else
      update public.artisan_works
      set designation = btrim(p_work ->> 'designation'),
        description = nullif(btrim(coalesce(p_work ->> 'description', '')), ''),
        unit = coalesce((p_work ->> 'unit')::public.quote_unit, unit),
        line_type = coalesce((p_work ->> 'lineType')::public.quote_line_type, line_type),
        vat_rate_bp = coalesce((p_work ->> 'vatRateBp')::smallint, vat_rate_bp),
        detailed = coalesce((p_work ->> 'detailed')::boolean, detailed),
        manual_price_cents = (p_work ->> 'manualPriceCents')::integer,
        price_pick = coalesce(p_work ->> 'pricePick', price_pick)
      where id = p_work_id and artisan_id = v_artisan
      returning id into v_id;
      if v_id is null then
        raise exception 'Ouvrage introuvable.' using errcode = '22023';
      end if;
    end if;
  exception when unique_violation then
    raise exception 'Un ouvrage porte déjà cette désignation avec cette unité.' using errcode = '22023';
  end;

  delete from public.artisan_work_components where work_id = v_id;
  insert into public.artisan_work_components (work_id, position, kind, supply_id, label,
    quantity_milli, cost_cents)
  select v_id, c.ord::smallint, c.v ->> 'kind', (c.v ->> 'supplyId')::uuid,
    left(nullif(btrim(coalesce(c.v ->> 'label', '')), ''), 200),
    (c.v ->> 'quantityMilli')::integer, (c.v ->> 'costCents')::integer
  from jsonb_array_elements(p_components) with ordinality as c (v, ord);
  return v_id;
end;
$$;
