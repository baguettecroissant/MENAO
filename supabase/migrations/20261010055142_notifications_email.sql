-- F-41 (phase 3b) — notifications par e-mail : file d'envoi remplie par la base (nouvelle
-- demande, rendez-vous fixé, déplacé, annulé, rappel de la veille), envoyée par la fonction
-- notify (Resend) appelée chaque minute par pg_cron et pg_net. ADR 0017.

create extension if not exists pg_net with schema extensions;

create type public.notification_type as enum (
  'nouvelle_demande', 'rdv_fixe', 'rdv_modifie', 'rdv_rappel', 'chantier_annule'
);
create type public.notification_channel as enum ('email', 'sms', 'push');
create type public.notification_status as enum ('a_envoyer', 'en_cours', 'envoyee', 'echec');

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  type public.notification_type not null,
  channel public.notification_channel not null default 'email',
  -- Données du modèle d'e-mail (titre, date, prénom…) : jamais d'e-mail ni de téléphone.
  data jsonb not null default '{}'::jsonb check (jsonb_typeof(data) = 'object'),
  status public.notification_status not null default 'a_envoyer',
  attempts smallint not null default 0,
  last_error text check (char_length(last_error) <= 200),
  locked_at timestamptz,
  sent_at timestamptz,
  -- Centre de notifications (phase 5).
  read_at timestamptz,
  -- Heure réelle : ordre d'envoi fiable même pour plusieurs notifications d'une transaction.
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default now()
);
create index notifications_file_idx on public.notifications (created_at)
  where status in ('a_envoyer', 'en_cours');
create index notifications_user_idx on public.notifications (user_id, created_at desc);
create trigger notifications_set_updated_at before update on public.notifications
  for each row execute function app.set_updated_at();
alter table public.notifications enable row level security;
-- Écriture par la base (déclencheurs) et par la fonction notify (service_role) uniquement.
revoke all on public.notifications from anon, authenticated;
grant select on public.notifications to authenticated;
create policy "notifications : lecture par le destinataire"
  on public.notifications for select to authenticated
  using (user_id = (select auth.uid()));

create function app.notify(p_user_id uuid, p_type public.notification_type, p_data jsonb)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.notifications (user_id, type, data)
  values (p_user_id, p_type, jsonb_strip_nulls(coalesce(p_data, '{}'::jsonb)))
$$;
revoke execute on function app.notify(uuid, public.notification_type, jsonb) from public, anon, authenticated;

