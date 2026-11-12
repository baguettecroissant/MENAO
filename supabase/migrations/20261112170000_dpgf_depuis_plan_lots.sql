-- DPGF créé depuis les plans, lot 2 : revêtements et création du DPGF (F-140, ADR 0292).
-- L'artisan choisit les revêtements de chaque pièce relevée ; le site calcule les lots et postes
-- par métier (packages/core, plan-takeoff.ts) et les enregistre ici avec l'origine et le détail
-- de chaque quantité. L'export (Excel, PDF) attend que l'artisan ait coché « J'ai vérifié les
-- quantités » : il reste responsable de ses quantités au forfait.

-- ---------------------------------------------------------------------------
-- Colonnes
-- ---------------------------------------------------------------------------
alter table public.tender_rooms
  add column floor text check (floor is null or floor in ('carrelage', 'parquet', 'sol_souple', 'aucun')),
  add column walls text check (walls is null or walls in ('peinture', 'faience', 'aucun')),
  add column ceiling text check (ceiling is null or ceiling in ('peinture', 'plaque', 'aucun')),
  add column tile_height_mm integer check (tile_height_mm is null or tile_height_mm between 100 and 4000);

alter table public.tender_lines
  -- Origine de la quantité d'un DPGF créé depuis les plans : lue sur le plan, calculée, tirée d'une
  -- photo, à compléter, ou saisie ensuite par l'artisan. Null pour un DPGF reçu de l'architecte.
  add column quantity_source text check (quantity_source is null
    or quantity_source in ('plan', 'calcul', 'photo', 'manque', 'saisi')),
  add column quantity_detail text check (quantity_detail is null or char_length(quantity_detail) <= 1000);

alter table public.tenders
  -- « J'ai vérifié les quantités » (DPGF créé depuis les plans) : condition de l'export.
  add column quantities_checked_at timestamptz;

-- ---------------------------------------------------------------------------
-- Relevé corrigé : les revêtements déjà choisis sont gardés
-- ---------------------------------------------------------------------------
create or replace function public.artisan_save_plan_rooms(p_tender_id uuid, p_rooms jsonb, p_counts jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  t public.tenders := app.my_plan_tender(p_tender_id);
  v_rows jsonb;
begin
  select coalesce(jsonb_agg(jsonb_build_object(
      'ord', r.ord, 'level', r.level, 'name', r.name, 'area', r.area_cm2,
      'perimeter', r.perimeter_mm, 'height', r.height_mm, 'wet', r.wet, 'habitable', r.habitable,
      'changed', o.id is null or (o.level, o.name, o.area_cm2, o.perimeter_mm, o.height_mm, o.wet,
        o.habitable) is distinct from (r.level, r.name, r.area_cm2, r.perimeter_mm, r.height_mm,
        r.wet, r.habitable),
      'source', o.source, 'file', o.file_index, 'page', o.page, 'uncertain', o.uncertain,
      'floor', o.floor, 'walls', o.walls, 'ceiling', o.ceiling, 'tile', o.tile_height_mm
    ) order by r.ord), '[]'::jsonb)
  into v_rows
  from app.plan_rooms_rows(p_rooms) r
  left join public.tender_rooms o on o.id = r.room_id and o.tender_id = t.id;

  delete from public.tender_rooms where tender_id = t.id;
  insert into public.tender_rooms (tender_id, position, level, name, area_cm2, perimeter_mm,
    height_mm, wet, habitable, source, file_index, page, uncertain, floor, walls, ceiling,
    tile_height_mm)
  select t.id, (v ->> 'ord')::smallint, v ->> 'level', v ->> 'name', (v ->> 'area')::integer,
    (v ->> 'perimeter')::integer, (v ->> 'height')::integer, (v ->> 'wet')::boolean,
    (v ->> 'habitable')::boolean,
    case when (v ->> 'changed')::boolean then 'saisi' else v ->> 'source' end,
    (v ->> 'file')::smallint, (v ->> 'page')::smallint,
    case when (v ->> 'changed')::boolean then false else (v ->> 'uncertain')::boolean end,
    v ->> 'floor', v ->> 'walls', v ->> 'ceiling', (v ->> 'tile')::integer
  from jsonb_array_elements(v_rows) v;

  update public.tenders
  set plan_counts = app.plan_counts(coalesce(p_counts, '{}'::jsonb))
  where id = t.id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Fonctions
-- ---------------------------------------------------------------------------
-- Revêtements de chaque pièce : [{ id, floor, walls, ceiling, tileHeightMm }].
create function public.artisan_save_plan_finishes(p_tender_id uuid, p_finishes jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  t public.tenders := app.my_plan_tender(p_tender_id);
begin
  if p_finishes is null or jsonb_typeof(p_finishes) <> 'array' or jsonb_array_length(p_finishes) > 200 then
    raise exception 'Revêtements invalides.' using errcode = '22023';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_finishes) f
    where coalesce(f ->> 'floor', '') not in ('carrelage', 'parquet', 'sol_souple', 'aucun')
      or coalesce(f ->> 'walls', '') not in ('peinture', 'faience', 'aucun')
      or coalesce(f ->> 'ceiling', '') not in ('peinture', 'plaque', 'aucun')
      or coalesce(f ->> 'id', '') !~ '^[0-9a-f-]{36}$'
  ) then
    raise exception 'Revêtements invalides.' using errcode = '22023';
  end if;
  update public.tender_rooms r
  set floor = f ->> 'floor',
    walls = f ->> 'walls',
    ceiling = f ->> 'ceiling',
    tile_height_mm = case when f ->> 'walls' = 'faience' then (f ->> 'tileHeightMm')::integer end
  from jsonb_array_elements(p_finishes) f
  where r.tender_id = t.id and r.id = (f ->> 'id')::uuid;
