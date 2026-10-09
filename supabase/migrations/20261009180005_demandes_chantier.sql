-- F-08, F-11, F-17 (phase 2c) — compte au moment de la demande (transfert du projet anonyme),
-- demandes envoyées à 1 à 3 artisans, réponse sous 48 h, boîte de réception de l'artisan. ADR 0014.

-- ---------------------------------------------------------------------------
-- Transfert du projet d'une session anonyme vers un compte (inscription ou connexion).
-- Jeton aléatoire à usage unique, valable 24 h, stocké sous forme d'empreinte SHA-256.
-- ---------------------------------------------------------------------------
create table public.project_transfers (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  from_user_id uuid not null references auth.users (id) on delete cascade,
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  expires_at timestamptz not null default now() + interval '24 hours',
  used_at timestamptz,
  created_at timestamptz not null default now()
);
create index project_transfers_project_id_idx on public.project_transfers (project_id);
-- Aucune politique : accès par les fonctions ci-dessous uniquement.
alter table public.project_transfers enable row level security;

create function public.create_project_transfer(p_project_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_token text := encode(extensions.gen_random_bytes(32), 'hex');
begin
  if not exists (
    select 1 from public.projects p join auth.users u on u.id = p.user_id
    where p.id = p_project_id and p.user_id = auth.uid() and u.is_anonymous
  ) then
    raise exception 'Projet introuvable' using errcode = '42501';
  end if;
  insert into public.project_transfers (project_id, from_user_id, token_hash)
  values (p_project_id, auth.uid(), encode(extensions.digest(v_token, 'sha256'), 'hex'));
  return v_token;
end;
$$;
revoke execute on function public.create_project_transfer(uuid) from public, anon;
grant execute on function public.create_project_transfer(uuid) to authenticated;

create function public.claim_project(p_token text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.project_transfers;
begin
  if not exists (select 1 from auth.users where id = auth.uid() and not is_anonymous) then
    raise exception 'Compte requis' using errcode = '42501';
  end if;
  select t.* into v from public.project_transfers t
  join auth.users u on u.id = t.from_user_id
  where t.token_hash = encode(extensions.digest(coalesce(p_token, ''), 'sha256'), 'hex')
    and t.used_at is null and t.expires_at > now() and u.is_anonymous
  for update of t;
  if not found then
    -- Déjà transféré à ce compte (lien ouvert deux fois) : sans effet.
    select t.* into v from public.project_transfers t
    join public.projects p on p.id = t.project_id
    where t.token_hash = encode(extensions.digest(coalesce(p_token, ''), 'sha256'), 'hex')
      and t.used_at is not null and p.user_id = auth.uid();
    if found then
      return v.project_id;
    end if;
    raise exception 'Lien de transfert invalide ou expiré' using errcode = '22023';
  end if;
  update public.projects set user_id = auth.uid() where id = v.project_id and user_id = v.from_user_id;
  update public.tickets set user_id = auth.uid() where project_id = v.project_id and user_id = v.from_user_id;
  update public.project_transfers set used_at = now() where id = v.id;
  return v.project_id;
end;
$$;
revoke execute on function public.claim_project(text) from public, anon;
grant execute on function public.claim_project(text) to authenticated;

-- ---------------------------------------------------------------------------
-- Demandes (F-11)
-- ---------------------------------------------------------------------------
create type public.request_status as enum ('envoyee', 'acceptee', 'refusee', 'expiree', 'annulee');
create type public.refusal_reason as enum ('planning_complet', 'hors_expertise', 'hors_zone', 'autre');
create type public.callback_mode as enum ('des_que_possible', 'plage');

create table public.requests (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  artisan_id uuid not null references public.artisans (id) on delete cascade,
  particulier_id uuid not null references auth.users (id) on delete cascade,
  message text check (char_length(message) <= 10000),
  contact_phone text not null check (contact_phone ~ '^\+[1-9][0-9]{7,14}$'),
  callback_mode public.callback_mode not null default 'des_que_possible',
  callback_from time,
  callback_to time,
  status public.request_status not null default 'envoyee',
  expires_at timestamptz not null default now() + interval '48 hours',
  responded_at timestamptz,
  refusal_reason public.refusal_reason,
  refusal_detail text check (char_length(refusal_detail) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, artisan_id),
  check (callback_mode = 'des_que_possible' or (callback_from is not null and callback_to > callback_from)),
  check (status <> 'refusee' or refusal_reason is not null)
);
create index requests_artisan_status_idx on public.requests (artisan_id, status);
create index requests_particulier_idx on public.requests (particulier_id);
create index requests_expiry_idx on public.requests (expires_at) where status = 'envoyee';
create trigger requests_set_updated_at before update on public.requests
  for each row execute function app.set_updated_at();
alter table public.requests enable row level security;

create policy "requests : lecture par le particulier, l'artisan ou l'équipe"
  on public.requests for select to authenticated
  using (
    particulier_id = (select auth.uid())
    or artisan_id = (select app.my_artisan_id())
    or (select app.is_staff())
  );

-- Photos du projet lisibles par les artisans destinataires (URL signées).
create function app.artisan_received_project_folder(p_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.requests r
    join public.artisans a on a.id = r.artisan_id
    where r.project_id::text = (storage.foldername(p_name))[1] and a.user_id = auth.uid()
  )
$$;
revoke execute on function app.artisan_received_project_folder(text) from public, anon;
grant execute on function app.artisan_received_project_folder(text) to authenticated;
create policy "project-photos : lecture par les artisans destinataires"
  on storage.objects for select to authenticated
  using (bucket_id = 'project-photos' and (select app.artisan_received_project_folder(name)));

create function public.send_project_requests(
  p_project_id uuid,
  p_artisan_ids uuid[],
  p_message text,
  p_phone text,
  p_callback_mode public.callback_mode,
  p_callback_from time,
  p_callback_to time
)
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ids uuid[] := (select coalesce(array_agg(distinct x), '{}') from unnest(p_artisan_ids) x);
  v_active int;
  v_status public.project_status;
begin
  -- Compte particulier confirmé (F-08 : e-mail vérifié avant l'envoi d'une demande).
  if app.jwt_role() is distinct from 'particulier' or not exists (
    select 1 from auth.users where id = auth.uid() and not is_anonymous and email_confirmed_at is not null
  ) then
    raise exception 'Compte particulier confirmé requis' using errcode = '42501';
  end if;
  select status into v_status from public.projects where id = p_project_id and user_id = auth.uid();
  if not found then
    raise exception 'Projet introuvable' using errcode = '42501';
  end if;
  if v_status not in ('criteres_valides', 'demande_envoyee') then
    raise exception 'Validez d''abord vos critères de recherche' using errcode = '22023';
  end if;
  if cardinality(v_ids) = 0 then
    raise exception 'Sélectionnez au moins un artisan' using errcode = '22023';
  end if;
  select count(*) into v_active from public.requests
  where project_id = p_project_id and status in ('envoyee', 'acceptee');
  if v_active + cardinality(v_ids) > 3 then
    raise exception 'Vous pouvez contacter 3 artisans au plus pour ce projet' using errcode = '22023';
  end if;
  if exists (select 1 from public.requests where project_id = p_project_id and artisan_id = any (v_ids)) then
    raise exception 'Demande déjà envoyée à cet artisan' using errcode = '22023';
  end if;
  -- Chaque artisan doit toujours correspondre au projet (visible, métier, zone, hors pause).
  if exists (
    select 1 from unnest(v_ids) x
    where x not in (select m.artisan_id from public.match_artisans(p_project_id, 20) m)
  ) then
    raise exception 'Un des artisans choisis n''est plus disponible pour ce projet' using errcode = '22023';
  end if;
  if p_phone is null or p_phone !~ '^\+[1-9][0-9]{7,14}$' then
    raise exception 'Téléphone invalide' using errcode = '22023';
  end if;
  if p_callback_mode = 'plage' and (p_callback_from is null or p_callback_to is null or p_callback_to <= p_callback_from) then
    raise exception 'Plage horaire invalide' using errcode = '22023';
  end if;

  insert into public.requests (project_id, artisan_id, particulier_id, message, contact_phone,
    callback_mode, callback_from, callback_to)
  select p_project_id, x, auth.uid(), nullif(btrim(left(p_message, 10000)), ''), p_phone,
    p_callback_mode, case when p_callback_mode = 'plage' then p_callback_from end,
    case when p_callback_mode = 'plage' then p_callback_to end
  from unnest(v_ids) x;

  update public.projects set status = 'demande_envoyee' where id = p_project_id;
  update public.profiles set phone = p_phone where user_id = auth.uid() and phone is null;
  return cardinality(v_ids);
end;
$$;
revoke execute on function public.send_project_requests(uuid, uuid[], text, text, public.callback_mode, time, time)
  from public, anon;
grant execute on function public.send_project_requests(uuid, uuid[], text, text, public.callback_mode, time, time)
  to authenticated;

-- Réponse de l'artisan (F-17). Le rendez-vous (F-18) viendra en phase 3.
create function public.artisan_respond_request(
  p_request_id uuid,
  p_accept boolean,
  p_reason public.refusal_reason default null,
  p_detail text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.requests;
begin
  select * into v from public.requests
  where id = p_request_id and artisan_id = app.my_artisan_id()
  for update;
  if not found then
    raise exception 'Demande introuvable' using errcode = '42501';
  end if;
  if v.status <> 'envoyee' or v.expires_at <= now() then
    raise exception 'Cette demande n''attend plus de réponse' using errcode = '22023';
  end if;
  if not p_accept and (p_reason is null or (p_reason = 'autre' and nullif(btrim(p_detail), '') is null)) then
    raise exception 'Motif de refus obligatoire' using errcode = '22023';
  end if;
  update public.requests set
    status = case when p_accept then 'acceptee'::public.request_status else 'refusee' end,
    responded_at = now(),
    refusal_reason = case when p_accept then null else p_reason end,
    refusal_detail = case when p_accept then null else nullif(btrim(left(p_detail, 500)), '') end
  where id = p_request_id;
end;
$$;
revoke execute on function public.artisan_respond_request(uuid, boolean, public.refusal_reason, text) from public, anon;
grant execute on function public.artisan_respond_request(uuid, boolean, public.refusal_reason, text) to authenticated;

-- Expiration des demandes sans réponse (48 h), toutes les 15 minutes.
create function app.expire_requests()
returns int
language sql
security definer
set search_path = ''
as $$
  with expired as (
    update public.requests set status = 'expiree'
    where status = 'envoyee' and expires_at <= now()
    returning 1
  )
  select count(*)::int from expired
$$;
revoke execute on function app.expire_requests() from public, anon, authenticated;
select cron.schedule('menao-expiration-demandes', '*/15 * * * *', 'select app.expire_requests()');

-- Masque e-mails et téléphones d'un texte (décision C : coordonnées après acceptation).
create function app.scrub_contacts(p_text text)
returns text
language sql
immutable
set search_path = ''
as $$
  select regexp_replace(
    regexp_replace(p_text, '[[:alnum:]._%+-]+@[[:alnum:]-]+(\.[[:alnum:]-]+)+', '[e-mail]', 'g'),
    '((\+|00)[0-9]{1,3}[ .-]?[0-9]([ .-]?[0-9]{2}){3,6}|\y0[1-9]([ .-]?[0-9]{2}){4}\y)', '[téléphone]', 'g'
  )
$$;

-- ---------------------------------------------------------------------------
-- Lecture des demandes : particulier (Mon espace) et artisan (boîte de réception, détail).
-- Coordonnées de l'autre partie uniquement après acceptation.
-- ---------------------------------------------------------------------------
create function public.particulier_requests()
returns table (
  request_id uuid,
  project_id uuid,
  trade_label text,
  ville_nom text,
  summary text,
  artisan_id uuid,
  artisan_name text,
  artisan_avatar_path text,
  status public.request_status,
  created_at timestamptz,
  expires_at timestamptz,
  refusal_reason public.refusal_reason,
  artisan_phone text,
  artisan_email text
)
language sql
stable
security definer
set search_path = ''
as $$
  select r.id, p.id, t.label, p.ville_nom, p.summary, a.id,
    coalesce(pr.first_name, a.nom_commercial, a.raison_sociale), pr.avatar_path,
    r.status, r.created_at, r.expires_at, r.refusal_reason,
    case when r.status = 'acceptee' then pr.phone end,
    case when r.status = 'acceptee' then u.email::text end
  from public.requests r
  join public.projects p on p.id = r.project_id
  join public.artisans a on a.id = r.artisan_id
  left join public.trades t on t.code = p.trade_code
  left join public.profiles pr on pr.user_id = a.user_id
  left join auth.users u on u.id = a.user_id
  where r.particulier_id = auth.uid()
  order by r.created_at desc, coalesce(pr.first_name, a.raison_sociale)
$$;
revoke execute on function public.particulier_requests() from public, anon;
grant execute on function public.particulier_requests() to authenticated;

create function public.artisan_inbox()
returns table (
  request_id uuid,
  status public.request_status,
  created_at timestamptz,
  expires_at timestamptz,
  urgence boolean,
  trade_label text,
  ville_nom text,
  code_postal text,
  date_mode public.project_date_mode,
  date_souhaitee date,
  summary text,
  client_first_name text,
  photo_path text
)
language sql
stable
security definer
set search_path = ''
as $$
  select r.id, r.status, r.created_at, r.expires_at, p.urgence, t.label, p.ville_nom, p.code_postal,
    p.date_mode, p.date_souhaitee, app.scrub_contacts(p.summary), cp.first_name,
    (select ph.storage_path from public.project_photos ph where ph.project_id = p.id order by ph.sort_order, ph.created_at limit 1)
  from public.requests r
  join public.projects p on p.id = r.project_id
  left join public.trades t on t.code = p.trade_code
  left join public.profiles cp on cp.user_id = r.particulier_id
  where r.artisan_id = app.my_artisan_id()
  order by (r.status = 'envoyee') desc, r.created_at desc
$$;
revoke execute on function public.artisan_inbox() from public, anon;
grant execute on function public.artisan_inbox() to authenticated;

create function public.artisan_request_detail(p_request_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', r.id,
    'status', r.status,
    'created_at', r.created_at,
    'expires_at', r.expires_at,
    'refusal_reason', r.refusal_reason,
    'callback_mode', r.callback_mode,
    'callback_from', to_char(r.callback_from, 'HH24:MI'),
    'callback_to', to_char(r.callback_to, 'HH24:MI'),
    'message', case when r.status = 'acceptee' then r.message else app.scrub_contacts(r.message) end,
    'description', case when r.status = 'acceptee' then p.description else app.scrub_contacts(p.description) end,
    'summary', app.scrub_contacts(p.summary),
    'trade', t.label,
    'lieu_type', p.lieu_type,
    'surface', p.surface,
    'rooms', (select coalesce(jsonb_agg(ro.label order by ro.sort_order), '[]') from public.rooms ro where ro.code = any (p.room_codes)),
    'work_types', (select coalesce(jsonb_agg(w.label order by w.sort_order), '[]') from public.work_types w where w.code = any (p.work_type_codes)),
    'urgence', p.urgence,
    'date_mode', p.date_mode,
    'date_souhaitee', p.date_souhaitee,
    'ville_nom', p.ville_nom,
    'code_postal', p.code_postal,
    -- Adresse exacte et coordonnées : après acceptation seulement.
    'adresse', case when r.status = 'acceptee' then p.adresse end,
    'lat', case when r.status = 'acceptee' then extensions.st_y(coalesce(p.location, p.ville_location)::extensions.geometry) end,
    'lon', case when r.status = 'acceptee' then extensions.st_x(coalesce(p.location, p.ville_location)::extensions.geometry) end,
    'photos', (select coalesce(jsonb_agg(ph.storage_path order by ph.sort_order, ph.created_at), '[]') from public.project_photos ph where ph.project_id = p.id),
    'client', jsonb_build_object(
      'first_name', cp.first_name,
      'last_name', case when r.status = 'acceptee' then cp.last_name end,
      'phone', case when r.status = 'acceptee' then r.contact_phone end,
      'email', case when r.status = 'acceptee' then u.email::text end
    )
  )
  from public.requests r
  join public.projects p on p.id = r.project_id
  left join public.trades t on t.code = p.trade_code
  left join public.profiles cp on cp.user_id = r.particulier_id
  left join auth.users u on u.id = r.particulier_id
  where r.id = p_request_id and r.artisan_id = app.my_artisan_id()
$$;
revoke execute on function public.artisan_request_detail(uuid) from public, anon;
grant execute on function public.artisan_request_detail(uuid) to authenticated;
