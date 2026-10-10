-- F-41 (phase 5g) — centre de notifications et préférences : chaque notification (déjà créée
-- pour l'e-mail) est aussi lisible dans l'espace de son destinataire, avec un compteur de non
-- lues. Préférences d'e-mail : seules les notifications facultatives se désactivent (activité du
-- chantier, rappels) ; les notifications transactionnelles (devis, paiements, réception, litiges,
-- avis reçus…) sont toujours envoyées. Les e-mails non voulus passent à « ignoree ». ADR 0033.

-- ---------------------------------------------------------------------------
-- Lecture dans l'espace du destinataire
-- ---------------------------------------------------------------------------
create function public.my_notifications(p_limit int default 50)
returns table (
  notification_id uuid,
  type public.notification_type,
  data jsonb,
  created_at timestamptz,
  read_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select n.id, n.type, n.data, n.created_at, n.read_at
  from public.notifications n
  where n.user_id = auth.uid()
  order by n.created_at desc, n.id desc
  limit least(greatest(coalesce(p_limit, 50), 1), 100)
$$;
revoke execute on function public.my_notifications(int) from public, anon;
grant execute on function public.my_notifications(int) to authenticated;

create function public.my_unread_notifications()
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::int from public.notifications where user_id = auth.uid() and read_at is null
$$;
revoke execute on function public.my_unread_notifications() from public, anon;
grant execute on function public.my_unread_notifications() to authenticated;

-- Notifications marquées lues : celles indiquées, ou toutes (p_ids absent).
create function public.mark_notifications_read(p_ids uuid[] default null)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  update public.notifications set read_at = now()
  where user_id = auth.uid() and read_at is null and (p_ids is null or id = any (p_ids));
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;
revoke execute on function public.mark_notifications_read(uuid[]) from public, anon;
grant execute on function public.mark_notifications_read(uuid[]) to authenticated;

-- ---------------------------------------------------------------------------
-- Préférences d'e-mail (profiles.notification_preferences : {"email": {"activite": …, "rappels": …}})
-- ---------------------------------------------------------------------------
create function app.notification_category(p_type public.notification_type)
returns text
language sql
immutable
set search_path = ''
as $$
  select case p_type
    when 'chantier_nouveautes' then 'activite'
    when 'nouveaux_messages' then 'activite'
    when 'rdv_rappel' then 'rappels'
    when 'avis_relance' then 'rappels'
    when 'levee_relance' then 'rappels'
    else 'transactionnel'
  end
$$;

create function app.email_wanted(p_user_id uuid, p_type public.notification_type)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select app.notification_category(p_type) = 'transactionnel'
    or coalesce((
      select (p.notification_preferences #>> array['email', app.notification_category(p_type)])::boolean
      from public.profiles p where p.user_id = p_user_id
    ), true)
$$;
revoke execute on function app.notification_category(public.notification_type) from public, anon, authenticated;
revoke execute on function app.email_wanted(uuid, public.notification_type) from public, anon, authenticated;

create function public.set_notification_preferences(p_activite boolean, p_rappels boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_activite is null or p_rappels is null then
    raise exception 'Préférences incomplètes' using errcode = '22023';
  end if;
  update public.profiles
  set notification_preferences = coalesce(notification_preferences, '{}'::jsonb)
    || jsonb_build_object('email', jsonb_build_object('activite', p_activite, 'rappels', p_rappels))
  where user_id = auth.uid();
  if not found then
    raise exception 'Profil introuvable' using errcode = '42501';
  end if;
end;
$$;
revoke execute on function public.set_notification_preferences(boolean, boolean) from public, anon;
grant execute on function public.set_notification_preferences(boolean, boolean) to authenticated;

-- Envoi des e-mails : les notifications facultatives refusées par le destinataire passent à
-- « ignoree » (elles restent lisibles dans son espace) ; les autres sont envoyées comme avant.
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
  with skipped as (
    update public.notifications n
    set status = 'ignoree', updated_at = now()
    where n.channel = 'email' and n.status = 'a_envoyer' and n.send_after <= now()
      and not app.email_wanted(n.user_id, n.type)
    returning n.id
  ),
  picked as (
    select n.id from public.notifications n
    where n.channel = 'email'
      and n.attempts < 5
      and ((n.status = 'a_envoyer' and n.send_after <= now())
           or (n.status = 'en_cours' and n.locked_at < now() - interval '10 minutes'))
      and app.email_wanted(n.user_id, n.type)
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
