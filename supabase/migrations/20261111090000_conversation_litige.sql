-- Conversation d'un chantier consultée par l'équipe MENAO (F-125, ADR 0277).
--
-- Les messages entre le client et l'artisan restent privés (ADR 0046). Exception : sur un ticket de
-- litige ou de message signalé, l'équipe (admin en double authentification, ou support) peut lire
-- toute la conversation du chantier concerné, en lecture seule. Chaque consultation est inscrite au
-- journal d'audit (qui, quand, quel chantier, depuis quel ticket).
-- TODO(legal) : annoncer cet accès dans les conditions d'utilisation et la politique de
-- confidentialité avant la mise en service publique (texte proposé dans l'ADR 0277).

create function public.admin_ticket_conversation(p_ticket_id uuid)
returns table (
  message_id uuid,
  author_side text,
  author_name text,
  kind public.message_kind,
  body text,
  storage_path text,
  created_at timestamptz,
  read_at timestamptz,
  hidden boolean,
  moderation_reason text,
  reported boolean
)
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  t public.tickets;
  v_chantier uuid;
begin
  if not app.is_staff() then
    raise exception 'Réservé à l''équipe MENAO' using errcode = '42501';
  end if;
  select * into t from public.tickets where id = p_ticket_id;
  if not found or t.type not in ('litige', 'message') then
    raise exception 'Conversation consultable seulement depuis un litige ou un message signalé'
      using errcode = '42501';
  end if;
  v_chantier := case
    when t.type = 'litige' then t.chantier_id
    else (select m.chantier_id from public.messages m where m.id = t.message_id)
  end;
  if v_chantier is null then
    raise exception 'Chantier introuvable' using errcode = '42501';
  end if;

  perform app.audit('conversation.consultee', 'chantier', v_chantier,
    jsonb_build_object('ticket_id', t.id, 'type', t.type));

  -- Auteur : le client, ou l'entreprise (« Prénom (Entreprise) » pour un membre de son équipe).
  -- Messages masqués : contenu et motif visibles par l'équipe.
  return query
    select m.id,
      case when m.author_id is null then null
        when m.author_id = c.particulier_id then 'client'
        else 'artisan' end,
      case when m.author_id is null then null
        when m.author_id = c.particulier_id then
          nullif(btrim(concat_ws(' ', cp.first_name, cp.last_name)), '')
        else coalesce(
          app.message_author_label(m.author_id, c.artisan_id, c.particulier_id, true),
          app.artisan_company_name(c.artisan_id))
      end,
      m.kind, m.body, m.storage_path, m.created_at, m.read_at,
      m.hidden_at is not null, m.moderation_reason,
      t.type = 'message' and m.id = t.message_id
    from public.messages m
    join public.chantiers c on c.id = m.chantier_id
    left join public.profiles cp on cp.user_id = c.particulier_id
    where m.chantier_id = v_chantier
    order by m.created_at, m.id;
end;
$$;
revoke execute on function public.admin_ticket_conversation(uuid) from public, anon;
grant execute on function public.admin_ticket_conversation(uuid) to authenticated;
