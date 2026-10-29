-- Messagerie instantanée (F-40, F-41, ADR 0201) : une notification push à chaque message, envoyée
-- en quelques secondes, au lieu d'une seule par conversation et par fenêtre de 10 minutes au rythme
-- du cron. L'e-mail reste groupé (notification « nouveaux_messages », 10 minutes, annulée si la
-- conversation est lue) ; il ne part plus en push, pour éviter le doublon.

create type public.message_push_status as enum ('a_envoyer', 'en_cours', 'envoyee', 'echec', 'ignoree');

-- File des pushes de messages : une ligne par message dont le destinataire a l'application.
-- Écrite par le déclencheur des messages, lue par la fonction notify (service_role) seulement.
create table public.message_pushes (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null unique references public.messages (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  status public.message_push_status not null default 'a_envoyer',
  attempts smallint not null default 0 check (attempts between 0 and 10),
  locked_at timestamptz,
  pushed_at timestamptz,
  created_at timestamptz not null default clock_timestamp()
);
create index message_pushes_user_idx on public.message_pushes (user_id);
create index message_pushes_pending_idx on public.message_pushes (created_at)
  where status in ('a_envoyer', 'en_cours');
alter table public.message_pushes enable row level security;
-- Aucune politique : ni les comptes ni les visiteurs n'y ont accès (fonctions security definer).
revoke all on public.message_pushes from anon, authenticated;

-- Appel immédiat de la fonction notify (pg_net, envoyé après la validation de la transaction).
-- Sans les secrets du coffre (tests, base locale), rien ne part ; le cron reste le filet.
create function app.kick_notify()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_url text;
  v_secret text;
begin
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
revoke execute on function app.kick_notify() from public, anon, authenticated;

-- Même fonction qu'avant, avec le push du message pour un destinataire qui a l'application.
create or replace function app.notify_new_message()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  c public.chantiers;
  v_recipient uuid;
  v_author text;
  v_side text;
begin
  select * into c from public.chantiers where id = new.chantier_id;
  if new.author_id = c.particulier_id then
    select a.user_id into v_recipient from public.artisans a where a.id = c.artisan_id;
    select coalesce(p.first_name, 'Votre client') into v_author
    from public.profiles p where p.user_id = c.particulier_id;
    v_side := 'artisan';
  else
    v_recipient := c.particulier_id;
    v_author := app.artisan_display_name(c.artisan_id);
    v_side := 'client';
  end if;
  if v_recipient is null then
    return new;
  end if;
  insert into public.notifications as n (user_id, type, data, send_after)
  values (v_recipient, 'nouveaux_messages', jsonb_build_object(
      'chantier_id', c.id,
      'titre', c.title,
      'auteur', v_author,
      'destinataire', v_side,
      'messages', 1
    ), now() + interval '10 minutes')
  on conflict (user_id, (data ->> 'chantier_id'))
    where type = 'nouveaux_messages' and status = 'a_envoyer' and attempts = 0
  do update set data = n.data || jsonb_build_object('messages', (n.data ->> 'messages')::int + 1);

  if exists (select 1 from public.push_tokens t where t.user_id = v_recipient) then
    insert into public.message_pushes (message_id, user_id) values (new.id, v_recipient);
    perform app.kick_notify();
  end if;
  return new;
end;
$$;

-- L'e-mail groupé des messages ne part plus en push : chaque message a déjà le sien.
create or replace function app.notifications_push_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.channel = 'email'
     and new.type not in ('abonnement_impaye', 'mois_offert', 'nouveaux_messages')
     and exists (select 1 from public.push_tokens t where t.user_id = new.user_id) then
    new.push_status := 'a_envoyer';
  end if;
  return new;
end;
$$;

-- Cron de chaque minute : il appelle aussi notify pour un push de message resté en attente.
create or replace function app.dispatch_notifications()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.notifications
    where channel = 'email'
      and attempts < 5
      and ((status = 'a_envoyer' and send_after <= now())
           or (status = 'en_cours' and locked_at < now() - interval '10 minutes'))
  ) and not exists (
    select 1 from public.notifications
    where push_attempts < 3
      and ((push_status = 'a_envoyer')
           or (push_status = 'en_cours' and push_locked_at < now() - interval '10 minutes'))
  ) and not exists (
    select 1 from public.message_pushes
    where attempts < 3
      and created_at >= now() - interval '1 hour'
      and (status = 'a_envoyer' or (status = 'en_cours' and locked_at < now() - interval '2 minutes'))
  ) then
    return;
  end if;
  perform app.kick_notify();
