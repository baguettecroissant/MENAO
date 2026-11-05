-- Rendez-vous avec le commercial du secteur, pris par la secrétaire vocale « Camille »
-- (F-76, ADR 0226).
-- - Le commercial est celui dont la zone (débuts de codes postaux, ADR 0207) couvre le code postal
--   de la commune de l'artisan : le début le plus long l'emporte, puis le moins chargé.
-- - Créneaux calculés par l'Edge Function (packages/core) à partir des rendez-vous déjà pris :
--   ceux de Camille et les rendez-vous du suivi des prospects. La base refait les contrôles à la
--   réservation (début prévu en semaine, délai, écart d'une heure) : deux réservations simultanées
--   ne peuvent pas prendre le même créneau.
-- - Le commercial est prévenu (notification rdv_commercial, e-mail) et voit ses rendez-vous dans
--   « Ma journée » ; il peut les annuler. Purge 12 mois après la date du rendez-vous.

create table public.commercial_appointments (
  id uuid primary key default gen_random_uuid(),
  commercial_id uuid not null references public.commercials (id) on delete cascade,
  starts_at timestamptz not null,
  kind text not null check (kind in ('appel', 'visite')),
  first_name text not null check (char_length(first_name) between 1 and 60),
  phone text not null check (phone ~ '^\+[1-9][0-9]{7,14}$'),
  email text not null check (email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' and char_length(email) <= 254),
  address text check (char_length(address) <= 200),
  city text not null check (char_length(city) between 1 and 100),
  postcode text check (postcode ~ '^[0-9]{5}$'),
  trade text check (char_length(trade) <= 80),
  reason text not null check (char_length(reason) between 1 and 300),
  status text not null default 'prevu' check (status in ('prevu', 'annule')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (kind <> 'visite' or address is not null)
);

create unique index commercial_appointments_slot_idx
  on public.commercial_appointments (commercial_id, starts_at) where status = 'prevu';
create index commercial_appointments_commercial_idx
  on public.commercial_appointments (commercial_id, starts_at);

create trigger commercial_appointments_set_updated_at before update on public.commercial_appointments
  for each row execute function app.set_updated_at();

alter table public.commercial_appointments enable row level security;
revoke all on public.commercial_appointments from anon, authenticated;
grant select on public.commercial_appointments to authenticated;

create policy "commercial_appointments : lecture par le commercial ou un admin"
  on public.commercial_appointments for select to authenticated
  using (commercial_id = (select app.my_commercial_id()) or (select app.is_admin()));

-- Commercial actif du secteur d'un code postal, et son prénom ; aucun si la zone n'est couverte.
create function public.voice_commercial_for_postcode(p_postcode text)
returns table (commercial_id uuid, prenom text)
language sql
stable
security definer
set search_path = ''
as $$
  select c.id,
    coalesce(nullif(btrim(p.first_name), ''), split_part(btrim(c.nom), ' ', 1))
  from public.commercials c
  cross join lateral (
    select max(char_length(z.code)) as longest
    from unnest(c.zone_codes_postaux) as z (code)
    where p_postcode ~ '^[0-9]{5}$' and p_postcode like z.code || '%'
  ) m
  left join public.profiles p on p.user_id = c.user_id
  where c.status = 'actif' and c.user_id is not null and m.longest is not null
  order by m.longest desc,
    (select count(*) from public.commercial_appointments a
     where a.commercial_id = c.id and a.status = 'prevu' and a.starts_at > now()),
    c.created_at
  limit 1
$$;
revoke execute on function public.voice_commercial_for_postcode(text) from public, anon, authenticated;
grant execute on function public.voice_commercial_for_postcode(text) to service_role;

-- Rendez-vous déjà pris par le commercial sur la période (Camille et suivi des prospects).
create function public.voice_commercial_busy(p_commercial_id uuid, p_from timestamptz, p_to timestamptz)
returns timestamptz[]
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(array_agg(t.at order by t.at), '{}')
  from (
    select a.starts_at as at from public.commercial_appointments a
    where a.commercial_id = p_commercial_id and a.status = 'prevu' and a.starts_at between p_from and p_to
    union all
    select f.next_action_at from public.prospect_follows f
    where f.commercial_id = p_commercial_id and f.status = 'rdv_pris'
      and f.next_action_at between p_from and p_to
  ) t
$$;
revoke execute on function public.voice_commercial_busy(uuid, timestamptz, timestamptz) from public, anon, authenticated;
grant execute on function public.voice_commercial_busy(uuid, timestamptz, timestamptz) to service_role;

-- Réserver un créneau. Contrôles : commercial actif, début prévu (en semaine, 10 h à 12 h 30 ou
-- 14 h à 19 h 30, toutes les demi-heures, heure de Paris), au moins deux heures d'avance, sous
-- quinze jours, une heure d'écart avec ses autres rendez-vous ; 2 rendez-vous au plus par
-- numéro sur 7 jours. Le commercial est prévenu. Renvoie l'identifiant du rendez-vous.
create function public.voice_book_commercial_appointment(
  p_commercial_id uuid,
  p_starts_at timestamptz,
  p_kind text,
  p_first_name text,
  p_phone text,
  p_email text,
  p_city text,
  p_reason text,
  p_postcode text default null,
  p_address text default null,
  p_trade text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid;
  v_local timestamp := p_starts_at at time zone 'Europe/Paris';
  v_time time := (p_starts_at at time zone 'Europe/Paris')::time;
  v_first_name text := btrim(coalesce(p_first_name, ''));
  v_phone text := btrim(coalesce(p_phone, ''));
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_city text := btrim(left(coalesce(p_city, ''), 100));
  v_reason text := btrim(left(coalesce(p_reason, ''), 300));
  v_address text := nullif(btrim(left(coalesce(p_address, ''), 200)), '');
  v_trade text := nullif(btrim(left(coalesce(p_trade, ''), 80)), '');
  v_postcode text := nullif(btrim(coalesce(p_postcode, '')), '');
  v_id uuid;
begin
  select c.user_id into v_user from public.commercials c
  where c.id = p_commercial_id and c.status = 'actif'
  for update;
  if v_user is null then
    raise exception 'Conseiller indisponible' using errcode = '22023';
  end if;
  if p_kind is null or p_kind not in ('appel', 'visite') then
    raise exception 'Type de rendez-vous invalide' using errcode = '22023';
  end if;
  if extract(isodow from v_local) > 5
    or extract(second from v_local) <> 0
    or extract(minute from v_local) not in (0, 30)
    or not (v_time between time '10:00' and time '12:30' or v_time between time '14:00' and time '19:30') then
    raise exception 'Créneau invalide' using errcode = '22023';
  end if;
  if p_starts_at < now() + interval '2 hours' or p_starts_at > now() + interval '15 days' then
    raise exception 'Créneau invalide' using errcode = '22023';
  end if;
  if v_first_name = '' or char_length(v_first_name) > 60 then
    raise exception 'Prénom obligatoire' using errcode = '22023';
  end if;
  if v_phone !~ '^\+[1-9][0-9]{7,14}$' then
    raise exception 'Numéro de téléphone invalide' using errcode = '22023';
  end if;
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or char_length(v_email) > 254 then
    raise exception 'Adresse e-mail invalide' using errcode = '22023';
  end if;
  if v_city = '' or v_reason = '' then
    raise exception 'Commune et motif obligatoires' using errcode = '22023';
  end if;
  if p_kind = 'visite' and v_address is null then
    raise exception 'Adresse obligatoire pour une visite' using errcode = '22023';
  end if;
  if v_postcode is not null and v_postcode !~ '^[0-9]{5}$' then
    v_postcode := null;
  end if;
  if (select count(*) from public.commercial_appointments a
      where a.phone = v_phone and a.status = 'prevu' and a.created_at > now() - interval '7 days') >= 2 then
    raise exception 'Rendez-vous déjà pris' using errcode = '22023';
  end if;
  if exists (
    select 1 from unnest(public.voice_commercial_busy(
      p_commercial_id, p_starts_at - interval '59 minutes', p_starts_at + interval '59 minutes'
    )) as b (at)
  ) then
    raise exception 'Créneau déjà pris' using errcode = '22023';
  end if;

  insert into public.commercial_appointments (
    commercial_id, starts_at, kind, first_name, phone, email, address, city, postcode, trade, reason
  ) values (
    p_commercial_id, p_starts_at, p_kind, v_first_name, v_phone, v_email, v_address, v_city,
    v_postcode, v_trade, v_reason
  )
  returning id into v_id;

  perform app.notify(v_user, 'rdv_commercial', jsonb_build_object(
    'rendez_vous', p_starts_at,
    'type', p_kind,
    -- Jamais de téléphone ni d'e-mail dans les notifications : ils sont dans « Ma journée ».
    'prenom', v_first_name,
    'commune', v_city,
    'metier', v_trade,
    'motif', v_reason
  ));
  return v_id;
end;
$$;
revoke execute on function public.voice_book_commercial_appointment(
  uuid, timestamptz, text, text, text, text, text, text, text, text, text
) from public, anon, authenticated;
grant execute on function public.voice_book_commercial_appointment(
  uuid, timestamptz, text, text, text, text, text, text, text, text, text
) to service_role;

-- Le commercial annule un de ses rendez-vous à venir (l'artisan s'est désisté, par exemple).
create function public.commercial_cancel_appointment(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := app.my_commercial_id();
begin
  if v_me is null then
    raise exception 'Réservé aux commerciaux' using errcode = '42501';
  end if;
  update public.commercial_appointments a set status = 'annule'
  where a.id = p_id and a.commercial_id = v_me and a.status = 'prevu';
  if not found then
    raise exception 'Rendez-vous introuvable.' using errcode = '22023';
  end if;
end;
$$;
revoke execute on function public.commercial_cancel_appointment(uuid) from public, anon;
grant execute on function public.commercial_cancel_appointment(uuid) to authenticated;

-- Purge quotidienne : rendez-vous passés depuis plus de 12 mois.
create function app.purge_commercial_appointments()
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.commercial_appointments where starts_at < now() - interval '12 months'
$$;
revoke execute on function app.purge_commercial_appointments() from public, anon, authenticated;
select cron.schedule('menao-purge-rdv-commerciaux', '50 3 * * *', 'select app.purge_commercial_appointments()');
