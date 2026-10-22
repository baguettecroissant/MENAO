-- Faux particuliers et collecteurs de devis (lot 2 du plan V1.1, ADR 0157 ; « Plan anti-problèmes
-- V2 », focus « faux particulier » et point A3) :
-- - un particulier qui n'a encore concrétisé aucun chantier (devis signé ou étape suivante) n'a que
--   2 projets en cours à la fois ;
-- - recoupement automatique à l'envoi : téléphone, nom et prénom du particulier, adresse du
--   chantier comparés à ceux des artisans inscrits (téléphone et nom du compte, adresse de base de
--   la zone, souvent le siège ou le domicile). Correspondance : demandes retenues (« à vérifier »),
--   invisibles des artisans, et ticket pour l'équipe, qui les transmet ou les bloque ;
-- - signalement par l'artisan : « Je pense que ce n'est pas un vrai particulier » (ticket).

-- ---------------------------------------------------------------------------
-- Règles
-- ---------------------------------------------------------------------------
-- Chantier concrétisé : devis signé ou étape suivante.
create function app.particulier_has_concretized(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.chantiers c
    where c.particulier_id = p_user and c.status in ('devis_signe', 'acompte_paye', 'planifie', 'en_cours',
      'travaux_termines', 'reserves_a_lever', 'receptionne', 'cloture', 'en_litige')
  )
$$;
revoke execute on function app.particulier_has_concretized(uuid) from public, anon, authenticated;