end;
$$;

-- Lot de pushes de messages (fonction notify, service_role) : auteur, chantier, début du texte et
-- jetons du destinataire. Ignorés : message déjà lu ou masqué, de plus d'une heure, ou destinataire
-- sans appareil. Reprise après 2 minutes d'un envoi interrompu ; 3 tentatives au plus. Les lignes
-- de plus de 7 jours sont effacées au passage.
create function public.claim_message_pushes(p_limit int default 50)
returns table (
  id uuid,
  chantier_id uuid,
  titre text,
  auteur text,
  destinataire text,
  kind public.message_kind,
  apercu text,
  tokens text[]
)
language sql
security definer
set search_path = ''
as $$
  with purged as (
    delete from public.message_pushes where created_at < now() - interval '7 days'
  ),
  skipped as (
    update public.message_pushes p
    set status = 'ignoree'
    from public.messages m
    where m.id = p.message_id
      and p.status = 'a_envoyer'
      and (m.read_at is not null
           or m.hidden_at is not null
           or p.created_at < now() - interval '1 hour'
           or not exists (select 1 from public.push_tokens t where t.user_id = p.user_id))
    returning p.id
  ),
  picked as (
    select p.id from public.message_pushes p
    where p.attempts < 3
      and p.created_at >= now() - interval '1 hour'
      and (p.status = 'a_envoyer'
           or (p.status = 'en_cours' and p.locked_at < now() - interval '2 minutes'))
      and p.id not in (select s.id from skipped s)
    order by p.created_at, p.id
    limit least(greatest(coalesce(p_limit, 50), 1), 100)
    for update skip locked
  ),
  claimed as (
    update public.message_pushes p
    set status = 'en_cours', attempts = p.attempts + 1, locked_at = now()
    from picked
    where p.id = picked.id
    returning p.id, p.message_id, p.user_id
  )
  select c.id, m.chantier_id, ch.title,
    case when m.author_id = ch.particulier_id
      then coalesce((select pr.first_name from public.profiles pr where pr.user_id = ch.particulier_id),
                    'Votre client')
      else app.artisan_display_name(ch.artisan_id)
    end,
    case when m.author_id = ch.particulier_id then 'artisan' else 'client' end,
    m.kind,
    case when m.kind = 'texte' then left(m.body, 180) end,
    array(
      select t.token from public.push_tokens t
      where t.user_id = c.user_id
      order by t.last_seen_at desc, t.id
    )
  from claimed c
  join public.messages m on m.id = c.message_id
  join public.chantiers ch on ch.id = m.chantier_id
$$;
revoke execute on function public.claim_message_pushes(int) from public, anon, authenticated;
grant execute on function public.claim_message_pushes(int) to service_role;

create function public.complete_message_push(p_id uuid, p_sent boolean, p_retry boolean)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.message_pushes
  set status = case
        when p_sent then 'envoyee'::public.message_push_status
        when p_retry and attempts < 3 then 'a_envoyer'::public.message_push_status
        else 'echec'::public.message_push_status
      end,
      pushed_at = case when p_sent then now() else pushed_at end,
      locked_at = null
  where id = p_id and status = 'en_cours'
$$;
revoke execute on function public.complete_message_push(uuid, boolean, boolean)
  from public, anon, authenticated;
grant execute on function public.complete_message_push(uuid, boolean, boolean) to service_role;
