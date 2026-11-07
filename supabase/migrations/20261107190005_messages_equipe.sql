-- Comptes d'équipe, PR 3 (F-89, ADR 0243) : messages, journal et notifications de l'équipe.
-- - Côté artisan, un message de l'entreprise est « de son côté », avec le prénom de l'auteur quand ce
--   n'est pas soi ; seuls les messages du client comptent comme non lus et sont marqués lus.
-- - Côté client, un message ou une entrée du journal d'un membre porte « Prénom (Entreprise) » ;
--   ceux du patron restent au nom de l'entreprise.
-- - Notifications : le chef d'équipe reçoit celles des demandes, rendez-vous, devis, paiements et
--   messages ; l'ouvrier, les messages et changements de date de ses chantiers ; le reste au patron.

-- ---------------------------------------------------------------------------
-- Auteur d'un message ou d'une entrée du journal
-- ---------------------------------------------------------------------------
-- Nom de l'entreprise : nom commercial, sinon raison sociale (comme my_team_context).
create function app.artisan_company_name(p_artisan_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(nullif(btrim(a.nom_commercial), ''), a.raison_sociale)
  from public.artisans a where a.id = p_artisan_id
$$;
revoke execute on function app.artisan_company_name(uuid) from public, anon, authenticated;

-- Pour le client : « Prénom (Entreprise) » d'un membre, rien pour le patron (l'entreprise est déjà
-- nommée) ; pour l'équipe : le prénom de l'auteur. Rien pour un message du client.
create function app.message_author_label(
  p_author uuid, p_artisan_id uuid, p_particulier uuid, p_for_client boolean
)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when p_author is null or p_author = p_particulier then null
    when p_for_client and exists (
      select 1 from public.artisans a where a.id = p_artisan_id and a.user_id = p_author
    ) then null
    when p_for_client then (
      select btrim(p.first_name) || ' (' || app.artisan_company_name(p_artisan_id) || ')'
      from public.profiles p
      where p.user_id = p_author and nullif(btrim(p.first_name), '') is not null
    )
    else (
      select nullif(btrim(p.first_name), '') from public.profiles p where p.user_id = p_author
    )
  end
$$;
revoke execute on function app.message_author_label(uuid, uuid, uuid, boolean)
  from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Messages