end;
$$;

-- Lots et postes calculés depuis le relevé, remplaçant les précédents. La vérification des
-- quantités est à refaire.
create function public.artisan_import_plan_lines(p_tender_id uuid, p_lines jsonb)
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
    case when l.v ->> 'unitPriceHtCents' is not null then 'devis' end,
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

-- « J'ai vérifié les quantités » (ou retrait de la case).
create function public.artisan_check_tender_quantities(p_tender_id uuid, p_checked boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  t public.tenders := app.my_plan_tender(p_tender_id);
begin
  if p_checked and not exists (select 1 from public.tender_lines where tender_id = t.id) then
    raise exception 'Créez d''abord le DPGF.' using errcode = '22023';
  end if;
  update public.tenders
  set quantities_checked_at = case when p_checked then now() end
  where id = t.id;
end;
$$;

-- Quantités et prix retenus : une quantité d'un DPGF créé depuis les plans, changée par l'artisan,
-- passe en « saisi ».
create or replace function public.artisan_save_tender(p_tender_id uuid, p_vat_rate_bp integer, p_lines jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  t public.tenders := app.my_tender(p_tender_id);
  v_assujetti boolean;
begin
  select a.assujetti_tva into v_assujetti from public.artisans a where a.id = t.artisan_id;
  if p_vat_rate_bp not in (0, 550, 1000, 2000)
    or (v_assujetti is false and p_vat_rate_bp <> 0)
    or (v_assujetti is not false and p_vat_rate_bp = 0) then
    raise exception 'Taux de TVA invalide.' using errcode = '22023';
  end if;
  if jsonb_typeof(p_lines) <> 'array' then
    raise exception 'Lignes invalides.' using errcode = '22023';
  end if;
  update public.tender_lines tl
  set quantity_milli = (l ->> 'quantityMilli')::bigint,
    unit_price_ht_cents = (l ->> 'unitPriceHtCents')::integer,
    price_source = case
      when l ->> 'unitPriceHtCents' is null then null
      when (l ->> 'unitPriceHtCents')::integer is distinct from tl.unit_price_ht_cents then 'manuel'
      else tl.price_source
    end,
    quantity_source = case
      when tl.quantity_source is not null
        and (l ->> 'quantityMilli')::bigint is distinct from tl.quantity_milli then 'saisi'
      else tl.quantity_source
    end
  from jsonb_array_elements(p_lines) l
  where tl.tender_id = t.id and tl.kind = 'poste' and tl.id = (l ->> 'id')::uuid;
  update public.tenders set vat_rate_bp = p_vat_rate_bp where id = t.id;
end;
$$;

-- Données du PDF : pour un DPGF créé depuis les plans, seulement après « J'ai vérifié ».
create or replace function public.tender_document(p_tender_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'tender', jsonb_build_object(
      'id', t.id,
      'name', t.name,
      'client_name', t.client_name,
      'due_on', t.due_on,
      'vat_rate_bp', t.vat_rate_bp,
      'issued_on', (now() at time zone 'Europe/Paris')::date
    ),
    'lines', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'kind', l.kind,
        'lot', l.lot,
        'code', l.code,
        'designation', l.designation,
        'unit_label', l.unit_label,
        'unit', l.unit,
        'architect_quantity_milli', l.architect_quantity_milli,
        'quantity_milli', l.quantity_milli,
        'unit_price_ht_cents', l.unit_price_ht_cents
      ) order by l.position), '[]'::jsonb)
      from public.tender_lines l
      where l.tender_id = t.id
    ),
    'issuer', jsonb_build_object(
      'raison_sociale', a.raison_sociale,
      'nom_commercial', a.nom_commercial,
      'forme_juridique_code', a.forme_juridique_code,
      'siret', a.siret,
      'tva_intracom', a.tva_intracom,
      'assujetti_tva', a.assujetti_tva,
      'adresse_ligne', a.adresse_ligne,
      'code_postal', a.adresse_code_postal,
      'commune', a.adresse_commune,
      'email', u.email,
      'phone', ap.phone,
      'logo_path', a.logo_path,
      'decennale', (
        select jsonb_build_object('assureur', d.assureur, 'numero', d.numero,
          'couverture', d.couverture, 'date_fin', d.date_fin)
        from public.artisan_documents d
        where d.artisan_id = a.id and d.type = 'decennale' and d.status <> 'refuse'
        order by d.status = 'valide' desc
        limit 1
      )
    )
  )
  from public.tenders t
  join public.artisans a on a.id = t.artisan_id
  left join public.profiles ap on ap.user_id = a.user_id
  left join auth.users u on u.id = a.user_id
  where t.id = p_tender_id and t.artisan_id = app.my_manager_artisan_id()
    and (t.source_kind is distinct from 'plan' or t.quantities_checked_at is not null)
$$;

revoke execute on function public.artisan_save_plan_finishes(uuid, jsonb) from public, anon;
revoke execute on function public.artisan_import_plan_lines(uuid, jsonb) from public, anon;
revoke execute on function public.artisan_check_tender_quantities(uuid, boolean) from public, anon;
grant execute on function public.artisan_save_plan_finishes(uuid, jsonb) to authenticated;
grant execute on function public.artisan_import_plan_lines(uuid, jsonb) to authenticated;
grant execute on function public.artisan_check_tender_quantities(uuid, boolean) to authenticated;
