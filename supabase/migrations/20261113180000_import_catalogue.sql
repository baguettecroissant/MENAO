-- Import d'un catalogue dans la bibliothèque (F-148, ADR 0309, maquette lot 42) : fichier Excel ou
-- CSV déposé dans un espace privé de l'entreprise, lu par la fonction library-import (colonnes
-- reconnues par packages/core, IA en secours), puis enregistré ici d'un bloc : ouvrages (prix de
-- vente) ou fournitures (prix d'achat). Un article déjà présent (même désignation et même unité) :
-- prix mis à jour, ou laissé tel quel, au choix de l'artisan.

-- ---------------------------------------------------------------------------
-- Fichiers déposés : espace privé, un dossier par entreprise, supprimés après l'import
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('library-imports', 'library-imports', false, 5242880, array[
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv',
  'text/plain',
  'application/vnd.ms-excel'
])
on conflict (id) do nothing;

create policy "library-imports : dépôt par l'entreprise"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'library-imports'
    and (storage.foldername(name))[1] = (select app.my_manager_artisan_id())::text);
create policy "library-imports : lecture par l'entreprise"
  on storage.objects for select to authenticated
  using (bucket_id = 'library-imports'
    and (storage.foldername(name))[1] = (select app.my_manager_artisan_id())::text);
create policy "library-imports : suppression par l'entreprise"
  on storage.objects for delete to authenticated
  using (bucket_id = 'library-imports'
    and (storage.foldername(name))[1] = (select app.my_manager_artisan_id())::text);

-- ---------------------------------------------------------------------------
-- Origine « import » des ouvrages ; journal de l'IA de secours
-- ---------------------------------------------------------------------------
alter table public.artisan_works drop constraint artisan_works_source_check;
alter table public.artisan_works
  add constraint artisan_works_source_check check (source in ('devis', 'manuel', 'menao', 'import'));

alter table public.ai_runs drop constraint ai_runs_function_name_check;
alter table public.ai_runs add constraint ai_runs_function_name_check
  check (function_name in (
    'analyze-need', 'transcribe', 'quote-from-voice', 'read-document', 'suggest-need',
    'describe-photo', 'read-expense', 'pro-assistant', 'client-assistant', 'commercial-copilot',
    'voice-assistant', 'artisan-assistant', 'read-dpgf', 'read-plan', 'read-catalog'
  ));

-- ---------------------------------------------------------------------------
-- Import d'un bloc
-- ---------------------------------------------------------------------------
-- p_rows : [{designation, unit, priceCents, vatRateBp?, description?, reference?, supplier?}],
-- 5 000 au plus, déjà lus et vérifiés par packages/core (revérifiés ici). Une ligne répétée dans
-- le fichier compte une fois (la dernière). Rend {added, updated}.
create function public.artisan_import_library(p_kind text, p_rows jsonb, p_update boolean)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_artisan uuid := app.library_artisan();
  v_added integer := 0;
  v_updated integer := 0;
begin
  if p_kind is null or p_kind not in ('ouvrages', 'fournitures') then
    raise exception 'Type d''import inconnu.' using errcode = '22023';
  end if;
  if p_rows is null or jsonb_typeof(p_rows) <> 'array' or jsonb_array_length(p_rows) = 0
    or jsonb_array_length(p_rows) > 5000 then
    raise exception 'Fichier vide ou trop long (5 000 lignes au plus).' using errcode = '22023';
  end if;

  -- Table de travail de la transaction (appel répété : recréée).
  drop table if exists pg_temp.import_rows;
  create temporary table import_rows on commit drop as
  select distinct on (lower(btrim(r ->> 'designation')), r ->> 'unit')
    btrim(r ->> 'designation') as designation,
    (r ->> 'unit')::public.quote_unit as unit,
    (r ->> 'priceCents')::integer as price_cents,
    coalesce((r ->> 'vatRateBp')::smallint, 1000) as vat_rate_bp,
    nullif(btrim(coalesce(r ->> 'description', '')), '') as description,
    nullif(btrim(coalesce(r ->> 'reference', '')), '') as reference,
    nullif(btrim(coalesce(r ->> 'supplier', '')), '') as supplier
  from jsonb_array_elements(p_rows) with ordinality as x (r, ord)
  order by lower(btrim(r ->> 'designation')), r ->> 'unit', ord desc;

  if exists (
    select 1 from pg_temp.import_rows
    where designation is null or char_length(designation) not between 1 and 200
      or price_cents is null or price_cents not between 0 and 100000000
      or vat_rate_bp not in (0, 550, 1000, 2000)
      or char_length(coalesce(description, '')) > 1000
      or char_length(coalesce(reference, '')) > 80
      or char_length(coalesce(supplier, '')) > 120
  ) then
    raise exception 'Une ligne du fichier est invalide.' using errcode = '22023';
  end if;

  if p_kind = 'ouvrages' then
    if p_update then
      update public.artisan_works w
      set manual_price_cents = i.price_cents
      from pg_temp.import_rows i
      where w.artisan_id = v_artisan and lower(w.designation) = lower(i.designation) and w.unit = i.unit;
      get diagnostics v_updated = row_count;
    end if;
    insert into public.artisan_works (artisan_id, designation, description, unit, line_type,
      vat_rate_bp, manual_price_cents, source)
    select v_artisan, i.designation, i.description, i.unit, 'autre', i.vat_rate_bp, i.price_cents,
      'import'
    from pg_temp.import_rows i
    where not exists (
      select 1 from public.artisan_works w
      where w.artisan_id = v_artisan and lower(w.designation) = lower(i.designation) and w.unit = i.unit
    );
    get diagnostics v_added = row_count;
  else
    if p_update then
      update public.artisan_supplies s
      set purchase_price_cents = i.price_cents,
        price_on = (now() at time zone 'Europe/Paris')::date,
        reference = coalesce(i.reference, s.reference),
        supplier = coalesce(i.supplier, s.supplier)
      from pg_temp.import_rows i
      where s.artisan_id = v_artisan and lower(s.designation) = lower(i.designation) and s.unit = i.unit;
      get diagnostics v_updated = row_count;
    end if;
    insert into public.artisan_supplies (artisan_id, designation, reference, supplier, unit,
      purchase_price_cents, price_on)
    select v_artisan, i.designation, i.reference, i.supplier, i.unit, i.price_cents,
      (now() at time zone 'Europe/Paris')::date
    from pg_temp.import_rows i
    where not exists (
      select 1 from public.artisan_supplies s
      where s.artisan_id = v_artisan and lower(s.designation) = lower(i.designation) and s.unit = i.unit
    );
    get diagnostics v_added = row_count;
  end if;

  return jsonb_build_object('added', v_added, 'updated', v_updated);
end;
$$;
revoke execute on function public.artisan_import_library(text, jsonb, boolean) from public, anon;
grant execute on function public.artisan_import_library(text, jsonb, boolean) to authenticated;
