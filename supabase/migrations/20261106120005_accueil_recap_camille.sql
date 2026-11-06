-- Horaires d'accueil de l'équipe (F-81) et récapitulatif du matin de Camille (F-80), ADR 0230.
--
-- Horaires d'accueil : réglés par un admin dans le back-office (plages par jour de la semaine,
-- fermetures exceptionnelles, jours fériés fermés ou non), heure de Paris. Ils servent :
--   - à Camille, pour dire quand l'équipe rappelle (reception_status) ;
--   - au récapitulatif, pour compter les appels reçus hors horaires ;
--   - plus tard, à l'aiguillage de la ligne téléphonique (secrétaire aux heures d'accueil, Camille
--     le reste du temps).
-- Récapitulatif : chaque matin à 8 h (heure de Paris), un e-mail à l'équipe (admins et support)
-- avec ce que Camille a fait depuis le précédent : appels, minutes, appels hors horaires, demandes
-- de rappel (motifs), rendez-vous pris, demandes de travaux préparées et validées. Rien s'il ne
-- s'est rien passé. Aucune coordonnée dans la notification.

-- ---------------------------------------------------------------------------
-- Jours fériés en France (métropole) : fêtes fixes, lundi de Pâques, Ascension, lundi de Pentecôte.
-- ---------------------------------------------------------------------------
create function app.easter_sunday(p_year int)
returns date
language plpgsql
immutable
set search_path = ''
as $$
declare
  a int := p_year % 19;
  b int := p_year / 100;
  c int := p_year % 100;
  d int; e int; f int; g int; h int; i int; k int; l int; m int;
begin
  d := b / 4; e := b % 4; f := (b + 8) / 25; g := (b - f + 1) / 3;
  h := (19 * a + b - d - g + 15) % 30;
  i := c / 4; k := c % 4;
  l := (32 + 2 * e + 2 * i - h - k) % 7;
  m := (a + 11 * h + 22 * l) / 451;
  return make_date(p_year, (h + l - 7 * m + 114) / 31, ((h + l - 7 * m + 114) % 31) + 1);
end;
$$;

create function app.is_french_public_holiday(p_day date)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select to_char(p_day, 'MM-DD') in ('01-01', '05-01', '05-08', '07-14', '08-15', '11-01', '11-11', '12-25')
    or p_day - app.easter_sunday(extract(year from p_day)::int) in (1, 39, 50)
$$;

-- ---------------------------------------------------------------------------
-- Réglage unique des horaires d'accueil. Par défaut : du lundi au vendredi, de 9 h à 17 h.
-- Plage : {"jour": 1 (lundi) à 7 (dimanche), "debut": "09:00", "fin": "17:00"}.
-- ---------------------------------------------------------------------------
create table public.reception_settings (
  id boolean primary key default true check (id),
  hours jsonb not null default '[
    {"jour": 1, "debut": "09:00", "fin": "17:00"},
    {"jour": 2, "debut": "09:00", "fin": "17:00"},
    {"jour": 3, "debut": "09:00", "fin": "17:00"},
    {"jour": 4, "debut": "09:00", "fin": "17:00"},
    {"jour": 5, "debut": "09:00", "fin": "17:00"}
  ]'::jsonb,
  closed_dates date[] not null default '{}',
  holidays_closed boolean not null default true,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null
);
insert into public.reception_settings (id) values (true);
alter table public.reception_settings enable row level security;
create policy "reception_settings : lecture par l'équipe"
  on public.reception_settings for select to authenticated
  using ((select app.is_staff()));

-- Accueil ouvert à cet instant (heure de Paris).
create function app.reception_open_at(p_at timestamptz)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.reception_settings s
    cross join lateral jsonb_array_elements(s.hours) h
    where s.id
      and (h ->> 'jour')::int = extract(isodow from (p_at at time zone 'Europe/Paris'))::int
      and (p_at at time zone 'Europe/Paris')::time >= (h ->> 'debut')::time
      and (p_at at time zone 'Europe/Paris')::time < (h ->> 'fin')::time
      and not ((p_at at time zone 'Europe/Paris')::date = any (s.closed_dates))
      and not (s.holidays_closed and app.is_french_public_holiday((p_at at time zone 'Europe/Paris')::date))
  )
$$;
revoke execute on function app.reception_open_at(timestamptz) from public, anon, authenticated;

