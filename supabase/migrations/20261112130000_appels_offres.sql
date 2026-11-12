-- Appels d'offres, lot 1 (F-136, ADR 0287) : l'artisan de la formule Entreprise importe le DPGF
-- d'un architecte (Excel ; PDF au lot suivant), le chiffre avec les prix de ses anciens devis, et
-- le rend dans le fichier de l'architecte (Edge Function tender-sheet) ou en PDF (generate-pdf).
-- Le patron et le chef d'équipe (droit « money ») y ont accès ; les écritures passent par les
-- fonctions ci-dessous, qui vérifient la formule.

-- ---------------------------------------------------------------------------
-- Droit de la formule : Entreprise seulement (réglable en base, comme les agents IA, ADR 0231)
-- ---------------------------------------------------------------------------
update public.plans
set limites = jsonb_set(coalesce(limites, '{}'::jsonb), '{agents,appels_offres}', to_jsonb(code = 'entreprise'), true);

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create type public.tender_status as enum ('en_cours', 'envoye', 'retenu', 'perdu');

create table public.tenders (
  id uuid primary key default gen_random_uuid(),
  artisan_id uuid not null references public.artisans (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 160),
  client_name text check (client_name is null or char_length(client_name) <= 160),
  due_on date,
  status public.tender_status not null default 'en_cours',
  -- Fichier de l'architecte (bucket privé tender-files), réécrit à l'export.
  source_path text check (source_path is null or char_length(source_path) <= 300),
  source_name text check (source_name is null or char_length(source_name) <= 200),
  source_kind text check (source_kind is null or source_kind in ('xlsx', 'pdf')),
  -- Lecture de la feuille : nom, ligne d'en-tête, colonnes (indices à partir de 0).
  sheet jsonb not null default '{}'::jsonb,
  vat_rate_bp smallint not null default 2000 check (vat_rate_bp in (0, 550, 1000, 2000)),
  imported_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index tenders_artisan_idx on public.tenders (artisan_id, created_at desc);

create table public.tender_lines (
  id uuid primary key default gen_random_uuid(),
  tender_id uuid not null references public.tenders (id) on delete cascade,
  position smallint not null check (position between 1 and 1000),
  kind text not null check (kind in ('titre', 'poste')),
  lot text check (lot is null or char_length(lot) <= 300),
  code text check (code is null or char_length(code) <= 40),
  designation text not null check (char_length(designation) between 1 and 500),
  unit_label text check (unit_label is null or char_length(unit_label) <= 20),
  unit public.quote_unit,
  -- Quantité du DPGF de l'architecte, et quantité retenue par l'artisan (la même au départ).
  architect_quantity_milli bigint check (architect_quantity_milli is null or architect_quantity_milli >= 0),
  quantity_milli bigint check (quantity_milli is null or quantity_milli between 0 and 1000000000000),
  unit_price_ht_cents integer check (unit_price_ht_cents is null or unit_price_ht_cents between 0 and 100000000),
  -- Origine du prix : repris d'un ancien devis (suggestion), ou saisi par l'artisan.
  price_source text check (price_source is null or price_source in ('devis', 'manuel')),
  price_reference text check (price_reference is null or char_length(price_reference) <= 200),
  sheet_row integer check (sheet_row is null or sheet_row >= 1),
  unique (tender_id, position)
);

create trigger tenders_set_updated_at before update on public.tenders
  for each row execute function app.set_updated_at();

alter table public.tenders enable row level security;
alter table public.tender_lines enable row level security;

-- Lecture : patron ou chef d'équipe de l'entreprise (droit « money »), et les admins.
create policy "tenders : lecture par l'entreprise ou un admin"
  on public.tenders for select to authenticated
  using (artisan_id = (select app.my_manager_artisan_id()) or (select app.is_admin()));
create policy "tender_lines : lecture par l'entreprise ou un admin"
  on public.tender_lines for select to authenticated
  using (exists (
    select 1 from public.tenders t
    where t.id = tender_lines.tender_id
      and (t.artisan_id = (select app.my_manager_artisan_id()) or (select app.is_admin()))
  ));

-- ---------------------------------------------------------------------------
-- Fichiers des appels d'offres : bucket privé, un dossier par entreprise
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('tender-files', 'tender-files', false, 15728640, array[
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/pdf'
])
on conflict (id) do nothing;

create policy "tender-files : dépôt par l'entreprise"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'tender-files'
    and (storage.foldername(name))[1] = (select app.my_manager_artisan_id())::text);