-- Nom affiché de l'artisan (même règle que particulier_requests).
create function app.artisan_display_name(p_artisan_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(p.first_name, a.nom_commercial, a.raison_sociale)
  from public.artisans a
  left join public.profiles p on p.user_id = a.user_id
  where a.id = p_artisan_id
$$;
revoke execute on function app.artisan_display_name(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Déclencheurs
-- ---------------------------------------------------------------------------

-- Nouvelle demande (F-41) : à l'artisan. Résumé sans coordonnées, comme dans sa boîte.
create function app.notify_new_request()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
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
create trigger requests_notify after insert on public.requests
  for each row execute function app.notify_new_request();

-- Rendez-vous fixé, chantier annulé par l'artisan (journal des transitions) : au particulier.
create function app.notify_chantier_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  c public.chantiers;
begin
  if new.event = 'rdv_fixe' or (new.event = 'annulation' and new.details ->> 'par' = 'artisan') then
    select * into c from public.chantiers where id = new.chantier_id;
    perform app.notify(c.particulier_id,
      case when new.event = 'rdv_fixe' then 'rdv_fixe'::public.notification_type else 'chantier_annule' end,
      jsonb_build_object(
        'chantier_id', c.id,
        'titre', c.title,
        'artisan', app.artisan_display_name(c.artisan_id),
        'rendez_vous', new.details ->> 'rendez_vous',
        'motif', new.details ->> 'motif'
      ));
  end if;
  return new;
end;
$$;
create trigger chantier_events_notify after insert on public.chantier_events
  for each row execute function app.notify_chantier_event();

-- Rendez-vous déplacé : au particulier.
create function app.notify_appointment_moved()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'planifie' and new.starts_at is distinct from old.starts_at then
    perform app.notify(c.particulier_id, 'rdv_modifie', jsonb_build_object(
      'chantier_id', c.id,
      'titre', c.title,
      'artisan', app.artisan_display_name(c.artisan_id),
      'rendez_vous', new.starts_at
    ))
    from public.chantiers c
    where c.id = new.chantier_id;
  end if;
  return new;
end;
$$;
create trigger appointments_notify_moved after update of starts_at on public.appointments
  for each row execute function app.notify_appointment_moved();

-- F-18 « Rappels automatiques J-1 » : à partir de 18 h (heure de Paris), au particulier et à
-- l'artisan, une seule fois par rendez-vous (remis à zéro si la date change).
create function app.enqueue_appointment_reminders(p_now timestamptz default now())
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_today date := (p_now at time zone 'Europe/Paris')::date;
  v_count int := 0;
  r record;
begin
  if extract(hour from (p_now at time zone 'Europe/Paris')) < 18 then
    return 0;
  end if;
  for r in
    update public.appointments a set reminder_sent_at = p_now
    from public.chantiers c
    where c.id = a.chantier_id
      and c.status = 'rdv_planifie'
      and a.status = 'planifie'
      and a.reminder_sent_at is null
      and (a.starts_at at time zone 'Europe/Paris')::date = v_today + 1
    returning a.chantier_id, a.starts_at, c.title, c.particulier_id, c.artisan_id, c.adresse,
      c.ville_nom, c.code_postal
  loop
    perform app.notify(r.particulier_id, 'rdv_rappel', jsonb_build_object(
      'destinataire', 'particulier',
      'chantier_id', r.chantier_id,
      'titre', r.title,
      'artisan', app.artisan_display_name(r.artisan_id),
      'rendez_vous', r.starts_at
    ));
    perform app.notify(a.user_id, 'rdv_rappel', jsonb_build_object(
      'destinataire', 'artisan',
      'chantier_id', r.chantier_id,
      'titre', r.title,
      'client', nullif(concat_ws(' ', cp.first_name, cp.last_name), ''),
      'adresse', coalesce(r.adresse, nullif(concat_ws(' ', r.code_postal, r.ville_nom), '')),
      'rendez_vous', r.starts_at
    ))
    from public.artisans a
    left join public.profiles cp on cp.user_id = r.particulier_id
    where a.id = r.artisan_id;
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;
revoke execute on function app.enqueue_appointment_reminders(timestamptz) from public, anon, authenticated;
select cron.schedule('menao-rappels-rendez-vous', '5 * * * *', 'select app.enqueue_appointment_reminders()');

-- ---------------------------------------------------------------------------
-- Envoi (fonction notify, service_role)
-- ---------------------------------------------------------------------------

-- Lot de notifications à envoyer, verrouillées pendant l'envoi (reprises après 10 minutes si la
-- fonction s'est interrompue ; 5 tentatives au plus). Adresse et prénom du destinataire lus ici.
create function public.claim_notifications(p_limit int default 20)
returns table (
  id uuid,
  user_id uuid,
  type public.notification_type,
  data jsonb,
  email text,
  first_name text
)
language sql
security definer
set search_path = ''
as $$
  with picked as (
    select n.id from public.notifications n
    where n.channel = 'email'
      and n.attempts < 5
      and (n.status = 'a_envoyer' or (n.status = 'en_cours' and n.locked_at < now() - interval '10 minutes'))
    order by n.created_at, n.id
    limit least(greatest(coalesce(p_limit, 20), 1), 100)
    for update skip locked
  ),
  claimed as (
    update public.notifications n
    set status = 'en_cours', attempts = n.attempts + 1, locked_at = now()
    from picked
    where n.id = picked.id
    returning n.id, n.user_id, n.type, n.data
  )
  select c.id, c.user_id, c.type, c.data, u.email::text, p.first_name
  from claimed c
  join auth.users u on u.id = c.user_id
  left join public.profiles p on p.user_id = c.user_id
$$;
revoke execute on function public.claim_notifications(int) from public, anon, authenticated;
grant execute on function public.claim_notifications(int) to service_role;

-- Résultat d'un envoi : envoyée, à retenter (erreur passagère) ou en échec définitif.
create function public.complete_notification(
  p_id uuid,
  p_sent boolean,
  p_error text default null,
  p_retry boolean default true
)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.notifications set
    status = case
      when p_sent then 'envoyee'::public.notification_status
      when p_retry and attempts < 5 then 'a_envoyer'::public.notification_status
      else 'echec'::public.notification_status
    end,
    sent_at = case when p_sent then now() end,
    last_error = case when p_sent then null else left(p_error, 200) end,
    locked_at = null
  where id = p_id and status = 'en_cours'
$$;
revoke execute on function public.complete_notification(uuid, boolean, text, boolean) from public, anon, authenticated;
grant execute on function public.complete_notification(uuid, boolean, text, boolean) to service_role;

-- Appelle la fonction notify (pg_net) s'il reste des notifications à envoyer. Adresse et secret
-- partagé dans Vault (menao_notify_url, menao_notify_secret), posés par environnement : sans eux
-- (local, CI), rien n'est appelé.
create function app.dispatch_notifications()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_url text;
  v_secret text;
begin
  if not exists (
    select 1 from public.notifications
    where channel = 'email'
      and attempts < 5
      and (status = 'a_envoyer' or (status = 'en_cours' and locked_at < now() - interval '10 minutes'))
  ) then
    return;
  end if;
  select decrypted_secret into v_url from vault.decrypted_secrets where name = 'menao_notify_url';
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'menao_notify_secret';
  if v_url is null or v_secret is null then
    return;
  end if;
  perform net.http_post(
    url := v_url,
    body := '{}'::jsonb,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-menao-secret', v_secret),
    timeout_milliseconds := 20000
  );
end;
$$;
revoke execute on function app.dispatch_notifications() from public, anon, authenticated;
select cron.schedule('menao-envoi-notifications', '* * * * *', 'select app.dispatch_notifications()');
