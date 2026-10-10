-- F-16, F-17, F-18 (phase 3a) — chantiers et machine à états (spec §9), rendez-vous, tableau de
-- bord artisan. ADR 0016 : le chantier naît quand l'artisan fixe le rendez-vous ; le refus et
-- l'expiration restent des statuts de la demande.

-- ---------------------------------------------------------------------------
-- Machine à états (même contenu que packages/core/src/chantier-state.ts)
-- ---------------------------------------------------------------------------
create type public.chantier_status as enum (
  'demande_envoyee', 'rdv_planifie', 'devis_envoye', 'devis_en_revision', 'devis_refuse',
  'devis_signe', 'acompte_paye', 'planifie', 'en_cours', 'travaux_termines', 'reserves_a_lever',
  'receptionne', 'cloture', 'en_litige', 'annule'
);
create type public.chantier_event as enum (
  'rdv_fixe', 'devis_envoye', 'revision_demandee', 'devis_refuse', 'devis_signe', 'acompte_paye',
  'date_confirmee', 'demarrage', 'fin_declaree', 'pv_sans_reserves', 'pv_avec_reserves',
  'reserves_levees', 'solde_paye', 'litige_ouvert', 'litige_resolu', 'litige_annule', 'annulation'
);

-- Référentiel des transitions autorisées. « litige_resolu » (retour à l'état d'avant le litige)
-- est traité par transition_chantier() à partir du journal.
create table public.chantier_transitions (
  from_status public.chantier_status not null,
  event public.chantier_event not null,
  to_status public.chantier_status not null,
  primary key (from_status, event)
);
alter table public.chantier_transitions enable row level security;
revoke all on public.chantier_transitions from anon, authenticated;
grant select on public.chantier_transitions to anon, authenticated;
create policy "chantier_transitions : lecture publique"
  on public.chantier_transitions for select to anon, authenticated using (true);

insert into public.chantier_transitions (from_status, event, to_status) values
  ('demande_envoyee', 'rdv_fixe', 'rdv_planifie'),
  ('rdv_planifie', 'devis_envoye', 'devis_envoye'),
  ('devis_envoye', 'devis_refuse', 'devis_refuse'),
  ('devis_envoye', 'revision_demandee', 'devis_en_revision'),
  ('devis_en_revision', 'devis_envoye', 'devis_envoye'),
  ('devis_envoye', 'devis_signe', 'devis_signe'),
  ('devis_signe', 'acompte_paye', 'acompte_paye'),
  ('acompte_paye', 'date_confirmee', 'planifie'),
  ('planifie', 'demarrage', 'en_cours'),
  ('en_cours', 'fin_declaree', 'travaux_termines'),
  ('travaux_termines', 'pv_sans_reserves', 'receptionne'),
  ('travaux_termines', 'pv_avec_reserves', 'reserves_a_lever'),
  ('reserves_a_lever', 'reserves_levees', 'receptionne'),
  ('receptionne', 'solde_paye', 'cloture'),
  ('en_litige', 'litige_annule', 'annule');
-- Annulation avant le paiement de l'acompte.
insert into public.chantier_transitions (from_status, event, to_status)
select s::public.chantier_status, 'annulation', 'annule'
from unnest(array['demande_envoyee', 'rdv_planifie', 'devis_envoye', 'devis_en_revision', 'devis_signe']) s;
-- Litige depuis tout état actif.
insert into public.chantier_transitions (from_status, event, to_status)
select s::public.chantier_status, 'litige_ouvert', 'en_litige'
from unnest(array['rdv_planifie', 'devis_envoye', 'devis_en_revision', 'devis_signe', 'acompte_paye',
  'planifie', 'en_cours', 'travaux_termines', 'reserves_a_lever', 'receptionne']) s;

