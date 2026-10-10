-- F-40 (phase 5e) — messagerie par chantier (particulier ↔ artisan) : texte, photos et documents
-- PDF. Une conversation existe dès que le chantier existe, c'est-à-dire après l'acceptation de la
-- demande : l'option « masquer les coordonnées avant l'acceptation » ([À VALIDER], F-40) est sans
-- objet. Fermée (lecture seule) si le chantier est annulé ou le devis refusé. Temps réel (Supabase
-- Realtime) quand la conversation est ouverte ; sinon e-mail groupé par fenêtre de 10 minutes,
-- annulé si les messages sont lus entre-temps. Signalement d'un message, masquage motivé par
-- l'équipe. ADR 0031.

create type public.message_kind as enum ('texte', 'photo', 'fichier');

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  chantier_id uuid not null references public.chantiers (id) on delete cascade,
  author_id uuid references auth.users (id) on delete set null,
  kind public.message_kind not null,
  body text check (char_length(body) between 1 and 2000),
  -- Pièce jointe rangée par process-upload dans « message-attachments/<chantier_id>/<fichier> ».
  storage_path text unique check (char_length(storage_path) <= 300),
  -- Lu par le destinataire (l'autre partie du chantier).
  read_at timestamptz,
  -- Masqué par l'équipe MENAO (F-55), avec son motif.
  hidden_at timestamptz,
  moderation_reason text check (char_length(moderation_reason) between 10 and 500),
  moderated_by uuid references auth.users (id) on delete set null,
  -- Heure réelle : ordre fiable, même pour plusieurs envois d'une transaction.
  created_at timestamptz not null default clock_timestamp(),
  check (
    (kind = 'texte' and body is not null and storage_path is null)
    or (kind in ('photo', 'fichier') and body is null and storage_path is not null
        and starts_with(storage_path, chantier_id::text || '/'))
  ),
  check ((hidden_at is null) = (moderation_reason is null))
);
create index messages_chantier_idx on public.messages (chantier_id, created_at);
create index messages_author_idx on public.messages (author_id);
alter table public.messages enable row level security;
-- Écriture par les fonctions ci-dessous seulement.
revoke all on public.messages from anon, authenticated;
grant select on public.messages to authenticated;

-- Lecture directe (temps réel) : les deux parties du chantier et l'équipe. L'affichage passe par
-- chantier_messages, qui masque le contenu des messages masqués.
create policy "messages : lecture par les parties du chantier ou l'équipe"
  on public.messages for select to authenticated
  using (
    (select app.is_staff())
    or exists (
      select 1 from public.chantiers c
      where c.id = chantier_id
        and (c.particulier_id = (select auth.uid()) or c.artisan_id = (select app.my_artisan_id()))
    )
  );
alter publication supabase_realtime add table public.messages;

-- Pièces jointes : privées, servies par URL signées aux parties et à l'équipe.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('message-attachments', 'message-attachments', false, 10485760,
   array['image/jpeg', 'image/png', 'application/pdf'])
on conflict (id) do nothing;

create policy "message-attachments : lecture par les parties du chantier ou l'équipe"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'message-attachments'
    and ((select app.can_read_chantier_folder(name)) or (select app.is_staff()))
  );

