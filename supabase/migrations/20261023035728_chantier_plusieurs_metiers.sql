-- Chantier à plusieurs métiers (ADR 0167) : une rénovation de salle de bains demande un plombier,
-- un carreleur, un électricien, un plaquiste et un peintre. Le projet garde son métier principal ;
-- chaque autre métier choisi par le particulier devient un « lot », projet rattaché au projet
-- principal (`parent_project_id`) qui en reprend la description, le lieu, la date et les photos.
-- Recherche, demandes (3 artisans au plus par métier), devis et chantiers fonctionnent lot par lot,
-- chaque artisan restant indépendant (MENAO ne coordonne pas les travaux). La limite de 2 projets
-- ouverts (ADR 0157) compte le chantier entier. Mêmes valeurs dans packages/core/src/project.ts
-- (MAX_PROJECT_LOTS, suggestedLots).

alter table public.projects
  add column parent_project_id uuid references public.projects (id) on delete cascade,
  -- Lots proposés par l'analyse : [{ trade_code, work_type_codes }].
  add column suggested_lots jsonb not null default '[]' check (jsonb_typeof(suggested_lots) = 'array'),
  -- Lots choisis par le particulier (métiers), créés au lancement de la recherche.
  add column lot_trades text[] not null default '{}' check (cardinality(lot_trades) <= 4),
  add constraint projects_lot_pas_soi_meme check (parent_project_id is distinct from id);
create index projects_parent_idx on public.projects (parent_project_id) where parent_project_id is not null;
create unique index projects_un_lot_par_metier on public.projects (parent_project_id, trade_code)
  where parent_project_id is not null;

-- Photos du chantier partagées par ses lots : un même fichier pour plusieurs projets.
alter table public.project_photos drop constraint project_photos_storage_path_key;
alter table public.project_photos add constraint project_photos_un_chemin_par_projet unique (project_id, storage_path);

-- Photo ajoutée ou retirée au chantier : ses lots suivent.
create function app.sync_lot_photos()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.project_photos (project_id, storage_path, sort_order)
    select l.id, new.storage_path, new.sort_order
    from public.projects l
    where l.parent_project_id = new.project_id
    on conflict (project_id, storage_path) do nothing;
    return null;
  end if;
  delete from public.project_photos ph
  using public.projects l
  where l.parent_project_id = old.project_id and ph.project_id = l.id and ph.storage_path = old.storage_path;
  return null;
end;
$$;
revoke execute on function app.sync_lot_photos() from public, anon, authenticated;
create trigger project_photos_sync_lots after insert or delete on public.project_photos
  for each row execute function app.sync_lot_photos();

-- Les artisans destinataires d'un lot lisent les photos du chantier (dossier du projet principal).
create or replace function app.artisan_received_project_folder(p_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.requests r
    join public.artisans a on a.id = r.artisan_id
    join public.projects p on p.id = r.project_id
    where a.user_id = auth.uid()
      and (r.project_id::text = (storage.foldername(p_name))[1]
        or p.parent_project_id::text = (storage.foldername(p_name))[1])
  )
$$;

