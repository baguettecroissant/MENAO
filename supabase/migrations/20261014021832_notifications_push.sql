-- F-41 (lot 6e) — notifications push (Expo Notifications) : jetons des appareils de l'application
-- (`push_tokens`, spec §14) et envoi par la fonction notify, en plus des e-mails. Chaque
-- notification de la file destinée à un compte qui a l'application part aussi en push, tout de
-- suite (les e-mails regroupés attendent leur fenêtre de 10 minutes). ADR 0078.

create type public.push_platform as enum ('ios', 'android');

create table public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  -- Jeton Expo de l'appareil : un appareil, un compte à la fois.
  token text not null unique check (token ~ '^Expo(nent)?PushToken\[[A-Za-z0-9_-]{1,200}\]$'),
  platform public.push_platform not null,
  -- Dernière ouverture de l'application avec ce jeton (heure réelle : ordre fiable même dans une
  -- seule transaction).
  last_seen_at timestamptz not null default clock_timestamp(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index push_tokens_user_idx on public.push_tokens (user_id);
create trigger push_tokens_set_updated_at before update on public.push_tokens
  for each row execute function app.set_updated_at();
alter table public.push_tokens enable row level security;
-- Écriture par les fonctions ci-dessous seulement (security definer).
revoke all on public.push_tokens from anon, authenticated;
grant select on public.push_tokens to authenticated;
create policy "push_tokens : lecture par le propriétaire"
  on public.push_tokens for select to authenticated
  using (user_id = (select auth.uid()));

-- Jeton de l'appareil, enregistré à chaque ouverture de l'application par un compte connecté (pas
-- une session anonyme de recherche). Il change de compte si l'appareil a changé d'utilisateur ;
-- 10 appareils au plus par compte (les plus anciens sont oubliés).
create function public.register_push_token(p_token text, p_platform public.push_platform)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
begin
  if not exists (select 1 from auth.users where id = v_user and not is_anonymous) then
    raise exception 'Connexion requise' using errcode = '42501';
  end if;
  insert into public.push_tokens (user_id, token, platform, last_seen_at)
  values (v_user, p_token, p_platform, clock_timestamp())
  on conflict (token) do update
    set user_id = excluded.user_id, platform = excluded.platform, last_seen_at = clock_timestamp();
  delete from public.push_tokens t
  where t.user_id = v_user
    and t.id not in (
      select k.id from public.push_tokens k
      where k.user_id = v_user
      order by k.last_seen_at desc, k.id
      limit 10
    );
end;
$$;
revoke execute on function public.register_push_token(text, public.push_platform) from public, anon;
grant execute on function public.register_push_token(text, public.push_platform) to authenticated;

-- Déconnexion de l'application : l'appareil ne reçoit plus les notifications de ce compte.
create function public.unregister_push_token(p_token text)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.push_tokens where token = p_token and user_id = (select auth.uid())
$$;
revoke execute on function public.unregister_push_token(text) from public, anon;
grant execute on function public.unregister_push_token(text) to authenticated;

-- ---------------------------------------------------------------------------
-- Envoi en push des notifications de la file
-- ---------------------------------------------------------------------------
alter table public.notifications
  add column push_status public.notification_status,
  add column push_attempts smallint not null default 0,
  add column push_locked_at timestamptz,
  add column pushed_at timestamptz;
create index notifications_push_file_idx on public.notifications (created_at)
  where push_status in ('a_envoyer', 'en_cours');

-- Toute notification destinée à un compte qui a l'application part aussi en push. Les
-- notifications regroupées (messages, nouveautés du chantier) ne repartent pas tant que la ligne
-- en attente est complétée : un push par fenêtre de 10 minutes.
create function app.notifications_push_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.channel = 'email'
     and exists (select 1 from public.push_tokens t where t.user_id = new.user_id) then
    new.push_status := 'a_envoyer';
  end if;
  return new;
end;
$$;
create trigger notifications_push_status before insert on public.notifications
  for each row execute function app.notifications_push_status();

-- Appel de la fonction notify chaque minute (pg_cron) : aussi quand seuls des pushes attendent
-- (l'e-mail d'un message reste en attente 10 minutes, le push part tout de suite).
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
  ) and not exists (
    select 1 from public.notifications
    where push_attempts < 3
      and ((push_status = 'a_envoyer')
           or (push_status = 'en_cours' and push_locked_at < now() - interval '10 minutes'))
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

-- Lot de pushes à envoyer (fonction notify, service_role), avec les jetons du destinataire.
-- Ignorées : notifications déjà lues dans l'application, de plus d'un jour, ou d'un compte qui
-- n'a plus d'appareil. Reprise après 10 minutes d'un envoi interrompu ; 3 tentatives au plus.
create function public.claim_push_notifications(p_limit int default 50)
returns table (
  id uuid,
  type public.notification_type,
  data jsonb,
  tokens text[]
)
language sql
security definer
set search_path = ''
as $$
  with skipped as (
    update public.notifications n
    set push_status = 'ignoree', updated_at = now()
    where n.push_status = 'a_envoyer'
      and (n.read_at is not null
           or n.created_at < now() - interval '1 day'
           or not exists (select 1 from public.push_tokens t where t.user_id = n.user_id))
    returning n.id
  ),
  picked as (
    select n.id from public.notifications n
    where n.push_attempts < 3
      and n.read_at is null
      and n.created_at >= now() - interval '1 day'
      and ((n.push_status = 'a_envoyer')
           or (n.push_status = 'en_cours' and n.push_locked_at < now() - interval '10 minutes'))
      and exists (select 1 from public.push_tokens t where t.user_id = n.user_id)
      and n.id not in (select s.id from skipped s)
    order by n.created_at, n.id
    limit least(greatest(coalesce(p_limit, 50), 1), 100)
    for update skip locked
  ),
  claimed as (
    update public.notifications n
    set push_status = 'en_cours', push_attempts = n.push_attempts + 1, push_locked_at = now()
    from picked
    where n.id = picked.id
    returning n.id, n.user_id, n.type, n.data
  )
  select c.id, c.type, c.data,
    array(
      select t.token from public.push_tokens t
      where t.user_id = c.user_id
      order by t.last_seen_at desc, t.id
    )
  from claimed c
$$;
revoke execute on function public.claim_push_notifications(int) from public, anon, authenticated;
grant execute on function public.claim_push_notifications(int) to service_role;

-- Résultat d'un envoi : envoyée, à retenter (erreur passagère du service) ou en échec.
create function public.complete_push_notification(p_id uuid, p_sent boolean, p_retry boolean)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.notifications
  set push_status = case
        when p_sent then 'envoyee'::public.notification_status
        when p_retry and push_attempts < 3 then 'a_envoyer'::public.notification_status
        else 'echec'::public.notification_status
      end,
      pushed_at = case when p_sent then now() else pushed_at end,
      push_locked_at = null
  where id = p_id and push_status = 'en_cours'
$$;
revoke execute on function public.complete_push_notification(uuid, boolean, boolean)
  from public, anon, authenticated;
grant execute on function public.complete_push_notification(uuid, boolean, boolean) to service_role;

-- Jetons refusés par le service Expo (application désinstallée, notifications désactivées) :
-- oubliés, ils ne servent plus.
create function public.forget_push_tokens(p_tokens text[])
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.push_tokens where token = any (coalesce(p_tokens, '{}'))
$$;
revoke execute on function public.forget_push_tokens(text[]) from public, anon, authenticated;
grant execute on function public.forget_push_tokens(text[]) to service_role;
