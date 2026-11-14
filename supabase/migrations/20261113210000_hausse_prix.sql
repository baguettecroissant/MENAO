-- Augmenter ses prix en un geste (F-149, ADR 0312, maquette lot 43) : hausse en pourcentage sur
-- les ouvrages à prix fixé à la main et/ou les prix d'achat des fournitures, arrondie comme dans
-- packages/core (raisePrice). Chaque hausse garde les prix d'avant : la dernière est annulable
-- pendant 24 h ; un prix modifié depuis n'est pas écrasé par l'annulation.

create table public.library_price_raises (
  id uuid primary key default gen_random_uuid(),
  artisan_id uuid not null references public.artisans (id) on delete cascade,
  rate_bp integer not null check (rate_bp between 10 and 3000),
  rounding text not null check (rounding in ('centime', 'dix', 'euro')),
  on_works boolean not null,
  on_supplies boolean not null,
  works_count integer not null default 0,
  supplies_count integer not null default 0,
  -- [{k: 'w'|'s', id, b: prix d'avant, a: prix d'après, d: date du prix d'achat d'avant}]
  previous jsonb not null default '[]',
  -- Heure réelle (deux hausses dans une même transaction restent ordonnées).
  created_at timestamptz not null default clock_timestamp(),
  undone_at timestamptz
);
create index library_price_raises_artisan_idx on public.library_price_raises (artisan_id, created_at desc);

alter table public.library_price_raises enable row level security;
revoke all on public.library_price_raises from anon, authenticated;
grant select on public.library_price_raises to authenticated;
-- Lecture par l'entreprise (patron et chef d'équipe) ; écriture par les fonctions ci-dessous.
create policy "library_price_raises : lecture par l'entreprise"
  on public.library_price_raises for select to authenticated
  using (artisan_id = (select app.my_manager_artisan_id()));

-- Prix augmenté : arrondi au plus proche (moitié vers le haut), jamais sous le prix de départ.
create function app.raise_price(p_cents integer, p_bp integer, p_step integer)
returns integer
language sql
immutable
set search_path = ''
as $$
  select greatest(
    (((2 * p_cents::bigint * (10000 + p_bp) + 10000 * p_step) / (20000 * p_step)) * p_step)::integer,
    p_cents
  );
$$;

-- Hausse d'un bloc. Rend {raiseId, works, supplies} (nombre de prix changés).
create function public.artisan_raise_prices(
  p_rate_bp integer, p_rounding text, p_works boolean, p_supplies boolean
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_artisan uuid := app.library_artisan();
  v_step integer;
  v_previous jsonb := '[]';
  v_works integer := 0;
  v_supplies integer := 0;
  v_id uuid;
begin
  if p_rate_bp is null or p_rate_bp not between 10 and 3000 then
    raise exception 'Hausse invalide (de 0,1 à 30 %%).' using errcode = '22023';
  end if;
  v_step := case p_rounding when 'centime' then 1 when 'dix' then 10 when 'euro' then 100 end;
  if v_step is null or not (coalesce(p_works, false) or coalesce(p_supplies, false)) then
    raise exception 'Hausse invalide (de 0,1 à 30 %%).' using errcode = '22023';
  end if;

  if p_works then
    with changed as (
      update public.artisan_works w
      set manual_price_cents = app.raise_price(w.manual_price_cents, p_rate_bp, v_step)
      from public.artisan_works old
      where old.id = w.id and w.artisan_id = v_artisan and w.manual_price_cents is not null
        and app.raise_price(w.manual_price_cents, p_rate_bp, v_step) <> w.manual_price_cents
      returning w.id, old.manual_price_cents as before, w.manual_price_cents as after
    )
    select coalesce(jsonb_agg(jsonb_build_object('k', 'w', 'id', id, 'b', before, 'a', after)), '[]'),
      count(*)
    into v_previous, v_works
    from changed;
  end if;

  if p_supplies then
    with changed as (
      update public.artisan_supplies s
      set purchase_price_cents = app.raise_price(s.purchase_price_cents, p_rate_bp, v_step),
        price_on = (now() at time zone 'Europe/Paris')::date
      from public.artisan_supplies old
      where old.id = s.id and s.artisan_id = v_artisan and s.purchase_price_cents is not null
        and app.raise_price(s.purchase_price_cents, p_rate_bp, v_step) <> s.purchase_price_cents
      returning s.id, old.purchase_price_cents as before, s.purchase_price_cents as after,
        old.price_on as before_on
    )
    select v_previous || coalesce(jsonb_agg(jsonb_build_object(
        'k', 's', 'id', id, 'b', before, 'a', after, 'd', before_on)), '[]'),
      count(*)
    into v_previous, v_supplies
    from changed;
  end if;

  insert into public.library_price_raises (artisan_id, rate_bp, rounding, on_works, on_supplies,
    works_count, supplies_count, previous)
  values (v_artisan, p_rate_bp, p_rounding, coalesce(p_works, false), coalesce(p_supplies, false),
    v_works, v_supplies, v_previous)
  returning id into v_id;

  return jsonb_build_object('raiseId', v_id, 'works', v_works, 'supplies', v_supplies);
end;
$$;
revoke execute on function public.artisan_raise_prices(integer, text, boolean, boolean) from public, anon;
grant execute on function public.artisan_raise_prices(integer, text, boolean, boolean) to authenticated;

-- Annulation de la dernière hausse, dans les 24 h. Un prix modifié depuis la hausse est laissé.
-- Rend le nombre de prix rétablis.
create function public.artisan_undo_price_raise(p_raise_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_artisan uuid := app.library_artisan();
  v_raise public.library_price_raises;
  v_works integer;
  v_supplies integer;
begin
  select * into v_raise from public.library_price_raises
  where id = p_raise_id and artisan_id = v_artisan
  for update;
  if v_raise.id is null or v_raise.undone_at is not null
    or v_raise.created_at < now() - interval '24 hours'
    or exists (
      select 1 from public.library_price_raises r
      where r.artisan_id = v_artisan and r.undone_at is null and r.created_at > v_raise.created_at
    ) then
    raise exception 'Cette hausse ne peut plus être annulée.' using errcode = '22023';
  end if;

  update public.artisan_works w
  set manual_price_cents = (p ->> 'b')::integer
  from jsonb_array_elements(v_raise.previous) as p
  where p ->> 'k' = 'w' and w.id = (p ->> 'id')::uuid and w.artisan_id = v_artisan
    and w.manual_price_cents = (p ->> 'a')::integer;
  get diagnostics v_works = row_count;

  update public.artisan_supplies s
  set purchase_price_cents = (p ->> 'b')::integer,
    price_on = (p ->> 'd')::date
  from jsonb_array_elements(v_raise.previous) as p
  where p ->> 'k' = 's' and s.id = (p ->> 'id')::uuid and s.artisan_id = v_artisan
    and s.purchase_price_cents = (p ->> 'a')::integer;
  get diagnostics v_supplies = row_count;

  update public.library_price_raises set undone_at = now() where id = v_raise.id;
  return v_works + v_supplies;
end;
$$;
revoke execute on function public.artisan_undo_price_raise(uuid) from public, anon;
grant execute on function public.artisan_undo_price_raise(uuid) to authenticated;