-- Choix des lots par le particulier, sur le projet principal encore modifiable : métiers actifs,
-- autres que le principal, 4 au plus (MAX_PROJECT_LOTS).
create function public.set_project_lot_trades(p_project_id uuid, p_trade_codes text[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.projects;
  v_trades text[] := (select coalesce(array_agg(distinct c), '{}') from unnest(coalesce(p_trade_codes, '{}')) c);
begin
  select * into v from public.projects
  where id = p_project_id and user_id = auth.uid() and parent_project_id is null
    and status in ('brouillon', 'criteres_valides');
  if not found then
    raise exception 'Projet introuvable ou non modifiable' using errcode = '42501';
  end if;
  v_trades := array_remove(v_trades, v.trade_code);
  if cardinality(v_trades) > 4 then
    raise exception 'Quatre autres métiers au plus pour un même chantier' using errcode = '22023';
  end if;
  if exists (
    select 1 from unnest(v_trades) c
    where not exists (select 1 from public.trades t where t.code = c and t.active)
  ) then
    raise exception 'Métier inconnu' using errcode = '22023';
  end if;
  update public.projects set lot_trades = v_trades where id = p_project_id;
end;
$$;
revoke execute on function public.set_project_lot_trades(uuid, text[]) from public, anon;
grant execute on function public.set_project_lot_trades(uuid, text[]) to authenticated;

-- Lots du chantier, au lancement de la recherche : créés ou remis à jour depuis le projet principal
-- (description, lieu, date, budget, photos ; travaux proposés pour ce métier), critères validés ;
-- un lot retiré disparaît tant qu'aucune demande n'est partie ; un lot déjà envoyé ne change plus.
create function app.sync_project_lots(p_root uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  r public.projects;
  t text;
  v_lot uuid;
  v_works text[];
begin
  select * into r from public.projects where id = p_root;
  if not found or r.parent_project_id is not null then
    return;
  end if;
  delete from public.projects l
  where l.parent_project_id = p_root
    and (l.trade_code is null or l.trade_code = r.trade_code or not (l.trade_code = any (r.lot_trades)))
    and not exists (select 1 from public.requests q where q.project_id = l.id);

  foreach t in array r.lot_trades loop
    continue when t = r.trade_code or r.trade_code is null;
    v_works := array(
      select distinct w.code
      from jsonb_array_elements(r.suggested_lots) s
      cross join lateral jsonb_array_elements_text(coalesce(s -> 'work_type_codes', '[]')) c(code)
      join public.work_types w on w.code = c.code and w.trade_code = t and w.active
      where s ->> 'trade_code' = t
    );
    select id into v_lot from public.projects where parent_project_id = p_root and trade_code = t;
    if v_lot is null then
      insert into public.projects (user_id, parent_project_id, status, description, summary, artisan_brief,
        trade_code, lieu_type, room_codes, work_type_codes, surface, budget, ville_code_insee, ville_nom,
        code_postal, ville_location, adresse, location, date_mode, date_souhaitee, urgence, criteria_validated_at)
      values (r.user_id, p_root, 'criteres_valides', r.description, r.summary, r.artisan_brief,
        t, r.lieu_type, r.room_codes, v_works, r.surface, r.budget, r.ville_code_insee, r.ville_nom,
        r.code_postal, r.ville_location, r.adresse, r.location, r.date_mode, r.date_souhaitee, r.urgence, now())
      returning id into v_lot;
    elsif exists (select 1 from public.requests q where q.project_id = v_lot) then
      continue;
    else
      update public.projects set
        status = 'criteres_valides', criteria_validated_at = now(),
        description = r.description, summary = r.summary, artisan_brief = r.artisan_brief,
        lieu_type = r.lieu_type, room_codes = r.room_codes, work_type_codes = v_works,
        surface = r.surface, budget = r.budget, ville_code_insee = r.ville_code_insee,
        ville_nom = r.ville_nom, code_postal = r.code_postal, ville_location = r.ville_location,
        adresse = r.adresse, location = r.location, date_mode = r.date_mode,
        date_souhaitee = r.date_souhaitee, urgence = r.urgence
      where id = v_lot;
    end if;
    delete from public.project_photos where project_id = v_lot;
    insert into public.project_photos (project_id, storage_path, sort_order)
    select v_lot, ph.storage_path, ph.sort_order from public.project_photos ph where ph.project_id = p_root;
  end loop;
end;
$$;
revoke execute on function app.sync_project_lots(uuid) from public, anon, authenticated;

-- « Trouver l'artisan idéal » : lots du chantier en plus.
create or replace function public.validate_project_criteria(p_project_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.projects;
begin
  select * into v from public.projects where id = p_project_id and user_id = auth.uid();
  if not found or v.status not in ('brouillon', 'criteres_valides') then
    raise exception 'Projet introuvable ou non modifiable' using errcode = '42501';
  end if;
  if v.trade_code is null or v.ville_code_insee is null then
    raise exception 'Métier et ville obligatoires' using errcode = '22023';
  end if;
  if v.date_mode = 'date' and v.date_souhaitee < (now() at time zone 'Europe/Paris')::date then
    raise exception 'La date de début ne peut pas être passée' using errcode = '22023';
  end if;
  update public.projects
  set status = 'criteres_valides', criteria_validated_at = now()
  where id = p_project_id;
  -- Chantier à plusieurs métiers (ADR 0167) : lots créés ou mis à jour au lancement.
  perform app.sync_project_lots(p_project_id);
end;
$$;

-- Collecteurs de devis (ADR 0157) : 2 chantiers ouverts au plus, un chantier comptant ses lots.
create or replace function app.particulier_open_projects(p_user uuid, p_exclude uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(distinct coalesce(p.parent_project_id, p.id))::int
  from public.projects p
  where p.user_id = p_user
    and coalesce(p.parent_project_id, p.id) is distinct from (
      select coalesce(x.parent_project_id, x.id) from public.projects x where x.id = p_exclude
    )
    and (
      exists (select 1 from public.requests r where r.project_id = p.id and r.status in ('envoyee', 'a_verifier'))
      or exists (
        select 1 from public.chantiers c
        where c.project_id = p.id and c.status in ('demande_envoyee', 'rdv_planifie', 'devis_envoye', 'devis_en_revision')
      )
    )
$$;

-- Détail de la demande pour l'artisan : autres métiers du chantier.
create or replace function public.artisan_request_detail(p_request_id uuid)
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
    -- Demande reformulée par l'IA et budget approximatif (ADR 0163).
    'artisan_brief', app.scrub_contacts(p.artisan_brief),
    'budget', p.budget,
    -- Demande venue de la zone élargie (ADR 0165).
    'hors_zone', r.hors_zone,
    -- Autres métiers du même chantier (ADR 0167), sans les artisans contactés.
    'autres_metiers', (
      select coalesce(jsonb_agg(tg.label order by tg.sort_order), '[]')
      from public.projects g
      join public.trades tg on tg.code = g.trade_code
      where coalesce(g.parent_project_id, g.id) = coalesce(p.parent_project_id, p.id) and g.id <> p.id
    ),
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
    ),
    'chantier_id', (select ch.id from public.chantiers ch where ch.request_id = r.id)
  )
  from public.requests r
  join public.projects p on p.id = r.project_id
  left join public.trades t on t.code = p.trade_code
  left join public.profiles cp on cp.user_id = r.particulier_id
  left join auth.users u on u.id = r.particulier_id
  where r.id = p_request_id and r.artisan_id = app.my_artisan_id() and r.status <> 'a_verifier'
$$;

-- Projet d'une session anonyme rattaché au compte (F-08) : avec tous ses lots.
create or replace function public.claim_project(p_token text)
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
  -- Tout le chantier suit (ADR 0167) : projet principal et lots, quel que soit le lien ouvert.
  update public.tickets set user_id = auth.uid()
  where user_id = v.from_user_id and project_id in (
    select p.id from public.projects p
    where coalesce(p.parent_project_id, p.id) = (
      select coalesce(x.parent_project_id, x.id) from public.projects x where x.id = v.project_id
    )
  );
  update public.projects set user_id = auth.uid()
  where user_id = v.from_user_id and coalesce(parent_project_id, id) = (
    select coalesce(x.parent_project_id, x.id) from public.projects x where x.id = v.project_id
  );
  update public.project_transfers set used_at = now() where id = v.id;
  return v.project_id;
end;
$$;
