-- F-19 (phase 3c) — devis : brouillon rattaché au chantier, lignes typées (matériel, main d'œuvre,
-- autre), totaux en centimes calculés en base avec les règles de packages/core/src/quote.ts,
-- suggestions tirées des lignes déjà saisies par l'artisan. ADR 0018.

create type public.quote_status as enum (
  'brouillon', 'envoye', 'signe', 'refuse', 'revision_demandee', 'remplace'
);
create type public.quote_line_type as enum ('materiel', 'main_oeuvre', 'autre');
create type public.quote_unit as enum ('u', 'h', 'jour', 'm', 'ml', 'm2', 'm3', 'kg', 'l', 'forfait');

create table public.quotes (
  id uuid primary key default gen_random_uuid(),
  chantier_id uuid not null references public.chantiers (id) on delete cascade,
  artisan_id uuid not null references public.artisans (id) on delete cascade,
  version smallint not null default 1 check (version between 1 and 99),
  status public.quote_status not null default 'brouillon',
  -- Attribué à la génération du devis (F-20) par une séquence sans trou ni doublon.
  numero text unique check (numero ~ '^DEVIS-[0-9]{4}-[0-9]{4,}(-v[0-9]{1,2})?$'),
  total_ht_cents bigint not null default 0 check (total_ht_cents >= 0),
  total_tva_cents bigint not null default 0 check (total_tva_cents >= 0),
  total_ttc_cents bigint not null default 0 check (total_ttc_cents = total_ht_cents + total_tva_cents),
  -- Ventilation par taux : [{ "rateBp", "baseHtCents", "tvaCents" }], du plus petit taux au plus grand.
  vat_breakdown jsonb not null default '[]'::jsonb check (jsonb_typeof(vat_breakdown) = 'array'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index quotes_un_brouillon_par_chantier on public.quotes (chantier_id)
  where status = 'brouillon';
create index quotes_chantier_idx on public.quotes (chantier_id);
create index quotes_artisan_status_idx on public.quotes (artisan_id, status);
create trigger quotes_set_updated_at before update on public.quotes
  for each row execute function app.set_updated_at();
alter table public.quotes enable row level security;
-- Écriture par les fonctions ci-dessous uniquement.
revoke all on public.quotes from anon, authenticated;
grant select on public.quotes to authenticated;

-- Le brouillon reste privé à l'artisan ; le particulier voit le devis une fois envoyé.
create policy "quotes : lecture par l'artisan, le particulier (hors brouillon) ou l'équipe"
  on public.quotes for select to authenticated
  using (
    artisan_id = (select app.my_artisan_id())
    or (select app.is_staff())
    or (
      status <> 'brouillon'
      and exists (
        select 1 from public.chantiers c
        where c.id = chantier_id and c.particulier_id = (select auth.uid())
      )
    )
  );

create table public.quote_lines (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.quotes (id) on delete cascade,
  position smallint not null check (position between 1 and 200),
  type public.quote_line_type not null,
  designation text not null check (char_length(designation) between 1 and 200),
  description text check (char_length(description) <= 1000),
  -- Quantité en millièmes (2,5 h = 2500), prix et totaux en centimes (CLAUDE.md règle 5).
  quantity_milli integer not null check (quantity_milli between 1 and 100000000),
  unit public.quote_unit not null,
  unit_price_ht_cents integer not null check (unit_price_ht_cents between 0 and 100000000),
  vat_rate_bp smallint not null check (vat_rate_bp in (0, 550, 1000, 2000)),
  total_ht_cents bigint not null check (total_ht_cents between 0 and 1000000000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (quote_id, position)
);
create index quote_lines_quote_idx on public.quote_lines (quote_id);
create trigger quote_lines_set_updated_at before update on public.quote_lines
  for each row execute function app.set_updated_at();
alter table public.quote_lines enable row level security;
revoke all on public.quote_lines from anon, authenticated;
grant select on public.quote_lines to authenticated;

create policy "quote_lines : mêmes lecteurs que le devis"
  on public.quote_lines for select to authenticated
  using (exists (select 1 from public.quotes q where q.id = quote_id));

-- Les lignes d'un devis envoyé ne changent plus (une modification crée une nouvelle version).
create function app.quote_lines_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_status public.quote_status;
begin
  select status into v_status from public.quotes
  where id = case when tg_op = 'DELETE' then old.quote_id else new.quote_id end;
  -- Suppression du devis lui-même (cascade) : autorisée.
  if v_status is not null and v_status <> 'brouillon' and pg_trigger_depth() < 2 then
    raise exception 'Les lignes d''un devis envoyé ne peuvent plus changer' using errcode = '42501';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;
create trigger quote_lines_guard before insert or update or delete on public.quote_lines
  for each row execute function app.quote_lines_guard();

-- ---------------------------------------------------------------------------
-- Calculs (mêmes règles que packages/core/src/quote.ts) : total HT de la ligne au centime le plus
-- proche (moitié vers le haut), TVA par taux sur la somme hors taxe.
-- TODO(legal) : règle d'arrondi à faire valider par l'expert-comptable.
-- ---------------------------------------------------------------------------
create function app.quote_line_total(p_quantity_milli integer, p_unit_price_ht_cents integer)
returns bigint
language sql
immutable
set search_path = ''
as $$
  select round(p_quantity_milli::numeric * p_unit_price_ht_cents / 1000)::bigint
$$;

create function app.refresh_quote_totals(p_quote_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  with bases as (
    select vat_rate_bp, sum(total_ht_cents) as base
    from public.quote_lines
    where quote_id = p_quote_id
    group by vat_rate_bp
  ),
  vat as (
    select vat_rate_bp, base, round(base::numeric * vat_rate_bp / 10000)::bigint as tva from bases
  )
  update public.quotes set
    total_ht_cents = coalesce((select sum(base) from vat), 0),
    total_tva_cents = coalesce((select sum(tva) from vat), 0),
    total_ttc_cents = coalesce((select sum(base + tva) from vat), 0),
    vat_breakdown = coalesce(
      (select jsonb_agg(jsonb_build_object('rateBp', vat_rate_bp, 'baseHtCents', base, 'tvaCents', tva)
                        order by vat_rate_bp) from vat),
      '[]'::jsonb)
  where id = p_quote_id
$$;
revoke execute on function app.refresh_quote_totals(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Enregistrement du brouillon (F-19) : remplace toutes les lignes (statut « Enregistré et à
-- jour » de la maquette). Un brouillon par chantier, créé au premier enregistrement.
-- ---------------------------------------------------------------------------
create function public.artisan_save_quote_draft(p_chantier_id uuid, p_lines jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_chantier public.chantiers;
  v_assujetti boolean;
  v_quote uuid;
begin
  select * into v_chantier from public.chantiers
  where id = p_chantier_id and artisan_id = app.my_artisan_id()
  for update;
  if not found then
    raise exception 'Chantier introuvable' using errcode = '42501';
  end if;
  if v_chantier.status not in ('rdv_planifie', 'devis_en_revision') then
    raise exception 'Ce chantier n''attend pas de devis' using errcode = '22023';
  end if;
  if p_lines is null or jsonb_typeof(p_lines) <> 'array' then
    raise exception 'Lignes du devis invalides' using errcode = '22023';
  end if;
  if jsonb_array_length(p_lines) > 200 then
    raise exception 'Un devis compte 200 lignes au plus' using errcode = '22023';
  end if;
  select coalesce(assujetti_tva, true) into v_assujetti from public.artisans where id = v_chantier.artisan_id;

  select id into v_quote from public.quotes
  where chantier_id = p_chantier_id and status = 'brouillon'
  for update;
  if not found then
    insert into public.quotes (chantier_id, artisan_id, version)
    values (p_chantier_id, v_chantier.artisan_id,
      coalesce((select max(version) from public.quotes where chantier_id = p_chantier_id), 0) + 1)
    returning id into v_quote;
  end if;

  delete from public.quote_lines where quote_id = v_quote;
  insert into public.quote_lines (quote_id, position, type, designation, description, quantity_milli,
    unit, unit_price_ht_cents, vat_rate_bp, total_ht_cents)
  select v_quote, l.ord::smallint,
    (l.value ->> 'type')::public.quote_line_type,
    btrim(l.value ->> 'designation'),
    nullif(btrim(l.value ->> 'description'), ''),
    (l.value ->> 'quantityMilli')::integer,
    (l.value ->> 'unit')::public.quote_unit,
    (l.value ->> 'unitPriceHtCents')::integer,
    (l.value ->> 'vatRateBp')::smallint,
    app.quote_line_total((l.value ->> 'quantityMilli')::integer, (l.value ->> 'unitPriceHtCents')::integer)
  from jsonb_array_elements(p_lines) with ordinality as l(value, ord);

  -- Franchise en base (art. 293 B du CGI) : 0 % seulement ; sinon 5,5 %, 10 % ou 20 %.
  if exists (
    select 1 from public.quote_lines
    where quote_id = v_quote and (vat_rate_bp = 0) = v_assujetti
  ) then
    raise exception 'Taux de TVA incompatible avec votre régime de TVA' using errcode = '22023';
  end if;

  perform app.refresh_quote_totals(v_quote);
  return v_quote;
end;
$$;
revoke execute on function public.artisan_save_quote_draft(uuid, jsonb) from public, anon;
grant execute on function public.artisan_save_quote_draft(uuid, jsonb) to authenticated;

-- « Rechercher l'article » (F-19, catalogue personnel, décision D10) : lignes déjà saisies par
-- l'artisan, la plus récente de chaque désignation. Aucun prix fournisseur.
create function public.artisan_previous_lines(p_query text)
returns table (
  type public.quote_line_type,
  designation text,
  description text,
  unit public.quote_unit,
  unit_price_ht_cents integer,
  vat_rate_bp smallint
)
language sql
stable
security definer
set search_path = ''
as $$
  select s.type, s.designation, s.description, s.unit, s.unit_price_ht_cents, s.vat_rate_bp
  from (
    select distinct on (lower(l.designation)) l.type, l.designation, l.description, l.unit,
      l.unit_price_ht_cents, l.vat_rate_bp, l.updated_at
    from public.quote_lines l
    join public.quotes q on q.id = l.quote_id
    where q.artisan_id = app.my_artisan_id()
      and l.designation ilike '%' || replace(replace(replace(left(coalesce(p_query, ''), 100),
        '\', '\\'), '%', '\%'), '_', '\_') || '%'
    order by lower(l.designation), l.updated_at desc
  ) s
  order by s.updated_at desc
  limit 8
$$;
revoke execute on function public.artisan_previous_lines(text) from public, anon;
grant execute on function public.artisan_previous_lines(text) to authenticated;

-- Liste « Devis » de l'artisan (maquette « Devis à envoyer / Devis envoyés »).
create function public.artisan_quotes()
returns table (
  quote_id uuid,
  chantier_id uuid,
  status public.quote_status,
  version smallint,
  numero text,
  total_ttc_cents bigint,
  line_count integer,
  updated_at timestamptz,
  title text,
  client_name text,
  appointment_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select q.id, q.chantier_id, q.status, q.version, q.numero, q.total_ttc_cents,
    (select count(*)::int from public.quote_lines l where l.quote_id = q.id),
    q.updated_at, c.title, nullif(concat_ws(' ', cp.first_name, cp.last_name), ''),
    (select a.starts_at from public.appointments a where a.chantier_id = c.id
     order by a.created_at desc limit 1)
  from public.quotes q
  join public.chantiers c on c.id = q.chantier_id
  left join public.profiles cp on cp.user_id = c.particulier_id
  where q.artisan_id = app.my_artisan_id()
  order by q.updated_at desc
$$;
revoke execute on function public.artisan_quotes() from public, anon;
grant execute on function public.artisan_quotes() to authenticated;
