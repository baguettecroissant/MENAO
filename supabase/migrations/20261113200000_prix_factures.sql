-- Prix d'achat repérés dans les factures (F-149, ADR 0311, maquette lot 43) : les lignes des
-- factures fournisseurs déjà lues dans « Dépenses » sont rapprochées des fournitures par
-- packages/core (référence, sinon désignation et unité). L'artisan coche ; la mise à jour se fait
-- ici d'un bloc, avec les prix relus sur la facture (jamais ceux envoyés par le navigateur).
-- Les lignes passées en revue (mises à jour, ajoutées ou laissées) ne sont plus proposées.

-- ---------------------------------------------------------------------------
-- Lignes de facture passées en revue
-- ---------------------------------------------------------------------------
create table public.library_invoice_reviews (
  expense_line_id uuid primary key references public.expense_lines (id) on delete cascade,
  artisan_id uuid not null references public.artisans (id) on delete cascade,
  reviewed_at timestamptz not null default now()
);
create index library_invoice_reviews_artisan_idx on public.library_invoice_reviews (artisan_id);

alter table public.library_invoice_reviews enable row level security;
revoke all on public.library_invoice_reviews from anon, authenticated;
grant select on public.library_invoice_reviews to authenticated;
-- Lecture par l'entreprise (patron et chef d'équipe) ; écriture par la fonction ci-dessous.
create policy "library_invoice_reviews : lecture par l'entreprise"
  on public.library_invoice_reviews for select to authenticated
  using (artisan_id = (select app.my_manager_artisan_id()));

-- ---------------------------------------------------------------------------
-- Mise à jour d'un bloc
-- ---------------------------------------------------------------------------
-- p_updates : [{supplyId, lineId}] (prix d'achat repris de la ligne, daté de la facture) ;
-- p_add : lignes à ajouter comme fournitures ; p_seen : lignes affichées, toutes marquées comme
-- passées en revue (y compris celles laissées). 500 de chaque au plus. Rend {updated, added}.
create function public.artisan_apply_invoice_prices(p_updates jsonb, p_add uuid[], p_seen uuid[])
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_artisan uuid := app.library_artisan();
  v_updated integer := 0;
  v_added integer := 0;
  v_count integer;
begin
  if p_updates is null or jsonb_typeof(p_updates) <> 'array' or jsonb_array_length(p_updates) > 500
    or coalesce(cardinality(p_add), 0) > 500 or coalesce(cardinality(p_seen), 0) > 500 then
    raise exception 'Mise à jour invalide.' using errcode = '22023';
  end if;

  drop table if exists pg_temp.invoice_updates;
  create temporary table invoice_updates on commit drop as
  select distinct on ((u ->> 'supplyId')::uuid)
    (u ->> 'supplyId')::uuid as supply_id,
    (u ->> 'lineId')::uuid as line_id
  from jsonb_array_elements(p_updates) as u;

  -- Chaque fourniture et chaque ligne doivent appartenir à l'entreprise, la ligne avoir un prix.
  select count(*) into v_count
  from pg_temp.invoice_updates i
  join public.artisan_supplies s on s.id = i.supply_id and s.artisan_id = v_artisan
  join public.expense_lines l on l.id = i.line_id and l.unit_price_ht_cents is not null
  join public.expenses e on e.id = l.expense_id and e.artisan_id = v_artisan;
  if v_count <> (select count(*) from pg_temp.invoice_updates) then
    raise exception 'Fourniture ou facture inconnue.' using errcode = '22023';
  end if;
  if exists (
    select 1 from unnest(coalesce(p_add, '{}')) as a (line_id)
    where not exists (
      select 1 from public.expense_lines l
      join public.expenses e on e.id = l.expense_id and e.artisan_id = v_artisan
      where l.id = a.line_id and l.unit is not null and l.unit_price_ht_cents is not null
    )
  ) then
    raise exception 'Fourniture ou facture inconnue.' using errcode = '22023';
  end if;

  update public.artisan_supplies s
  set purchase_price_cents = l.unit_price_ht_cents,
    price_on = e.issued_on,
    reference = coalesce(s.reference, l.reference),
    supplier = coalesce(s.supplier, e.supplier_name)
  from pg_temp.invoice_updates i
  join public.expense_lines l on l.id = i.line_id
  join public.expenses e on e.id = l.expense_id
  where s.id = i.supply_id;
  get diagnostics v_updated = row_count;

  -- Ajouts : une fois par désignation et unité, sans doublon d'une fourniture existante.
  insert into public.artisan_supplies (artisan_id, designation, reference, supplier, unit,
    purchase_price_cents, price_on)
  select distinct on (lower(btrim(l.designation)), l.unit)
    v_artisan, btrim(l.designation), l.reference, e.supplier_name, l.unit, l.unit_price_ht_cents,
    e.issued_on
  from unnest(p_add) as a (line_id)
  join public.expense_lines l on l.id = a.line_id
  join public.expenses e on e.id = l.expense_id
  where not exists (
    select 1 from public.artisan_supplies s
    where s.artisan_id = v_artisan and lower(s.designation) = lower(btrim(l.designation))
      and s.unit = l.unit
  )
  order by lower(btrim(l.designation)), l.unit, e.issued_on desc;
  get diagnostics v_added = row_count;

  -- Passées en revue : affichées, mises à jour ou ajoutées (lignes de l'entreprise seulement).
  insert into public.library_invoice_reviews (expense_line_id, artisan_id)
  select l.id, v_artisan
  from public.expense_lines l
  join public.expenses e on e.id = l.expense_id and e.artisan_id = v_artisan
  where l.id = any (coalesce(p_seen, '{}') || coalesce(p_add, '{}')
    || array(select line_id from pg_temp.invoice_updates))
  on conflict (expense_line_id) do nothing;

  return jsonb_build_object('updated', v_updated, 'added', v_added);
end;
$$;
revoke execute on function public.artisan_apply_invoice_prices(jsonb, uuid[], uuid[]) from public, anon;
grant execute on function public.artisan_apply_invoice_prices(jsonb, uuid[], uuid[]) to authenticated;