-- ---------------------------------------------------------------------------
-- Chantiers
-- ---------------------------------------------------------------------------
create table public.chantiers (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  request_id uuid not null unique references public.requests (id) on delete cascade,
  artisan_id uuid not null references public.artisans (id) on delete cascade,
  particulier_id uuid not null references auth.users (id) on delete cascade,
  status public.chantier_status not null default 'demande_envoyee',
  title text not null check (char_length(title) between 1 and 300),
  adresse text check (char_length(adresse) <= 300),
  ville_nom text check (char_length(ville_nom) <= 100),
  code_postal text check (char_length(code_postal) <= 10),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index chantiers_artisan_status_idx on public.chantiers (artisan_id, status);
create index chantiers_particulier_idx on public.chantiers (particulier_id);
create index chantiers_project_idx on public.chantiers (project_id);
create trigger chantiers_set_updated_at before update on public.chantiers
  for each row execute function app.set_updated_at();
alter table public.chantiers enable row level security;
-- Aucune écriture directe : création et transitions par les fonctions ci-dessous.
revoke all on public.chantiers from anon, authenticated;
grant select on public.chantiers to authenticated;

create policy "chantiers : lecture par les parties ou l'équipe"
  on public.chantiers for select to authenticated
  using (
    particulier_id = (select auth.uid())
    or artisan_id = (select app.my_artisan_id())
    or (select app.is_staff())
  );

-- L'état ne change que par transition_chantier() (CLAUDE.md règle 6) ; les parties sont figées.
create function app.chantiers_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if new.status <> 'demande_envoyee' then
      raise exception 'Un chantier commence à l''état demande_envoyee' using errcode = '42501';
    end if;
    return new;
  end if;
  if new.status is distinct from old.status
     and coalesce(current_setting('menao.transition_chantier', true), '') <> 'on' then
    raise exception 'L''état d''un chantier ne change que par transition_chantier()' using errcode = '42501';
  end if;
  if (new.project_id, new.request_id, new.artisan_id, new.particulier_id)
     is distinct from (old.project_id, old.request_id, old.artisan_id, old.particulier_id) then
    raise exception 'Les parties d''un chantier ne changent pas' using errcode = '42501';
  end if;
  return new;
end;
$$;
create trigger chantiers_guard before insert or update on public.chantiers
  for each row execute function app.chantiers_guard();

-- Journal immuable des transitions (spec §9).
create table public.chantier_events (
  id uuid primary key default gen_random_uuid(),
  chantier_id uuid not null references public.chantiers (id) on delete cascade,
  event public.chantier_event not null,
  from_status public.chantier_status not null,
  to_status public.chantier_status not null,
  actor_id uuid references auth.users (id) on delete set null,
  actor_role text not null check (char_length(actor_role) <= 30),
  details jsonb not null default '{}'::jsonb check (jsonb_typeof(details) = 'object'),
  -- Heure réelle (et non celle du début de transaction) : ordre fiable du journal.
  created_at timestamptz not null default clock_timestamp()
);
create index chantier_events_chantier_idx on public.chantier_events (chantier_id, created_at);
create index chantier_events_actor_idx on public.chantier_events (actor_id);
alter table public.chantier_events enable row level security;
revoke all on public.chantier_events from anon, authenticated;
grant select on public.chantier_events to authenticated;

create policy "chantier_events : lecture par les parties ou l'équipe"
  on public.chantier_events for select to authenticated
  using (
    (select app.is_staff())
    or exists (
      select 1 from public.chantiers c
      where c.id = chantier_id
        and (c.particulier_id = (select auth.uid()) or c.artisan_id = (select app.my_artisan_id()))
    )
  );

-- Ni modification ni suppression, sauf effets en cascade (suppression du chantier ou d'un compte).
create function app.chantier_events_immutable()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if pg_trigger_depth() < 2 then
    raise exception 'Le journal du chantier est immuable' using errcode = '42501';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;
create trigger chantier_events_immutable before update or delete on public.chantier_events
  for each row execute function app.chantier_events_immutable();

-- Seul point de passage des transitions. Réservé aux fonctions de la base et au serveur
-- (service_role) : les utilisateurs passent par les fonctions métier qui vérifient leurs droits.
create function public.transition_chantier(
  p_chantier_id uuid,
  p_event public.chantier_event,
  p_details jsonb default '{}'::jsonb
)
returns public.chantier_status
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_from public.chantier_status;
  v_to public.chantier_status;
begin
  select status into v_from from public.chantiers where id = p_chantier_id for update;
  if not found then
    raise exception 'Chantier introuvable' using errcode = '22023';
  end if;
  if p_event = 'litige_resolu' then
    if v_from = 'en_litige' then
      select e.from_status into v_to from public.chantier_events e
      where e.chantier_id = p_chantier_id and e.event = 'litige_ouvert'
      order by e.created_at desc
      limit 1;
    end if;
  else
    select t.to_status into v_to from public.chantier_transitions t
    where t.from_status = v_from and t.event = p_event;
  end if;
  if v_to is null then
    raise exception 'Transition interdite : % depuis l''état %', p_event, v_from using errcode = '22023';
  end if;

  perform set_config('menao.transition_chantier', 'on', true);
  update public.chantiers set status = v_to where id = p_chantier_id;
  perform set_config('menao.transition_chantier', '', true);
  insert into public.chantier_events (chantier_id, event, from_status, to_status, actor_id, actor_role, details)
  values (p_chantier_id, p_event, v_from, v_to, auth.uid(), coalesce(app.jwt_role()::text, 'systeme'),
    coalesce(p_details, '{}'::jsonb));
  return v_to;
end;
$$;
revoke execute on function public.transition_chantier(uuid, public.chantier_event, jsonb) from public, anon, authenticated;
grant execute on function public.transition_chantier(uuid, public.chantier_event, jsonb) to service_role;

-- ---------------------------------------------------------------------------
-- Rendez-vous (F-17, F-18)
-- ---------------------------------------------------------------------------
create type public.appointment_status as enum ('planifie', 'annule');

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  chantier_id uuid not null references public.chantiers (id) on delete cascade,
  starts_at timestamptz not null,
  status public.appointment_status not null default 'planifie',
  artisan_notes text check (char_length(artisan_notes) <= 5000),
  -- Rappel de la veille (F-18), envoyé avec les notifications (phase 3b).
  reminder_sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index appointments_un_planifie_par_chantier
  on public.appointments (chantier_id) where status = 'planifie';
create index appointments_chantier_idx on public.appointments (chantier_id);
create index appointments_a_venir_idx on public.appointments (starts_at) where status = 'planifie';
create trigger appointments_set_updated_at before update on public.appointments
  for each row execute function app.set_updated_at();
alter table public.appointments enable row level security;
revoke all on public.appointments from anon, authenticated;
grant select on public.appointments to authenticated;

-- Notes privées (spec §14 : « artisan seul »). Le particulier lit la date du rendez-vous par
-- particulier_requests() et chantier_appointment(), jamais les notes.
create policy "appointments : lecture par l'artisan du chantier"
  on public.appointments for select to authenticated
  using (
    exists (
      select 1 from public.chantiers c
      where c.id = chantier_id and c.artisan_id = (select app.my_artisan_id())
    )
  );

-- Heure saisie à Paris ; à venir et au plus 180 jours plus tard (packages/core/src/appointment.ts).
create function app.appointment_start(p_date date, p_time time)
returns timestamptz
language plpgsql
stable
set search_path = ''
as $$
declare
  v_start timestamptz;
begin
  if p_date is null or p_time is null then
    raise exception 'Indiquez la date et l''heure du rendez-vous' using errcode = '22023';
  end if;
  v_start := (p_date + p_time) at time zone 'Europe/Paris';
  if v_start <= now() then
    raise exception 'Choisissez une date et une heure à venir' using errcode = '22023';
  end if;
  if v_start > now() + interval '180 days' then
    raise exception 'Le rendez-vous doit avoir lieu dans les 6 prochains mois' using errcode = '22023';
  end if;
  return v_start;
end;
$$;
revoke execute on function app.appointment_start(date, time) from public, anon, authenticated;

-- F-17 « Fixer un rendez-vous » : remplace l'acceptation simple (ADR 0014). Crée le chantier,
-- passe la demande en « acceptée » (coordonnées visibles) et journalise demande_envoyee → rdv_planifie.
create function public.artisan_fix_appointment(p_request_id uuid, p_date date, p_time time)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.requests;
  v_start timestamptz;
  v_chantier uuid;
begin
  select * into v from public.requests
  where id = p_request_id and artisan_id = app.my_artisan_id()
  for update;
  if not found then
    raise exception 'Demande introuvable' using errcode = '42501';
  end if;
  if exists (select 1 from public.chantiers where request_id = p_request_id) then
    raise exception 'Un rendez-vous est déjà fixé pour cette demande' using errcode = '22023';
  end if;
  -- Demande en attente de réponse, ou acceptée avant la phase 3 sans rendez-vous.
  if not ((v.status = 'envoyee' and v.expires_at > now()) or v.status = 'acceptee') then
    raise exception 'Cette demande n''attend plus de réponse' using errcode = '22023';
  end if;
  v_start := app.appointment_start(p_date, p_time);

  update public.requests set status = 'acceptee', responded_at = coalesce(responded_at, now())
  where id = p_request_id;
  insert into public.chantiers (project_id, request_id, artisan_id, particulier_id, title, adresse,
    ville_nom, code_postal)
  select p.id, v.id, v.artisan_id, v.particulier_id,
    left(coalesce(nullif(btrim(p.summary), ''), t.label, 'Chantier'), 300),
    left(p.adresse, 300), p.ville_nom, p.code_postal
  from public.projects p
  left join public.trades t on t.code = p.trade_code
  where p.id = v.project_id
  returning id into v_chantier;
  perform public.transition_chantier(v_chantier, 'rdv_fixe', jsonb_build_object('rendez_vous', v_start));
  insert into public.appointments (chantier_id, starts_at) values (v_chantier, v_start);
  return v_chantier;
end;
$$;
revoke execute on function public.artisan_fix_appointment(uuid, date, time) from public, anon;
grant execute on function public.artisan_fix_appointment(uuid, date, time) to authenticated;

-- Modification de la date tant que le devis n'est pas envoyé (l'artisan fixe la date avant
-- d'avoir les coordonnées du client).
create function public.artisan_reschedule_appointment(p_chantier_id uuid, p_date date, p_time time)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_status public.chantier_status;
  v_start timestamptz;
begin
  select status into v_status from public.chantiers
  where id = p_chantier_id and artisan_id = app.my_artisan_id()
  for update;
  if not found then
    raise exception 'Chantier introuvable' using errcode = '42501';
  end if;
  if v_status <> 'rdv_planifie' then
    raise exception 'Le rendez-vous ne peut plus être modifié' using errcode = '22023';
  end if;
  v_start := app.appointment_start(p_date, p_time);
  update public.appointments set starts_at = v_start, reminder_sent_at = null
  where chantier_id = p_chantier_id and status = 'planifie';
  if not found then
    raise exception 'Le rendez-vous ne peut plus être modifié' using errcode = '22023';
  end if;
end;
$$;
revoke execute on function public.artisan_reschedule_appointment(uuid, date, time) from public, anon;
grant execute on function public.artisan_reschedule_appointment(uuid, date, time) to authenticated;

-- F-18 « Annuler le chantier » : avant toute signature de devis (core :
-- ARTISAN_CANCELLABLE_STATUSES). TODO(legal) : annulation après signature du devis.
-- La demande passe en « annulée » : le particulier peut contacter un autre artisan.
create function public.artisan_cancel_chantier(p_chantier_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.chantiers;
begin
  select * into v from public.chantiers
  where id = p_chantier_id and artisan_id = app.my_artisan_id()
  for update;
  if not found then
    raise exception 'Chantier introuvable' using errcode = '42501';
  end if;
  if v.status not in ('rdv_planifie', 'devis_envoye', 'devis_en_revision') then
    raise exception 'Ce chantier ne peut plus être annulé' using errcode = '22023';
  end if;
  perform public.transition_chantier(p_chantier_id, 'annulation', jsonb_strip_nulls(jsonb_build_object(
    'par', 'artisan',
    'motif', nullif(btrim(left(p_reason, 500)), '')
  )));
  update public.appointments set status = 'annule' where chantier_id = p_chantier_id and status = 'planifie';
  update public.requests set status = 'annulee' where id = v.request_id;
end;
$$;
revoke execute on function public.artisan_cancel_chantier(uuid, text) from public, anon;
grant execute on function public.artisan_cancel_chantier(uuid, text) to authenticated;

-- F-18 « Ajouter des notes » : notes privées sur le dernier rendez-vous du chantier.
create function public.artisan_save_appointment_notes(p_chantier_id uuid, p_notes text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if char_length(coalesce(p_notes, '')) > 5000 then
    raise exception 'Vos notes dépassent 5 000 caractères' using errcode = '22023';
  end if;
  update public.appointments set artisan_notes = nullif(btrim(p_notes), '')
  where id = (
    select a.id from public.appointments a
    join public.chantiers c on c.id = a.chantier_id
    where c.id = p_chantier_id and c.artisan_id = app.my_artisan_id()
    order by a.created_at desc
    limit 1
  );
  if not found then
    raise exception 'Rendez-vous introuvable' using errcode = '42501';
  end if;
end;
$$;
revoke execute on function public.artisan_save_appointment_notes(uuid, text) from public, anon;
grant execute on function public.artisan_save_appointment_notes(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Réponse de l'artisan : l'acceptation passe désormais par le rendez-vous.
-- ---------------------------------------------------------------------------
create or replace function public.artisan_respond_request(
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
  if p_accept then
    raise exception 'Fixez un rendez-vous pour accepter la demande' using errcode = '22023';
  end if;
  if p_reason is null or (p_reason = 'autre' and nullif(btrim(p_detail), '') is null) then
    raise exception 'Motif de refus obligatoire' using errcode = '22023';
  end if;
  update public.requests set
    status = 'refusee',
    responded_at = now(),
    refusal_reason = p_reason,
    refusal_detail = nullif(btrim(left(p_detail, 500)), '')
  where id = p_request_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Lectures : détail de la demande (avec son chantier), chantiers de l'artisan, détail du
-- chantier, suivi du particulier (avec le rendez-vous), données du fichier agenda.
-- ---------------------------------------------------------------------------
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
  where r.id = p_request_id and r.artisan_id = app.my_artisan_id()
$$;

create function public.artisan_chantiers()
returns table (
  chantier_id uuid,
  request_id uuid,
  status public.chantier_status,
  title text,
  particulier_id uuid,
  client_first_name text,
  client_last_name text,
  adresse text,
  ville_nom text,
  code_postal text,
  appointment_at timestamptz,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select c.id, c.request_id, c.status, c.title, c.particulier_id, cp.first_name, cp.last_name,
    case when c.status <> 'annule' then c.adresse end, c.ville_nom, c.code_postal,
    (select a.starts_at from public.appointments a where a.chantier_id = c.id and a.status = 'planifie'),
    c.created_at
  from public.chantiers c
  left join public.profiles cp on cp.user_id = c.particulier_id
  where c.artisan_id = app.my_artisan_id()
  order by c.created_at desc
$$;
revoke execute on function public.artisan_chantiers() from public, anon;
grant execute on function public.artisan_chantiers() to authenticated;

create function public.artisan_chantier_detail(p_chantier_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select public.artisan_request_detail(c.request_id) || jsonb_build_object(
    'chantier', jsonb_build_object(
      'id', c.id,
      'status', c.status,
      'title', c.title,
      'created_at', c.created_at,
      'cancelled_at', (select e.created_at from public.chantier_events e
                       where e.chantier_id = c.id and e.event = 'annulation'
                       order by e.created_at desc limit 1)
    ),
    'appointment', (select jsonb_build_object('starts_at', a.starts_at, 'status', a.status, 'notes', a.artisan_notes)
                    from public.appointments a where a.chantier_id = c.id
                    order by a.created_at desc limit 1)
  )
  from public.chantiers c
  where c.id = p_chantier_id and c.artisan_id = app.my_artisan_id()
$$;
revoke execute on function public.artisan_chantier_detail(uuid) from public, anon;
grant execute on function public.artisan_chantier_detail(uuid) to authenticated;

-- Le type de retour change (rendez-vous) : suppression puis recréation.
drop function public.particulier_requests();
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
  artisan_email text,
  chantier_id uuid,
  chantier_status public.chantier_status,
  appointment_at timestamptz
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
    case when r.status = 'acceptee' then u.email::text end,
    ch.id, ch.status,
    (select ap.starts_at from public.appointments ap where ap.chantier_id = ch.id and ap.status = 'planifie')
  from public.requests r
  join public.projects p on p.id = r.project_id
  join public.artisans a on a.id = r.artisan_id
  left join public.trades t on t.code = p.trade_code
  left join public.profiles pr on pr.user_id = a.user_id
  left join auth.users u on u.id = a.user_id
  left join public.chantiers ch on ch.request_id = r.id
  where r.particulier_id = auth.uid()
  order by r.created_at desc, coalesce(pr.first_name, a.raison_sociale)
$$;
revoke execute on function public.particulier_requests() from public, anon;
grant execute on function public.particulier_requests() to authenticated;

-- F-44 : fichier agenda du rendez-vous, pour l'artisan comme pour le particulier.
create function public.chantier_appointment(p_chantier_id uuid)
returns table (
  starts_at timestamptz,
  title text,
  adresse text,
  ville_nom text,
  code_postal text,
  artisan_name text,
  client_name text
)
language sql
stable
security definer
set search_path = ''
as $$
  select a.starts_at, c.title, c.adresse, c.ville_nom, c.code_postal,
    coalesce(ap.first_name, ar.nom_commercial, ar.raison_sociale),
    nullif(concat_ws(' ', cp.first_name, cp.last_name), '')
  from public.chantiers c
  join public.appointments a on a.chantier_id = c.id and a.status = 'planifie'
  join public.artisans ar on ar.id = c.artisan_id
  left join public.profiles ap on ap.user_id = ar.user_id
  left join public.profiles cp on cp.user_id = c.particulier_id
  where c.id = p_chantier_id
    and c.status = 'rdv_planifie'
    and (c.particulier_id = auth.uid() or c.artisan_id = app.my_artisan_id())
$$;
revoke execute on function public.chantier_appointment(uuid) from public, anon;
grant execute on function public.chantier_appointment(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- « Ce chantier a besoin d'une expertise » (F-17, F-18) : ticket pour l'équipe MENAO.
-- ---------------------------------------------------------------------------
create unique index tickets_un_expertise_ouverte
  on public.tickets (project_id, user_id) where type = 'expertise' and status <> 'resolu';

create function public.artisan_report_expertise(p_request_id uuid, p_trade_code text, p_message text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.requests;
  v_trade text;
  v_ticket uuid;
begin
  select * into v from public.requests where id = p_request_id and artisan_id = app.my_artisan_id();
  if not found then
    raise exception 'Demande introuvable' using errcode = '42501';
  end if;
  select label into v_trade from public.trades where code = p_trade_code and active;
  if v_trade is null then
    raise exception 'Choisissez le corps de métier nécessaire' using errcode = '22023';
  end if;
  select id into v_ticket from public.tickets
  where type = 'expertise' and project_id = v.project_id and user_id = auth.uid() and status <> 'resolu';
  if found then
    return v_ticket;
  end if;
  insert into public.tickets (type, user_id, project_id, contact_email, subject, message)
  select 'expertise', auth.uid(), v.project_id, lower(u.email), left(v_trade, 150),
    nullif(btrim(left(p_message, 2000)), '')
  from auth.users u where u.id = auth.uid()
  returning id into v_ticket;
  return v_ticket;
end;
$$;
revoke execute on function public.artisan_report_expertise(uuid, text, text) from public, anon;
grant execute on function public.artisan_report_expertise(uuid, text, text) to authenticated;