create policy "tender-files : lecture par l'entreprise"
  on storage.objects for select to authenticated
  using (bucket_id = 'tender-files'
    and (storage.foldername(name))[1] = (select app.my_manager_artisan_id())::text);
create policy "tender-files : suppression par l'entreprise"
  on storage.objects for delete to authenticated
  using (bucket_id = 'tender-files'
    and (storage.foldername(name))[1] = (select app.my_manager_artisan_id())::text);

-- ---------------------------------------------------------------------------
-- Aides
-- ---------------------------------------------------------------------------
-- Entreprise de l'utilisateur (patron ou chef), dossier validé ou suspendu, formule qui inclut les
-- appels d'offres ; sinon une erreur claire.
create function app.tender_artisan()
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_artisan uuid := app.my_manager_artisan_id();
begin
  if v_artisan is null or not exists (
    select 1 from public.artisans a where a.id = v_artisan and a.status in ('valide', 'suspendu')
  ) then
    raise exception 'Réservé à l''entreprise (patron ou chef d''équipe).' using errcode = '42501';
  end if;
  if not coalesce((app.artisan_agents(v_artisan) -> 'agents' ->> 'appels_offres')::boolean, false) then
    raise exception 'Les appels d''offres sont inclus dans la formule Entreprise.' using errcode = '42501';
  end if;
  return v_artisan;
end;
$$;
revoke execute on function app.tender_artisan() from public, anon;
grant execute on function app.tender_artisan() to authenticated;

-- Appel d'offres de l'entreprise de l'utilisateur (verrouillé), sinon erreur.
create function app.my_tender(p_tender_id uuid)
returns public.tenders
language plpgsql
security definer
set search_path = ''
as $$
declare
  t public.tenders;
begin
  select * into t from public.tenders where id = p_tender_id and artisan_id = app.tender_artisan() for update;
  if not found then
    raise exception 'Appel d''offres introuvable.' using errcode = '22023';
  end if;
  return t;
