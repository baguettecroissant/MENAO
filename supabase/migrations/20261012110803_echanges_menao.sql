-- F-42, F-08 — « Mes échanges avec MENAO » (ADR 0041) : le fil d'un ticket (messages du déclarant
-- et réponses de l'équipe) vaut aussi pour les messages de la page Contact, les dossiers de
-- recherche et les demandes de suppression du compte, pas seulement pour les litiges. La réponse
-- de l'équipe indique le type du ticket, pour que la notification mène à la bonne page
-- (/signalements pour un litige, /echanges sinon).
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
    end if;
  end if;
  return v_id;
end;
$$;
revoke execute on function public.add_ticket_message(uuid, text) from public, anon;
grant execute on function public.add_ticket_message(uuid, text) to authenticated;
