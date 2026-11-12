-- DPGF créé depuis les plans de l'architecte, lot 1 : lire le plan (F-140, ADR 0291).
-- L'artisan dépose les plans (PDF ou photos) ; l'Edge Function tender-sheet les fait lire par un
-- modèle de langage, qui relève pièces, surfaces, périmètres, hauteurs et éléments comptés
-- (portes, fenêtres, appareils). Le relevé est enregistré ici, puis corrigé par l'artisan.
-- La création du DPGF à partir du relevé (règles par métier) vient au lot suivant.

-- ---------------------------------------------------------------------------
-- Appel d'offres « depuis les plans »
-- ---------------------------------------------------------------------------
alter table public.tenders drop constraint tenders_source_kind_check;
alter table public.tenders add constraint tenders_source_kind_check
  check (source_kind is null or source_kind in ('xlsx', 'pdf', 'plan'));

alter table public.tenders
  -- Plans déposés : [{ "path", "name", "kind" (pdf, jpg, png) }], dans l'ordre de dépôt.
  add column plan_files jsonb not null default '[]'::jsonb
    check (jsonb_typeof(plan_files) = 'array' and jsonb_array_length(plan_files) <= 10),
  -- Métiers dont l'artisan prépare les lots.
  add column plan_trades text[] not null default '{}'
    check (cardinality(plan_trades) <= 20),
  -- Éléments comptés sur les plans (portes, fenêtres, appareils…), corrigeables.
  add column plan_counts jsonb not null default '{}'::jsonb
    check (jsonb_typeof(plan_counts) = 'object'),
  -- Échelle lue dans le cartouche (« 1/50 »).
  add column plan_scale text check (plan_scale is null or char_length(plan_scale) <= 40);

-- Pièces relevées. Mesures en entiers : surface en cm², périmètre et hauteur en mm.
create table public.tender_rooms (
  id uuid primary key default gen_random_uuid(),
  tender_id uuid not null references public.tenders (id) on delete cascade,
  position smallint not null check (position between 1 and 200),
  level text check (level is null or char_length(level) <= 40),
  name text not null check (char_length(btrim(name)) between 1 and 80),
  area_cm2 integer check (area_cm2 is null or area_cm2 between 1 and 100000000),
  perimeter_mm integer check (perimeter_mm is null or perimeter_mm between 1 and 2000000),
  height_mm integer check (height_mm is null or height_mm between 1500 and 10000),
  wet boolean not null default false,
  habitable boolean not null default true,
  -- Écrite sur le plan, calculée avec les cotes, lue sur une photo, ou saisie par l'artisan.
  source text not null check (source in ('plan', 'cotes', 'photo', 'saisi')),
  file_index smallint check (file_index is null or file_index between 1 and 10),
  page smallint check (page is null or page between 1 and 999),
  uncertain boolean not null default false,
  unique (tender_id, position)
);

alter table public.tender_rooms enable row level security;

-- Lecture comme les lignes du DPGF : l'entreprise (patron ou chef d'équipe) et les admins.
-- Aucune écriture directe : tout passe par les fonctions ci-dessous.
create policy "tender_rooms : lecture par l'entreprise ou un admin"
  on public.tender_rooms for select to authenticated
  using (exists (
    select 1 from public.tenders t
    where t.id = tender_rooms.tender_id
      and (t.artisan_id = (select app.my_manager_artisan_id()) or (select app.is_admin()))
  ));

-- Photos de plans acceptées dans le bucket (JPEG et PNG, réduites par le navigateur).
update storage.buckets
set allowed_mime_types = array[
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/pdf',
  'image/jpeg',
  'image/png'
]
where id = 'tender-files';

-- Journal ai_runs : métriques des lectures de plans (jamais le document).
alter table public.ai_runs drop constraint ai_runs_function_name_check;
alter table public.ai_runs add constraint ai_runs_function_name_check
  check (function_name in (
    'analyze-need', 'transcribe', 'quote-from-voice', 'read-document', 'suggest-need',
    'describe-photo', 'read-expense', 'pro-assistant', 'client-assistant', 'commercial-copilot',
    'voice-assistant', 'artisan-assistant', 'read-dpgf', 'read-plan'
  ));

-- ---------------------------------------------------------------------------
-- Aides
-- ---------------------------------------------------------------------------
-- Éléments comptés remis en forme : clés connues, entiers de 0 à 999, sinon null.
create function app.plan_counts(p_counts jsonb)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select jsonb_object_agg(k, case
    when jsonb_typeof(p_counts -> k) = 'number'
      and (p_counts ->> k) ~ '^\d{1,3}$' then to_jsonb((p_counts ->> k)::integer)
    else 'null'::jsonb
  end)
  from unnest(array['portes', 'fenetres', 'wc', 'lavabos', 'douches', 'baignoires', 'eviers',
    'escaliers']) as k
$$;

-- Appel d'offres « depuis les plans » de l'entreprise de l'utilisateur (verrouillé), sinon erreur.
create function app.my_plan_tender(p_tender_id uuid)
returns public.tenders
language plpgsql
security definer
set search_path = ''
as $$
declare
  t public.tenders := app.my_tender(p_tender_id);
