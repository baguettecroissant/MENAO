-- Secrétaire dédiée de l'artisan, lot 3 des agents IA (F-83, ADR 0232).
--
-- Une assistante vocale qui répond au nom de l'entreprise de l'artisan : elle connaît ses métiers,
-- sa zone et ses horaires, prend un rendez-vous dans son agenda sur un créneau libre (créneau
-- bloqué, visible dans l'agenda et dans l'abonnement .ics), ou note un message. Chaque message ou
-- rendez-vous arrive dans l'espace de l'artisan, avec une notification (sans coordonnées).
-- Incluse dans Premium et Entreprise (`plans.limites.agents.secretaire`, ADR 0231), minutes
-- comptées par `voice_record_usage`. Minutes épuisées : prise de message seulement.
-- Essais : appel web depuis l'espace de l'artisan. Les vrais numéros viendront ensuite.

-- ---------------------------------------------------------------------------
-- Réglages de la secrétaire
-- ---------------------------------------------------------------------------
create table public.secretary_settings (
  artisan_id uuid primary key references public.artisans (id) on delete cascade,
  -- Nom annoncé au téléphone (par défaut : nom commercial, sinon raison sociale).
  display_name text check (char_length(display_name) between 1 and 80),
  can_book boolean not null default true,
  visit_minutes smallint not null default 60 check (visit_minutes in (30, 60, 90, 120)),
  -- Consignes à transmettre aux clients (« pas de dépannage le week-end »).
  instructions text check (char_length(instructions) <= 600),
  updated_at timestamptz not null default now()
);
alter table public.secretary_settings enable row level security;
create policy "secretary_settings : lecture par l'artisan"
  on public.secretary_settings for select to authenticated
  using (artisan_id = (select app.my_artisan_id()));

