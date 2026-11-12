-- Bibliothèque d'ouvrages et marge, lot 1 (F-141, ADR 0293). Toutes les formules.
-- L'artisan règle son chiffrage (coût et prix de l'heure, coefficient sur les fournitures, seuil
-- d'alerte), tient ses fournitures (prix d'achat) et ses ouvrages composés (ce que voit le client,
-- et une composition privée qui donne le coût). Le prix et la marge sont calculés par
-- packages/core (library.ts). La bibliothèque se remplit avec les lignes de ses anciens devis.
-- Garde-fous : ces tables sont lisibles par l'entreprise seule (patron et chef d'équipe) : ni le
-- client, ni les autres artisans, ni l'équipe MENAO ne voient un coût ou une marge.

-- ---------------------------------------------------------------------------
-- Réglages de chiffrage
-- ---------------------------------------------------------------------------
create table public.artisan_pricing_settings (
  artisan_id uuid primary key references public.artisans (id) on delete cascade,
  hour_cost_cents integer check (hour_cost_cents is null or hour_cost_cents between 0 and 1000000),
  hour_price_cents integer check (hour_price_cents is null or hour_price_cents between 0 and 1000000),
  -- Coefficient sur les fournitures et frais, en points de base (1,30 = 13 000).
  supply_coef_bp integer not null default 10000 check (supply_coef_bp between 5000 and 100000),
  -- Seuil d'alerte de marge (taux de marque) : aucun par défaut, l'artisan fixe le sien.
  margin_alert_bp integer check (margin_alert_bp is null or margin_alert_bp between 0 and 9000),
  price_max_age_months smallint not null default 6 check (price_max_age_months between 1 and 36),
  -- Remplissage initial avec les anciens devis (une seule fois).
  seeded_at timestamptz,
  updated_at timestamptz not null default now()
);
create trigger artisan_pricing_settings_set_updated_at before update on public.artisan_pricing_settings
  for each row execute function app.set_updated_at();