-- Ouvert maintenant ? Heure de fermeture de la plage en cours, ou prochaine ouverture (14 jours).
create function app.reception_status_at(p_at timestamptz)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  s public.reception_settings;
  v_local timestamp := p_at at time zone 'Europe/Paris';
  v_day date;
  v_close timestamptz;
  v_next timestamptz;
  r record;
begin
  select * into s from public.reception_settings where id;
  if found then
    for i in 0..14 loop
      v_day := v_local::date + i;
      continue when v_day = any (s.closed_dates)
        or (s.holidays_closed and app.is_french_public_holiday(v_day));
      for r in
        select (h ->> 'debut')::time as debut, (h ->> 'fin')::time as fin
        from jsonb_array_elements(s.hours) h
        where (h ->> 'jour')::int = extract(isodow from v_day)::int
        order by 1
      loop
        if i = 0 and v_local::time >= r.debut and v_local::time < r.fin then
          v_close := (v_day + r.fin) at time zone 'Europe/Paris';
        elsif v_next is null and (i > 0 or r.debut > v_local::time) then
          v_next := (v_day + r.debut) at time zone 'Europe/Paris';
        end if;
      end loop;
      exit when v_next is not null;
    end loop;
  end if;
  return jsonb_build_object('ouvert', v_close is not null, 'ferme_a', v_close, 'prochaine_ouverture', v_next);
end;
$$;
revoke execute on function app.reception_status_at(timestamptz) from public, anon, authenticated;

-- Pour Camille (rôle service) et l'équipe.
create function public.reception_status()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is not null and not app.is_staff() then
    raise exception 'Réservé à l''équipe MENAO' using errcode = '42501';
  end if;
  return app.reception_status_at(now());
end;
$$;
revoke execute on function public.reception_status() from public, anon;
grant execute on function public.reception_status() to authenticated, service_role;