create function public.save_secretary_settings(
  p_display_name text,
  p_can_book boolean,
  p_visit_minutes int,
  p_instructions text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_artisan uuid := app.my_artisan_id();
begin
  if v_artisan is null then
    raise exception 'Réservé aux artisans' using errcode = '42501';
  end if;
  if p_visit_minutes not in (30, 60, 90, 120) then
    raise exception 'Durée de rendez-vous invalide.' using errcode = '22023';
  end if;
  insert into public.secretary_settings (artisan_id, display_name, can_book, visit_minutes, instructions)
  values (
    v_artisan, nullif(btrim(left(coalesce(p_display_name, ''), 80)), ''), coalesce(p_can_book, true),
    p_visit_minutes, nullif(btrim(left(coalesce(p_instructions, ''), 600)), '')
  )
  on conflict (artisan_id) do update set
    display_name = excluded.display_name,
    can_book = excluded.can_book,
    visit_minutes = excluded.visit_minutes,
    instructions = excluded.instructions,
    updated_at = now();
end;
$$;
revoke execute on function public.save_secretary_settings(text, boolean, int, text) from public, anon;
grant execute on function public.save_secretary_settings(text, boolean, int, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Messages et rendez-vous pris par la secrétaire
-- ---------------------------------------------------------------------------
create table public.secretary_messages (
  id uuid primary key default gen_random_uuid(),
  artisan_id uuid not null references public.artisans (id) on delete cascade,
  call_id text not null check (char_length(call_id) between 1 and 100),
  kind text not null check (kind in ('message', 'rendez_vous')),
  caller_name text not null check (char_length(caller_name) between 1 and 80),
  caller_phone text not null check (caller_phone ~ '^\+[1-9][0-9]{7,14}$'),
  city text check (char_length(city) <= 100),
  reason text not null check (char_length(reason) between 1 and 500),
  urgent boolean not null default false,
  appointment_at timestamptz,
  blocked_slot_id uuid references public.artisan_blocked_slots (id) on delete set null,
  done_at timestamptz,
  created_at timestamptz not null default now(),
  check ((kind = 'rendez_vous') = (appointment_at is not null))
);
create index secretary_messages_artisan_idx on public.secretary_messages (artisan_id, created_at desc);
alter table public.secretary_messages enable row level security;
create policy "secretary_messages : lecture par l'artisan"
  on public.secretary_messages for select to authenticated
  using (artisan_id = (select app.my_artisan_id()));

create function public.secretary_message_done(p_id uuid, p_done boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.secretary_messages
  set done_at = case when p_done then coalesce(done_at, now()) end
  where id = p_id and artisan_id = app.my_artisan_id();
  if not found then
    raise exception 'Message introuvable' using errcode = '42501';
  end if;
end;
$$;
revoke execute on function public.secretary_message_done(uuid, boolean) from public, anon;
grant execute on function public.secretary_message_done(uuid, boolean) to authenticated;

-- Purge : messages de plus de 12 mois.
create function app.purge_secretary_messages()
returns integer
language sql
security definer
set search_path = ''
as $$
  with d as (delete from public.secretary_messages where created_at < now() - interval '12 months' returning 1)
  select count(*)::int from d
$$;
revoke execute on function app.purge_secretary_messages() from public, anon, authenticated;
select cron.schedule('menao-purge-messages-secretaire', '55 3 * * *', 'select app.purge_secretary_messages()');

-- ---------------------------------------------------------------------------
-- Pour la secrétaire (Edge Function voice-assistant, rôle service)
-- ---------------------------------------------------------------------------
-- Contexte de l'appel : nom annoncé, métiers, zone, horaires, consignes, droits et minutes.
create function public.voice_secretary_context(p_artisan_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'artisan_id', a.id,
    'entreprise', coalesce(s.display_name, a.nom_commercial, a.raison_sociale),
    'metiers', coalesce((
      select string_agg(t.label, ', ' order by t.sort_order)
      from public.artisan_trades at join public.trades t on t.code = at.trade_code
      where at.artisan_id = a.id
    ), ''),
    'zone', case
      when a.zone_mode = 'rayon' then concat(
        'dans un rayon de ', a.radius_km, ' kilomètres autour de ',
        coalesce(substring(a.base_label from '[0-9]{5}\s+(.+)$'), 'son adresse'))
      else coalesce((
        select string_agg(z.nom, ', ' order by z.nom) from public.artisan_zones z where z.artisan_id = a.id
      ), '')
    end,
    'horaires', coalesce((
      select jsonb_agg(jsonb_build_object('jour', h.weekday, 'debut', to_char(h.start_time, 'HH24:MI'),
        'fin', to_char(h.end_time, 'HH24:MI')) order by h.weekday, h.start_time)
      from public.artisan_hours h where h.artisan_id = a.id
    ), '[]'::jsonb),
    'consignes', s.instructions,
    'rendez_vous', coalesce(s.can_book, true),
    'duree_visite', coalesce(s.visit_minutes, 60),
    'droits', app.artisan_agents(a.id)
  )
  from public.artisans a
  left join public.secretary_settings s on s.artisan_id = a.id
  where a.id = p_artisan_id and a.status = 'valide'
$$;
revoke execute on function public.voice_secretary_context(uuid) from public, anon, authenticated;
grant execute on function public.voice_secretary_context(uuid) to service_role;

-- Agenda de l'artisan pour proposer des créneaux : horaires, absences et moments occupés.
create function public.voice_secretary_agenda(p_artisan_id uuid, p_from timestamptz, p_to timestamptz)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'horaires', coalesce((
      select jsonb_agg(jsonb_build_object('weekday', h.weekday, 'start', to_char(h.start_time, 'HH24:MI'),
        'end', to_char(h.end_time, 'HH24:MI')))
      from public.artisan_hours h where h.artisan_id = p_artisan_id
    ), '[]'::jsonb),
    'absences', coalesce((
      select jsonb_agg(jsonb_build_object('startsOn', x.starts_on, 'endsOn', x.ends_on))
      from public.artisan_absences x
      where x.artisan_id = p_artisan_id and x.ends_on >= p_from::date
    ), '[]'::jsonb),
    'occupe', coalesce((
      select jsonb_agg(jsonb_build_object('debut', o.debut, 'fin', o.fin))
      from (
        select b.starts_at as debut, b.ends_at as fin
        from public.artisan_blocked_slots b
        where b.artisan_id = p_artisan_id and b.ends_at > p_from and b.starts_at < p_to
        union all
        select ap.starts_at, ap.starts_at + interval '1 hour'
        from public.appointments ap
        join public.chantiers c on c.id = ap.chantier_id
        where c.artisan_id = p_artisan_id and ap.status = 'planifie'
          and ap.starts_at between p_from - interval '1 hour' and p_to
      ) o
    ), '[]'::jsonb)
  )
$$;
revoke execute on function public.voice_secretary_agenda(uuid, timestamptz, timestamptz) from public, anon, authenticated;
grant execute on function public.voice_secretary_agenda(uuid, timestamptz, timestamptz) to service_role;

-- Message ou rendez-vous dicté à la secrétaire. Un rendez-vous bloque le créneau dans l'agenda
-- (refusé s'il chevauche un moment occupé ou si l'artisan ne prend pas de rendez-vous par elle).
-- Un appel ne crée qu'un rendez-vous ; 3 messages au plus par appel.
create function public.voice_secretary_record(
  p_artisan_id uuid,
  p_call_id text,
  p_kind text,
  p_caller_name text,
  p_caller_phone text,
  p_reason text,
  p_city text default null,
  p_urgent boolean default false,
  p_starts_at timestamptz default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text := btrim(left(coalesce(p_caller_name, ''), 80));
  v_reason text := btrim(left(coalesce(p_reason, ''), 500));
  v_city text := nullif(btrim(left(coalesce(p_city, ''), 100)), '');
  v_settings public.secretary_settings;
  v_minutes int;
  v_end timestamptz;
  v_slot uuid;
  v_id uuid;
  v_user uuid;
begin
  if p_kind not in ('message', 'rendez_vous') then
    raise exception 'Type inconnu' using errcode = '22023';
  end if;
  if v_name = '' or v_reason = '' then
    raise exception 'Il manque le nom ou le motif.' using errcode = '22023';
  end if;
  if coalesce(p_caller_phone, '') !~ '^\+[1-9][0-9]{7,14}$' then
    raise exception 'Numéro de téléphone invalide.' using errcode = '22023';
  end if;
  if not exists (select 1 from public.artisans where id = p_artisan_id and status = 'valide') then
    raise exception 'Artisan introuvable' using errcode = '22023';
  end if;
  if (select count(*) from public.secretary_messages where call_id = p_call_id) >= 3 then
    raise exception 'Trop de messages pour cet appel.' using errcode = '22023';
  end if;

  if p_kind = 'rendez_vous' then
    select * into v_settings from public.secretary_settings where artisan_id = p_artisan_id;
    if found and not v_settings.can_book then
      raise exception 'L''artisan ne prend pas de rendez-vous par sa secrétaire.' using errcode = '22023';
    end if;
    if exists (select 1 from public.secretary_messages where call_id = p_call_id and kind = 'rendez_vous') then
      raise exception 'Un rendez-vous est déjà pris pendant cet appel.' using errcode = '22023';
    end if;
    if p_starts_at is null or p_starts_at < now() + interval '1 hour' or p_starts_at > now() + interval '30 days' then
      raise exception 'Créneau invalide.' using errcode = '22023';
    end if;
    v_minutes := coalesce(v_settings.visit_minutes, 60);
    v_end := p_starts_at + make_interval(mins => v_minutes);
    -- Une réservation à la fois par artisan : pas de double rendez-vous sur le même créneau.
    perform pg_advisory_xact_lock(hashtextextended('secretaire:' || p_artisan_id::text, 0));
    if exists (
      select 1 from public.artisan_blocked_slots b
      where b.artisan_id = p_artisan_id and b.starts_at < v_end and b.ends_at > p_starts_at
    ) or exists (
      select 1 from public.appointments ap join public.chantiers c on c.id = ap.chantier_id
      where c.artisan_id = p_artisan_id and ap.status = 'planifie'
        and ap.starts_at < v_end and ap.starts_at + interval '1 hour' > p_starts_at
    ) or exists (
      select 1 from public.artisan_absences x
      where x.artisan_id = p_artisan_id
        and (p_starts_at at time zone 'Europe/Paris')::date between x.starts_on and x.ends_on
    ) then
      raise exception 'Créneau déjà pris.' using errcode = '22023';
    end if;
    insert into public.artisan_blocked_slots (artisan_id, starts_at, ends_at, label)
    values (p_artisan_id, p_starts_at, v_end, left('RDV pris par votre secrétaire : ' || v_name, 80))
    returning id into v_slot;
  end if;

  insert into public.secretary_messages (artisan_id, call_id, kind, caller_name, caller_phone, city, reason,
    urgent, appointment_at, blocked_slot_id)
  values (p_artisan_id, p_call_id, p_kind, v_name, p_caller_phone, v_city, v_reason, coalesce(p_urgent, false),
    case when p_kind = 'rendez_vous' then p_starts_at end, v_slot)
  returning id into v_id;

  select a.user_id into v_user from public.artisans a where a.id = p_artisan_id;
  perform app.notify(v_user, 'secretaire_message', jsonb_build_object(
    'message_id', v_id, 'type', p_kind, 'prenom', split_part(v_name, ' ', 1), 'commune', v_city,
    'motif', left(v_reason, 160), 'urgent', coalesce(p_urgent, false),
    'rendez_vous', case when p_kind = 'rendez_vous' then p_starts_at end
  ));
  return v_id;
end;
$$;
revoke execute on function public.voice_secretary_record(uuid, text, text, text, text, text, text, boolean, timestamptz)
  from public, anon, authenticated;
grant execute on function public.voice_secretary_record(uuid, text, text, text, text, text, text, boolean, timestamptz)
  to service_role;
