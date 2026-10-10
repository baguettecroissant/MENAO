-- F-12 (phase 4d) — « Mes chantiers » du client et vue d'un chantier (suivi, dossier) :
-- - liste et détail des chantiers du client (artisan, prochaine intervention, devis, acompte) ;
-- - fichier agenda étendu au démarrage des travaux ;
-- - journal ouvert au début des travaux (F-22 « pendant les travaux », maquettes) ;
-- - nouveautés du journal notifiées au client, regroupées par fenêtre de 10 minutes.
-- ADR 0026.

-- ---------------------------------------------------------------------------
-- Journal du chantier : ouvert pendant les travaux et jusqu'à la réception
-- (packages/core : CHANTIER_JOURNAL_STATUSES).
-- ---------------------------------------------------------------------------
create or replace function app.chantier_journal_open(p_status public.chantier_status)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select p_status in ('en_cours', 'travaux_termines', 'reserves_a_lever')
$$;

-- ---------------------------------------------------------------------------
-- Notifications différées : envoyées à partir de send_after.
-- ---------------------------------------------------------------------------
alter table public.notifications add column send_after timestamptz not null default now();

create or replace function public.claim_notifications(p_limit int default 20)
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
      and ((n.status = 'a_envoyer' and n.send_after <= now())
           or (n.status = 'en_cours' and n.locked_at < now() - interval '10 minutes'))
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

create or replace function app.dispatch_notifications()
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
      and ((status = 'a_envoyer' and send_after <= now())
           or (status = 'en_cours' and locked_at < now() - interval '10 minutes'))
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

-- Nouveautés du journal (F-22, F-12) : une notification au client par fenêtre de 10 minutes,
-- avec le nombre de photos et de messages ajoutés. Une notification déjà tentée n'est plus
-- complétée : les ajouts suivants en ouvrent une nouvelle.
create unique index notifications_nouveautes_en_attente
  on public.notifications (user_id, (data ->> 'chantier_id'))
  where type = 'chantier_nouveautes' and status = 'a_envoyer' and attempts = 0;

create function app.notify_chantier_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  c public.chantiers;
begin
  select * into c from public.chantiers where id = new.chantier_id;
  insert into public.notifications as n (user_id, type, data, send_after)
  values (c.particulier_id, 'chantier_nouveautes', jsonb_build_object(
      'chantier_id', c.id,
      'titre', c.title,
      'artisan', app.artisan_display_name(c.artisan_id),
      'photos', (new.kind = 'photo')::int,
      'messages', (new.kind = 'message')::int
    ), now() + interval '10 minutes')
  on conflict (user_id, (data ->> 'chantier_id'))
    where type = 'chantier_nouveautes' and status = 'a_envoyer' and attempts = 0
  do update set data = n.data || jsonb_build_object(
    'photos', (n.data ->> 'photos')::int + (excluded.data ->> 'photos')::int,
    'messages', (n.data ->> 'messages')::int + (excluded.data ->> 'messages')::int
  );
  return new;
end;
$$;
create trigger chantier_updates_notify after insert on public.chantier_updates
  for each row execute function app.notify_chantier_update();