-- ---------------------------------------------------------------------------
-- Fournitures
-- ---------------------------------------------------------------------------
create table public.artisan_supplies (
  id uuid primary key default gen_random_uuid(),
  artisan_id uuid not null references public.artisans (id) on delete cascade,
  designation text not null check (char_length(btrim(designation)) between 1 and 200),
  reference text check (reference is null or char_length(reference) <= 80),
  supplier text check (supplier is null or char_length(supplier) <= 120),
  unit public.quote_unit not null default 'u',
  purchase_price_cents integer not null check (purchase_price_cents between 0 and 100000000),
  price_on date,
  -- Perte (chutes, casse), en points de base : 10 % = 1 000.
  waste_bp smallint not null default 0 check (waste_bp between 0 and 5000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index artisan_supplies_artisan_idx on public.artisan_supplies (artisan_id, lower(designation));
create trigger artisan_supplies_set_updated_at before update on public.artisan_supplies
  for each row execute function app.set_updated_at();

-- ---------------------------------------------------------------------------
-- Ouvrages et composition
-- ---------------------------------------------------------------------------
create table public.artisan_works (
  id uuid primary key default gen_random_uuid(),
  artisan_id uuid not null references public.artisans (id) on delete cascade,
  -- Ce que voit le client.
  designation text not null check (char_length(btrim(designation)) between 1 and 200),
  description text check (description is null or char_length(description) <= 1000),
  unit public.quote_unit not null default 'u',
  line_type public.quote_line_type not null default 'autre',
  vat_rate_bp smallint not null default 2000 check (vat_rate_bp in (0, 550, 1000, 2000)),
  -- Sur le devis : une ligne, ou détaillé en fournitures et main d'œuvre (TODO(legal) : arrêté du
  -- 24 janvier 2017, décompte détaillé pour le dépannage, la réparation et l'entretien).
  detailed boolean not null default false,
  -- Prix fixé à la main (repris d'un devis, ou choisi) ; sinon calculé par la composition.
  manual_price_cents integer check (manual_price_cents is null or manual_price_cents between 0 and 100000000),
  source text not null default 'manuel' check (source in ('devis', 'manuel')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index artisan_works_designation_key on public.artisan_works (artisan_id, lower(designation), unit);
create trigger artisan_works_set_updated_at before update on public.artisan_works
  for each row execute function app.set_updated_at();

create table public.artisan_work_components (
  id uuid primary key default gen_random_uuid(),
  work_id uuid not null references public.artisan_works (id) on delete cascade,
  position smallint not null check (position between 1 and 100),
  kind text not null check (kind in ('fourniture', 'heures', 'frais')),
  -- Une fourniture utilisée ne peut pas être supprimée (le coût de l'ouvrage deviendrait faux).
  supply_id uuid references public.artisan_supplies (id) on delete restrict,
  label text check (label is null or char_length(label) <= 200),
  quantity_milli integer not null check (quantity_milli between 1 and 100000000),
  -- Coût unitaire d'un autre frais (location, évacuation, sous-traitance).
  cost_cents integer check (cost_cents is null or cost_cents between 0 and 100000000),
  unique (work_id, position),
  check (
    (kind = 'fourniture' and supply_id is not null and cost_cents is null)
    or (kind = 'heures' and supply_id is null and cost_cents is null)
    or (kind = 'frais' and supply_id is null and cost_cents is not null
        and nullif(btrim(coalesce(label, '')), '') is not null)
  )
);
create index artisan_work_components_supply_idx on public.artisan_work_components (supply_id);

-- ---------------------------------------------------------------------------
-- RLS : l'entreprise seule (patron et chef d'équipe, droit « money »)
-- ---------------------------------------------------------------------------
alter table public.artisan_pricing_settings enable row level security;
alter table public.artisan_supplies enable row level security;
alter table public.artisan_works enable row level security;
alter table public.artisan_work_components enable row level security;
revoke all on public.artisan_pricing_settings, public.artisan_supplies, public.artisan_works,
  public.artisan_work_components from anon, authenticated;
grant select, insert, update, delete on public.artisan_pricing_settings, public.artisan_supplies
  to authenticated;
-- Ouvrages et composition : lecture directe, écritures par artisan_save_work (atomique).
grant select, delete on public.artisan_works to authenticated;
grant select on public.artisan_work_components to authenticated;

create policy "artisan_pricing_settings : l'entreprise seule"
  on public.artisan_pricing_settings for all to authenticated
  using (artisan_id = (select app.my_manager_artisan_id()))
  with check (artisan_id = (select app.my_manager_artisan_id()));
create policy "artisan_supplies : l'entreprise seule"
  on public.artisan_supplies for all to authenticated
  using (artisan_id = (select app.my_manager_artisan_id()))
  with check (artisan_id = (select app.my_manager_artisan_id()));
create policy "artisan_works : lecture par l'entreprise"
  on public.artisan_works for select to authenticated
  using (artisan_id = (select app.my_manager_artisan_id()));
create policy "artisan_works : suppression par l'entreprise"
  on public.artisan_works for delete to authenticated
  using (artisan_id = (select app.my_manager_artisan_id()));
create policy "artisan_work_components : lecture par l'entreprise"
  on public.artisan_work_components for select to authenticated
  using (exists (
    select 1 from public.artisan_works w
    where w.id = artisan_work_components.work_id
      and w.artisan_id = (select app.my_manager_artisan_id())
  ));

-- ---------------------------------------------------------------------------
-- Fonctions
-- ---------------------------------------------------------------------------
-- Entreprise de l'utilisateur (patron ou chef d'équipe), sinon erreur.
create function app.library_artisan()
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_artisan uuid := app.my_manager_artisan_id();
begin
  if v_artisan is null then
    raise exception 'Réservé à l''entreprise (patron ou chef d''équipe).' using errcode = '42501';
  end if;
  return v_artisan;
end;
$$;
revoke execute on function app.library_artisan() from public, anon;
grant execute on function app.library_artisan() to authenticated;

-- Ouvrage (création sans p_work_id) et sa composition, remplacée en entier.
-- p_work : { designation, description, unit, lineType, vatRateBp, detailed, manualPriceCents }.
-- p_components : [{ kind, supplyId, label, quantityMilli, costCents }], dans l'ordre affiché.
create function public.artisan_save_work(p_work jsonb, p_components jsonb, p_work_id uuid default null)
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
        vat_rate_bp, detailed, manual_price_cents, source)
      values (v_artisan, btrim(p_work ->> 'designation'),
        nullif(btrim(coalesce(p_work ->> 'description', '')), ''),
        coalesce((p_work ->> 'unit')::public.quote_unit, 'u'),
        coalesce((p_work ->> 'lineType')::public.quote_line_type, 'autre'),
        coalesce((p_work ->> 'vatRateBp')::smallint, 2000),
        coalesce((p_work ->> 'detailed')::boolean, false),
        (p_work ->> 'manualPriceCents')::integer, 'manuel')
      returning id into v_id;
    else
      update public.artisan_works
      set designation = btrim(p_work ->> 'designation'),
        description = nullif(btrim(coalesce(p_work ->> 'description', '')), ''),
        unit = coalesce((p_work ->> 'unit')::public.quote_unit, unit),
        line_type = coalesce((p_work ->> 'lineType')::public.quote_line_type, line_type),
        vat_rate_bp = coalesce((p_work ->> 'vatRateBp')::smallint, vat_rate_bp),
        detailed = coalesce((p_work ->> 'detailed')::boolean, detailed),
        manual_price_cents = (p_work ->> 'manualPriceCents')::integer
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

-- Remplissage initial (une seule fois) : chaque ligne déjà utilisée dans les devis de l'entreprise
-- devient un ouvrage, sans doublon et au dernier prix. Renvoie le nombre d'ouvrages créés.
create function public.artisan_seed_library()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_artisan uuid := app.library_artisan();
  v_count integer := 0;
begin
  insert into public.artisan_pricing_settings (artisan_id) values (v_artisan)
  on conflict (artisan_id) do nothing;
  if (select seeded_at from public.artisan_pricing_settings where artisan_id = v_artisan) is not null then
    return 0;
  end if;
  insert into public.artisan_works (artisan_id, designation, description, unit, line_type,
    vat_rate_bp, manual_price_cents, source)
  select v_artisan, s.designation, s.description, s.unit, s.type, s.vat_rate_bp,
    s.unit_price_ht_cents, 'devis'
  from (
    select distinct on (lower(btrim(l.designation)), l.unit) btrim(l.designation) as designation,
      l.description, l.unit, l.type, l.vat_rate_bp, l.unit_price_ht_cents
    from public.quote_lines l
    join public.quotes q on q.id = l.quote_id
    where q.artisan_id = v_artisan and l.unit_price_ht_cents > 0
    order by lower(btrim(l.designation)), l.unit, l.updated_at desc
    limit 2000
  ) s
  on conflict do nothing;
  get diagnostics v_count = row_count;
  update public.artisan_pricing_settings set seeded_at = now() where artisan_id = v_artisan;
  return v_count;
end;
$$;

revoke execute on function public.artisan_save_work(jsonb, jsonb, uuid) from public, anon;
revoke execute on function public.artisan_seed_library() from public, anon;
grant execute on function public.artisan_save_work(jsonb, jsonb, uuid) to authenticated;
grant execute on function public.artisan_seed_library() to authenticated;