begin
  if t.source_kind is distinct from 'plan' then
    raise exception 'Cet appel d''offres n''a pas été créé depuis des plans.' using errcode = '22023';
  end if;
  return t;
end;
$$;
revoke execute on function app.my_plan_tender(uuid) from public, anon;
grant execute on function app.my_plan_tender(uuid) to authenticated;

-- Pièces d'un relevé (JSON) vérifiées et numérotées, prêtes à insérer.
create function app.plan_rooms_rows(p_rooms jsonb)
returns table (
  ord integer, room_id uuid, level text, name text, area_cm2 integer, perimeter_mm integer,
  height_mm integer, wet boolean, habitable boolean, source text, file_index smallint,
  page smallint, uncertain boolean
)
language plpgsql
immutable
set search_path = ''
as $$
begin
  if p_rooms is null or jsonb_typeof(p_rooms) <> 'array' or jsonb_array_length(p_rooms) > 200 then
    raise exception 'Pièces invalides (200 au plus).' using errcode = '22023';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_rooms) r
    where nullif(btrim(coalesce(r ->> 'name', '')), '') is null
  ) then
    raise exception 'Chaque pièce doit avoir un nom.' using errcode = '22023';
  end if;
  return query
  select r.ord::integer,
    case when (r.v ->> 'id') ~ '^[0-9a-f-]{36}$' then (r.v ->> 'id')::uuid end,
    left(nullif(btrim(coalesce(r.v ->> 'level', '')), ''), 40),
    left(btrim(r.v ->> 'name'), 80),
    (r.v ->> 'areaCm2')::integer,
    (r.v ->> 'perimeterMm')::integer,
    (r.v ->> 'heightMm')::integer,
    coalesce((r.v ->> 'wet')::boolean, false),
    coalesce((r.v ->> 'habitable')::boolean, true),
    case when r.v ->> 'source' in ('plan', 'cotes', 'photo') then r.v ->> 'source' else 'saisi' end,
    (r.v ->> 'file')::smallint,
    (r.v ->> 'page')::smallint,
    coalesce((r.v ->> 'uncertain')::boolean, false)
  from jsonb_array_elements(p_rooms) with ordinality as r (v, ord);
end;
$$;
revoke execute on function app.plan_rooms_rows(jsonb) from public, anon;
grant execute on function app.plan_rooms_rows(jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- Fonctions
-- ---------------------------------------------------------------------------
-- Nouvel appel d'offres depuis les plans, déjà déposés dans tender-files, et les métiers choisis.
create function public.artisan_create_plan_tender(
  p_name text,
  p_files jsonb,
  p_trades text[],
  p_client_name text default null,
  p_due_on date default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_artisan uuid := app.tender_artisan();
  v_files jsonb;
  v_trades text[];
  v_id uuid;
begin
  if nullif(btrim(coalesce(p_name, '')), '') is null then
    raise exception 'Nom du projet obligatoire.' using errcode = '22023';
  end if;
  if p_files is null or jsonb_typeof(p_files) <> 'array'
    or jsonb_array_length(p_files) not between 1 and 10 then
    raise exception 'Déposez de 1 à 10 plans.' using errcode = '22023';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_files) f
    where coalesce(f ->> 'path', '') !~ ('^' || v_artisan::text || '/[0-9a-f-]{36}\.(pdf|jpg|png)$')
  ) or (
    select count(distinct f ->> 'path') from jsonb_array_elements(p_files) f
  ) <> jsonb_array_length(p_files) then
    raise exception 'Fichier invalide.' using errcode = '22023';
  end if;
  select coalesce(jsonb_agg(jsonb_build_object(
      'path', f.v ->> 'path',
      'name', left(coalesce(nullif(btrim(coalesce(f.v ->> 'name', '')), ''), 'Plan'), 200),
      'kind', substring(f.v ->> 'path' from '\.(pdf|jpg|png)$')
    ) order by f.ord), '[]'::jsonb)
  into v_files
  from jsonb_array_elements(p_files) with ordinality as f (v, ord);

  select coalesce(array_agg(distinct c), '{}') into v_trades from unnest(p_trades) c;
  if cardinality(v_trades) not between 1 and 20 or exists (
    select 1 from unnest(v_trades) c
    where not exists (select 1 from public.trades tr where tr.code = c and tr.active)
  ) then
    raise exception 'Choisissez au moins un métier.' using errcode = '22023';
  end if;

  insert into public.tenders (artisan_id, name, client_name, due_on, source_kind, plan_files,
    plan_trades, vat_rate_bp)
  select v_artisan, btrim(p_name), nullif(btrim(coalesce(p_client_name, '')), ''), p_due_on,
    'plan', v_files, v_trades, case when a.assujetti_tva is false then 0 else 2000 end
  from public.artisans a where a.id = v_artisan
  returning id into v_id;
  return v_id;
end;
$$;