-- ---------------------------------------------------------------------------
-- « Mes chantiers » (F-12) : chantiers du client avec l'artisan, la prochaine intervention, le
-- dernier devis envoyé et l'acompte. p_chantier_id : un seul chantier (vue d'un chantier).
-- ---------------------------------------------------------------------------
create function public.particulier_chantiers(p_chantier_id uuid default null)
returns table (
  chantier_id uuid,
  project_id uuid,
  status public.chantier_status,
  title text,
  description text,
  adresse text,
  ville_nom text,
  code_postal text,
  photo_path text,
  artisan_id uuid,
  artisan_name text,
  artisan_avatar_path text,
  artisan_phone text,
  trade_label text,
  appointment_at timestamptz,
  start_at timestamptz,
  finished_at timestamptz,
  closed_at timestamptz,
  quote_id uuid,
  quote_status public.quote_status,
  quote_total_ttc_cents bigint,
  deposit_cents bigint,
  deposit_status public.payment_status,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select c.id, c.project_id, c.status, c.title, p.description,
    c.adresse, c.ville_nom, c.code_postal,
    (select ph.storage_path from public.project_photos ph
     where ph.project_id = c.project_id order by ph.sort_order, ph.created_at limit 1),
    a.id, coalesce(pr.first_name, a.nom_commercial, a.raison_sociale), pr.avatar_path,
    -- Coordonnées de l'artisan tant que la demande est acceptée (F-17).
    case when r.status = 'acceptee' then pr.phone end,
    t.label,
    (select ap.starts_at from public.appointments ap where ap.chantier_id = c.id and ap.status = 'planifie'),
    c.start_at,
    (select e.created_at from public.chantier_events e
     where e.chantier_id = c.id and e.event = 'fin_declaree' order by e.created_at desc limit 1),
    (select e.created_at from public.chantier_events e
     where e.chantier_id = c.id and e.to_status in ('cloture', 'annule', 'devis_refuse')
     order by e.created_at desc limit 1),
    q.id, q.status, q.total_ttc_cents,
    (select (s ->> 'amount_cents')::bigint from jsonb_array_elements(q.payment_schedule) s
     where s ->> 'trigger' = 'signature' limit 1),
    (select pay.status from public.payments pay
     where pay.quote_id = q.id and pay.kind = 'acompte' and pay.status in ('en_attente', 'en_cours', 'paye')
     limit 1),
    c.created_at
  from public.chantiers c
  join public.requests r on r.id = c.request_id
  join public.projects p on p.id = c.project_id
  join public.artisans a on a.id = c.artisan_id
  left join public.profiles pr on pr.user_id = a.user_id
  left join public.trades t on t.code = p.trade_code
  left join lateral (
    select q0.id, q0.status, q0.total_ttc_cents, q0.payment_schedule from public.quotes q0
    where q0.chantier_id = c.id and q0.status <> 'brouillon'
    order by q0.version desc
    limit 1
  ) q on true
  where c.particulier_id = auth.uid()
    and (p_chantier_id is null or c.id = p_chantier_id)
  order by c.created_at desc
$$;
revoke execute on function public.particulier_chantiers(uuid) from public, anon;
grant execute on function public.particulier_chantiers(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Fichier agenda (F-12, F-44) : rendez-vous à venir, puis démarrage des travaux une fois la date
-- confirmée. Le type de retour change (kind) : suppression puis recréation.
-- ---------------------------------------------------------------------------
drop function public.chantier_appointment(uuid);
create function public.chantier_appointment(p_chantier_id uuid)
returns table (
  starts_at timestamptz,
  title text,
  adresse text,
  ville_nom text,
  code_postal text,
  artisan_name text,
  client_name text,
  kind text
)
language sql
stable
security definer
set search_path = ''
as $$
  select case when c.status = 'planifie' then c.start_at else a.starts_at end,
    c.title, c.adresse, c.ville_nom, c.code_postal,
    coalesce(ap.first_name, ar.nom_commercial, ar.raison_sociale),
    nullif(concat_ws(' ', cp.first_name, cp.last_name), ''),
    case when c.status = 'planifie' then 'demarrage' else 'rendez_vous' end
  from public.chantiers c
  join public.artisans ar on ar.id = c.artisan_id
  left join public.appointments a on a.chantier_id = c.id and a.status = 'planifie'
  left join public.profiles ap on ap.user_id = ar.user_id
  left join public.profiles cp on cp.user_id = c.particulier_id
  where c.id = p_chantier_id
    and ((c.status = 'rdv_planifie' and a.id is not null)
         or (c.status = 'planifie' and c.start_at is not null))
    and (c.particulier_id = auth.uid() or c.artisan_id = app.my_artisan_id())
$$;
revoke execute on function public.chantier_appointment(uuid) from public, anon;
grant execute on function public.chantier_appointment(uuid) to authenticated;
