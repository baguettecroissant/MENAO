-- Réponse de l'équipe à un déclarant sans compte (ADR 0140) : jusqu'ici, la réponse à un message
-- de la page Contact (ou à une candidature partenaire) restait dans le back-office, faute de compte
-- à notifier. Une notification peut désormais viser un ticket : l'e-mail part à l'adresse du
-- ticket, lue au moment de l'envoi (jamais copiée dans les données de la notification).

alter table public.notifications alter column user_id drop not null;
alter table public.notifications
  add column ticket_id uuid references public.tickets (id) on delete cascade;
alter table public.notifications add constraint notifications_destinataire
  check (user_id is not null or (ticket_id is not null and channel = 'email'));
create index notifications_ticket_idx on public.notifications (ticket_id) where ticket_id is not null;

-- Même forme et mêmes règles qu'avant (centre_notifications : envoi différé, préférences) ;
-- l'adresse vient du compte, sinon du ticket.
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
    returning n.id, n.user_id, n.ticket_id, n.type, n.data
  )
  select c.id, c.user_id, c.type, c.data, coalesce(u.email::text, t.contact_email), p.first_name
  from claimed c
  left join auth.users u on u.id = c.user_id
  left join public.tickets t on t.id = c.ticket_id
  left join public.profiles p on p.user_id = c.user_id
$$;

create or replace function public.add_ticket_message(p_ticket_id uuid, p_body text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  t public.tickets;
  v_staff boolean := app.is_staff();
  v_body text := btrim(p_body);
  v_id uuid;
begin
  select * into t from public.tickets where id = p_ticket_id for update;
  if not found or (t.user_id is distinct from auth.uid() and not v_staff) then
    raise exception 'Signalement introuvable' using errcode = '42501';
  end if;
  if t.status = 'resolu' then
    raise exception 'Ce signalement est clos' using errcode = '22023';
  end if;
  if coalesce(char_length(v_body) not between 1 and 2000, true) then
    raise exception 'Votre message doit compter entre 1 et 2 000 caractères' using errcode = '22023';
  end if;
  if not v_staff and not public.consume_rate_limit('ticket:' || auth.uid()::text, 20, 3600) then
    raise exception 'Trop de messages envoyés : réessayez plus tard' using errcode = '22023';
  end if;
  insert into public.ticket_messages (ticket_id, author_id, from_staff, body)
  values (t.id, auth.uid(), v_staff, v_body)
  returning id into v_id;
  if v_staff then
    update public.tickets set status = 'en_cours', handled_by = auth.uid()
    where id = t.id and status = 'ouvert';
    if t.user_id is not null then
      perform app.notify(t.user_id, 'reponse_support', jsonb_build_object(
        'ticket_id', t.id,
        'type', t.type,
        'titre', coalesce(
          t.subject,
          case when t.type = 'litige' then 'votre signalement' else 'votre message' end
        )
      ));
    elsif t.contact_email is not null then
      -- Déclarant sans compte (page Contact, candidature partenaire) : la réponse part par e-mail,
      -- avec son texte, à l'adresse du ticket (ADR 0140).
      insert into public.notifications (ticket_id, type, channel, data)
      values (t.id, 'reponse_contact', 'email', jsonb_build_object(
        'titre', coalesce(t.subject, 'votre message'),
        'message', v_body
      ));
    end if;
  end if;
  return v_id;
end;
$$;