-- Relevé lu par le modèle (pièces, éléments comptés, échelle), remplaçant le précédent. Appelée
-- par l'Edge Function tender-sheet avec le jeton de l'utilisateur.
create function public.artisan_import_plan_reading(
  p_tender_id uuid,
  p_rooms jsonb,
  p_counts jsonb,
  p_scale text default null
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  t public.tenders := app.my_plan_tender(p_tender_id);
  v_count integer;
begin
  delete from public.tender_rooms where tender_id = t.id;
  insert into public.tender_rooms (tender_id, position, level, name, area_cm2, perimeter_mm,
    height_mm, wet, habitable, source, file_index, page, uncertain)
  select t.id, r.ord::smallint, r.level, r.name, r.area_cm2, r.perimeter_mm, r.height_mm, r.wet,
    r.habitable, case when r.source = 'saisi' then 'plan' else r.source end, r.file_index, r.page,
    r.uncertain
  from app.plan_rooms_rows(p_rooms) r;
  get diagnostics v_count = row_count;
  update public.tenders
  set plan_counts = app.plan_counts(coalesce(p_counts, '{}'::jsonb)),
    plan_scale = left(nullif(btrim(coalesce(p_scale, '')), ''), 40),
    imported_at = now()
  where id = t.id;
  return v_count;
end;
$$;

-- Relevé corrigé par l'artisan : pièces dans l'ordre affiché (celles qui manquent sont retirées,
-- celles sans identifiant ajoutées) et éléments comptés. Une pièce modifiée passe en « saisi ».
create function public.artisan_save_plan_rooms(p_tender_id uuid, p_rooms jsonb, p_counts jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  t public.tenders := app.my_plan_tender(p_tender_id);
  v_rows jsonb;
begin
  -- Pièces fusionnées avec l'existant, gardées en mémoire avant de remplacer le relevé.
  select coalesce(jsonb_agg(jsonb_build_object(
      'ord', r.ord, 'level', r.level, 'name', r.name, 'area', r.area_cm2,
      'perimeter', r.perimeter_mm, 'height', r.height_mm, 'wet', r.wet, 'habitable', r.habitable,
      'changed', o.id is null or (o.level, o.name, o.area_cm2, o.perimeter_mm, o.height_mm, o.wet,
        o.habitable) is distinct from (r.level, r.name, r.area_cm2, r.perimeter_mm, r.height_mm,
        r.wet, r.habitable),
      'source', o.source, 'file', o.file_index, 'page', o.page, 'uncertain', o.uncertain
    ) order by r.ord), '[]'::jsonb)
  into v_rows
  from app.plan_rooms_rows(p_rooms) r
  left join public.tender_rooms o on o.id = r.room_id and o.tender_id = t.id;

  delete from public.tender_rooms where tender_id = t.id;
  insert into public.tender_rooms (tender_id, position, level, name, area_cm2, perimeter_mm,
    height_mm, wet, habitable, source, file_index, page, uncertain)
  select t.id, (v ->> 'ord')::smallint, v ->> 'level', v ->> 'name', (v ->> 'area')::integer,
    (v ->> 'perimeter')::integer, (v ->> 'height')::integer, (v ->> 'wet')::boolean,
    (v ->> 'habitable')::boolean,
    case when (v ->> 'changed')::boolean then 'saisi' else v ->> 'source' end,
    (v ->> 'file')::smallint, (v ->> 'page')::smallint,
    case when (v ->> 'changed')::boolean then false else (v ->> 'uncertain')::boolean end
  from jsonb_array_elements(v_rows) v;

  update public.tenders
  set plan_counts = app.plan_counts(coalesce(p_counts, '{}'::jsonb))
  where id = t.id;
end;
$$;

-- Suppression : renvoie désormais tous les fichiers (DPGF de l'architecte ou plans déposés), que le
-- site supprime ensuite du bucket.
drop function public.artisan_delete_tender(uuid);
create function public.artisan_delete_tender(p_tender_id uuid)
returns text[]
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_path text;
  v_files jsonb;
begin
  delete from public.tenders
  where id = p_tender_id and artisan_id = app.my_manager_artisan_id()
  returning source_path, plan_files into v_path, v_files;
  if not found then
    raise exception 'Appel d''offres introuvable.' using errcode = '22023';
  end if;
  return array_remove(
    array_prepend(v_path, coalesce(
      (select array_agg(f ->> 'path') from jsonb_array_elements(v_files) f), '{}'
    )),
    null
  );
end;
$$;

revoke execute on function public.artisan_create_plan_tender(text, jsonb, text[], text, date) from public, anon;
revoke execute on function public.artisan_import_plan_reading(uuid, jsonb, jsonb, text) from public, anon;
revoke execute on function public.artisan_save_plan_rooms(uuid, jsonb, jsonb) from public, anon;
revoke execute on function public.artisan_delete_tender(uuid) from public, anon;
grant execute on function public.artisan_create_plan_tender(text, jsonb, text[], text, date) to authenticated;
grant execute on function public.artisan_import_plan_reading(uuid, jsonb, jsonb, text) to authenticated;
grant execute on function public.artisan_save_plan_rooms(uuid, jsonb, jsonb) to authenticated;
grant execute on function public.artisan_delete_tender(uuid) to authenticated;