-- ---------------------------------------------------------------------------
-- « mine » : du côté de celui qui lit (toute l'entreprise pour un membre ou le patron) ;
-- « author_name » : qui l'a écrit, quand ce n'est pas soi.
drop function public.chantier_messages(uuid);
create function public.chantier_messages(p_chantier_id uuid)
returns table (
  message_id uuid,
  mine boolean,
  kind public.message_kind,
  body text,
  storage_path text,
  created_at timestamptz,
  read_at timestamptz,
  hidden boolean,
  author_name text
)
language sql
stable
security definer
set search_path = ''
as $$
  select m.id,
    case when c.particulier_id = (select auth.uid()) then m.author_id = (select auth.uid())
      else m.author_id is not null and m.author_id <> c.particulier_id end,
    m.kind,
    case when m.hidden_at is null then m.body end,
    case when m.hidden_at is null then m.storage_path end,
    m.created_at, m.read_at, m.hidden_at is not null,
    case when m.author_id is distinct from (select auth.uid()) then
      app.message_author_label(m.author_id, c.artisan_id, c.particulier_id,
        c.particulier_id = (select auth.uid()))
    end
  from public.messages m
  join public.chantiers c on c.id = m.chantier_id
  where m.chantier_id = p_chantier_id
    and (c.particulier_id = (select auth.uid())
         or (c.artisan_id = app.my_artisan_id() and app.can_see_chantier(c.id, c.artisan_id)))
  order by m.created_at, m.id
$$;
revoke execute on function public.chantier_messages(uuid) from public, anon;
grant execute on function public.chantier_messages(uuid) to authenticated;

create or replace function public.my_conversations()
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
    l.kind, case when l.hidden_at is null then l.body end,
    case when c.particulier_id = auth.uid() then l.author_id = auth.uid()
      else l.author_id is not null and l.author_id <> c.particulier_id end,
    l.hidden_at is not null, l.created_at,
    (select count(*)::int from public.messages u
     where u.chantier_id = c.id and u.read_at is null and u.hidden_at is null
       and case when c.particulier_id = auth.uid() then u.author_id is distinct from auth.uid()
         else u.author_id = c.particulier_id end),
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
  where c.particulier_id = auth.uid()
    or (c.artisan_id = app.my_artisan_id() and app.can_see_chantier(c.id, c.artisan_id))
  order by l.created_at desc
$$;

-- Non lus : pour l'entreprise, les messages du client seulement.
create or replace function public.my_unread_messages()
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::int from public.messages m
  join public.chantiers c on c.id = m.chantier_id
  where (c.particulier_id = auth.uid()
         or (c.artisan_id = app.my_artisan_id() and app.can_see_chantier(c.id, c.artisan_id)))
    and m.read_at is null and m.hidden_at is null
    and case when c.particulier_id = auth.uid() then m.author_id is distinct from auth.uid()
      else m.author_id = c.particulier_id end
$$;

-- Lu : un membre ne marque lus que les messages du client (pas ceux de ses collègues).
create or replace function public.mark_conversation_read(p_chantier_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  c public.chantiers;
  v_count integer;
begin
  select * into c from public.chantiers
  where id = p_chantier_id
    and (particulier_id = auth.uid() or (artisan_id = app.my_artisan_id() and app.can_see_chantier(id, artisan_id)));
  if not found then
    raise exception 'Conversation introuvable' using errcode = '42501';
  end if;
  update public.messages m set read_at = now()
  where m.chantier_id = p_chantier_id and m.read_at is null
    and case when c.particulier_id = auth.uid() then m.author_id is distinct from auth.uid()
      else m.author_id = c.particulier_id end;
  get diagnostics v_count = row_count;
  delete from public.notifications
  where user_id = auth.uid() and type = 'nouveaux_messages' and status = 'a_envoyer'
    and attempts = 0 and data ->> 'chantier_id' = p_chantier_id::text;
  return v_count;
end;
$$;

-- ---------------------------------------------------------------------------
-- Journal : auteurs des entrées
-- ---------------------------------------------------------------------------
-- { entrée : auteur } pour les entrées d'un membre (client : « Prénom (Entreprise) ») ou d'un
-- collègue (équipe : prénom) ; rien pour les siennes ni pour celles du patron vues par le client.
create function public.chantier_update_authors(p_chantier_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_object_agg(x.id, x.label), '{}'::jsonb)
  from (
    select u.id, app.message_author_label(u.author_id, c.artisan_id, c.particulier_id,
      c.particulier_id = (select auth.uid())) as label
    from public.chantiers c
    join public.chantier_updates u on u.chantier_id = c.id
    where c.id = p_chantier_id
      and u.author_id is distinct from (select auth.uid())
      and (c.particulier_id = (select auth.uid())
           or (c.artisan_id = app.my_artisan_id() and app.can_see_chantier(c.id, c.artisan_id)))
  ) x
  where x.label is not null
$$;
revoke execute on function public.chantier_update_authors(uuid) from public, anon;
grant execute on function public.chantier_update_authors(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Notifications des messages
-- ---------------------------------------------------------------------------
-- Une notification « nouveaux messages » par destinataire (regroupée 10 minutes), plus la
-- notification immédiate du téléphone quand il en a un.
create function app.queue_message_notification(
  p_user_id uuid, p_chantier public.chantiers, p_author text, p_side text, p_message_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.notifications as n (user_id, type, data, send_after)
  values (p_user_id, 'nouveaux_messages', jsonb_build_object(
      'chantier_id', p_chantier.id,
      'titre', p_chantier.title,
      'auteur', p_author,
      'destinataire', p_side,
      'messages', 1
    ), now() + interval '10 minutes')
  on conflict (user_id, (data ->> 'chantier_id'))
    where type = 'nouveaux_messages' and status = 'a_envoyer' and attempts = 0
  do update set data = n.data || jsonb_build_object('messages', (n.data ->> 'messages')::int + 1);
  if exists (select 1 from public.push_tokens t where t.user_id = p_user_id) then
    insert into public.message_pushes (message_id, user_id) values (p_message_id, p_user_id);
    perform app.kick_notify();
  end if;
end;
$$;
revoke execute on function app.queue_message_notification(uuid, public.chantiers, text, text, uuid)
  from public, anon, authenticated;

-- Message du client : le patron, ses chefs d'équipe et les ouvriers du chantier. Message de
-- l'entreprise : le client, avec « Prénom (Entreprise) » pour un membre.
create or replace function app.notify_new_message()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  c public.chantiers;
  v_author text;
  v_recipient uuid;
begin
  select * into c from public.chantiers where id = new.chantier_id;
  if new.author_id = c.particulier_id then
    select coalesce(p.first_name, 'Votre client') into v_author
    from public.profiles p where p.user_id = c.particulier_id;
    for v_recipient in
      select a.user_id from public.artisans a where a.id = c.artisan_id
      union
      select m.user_id from public.artisan_members m
      where m.artisan_id = c.artisan_id and m.suspended_at is null
        and (m.role = 'chef' or exists (
          select 1 from public.chantier_assignments ca
          where ca.chantier_id = c.id and ca.user_id = m.user_id
        ))
    loop
      perform app.queue_message_notification(v_recipient, c, coalesce(v_author, 'Votre client'),
        'artisan', new.id);
    end loop;
  elsif c.particulier_id is not null then
    v_author := coalesce(
      app.message_author_label(new.author_id, c.artisan_id, c.particulier_id, true),
      app.artisan_display_name(c.artisan_id)
    );
    perform app.queue_message_notification(c.particulier_id, c, v_author, 'client', new.id);
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Autres notifications : copie aux membres de l'équipe
-- ---------------------------------------------------------------------------
-- Une notification adressée au patron est copiée au chef d'équipe (demandes, rendez-vous, devis,
-- paiements, réception, litiges, secrétaire) et à l'ouvrier attribué au chantier (dates et
-- annulation). Dossier, abonnement, parrainage, avis, grade et minutes restent au patron.
create function app.share_notification_with_team()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_artisan uuid;
  v_chantier uuid;
  m record;
  v_chef constant text[] := array[
    'nouvelle_demande', 'demande_annulee', 'demande_relance', 'demande_sans_reponse',
    'creneau_choisi', 'rdv_fixe', 'rdv_modifie', 'rdv_rappel', 'chantier_annule',
    'devis_refuse', 'devis_modification', 'devis_signe', 'devis_expire', 'acompte_paye',
    'chantier_planifie', 'demarrage_modifie', 'demarrage_rappel', 'planning_relance',
    'travaux_termines', 'pv_signe', 'reserves_emises', 'levee_confirmee', 'solde_paye',
    'litige_ouvert', 'litige_clos', 'secretaire_message'
  ];
  v_ouvrier constant text[] := array[
    'rdv_fixe', 'rdv_modifie', 'rdv_rappel', 'chantier_annule', 'chantier_planifie',
    'demarrage_modifie', 'demarrage_rappel'
  ];
begin
  if not (new.type::text = any (v_chef)) then
    return null;
  end if;
  select a.id into v_artisan from public.artisans a where a.user_id = new.user_id;
  if v_artisan is null then
    return null;
  end if;
  if new.data ->> 'chantier_id' ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    v_chantier := (new.data ->> 'chantier_id')::uuid;
  end if;
  for m in
    select am.user_id, am.role from public.artisan_members am
    where am.artisan_id = v_artisan and am.suspended_at is null
  loop
    if m.role = 'chef'
       or (new.type::text = any (v_ouvrier) and v_chantier is not null and exists (
         select 1 from public.chantier_assignments ca
         where ca.chantier_id = v_chantier and ca.user_id = m.user_id
       )) then
      insert into public.notifications (user_id, type, channel, data, send_after)
      values (m.user_id, new.type, new.channel, new.data, new.send_after)
      on conflict do nothing;
    end if;
  end loop;
  return null;
end;
$$;
revoke execute on function app.share_notification_with_team() from public, anon, authenticated;
create trigger notifications_share_with_team
  after insert on public.notifications
  for each row when (new.type <> 'nouveaux_messages')
  execute function app.share_notification_with_team();

-- ---------------------------------------------------------------------------
-- Attribution d'un chantier : le membre est prévenu
-- ---------------------------------------------------------------------------
create or replace function public.set_chantier_team(p_chantier_id uuid, p_user_ids uuid[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_artisan uuid := app.my_manager_artisan_id();
  v_ids uuid[] := array(select distinct u from unnest(coalesce(p_user_ids, '{}'::uuid[])) u where u is not null);
  v_new uuid[];
  c public.chantiers;
begin
  select * into c from public.chantiers where id = p_chantier_id and artisan_id = v_artisan;
  if v_artisan is null or not found then
    raise exception 'Chantier introuvable' using errcode = '42501';
  end if;
  if exists (
    select 1 from unnest(v_ids) u
    where not exists (select 1 from public.artisan_members m
                      where m.user_id = u and m.artisan_id = v_artisan and m.suspended_at is null)
  ) then
    raise exception 'Membre de l''équipe introuvable.' using errcode = '22023';
  end if;
  v_new := array(
    select u from unnest(v_ids) u
    where not exists (select 1 from public.chantier_assignments ca
                      where ca.chantier_id = p_chantier_id and ca.user_id = u)
  );
  delete from public.chantier_assignments ca
  where ca.chantier_id = p_chantier_id
    and ca.user_id <> all (v_ids)
    and exists (select 1 from public.artisan_members m
                where m.user_id = ca.user_id and m.suspended_at is null);
  insert into public.chantier_assignments (chantier_id, user_id, assigned_by)
  select p_chantier_id, u, (select auth.uid()) from unnest(v_ids) u
  on conflict do nothing;
  perform app.notify(u, 'chantier_attribue', jsonb_build_object(
    'chantier_id', c.id,
    'titre', c.title,
    'entreprise', app.artisan_company_name(v_artisan)
  ))
  from unnest(v_new) u
  where u is distinct from (select auth.uid());
  perform app.audit('equipe_artisan.chantier', 'chantier', p_chantier_id,
    jsonb_build_object('membres', to_jsonb(v_ids)));
end;
$$;