-- Enregistrement par un admin.
create function public.admin_save_reception_settings(
  p_hours jsonb,
  p_closed_dates date[],
  p_holidays_closed boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row jsonb;
  v_time text := '^([01][0-9]|2[0-3]):[0-5][0-9]$';
begin
  perform app.require_admin();
  if p_hours is null or jsonb_typeof(p_hours) <> 'array' or jsonb_array_length(p_hours) > 14 then
    raise exception 'Horaires invalides.' using errcode = '22023';
  end if;
  for v_row in select value from jsonb_array_elements(p_hours) loop
    if jsonb_typeof(v_row) <> 'object'
      or coalesce(v_row ->> 'jour', '') !~ '^[1-7]$'
      or coalesce(v_row ->> 'debut', '') !~ v_time
      or coalesce(v_row ->> 'fin', '') !~ v_time
      or (v_row ->> 'debut')::time >= (v_row ->> 'fin')::time
    then
      raise exception 'Horaires invalides : chaque plage va d''une heure de début à une heure de fin plus tardive.'
        using errcode = '22023';
    end if;
  end loop;
  if cardinality(coalesce(p_closed_dates, '{}')) > 100 then
    raise exception 'Cent dates de fermeture au plus.' using errcode = '22023';
  end if;
  if exists (
    select 1 from unnest(coalesce(p_closed_dates, '{}')) d
    where d not between date '2020-01-01' and date '2040-12-31'
  ) then
    raise exception 'Indiquez des dates de fermeture entre 2020 et 2040.' using errcode = '22023';
  end if;
  update public.reception_settings set
    hours = (
      select coalesce(jsonb_agg(jsonb_build_object(
        'jour', (x ->> 'jour')::int, 'debut', x ->> 'debut', 'fin', x ->> 'fin'
      ) order by (x ->> 'jour')::int, x ->> 'debut'), '[]'::jsonb)
      from jsonb_array_elements(p_hours) x
    ),
    closed_dates = (
      select coalesce(array_agg(distinct d order by d), '{}') from unnest(coalesce(p_closed_dates, '{}')) d
    ),
    holidays_closed = coalesce(p_holidays_closed, true),
    updated_at = now(),
    updated_by = (select auth.uid())
  where id;
end;
$$;
revoke execute on function public.admin_save_reception_settings(jsonb, date[], boolean) from public, anon;
grant execute on function public.admin_save_reception_settings(jsonb, date[], boolean) to authenticated;

-- ---------------------------------------------------------------------------
-- Récapitulatif du matin.
-- ---------------------------------------------------------------------------
-- Demandes de travaux préparées au téléphone (ADR 0227), pour les compter.
alter table public.project_transfers add column via_telephone boolean not null default false;

create or replace function public.voice_prepare_work_request(
  p_project_id uuid,
  p_first_name text,
  p_email text,
  p_phone text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_token text := encode(extensions.gen_random_bytes(32), 'hex');
  v_owner uuid;
  v_transfer uuid;
begin
  -- Coordonnées des liens expirés : effacées au passage.
  delete from public.voice_work_requests v
  using public.project_transfers t
  where t.id = v.transfer_id and t.expires_at <= now();

  select p.user_id into v_owner
  from public.projects p
  join auth.users u on u.id = p.user_id
  where p.id = p_project_id and u.is_anonymous and p.status in ('brouillon', 'criteres_valides');
  if not found then
    raise exception 'Projet introuvable' using errcode = '42501';
  end if;
  if (
    select count(*) from public.voice_work_requests
    where phone = p_phone and created_at > now() - interval '1 day'
  ) >= 3 then
    raise exception 'Trop de demandes pour ce numéro aujourd''hui' using errcode = '22023';
  end if;

  insert into public.project_transfers (project_id, from_user_id, token_hash, expires_at, via_telephone)
  values (
    p_project_id, v_owner, encode(extensions.digest(v_token, 'sha256'), 'hex'), now() + interval '7 days', true
  )
  returning id into v_transfer;
  insert into public.voice_work_requests (project_id, transfer_id, first_name, email, phone)
  values (p_project_id, v_transfer, btrim(p_first_name), lower(btrim(p_email)), p_phone);
  return v_token;
end;
$$;

-- Un récapitulatif par jour (heure de Paris).
create table public.camille_recaps (
  day date primary key,
  sent_at timestamptz not null default now()
);
-- Aucune politique : écrit par la fonction ci-dessous seulement.
alter table public.camille_recaps enable row level security;

create function app.send_camille_recap(p_now timestamptz default now())
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_local timestamp := p_now at time zone 'Europe/Paris';
  v_since timestamptz;
  v_calls int;
  v_minutes int;
  v_after_hours int;
  v_callbacks int;
  v_reasons jsonb;
  v_appointments int;
  v_prepared int;
  v_validated int;
begin
  if extract(hour from v_local) <> 8
    or exists (select 1 from public.camille_recaps where day = v_local::date) then
    return 0;
  end if;
  select max(sent_at) into v_since from public.camille_recaps;
  v_since := greatest(coalesce(v_since, p_now - interval '24 hours'), p_now - interval '7 days');
  insert into public.camille_recaps (day, sent_at) values (v_local::date, p_now);

  select count(*), coalesce(round(sum(audio_seconds) / 60.0), 0),
    count(*) filter (where not app.reception_open_at(created_at))
  into v_calls, v_minutes, v_after_hours
  from public.ai_runs
  where function_name = 'voice-assistant' and created_at >= v_since and created_at < p_now;

  select count(*), coalesce(jsonb_agg(x.motif) filter (where x.motif is not null and x.n <= 5), '[]'::jsonb)
  into v_callbacks, v_reasons
  from (
    select left(substring(t.message from 'Motif : ([^\n]+)'), 160) as motif,
      row_number() over (order by t.created_at) as n
    from public.tickets t
    where t.subject = 'Demande de rappel (secrétaire vocale Camille)'
      and t.created_at >= v_since and t.created_at < p_now
  ) x;

  select count(*) into v_appointments
  from public.commercial_appointments
  where created_at >= v_since and created_at < p_now;

  select count(*), count(*) filter (where used_at is not null) into v_prepared, v_validated
  from public.project_transfers
  where via_telephone and created_at >= v_since and created_at < p_now;

  if v_calls + v_callbacks + v_appointments + v_prepared = 0 then
    return 0;
  end if;
  perform app.notify(p.user_id, 'equipe_recap_camille', jsonb_build_object(
    'appels', v_calls,
    'minutes', v_minutes,
    'hors_horaires', v_after_hours,
    'rappels', v_callbacks,
    'motifs', v_reasons,
    'rendez_vous', v_appointments,
    'demandes_preparees', v_prepared,
    'demandes_validees', v_validated
  ))
  from public.profiles p
  where p.role in ('admin', 'support');
  return 1;
end;
$$;
revoke execute on function app.send_camille_recap(timestamptz) from public, anon, authenticated;

-- Toutes les heures : la fonction n'envoie qu'à 8 h, heure de Paris (heure d'été comprise).
select cron.schedule('menao-recap-camille', '0 * * * *', 'select app.send_camille_recap()');