end;
$$;
revoke execute on function app.my_tender(uuid) from public, anon;
grant execute on function app.my_tender(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Fonctions
-- ---------------------------------------------------------------------------
-- Nouvel appel d'offres, avec le fichier de l'architecte déjà déposé dans tender-files.
create function public.artisan_create_tender(
  p_name text,
  p_client_name text default null,
  p_due_on date default null,
  p_source_path text default null,
  p_source_name text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_artisan uuid := app.tender_artisan();
  v_kind text;
  v_id uuid;
begin
  if nullif(btrim(coalesce(p_name, '')), '') is null then
    raise exception 'Nom du projet obligatoire.' using errcode = '22023';
  end if;
  if p_source_path is not null then
    if p_source_path !~ ('^' || v_artisan::text || '/[0-9a-f-]{36}\.(xlsx|pdf)$') then
      raise exception 'Fichier invalide.' using errcode = '22023';
    end if;
    v_kind := substring(p_source_path from '\.(xlsx|pdf)$');
  end if;
  insert into public.tenders (artisan_id, name, client_name, due_on, source_path, source_name, source_kind, vat_rate_bp)
  select v_artisan, btrim(p_name), nullif(btrim(coalesce(p_client_name, '')), ''), p_due_on, p_source_path,
    left(nullif(btrim(coalesce(p_source_name, '')), ''), 200), v_kind,
    case when a.assujetti_tva is false then 0 else 2000 end
  from public.artisans a where a.id = v_artisan
  returning id into v_id;
  return v_id;
end;
$$;

-- Lignes lues dans le DPGF (titres et postes), remplaçant les précédentes. Appelée par l'Edge
-- Function tender-sheet avec le jeton de l'utilisateur.
create function public.artisan_import_tender_lines(p_tender_id uuid, p_sheet jsonb, p_lines jsonb)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  t public.tenders := app.my_tender(p_tender_id);
  v_count integer;
begin
  if jsonb_typeof(p_lines) <> 'array' or jsonb_array_length(p_lines) > 1000 then
    raise exception 'Lignes invalides (1 000 au plus).' using errcode = '22023';
  end if;
  delete from public.tender_lines where tender_id = t.id;
  insert into public.tender_lines (tender_id, position, kind, lot, code, designation, unit_label, unit,
    architect_quantity_milli, quantity_milli, unit_price_ht_cents, price_source, price_reference, sheet_row)
  select t.id, l.ord::smallint, l.v ->> 'kind', left(l.v ->> 'lot', 300), left(l.v ->> 'code', 40),
    left(l.v ->> 'designation', 500), left(l.v ->> 'unitLabel', 20), (l.v ->> 'unit')::public.quote_unit,
    (l.v ->> 'quantityMilli')::bigint, (l.v ->> 'quantityMilli')::bigint,
    (l.v ->> 'unitPriceHtCents')::integer,
    case when l.v ->> 'unitPriceHtCents' is not null then 'devis' end,
    left(l.v ->> 'priceReference', 200), (l.v ->> 'sheetRow')::integer
  from jsonb_array_elements(p_lines) with ordinality as l (v, ord);
  get diagnostics v_count = row_count;
  update public.tenders
  set sheet = coalesce(p_sheet, '{}'::jsonb), imported_at = now()
  where id = t.id;
  return v_count;
end;
$$;

-- Quantités et prix retenus par l'artisan, et taux de TVA de l'offre.
create function public.artisan_save_tender(p_tender_id uuid, p_vat_rate_bp integer, p_lines jsonb)
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
    end
  from jsonb_array_elements(p_lines) l
  where tl.tender_id = t.id and tl.kind = 'poste' and tl.id = (l ->> 'id')::uuid;
  update public.tenders set vat_rate_bp = p_vat_rate_bp where id = t.id;
end;
$$;

-- Nom, architecte, date de remise et suivi (envoyé, retenu, perdu).
create function public.artisan_update_tender(
  p_tender_id uuid,
  p_name text,
  p_status public.tender_status,
  p_client_name text default null,
  p_due_on date default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  t public.tenders := app.my_tender(p_tender_id);
begin
  if nullif(btrim(coalesce(p_name, '')), '') is null then
    raise exception 'Nom du projet obligatoire.' using errcode = '22023';
  end if;
  update public.tenders
  set name = btrim(p_name), client_name = nullif(btrim(coalesce(p_client_name, '')), ''),
    due_on = p_due_on, status = coalesce(p_status, status)
  where id = t.id;
end;
$$;

-- Suppression (sans condition de formule : l'artisan garde la main sur ses données). Renvoie le
-- chemin du fichier, que le site supprime ensuite du bucket.
create function public.artisan_delete_tender(p_tender_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_path text;
begin
  delete from public.tenders
  where id = p_tender_id and artisan_id = app.my_manager_artisan_id()
  returning source_path into v_path;
  if not found then
    raise exception 'Appel d''offres introuvable.' using errcode = '22023';
  end if;
  return v_path;
end;
$$;

-- Prix pratiqués : pour chaque désignation et unité, la dernière ligne des devis de l'entreprise.
create function public.artisan_price_history()
returns table (designation text, unit public.quote_unit, unit_price_ht_cents integer, used_on date)
language sql
stable
security definer
set search_path = ''
as $$
  select distinct on (lower(btrim(l.designation)), l.unit)
    btrim(l.designation), l.unit, l.unit_price_ht_cents,
    (coalesce(q.sent_at, q.created_at) at time zone 'Europe/Paris')::date
  from public.quote_lines l
  join public.quotes q on q.id = l.quote_id
  where q.artisan_id = app.my_manager_artisan_id() and l.unit_price_ht_cents > 0
  order by lower(btrim(l.designation)), l.unit, coalesce(q.sent_at, q.created_at) desc
  limit 2000
$$;

-- Données du PDF du DPGF chiffré : appel d'offres, lignes, émetteur (comme un devis).
create function public.tender_document(p_tender_id uuid)
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
$$;

revoke execute on function public.artisan_create_tender(text, text, date, text, text) from public, anon;
revoke execute on function public.artisan_import_tender_lines(uuid, jsonb, jsonb) from public, anon;
revoke execute on function public.artisan_save_tender(uuid, integer, jsonb) from public, anon;
revoke execute on function public.artisan_update_tender(uuid, text, public.tender_status, text, date) from public, anon;
revoke execute on function public.artisan_delete_tender(uuid) from public, anon;
revoke execute on function public.artisan_price_history() from public, anon;
revoke execute on function public.tender_document(uuid) from public, anon;
grant execute on function public.artisan_create_tender(text, text, date, text, text) to authenticated;
grant execute on function public.artisan_import_tender_lines(uuid, jsonb, jsonb) to authenticated;
grant execute on function public.artisan_save_tender(uuid, integer, jsonb) to authenticated;
grant execute on function public.artisan_update_tender(uuid, text, public.tender_status, text, date) to authenticated;
grant execute on function public.artisan_delete_tender(uuid) to authenticated;
grant execute on function public.artisan_price_history() to authenticated;
grant execute on function public.tender_document(uuid) to authenticated;