-- Conversation fermée (lecture seule) : chantier annulé ou devis refusé.
create function app.conversation_closed(p_status public.chantier_status)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select p_status in ('annule', 'devis_refuse')
$$;
revoke execute on function app.conversation_closed(public.chantier_status) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Envoi d'un message texte (partie du chantier), 30 messages par minute au plus.
-- ---------------------------------------------------------------------------
create function public.send_message(p_chantier_id uuid, p_body text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  c public.chantiers;
  v_body text := btrim(p_body);
  v_id uuid;
begin
  select * into c from public.chantiers
  where id = p_chantier_id
    and (particulier_id = auth.uid() or artisan_id = app.my_artisan_id());
  if not found then
    raise exception 'Conversation introuvable' using errcode = '42501';
  end if;
  if app.conversation_closed(c.status) then
    raise exception 'Cette conversation est fermée' using errcode = '22023';
  end if;
  if coalesce(char_length(v_body) not between 1 and 2000, true) then
    raise exception 'Votre message doit compter entre 1 et 2 000 caractères' using errcode = '22023';
  end if;
  if not public.consume_rate_limit('message:' || auth.uid()::text, 30, 60) then
    raise exception 'Trop de messages envoyés : patientez une minute' using errcode = '22023';
  end if;
  insert into public.messages (chantier_id, author_id, kind, body)
  values (c.id, auth.uid(), 'texte', v_body)
  returning id into v_id;
  return v_id;
end;
$$;
revoke execute on function public.send_message(uuid, text) from public, anon;
grant execute on function public.send_message(uuid, text) to authenticated;

-- Pièce jointe vérifiée et rangée par process-upload (service_role) : photo ou document PDF.
create function public.record_message_attachment(
  p_chantier_id uuid,
  p_user_id uuid,
  p_kind public.message_kind,
  p_storage_path text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  c public.chantiers;
begin
  if p_kind not in ('photo', 'fichier') then
    return 'invalid';
  end if;
  select ch.* into c from public.chantiers ch
  where ch.id = p_chantier_id
    and (ch.particulier_id = p_user_id
         or ch.artisan_id = (select a.id from public.artisans a where a.user_id = p_user_id));
  if not found then
    return 'forbidden';
  end if;
  if app.conversation_closed(c.status) then
    return 'locked';
  end if;
  if (select count(*) from public.messages
      where chantier_id = c.id and kind in ('photo', 'fichier')) >= 200 then
    return 'limit';
  end if;
  insert into public.messages (chantier_id, author_id, kind, storage_path)
  values (c.id, p_user_id, p_kind, p_storage_path);
  return 'ok';
end;
$$;
revoke execute on function public.record_message_attachment(uuid, uuid, public.message_kind, text) from public, anon, authenticated;
grant execute on function public.record_message_attachment(uuid, uuid, public.message_kind, text) to service_role;

-- ---------------------------------------------------------------------------
-- Notification groupée du destinataire : une par conversation et par fenêtre de 10 minutes, avec
-- le nombre de messages ; supprimée si la conversation est lue avant l'envoi.
-- ---------------------------------------------------------------------------
create unique index notifications_messages_en_attente
  on public.notifications (user_id, (data ->> 'chantier_id'))
  where type = 'nouveaux_messages' and status = 'a_envoyer' and attempts = 0;

create function app.notify_new_message()
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
  return new;
end;
$$;
create trigger messages_notify after insert on public.messages
  for each row execute function app.notify_new_message();

-- Conversation ouverte : messages de l'autre partie marqués lus, e-mail en attente annulé.
create function public.mark_conversation_read(p_chantier_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  if not exists (
    select 1 from public.chantiers
    where id = p_chantier_id
      and (particulier_id = auth.uid() or artisan_id = app.my_artisan_id())
  ) then
    raise exception 'Conversation introuvable' using errcode = '42501';
  end if;
  update public.messages set read_at = now()
  where chantier_id = p_chantier_id and author_id is distinct from auth.uid() and read_at is null;
  get diagnostics v_count = row_count;
  delete from public.notifications
  where user_id = auth.uid() and type = 'nouveaux_messages' and status = 'a_envoyer'
    and attempts = 0 and data ->> 'chantier_id' = p_chantier_id::text;
  return v_count;
end;
$$;
revoke execute on function public.mark_conversation_read(uuid) from public, anon;
grant execute on function public.mark_conversation_read(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Lecture : messages d'une conversation (contenu des messages masqués retiré) et liste
-- « Messages » (dernier message, non lus).
-- ---------------------------------------------------------------------------
create function public.chantier_messages(p_chantier_id uuid)
returns table (
  message_id uuid,
  mine boolean,
  kind public.message_kind,
  body text,
  storage_path text,
  created_at timestamptz,
  read_at timestamptz,
  hidden boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select m.id, m.author_id = auth.uid(), m.kind,
    case when m.hidden_at is null then m.body end,
    case when m.hidden_at is null then m.storage_path end,
    m.created_at, m.read_at, m.hidden_at is not null
  from public.messages m
  join public.chantiers c on c.id = m.chantier_id
  where m.chantier_id = p_chantier_id
    and (c.particulier_id = auth.uid() or c.artisan_id = app.my_artisan_id())
  order by m.created_at, m.id
$$;
revoke execute on function public.chantier_messages(uuid) from public, anon;
grant execute on function public.chantier_messages(uuid) to authenticated;

create function public.my_conversations()
returns table (
  chantier_id uuid,
  title text,
  other_name text,
  other_avatar_path text,
  last_kind public.message_kind,
  last_body text,
  last_mine boolean,
  last_hidden boolean,
  last_at timestamptz,
  unread integer,
  closed boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select c.id, c.title,
    case when c.particulier_id = auth.uid()
      then app.artisan_display_name(c.artisan_id)
      else coalesce(nullif(btrim(concat_ws(' ', cp.first_name, cp.last_name)), ''), 'Votre client')
    end,
    case when c.particulier_id = auth.uid() then ap.avatar_path else cp.avatar_path end,
    l.kind, case when l.hidden_at is null then l.body end, l.author_id = auth.uid(),
    l.hidden_at is not null, l.created_at,
    (select count(*)::int from public.messages u
     where u.chantier_id = c.id and u.author_id is distinct from auth.uid()
       and u.read_at is null and u.hidden_at is null),
    app.conversation_closed(c.status)
  from public.chantiers c
  join public.artisans a on a.id = c.artisan_id
  left join public.profiles ap on ap.user_id = a.user_id
  left join public.profiles cp on cp.user_id = c.particulier_id
  join lateral (
    select m.kind, m.body, m.author_id, m.hidden_at, m.created_at from public.messages m
    where m.chantier_id = c.id
    order by m.created_at desc, m.id desc
    limit 1
  ) l on true
  where c.particulier_id = auth.uid() or c.artisan_id = app.my_artisan_id()
  order by l.created_at desc
$$;
revoke execute on function public.my_conversations() from public, anon;
grant execute on function public.my_conversations() to authenticated;

-- Pastille « Messages » : nombre total de messages non lus.
create function public.my_unread_messages()
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::int from public.messages m
  join public.chantiers c on c.id = m.chantier_id
  where (c.particulier_id = auth.uid() or c.artisan_id = app.my_artisan_id())
    and m.author_id is distinct from auth.uid() and m.read_at is null and m.hidden_at is null
$$;
revoke execute on function public.my_unread_messages() from public, anon;
grant execute on function public.my_unread_messages() to authenticated;

-- ---------------------------------------------------------------------------
-- Signalement d'un message (partie du chantier) et masquage motivé par l'équipe (F-55).
-- ---------------------------------------------------------------------------
alter table public.tickets add column message_id uuid references public.messages (id) on delete cascade;
create index tickets_message_idx on public.tickets (message_id) where message_id is not null;
create unique index tickets_un_signalement_message_ouvert
  on public.tickets (message_id, user_id) where type = 'message' and status <> 'resolu';

create function public.report_message(p_message_id uuid, p_reason text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  m public.messages;
  c public.chantiers;
  v_reason text := btrim(p_reason);
  v_ticket uuid;
begin
  select * into m from public.messages where id = p_message_id and hidden_at is null;
  select * into c from public.chantiers where id = m.chantier_id
    and (particulier_id = auth.uid() or artisan_id = app.my_artisan_id());
  if m.id is null or c.id is null then
    raise exception 'Message introuvable' using errcode = '42501';
  end if;
  if coalesce(char_length(v_reason) not between 10 and 1000, true) then
    raise exception 'Décrivez le problème en 10 à 1 000 caractères' using errcode = '22023';
  end if;
  select id into v_ticket from public.tickets
  where type = 'message' and message_id = m.id and user_id = auth.uid() and status <> 'resolu';
  if found then
    return v_ticket;
  end if;
  insert into public.tickets (type, user_id, project_id, contact_email, subject, message, message_id)
  select 'message', auth.uid(), c.project_id, lower(u.email),
    left('Message signalé : ' || c.title, 150), v_reason, m.id
  from auth.users u where u.id = auth.uid()
  returning id into v_ticket;
  return v_ticket;
end;
$$;
revoke execute on function public.report_message(uuid, text) from public, anon;
grant execute on function public.report_message(uuid, text) to authenticated;

create function public.admin_moderate_message(p_message_id uuid, p_hide boolean, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  m public.messages;
  v_reason text := nullif(btrim(p_reason), '');
begin
  if not app.is_staff() then
    raise exception 'Réservé à l''équipe MENAO' using errcode = '42501';
  end if;
  select * into m from public.messages where id = p_message_id for update;
  if not found then
    raise exception 'Message introuvable' using errcode = '42501';
  end if;
  if p_hide and coalesce(char_length(v_reason) not between 10 and 500, true) then
    raise exception 'Indiquez le motif du masquage en 10 à 500 caractères' using errcode = '22023';
  end if;
  update public.messages set
    hidden_at = case when p_hide then now() end,
    moderation_reason = case when p_hide then v_reason end,
    moderated_by = auth.uid()
  where id = m.id;
  update public.tickets set status = 'resolu', resolved_at = now(), handled_by = auth.uid()
  where message_id = m.id and type = 'message' and status <> 'resolu';
  perform app.audit(case when p_hide then 'message.masque' else 'message.republie' end,
    'message', m.id, jsonb_strip_nulls(jsonb_build_object('motif', v_reason)));
end;
$$;
revoke execute on function public.admin_moderate_message(uuid, boolean, text) from public, anon;
grant execute on function public.admin_moderate_message(uuid, boolean, text) to authenticated;