-- Projets en cours d'un particulier, hors p_exclude : une demande en attente ou en vérification, ou
-- un chantier avant la signature du devis.
create function app.particulier_open_projects(p_user uuid, p_exclude uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::int
  from public.projects p
  where p.user_id = p_user and p.id is distinct from p_exclude and (
    exists (select 1 from public.requests r where r.project_id = p.id and r.status in ('envoyee', 'a_verifier'))
    or exists (
      select 1 from public.chantiers c
      where c.project_id = p.id and c.status in ('demande_envoyee', 'rdv_planifie', 'devis_envoye', 'devis_en_revision')
    )
  )
$$;
revoke execute on function app.particulier_open_projects(uuid, uuid) from public, anon, authenticated;

-- Nom comparable : minuscules, sans accents, sans espaces ni ponctuation.
create function app.comparable_name(p_value text)
returns text
language sql
immutable
set search_path = ''
as $$
  select regexp_replace(lower(translate(coalesce(p_value, ''),
    'ÀÂÄÁÃÉÈÊËÎÏÍÔÖÓÕÙÛÜÚÇàâäáãéèêëîïíôöóõùûüúç',
    'AAAAAEEEEIIIOOOOUUUUCaaaaaeeeeiiioooouuuuc')), '[^a-z]', '', 'g')
$$;
revoke execute on function app.comparable_name(text) from public, anon, authenticated;

-- Recoupement : artisans dont le téléphone, le nom et le prénom, ou l'adresse de base (à 30 m de
-- l'adresse du chantier) correspondent au particulier.
create function app.request_suspicion(p_user uuid, p_project uuid, p_phone text)
returns table (artisan_id uuid, motif text)
language sql
stable
security definer
set search_path = ''
as $$
  with client as (
    select app.comparable_name(pr.first_name) as prenom, app.comparable_name(pr.last_name) as nom
    from public.profiles pr where pr.user_id = p_user
  )
  select a.id, 'telephone'
  from public.artisans a
  join public.profiles ap on ap.user_id = a.user_id
  where p_phone is not null and ap.phone = p_phone
  union
  select a.id, 'nom'
  from public.artisans a
  join public.profiles ap on ap.user_id = a.user_id
  cross join client c
  where c.prenom <> '' and c.nom <> ''
    and app.comparable_name(ap.first_name) = c.prenom and app.comparable_name(ap.last_name) = c.nom
  union
  select a.id, 'adresse'
  from public.artisans a
  join public.projects p on p.id = p_project
  where p.location is not null and a.base_location is not null
    and extensions.st_dwithin(a.base_location, p.location, 30)
$$;
revoke execute on function app.request_suspicion(uuid, uuid, text) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Envoi des demandes (F-11) : mêmes contrôles qu'avant, plus la limite des projets en cours et le
-- recoupement.
-- ---------------------------------------------------------------------------
create or replace function public.send_project_requests(
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
  v_motifs text[];
  v_suspects uuid[];
  v_email text;
  v_ticket uuid;
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
  where project_id = p_project_id and status in ('envoyee', 'acceptee', 'a_verifier');
  if v_active + cardinality(v_ids) > 3 then
    raise exception 'Vous pouvez contacter 3 artisans au plus pour ce projet' using errcode = '22023';
  end if;
  -- Collecteurs de devis (ADR 0157) : 2 projets en cours tant qu'aucun chantier n'est concrétisé.
  if not app.particulier_has_concretized(auth.uid())
     and app.particulier_open_projects(auth.uid(), p_project_id) >= 2 then
    raise exception 'Vous avez déjà 2 projets en attente de réponse. Vous pourrez en lancer un nouveau dès qu''un artisan vous aura répondu, ou après avoir annulé une demande.'
      using errcode = '22023';
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

  -- Faux particulier (ADR 0157) : recoupement avec les artisans inscrits.
  select array_agg(distinct s.motif order by s.motif), array_agg(distinct s.artisan_id)
  into v_motifs, v_suspects
  from app.request_suspicion(auth.uid(), p_project_id, p_phone) s;

  insert into public.requests (project_id, artisan_id, particulier_id, message, contact_phone,
    callback_mode, callback_from, callback_to, status)
  select p_project_id, x, auth.uid(), nullif(btrim(left(p_message, 10000)), ''), p_phone,
    p_callback_mode, case when p_callback_mode = 'plage' then p_callback_from end,
    case when p_callback_mode = 'plage' then p_callback_to end,
    case when v_motifs is null then 'envoyee' else 'a_verifier' end::public.request_status
  from unnest(v_ids) x;

  if v_motifs is not null then
    -- Ticket au nom du particulier, au texte neutre ; le détail du recoupement va dans une note
    -- interne, jamais visible du déclarant.
    select email into v_email from auth.users where id = auth.uid();
    insert into public.tickets (type, user_id, project_id, contact_email, subject, message, due_at)
    values ('particulier_a_verifier', auth.uid(), p_project_id, lower(v_email),
      'Demande en cours de vérification',
      'Demande retenue pour vérification avant sa transmission aux artisans.',
      now() + interval '1 day')
    returning id into v_ticket;
    insert into public.ticket_notes (ticket_id, author_id, body)
    values (v_ticket, null, left(format('Recoupement automatique avec des artisans inscrits (%s) : %s.',
      array_to_string(v_motifs, ', '),
      (select string_agg(app.artisan_label(s), ', ') from unnest(v_suspects) s)), 2000));
  end if;

  update public.projects set status = 'demande_envoyee' where id = p_project_id;
  update public.profiles set phone = p_phone where user_id = auth.uid() and phone is null;
  return cardinality(v_ids);
end;
$$;

-- Demande en vérification : le particulier peut aussi l'annuler (l'artisan n'en a jamais rien su).
create or replace function public.particulier_cancel_request(
  p_request_id uuid,
  p_reason public.client_cancel_reason,
  p_comment text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  r public.requests;
  v_comment text := nullif(btrim(p_comment), '');
begin
  select * into r from public.requests
  where id = p_request_id and particulier_id = auth.uid()
  for update;
  if not found then
    raise exception 'Demande introuvable' using errcode = '42501';
  end if;
  if r.status not in ('envoyee', 'a_verifier') then
    raise exception 'Cette demande n''attend plus de réponse' using errcode = '22023';
  end if;
  if p_reason is null then
    raise exception 'Choisissez un motif' using errcode = '22023';
  end if;
  if char_length(v_comment) > 500 then
    raise exception 'Commentaire trop long (500 caractères au plus)' using errcode = '22023';
  end if;

  update public.requests
  set status = 'annulee', cancelled_at = now(), cancellation_reason = p_reason,
    cancellation_comment = v_comment
  where id = r.id;
  if r.status = 'envoyee' then
    perform app.notify(a.user_id, 'demande_annulee'::public.notification_type, jsonb_build_object(
      'client', cp.first_name,
      'metier', t.label,
      'ville', p.ville_nom,
      'raison', p_reason,
      'message', v_comment
    ))
    from public.artisans a
    join public.projects p on p.id = r.project_id
    left join public.trades t on t.code = p.trade_code
    left join public.profiles cp on cp.user_id = r.particulier_id
    where a.id = r.artisan_id;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Les artisans ne voient pas une demande en vérification.
-- ---------------------------------------------------------------------------
drop policy "requests : lecture par le particulier, l'artisan ou l'équipe" on public.requests;
create policy "requests : lecture par le particulier, l'artisan ou l'équipe"
  on public.requests for select to authenticated
  using (
    particulier_id = (select auth.uid())
    or (artisan_id = (select app.my_artisan_id()) and status <> 'a_verifier')
    or (select app.is_staff())
  );

create or replace function public.artisan_inbox()
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
  where r.artisan_id = app.my_artisan_id() and r.status <> 'a_verifier'
  order by (r.status = 'envoyee') desc, r.created_at desc
$$;

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

-- Nouvelle demande : prévenir l'artisan seulement quand elle lui est transmise (à l'envoi, ou quand
-- l'équipe la libère après vérification).
create or replace function app.notify_new_request()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status <> 'envoyee' then
    return new;
  end if;
  perform app.notify(a.user_id, 'nouvelle_demande', jsonb_build_object(
    'request_id', new.id,
    'titre', coalesce(nullif(btrim(app.scrub_contacts(p.summary)), ''), t.label),
    'ville', p.ville_nom,
    'client', cp.first_name,
    'urgence', p.urgence,
    'expire_le', new.expires_at
  ))
  from public.artisans a
  join public.projects p on p.id = new.project_id
  left join public.trades t on t.code = p.trade_code
  left join public.profiles cp on cp.user_id = new.particulier_id
  where a.id = new.artisan_id;
  return new;
end;
$$;
create trigger requests_notify_released after update of status on public.requests
  for each row when (old.status = 'a_verifier' and new.status = 'envoyee')
  execute function app.notify_new_request();

-- ---------------------------------------------------------------------------
-- Décision de l'équipe : transmettre (délai de 72 h à partir de maintenant) ou bloquer.
-- ---------------------------------------------------------------------------
create function public.staff_review_held_requests(p_project_id uuid, p_release boolean, p_reason text default null)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
  v_reason text := nullif(left(btrim(coalesce(p_reason, '')), 500), '');
begin
  if not app.is_staff() then
    raise exception 'Réservé à l''équipe MENAO' using errcode = '42501';
  end if;
  if not coalesce(p_release, false) and v_reason is null then
    raise exception 'Indiquez le motif du blocage.' using errcode = '22023';
  end if;
  if coalesce(p_release, false) then
    -- Comme une demande envoyée maintenant : relances, délai et temps de réponse partent d'ici.
    update public.requests set status = 'envoyee', created_at = now(), expires_at = now() + interval '72 hours'
    where project_id = p_project_id and status = 'a_verifier';
  else
    update public.requests set status = 'annulee', cancelled_at = now()
    where project_id = p_project_id and status = 'a_verifier';
  end if;
  get diagnostics v_count = row_count;
  if v_count = 0 then
    raise exception 'Aucune demande en vérification pour ce projet.' using errcode = '22023';
  end if;
  perform app.audit(case when p_release then 'demande.transmise' else 'demande.bloquee' end,
    'projet', p_project_id, jsonb_strip_nulls(jsonb_build_object('demandes', v_count, 'motif', v_reason)));
  return v_count;
end;
$$;
revoke execute on function public.staff_review_held_requests(uuid, boolean, text) from public, anon;
grant execute on function public.staff_review_held_requests(uuid, boolean, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Signalement par l'artisan (« Je pense que ce n'est pas un vrai particulier ») : un par demande.
-- ---------------------------------------------------------------------------
create function public.artisan_report_fake_client(p_request_id uuid, p_detail text default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  r record;
  v_detail text := nullif(left(btrim(coalesce(p_detail, '')), 1000), '');
  v_email text;
  v_ticket uuid;
begin
  select q.id, q.project_id, t.label as metier, p.ville_nom
  into r
  from public.requests q
  join public.projects p on p.id = q.project_id
  left join public.trades t on t.code = p.trade_code
  where q.id = p_request_id and q.artisan_id = app.my_artisan_id() and q.status <> 'a_verifier';
  if r.id is null then
    raise exception 'Demande introuvable' using errcode = '42501';
  end if;
  if exists (
    select 1 from public.tickets
    where type = 'faux_particulier' and user_id = auth.uid() and project_id = r.project_id
  ) then
    raise exception 'Vous avez déjà signalé cette demande.' using errcode = '22023';
  end if;
  select email into v_email from auth.users where id = auth.uid();
  insert into public.tickets (type, user_id, project_id, contact_email, subject, message, due_at)
  values ('faux_particulier', auth.uid(), r.project_id, lower(v_email),
    left(format('Faux particulier possible : %s%s', coalesce(r.metier, 'demande'),
      coalesce(' à ' || r.ville_nom, '')), 150),
    coalesce(v_detail, 'Signalé par l''artisan depuis la demande.'),
    now() + interval '2 days')
  returning id into v_ticket;
  return v_ticket;
end;
$$;
revoke execute on function public.artisan_report_fake_client(uuid, text) from public, anon;
grant execute on function public.artisan_report_fake_client(uuid, text) to authenticated;
