-- F-56 (lot 4b, ADR 0050) : alertes de l'équipe MENAO, par e-mail et dans la cloche du
-- back-office. Nouveau ticket (admins et support), dossier artisan envoyé en vérification
-- (admins), ticket en retard (son responsable, sinon toute l'équipe ; une seule alerte).

-- Ticket en retard déjà signalé : pas de seconde alerte.
alter table public.tickets add column overdue_notified_at timestamptz;

-- ---------------------------------------------------------------------------
-- Nouveau ticket : prévenir l'équipe (admins et support).
-- ---------------------------------------------------------------------------
create function app.tickets_notify_team()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform app.notify(p.user_id, 'equipe_nouveau_ticket', jsonb_build_object(
    'ticket_id', new.id, 'type', new.type, 'objet', new.subject
  ))
  from public.profiles p
  where p.role in ('admin', 'support');
  return null;
end;
$$;
create trigger tickets_notify_team after insert on public.tickets
  for each row execute function app.tickets_notify_team();

-- ---------------------------------------------------------------------------
-- Dossier artisan envoyé (ou renvoyé) en vérification : prévenir les admins.
-- ---------------------------------------------------------------------------
create function app.artisans_notify_submission()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'en_verification' and new.submitted_at is not null
    and (old.status is distinct from new.status or old.submitted_at is distinct from new.submitted_at)
  then
    perform app.notify(p.user_id, 'equipe_dossier_a_verifier', jsonb_build_object(
      'artisan_id', new.id, 'entreprise', coalesce(new.nom_commercial, new.raison_sociale)
    ))
    from public.profiles p
    where p.role = 'admin';
  end if;
  return null;
end;
$$;
create trigger artisans_notify_submission after update of status, submitted_at on public.artisans
  for each row execute function app.artisans_notify_submission();

-- ---------------------------------------------------------------------------
-- Tickets en retard, chaque matin : leur responsable, sinon toute l'équipe ; une seule fois.
-- ---------------------------------------------------------------------------
create function app.notify_overdue_tickets()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  r record;
  v_count integer := 0;
begin
  for r in
    update public.tickets set overdue_notified_at = now()
    where status <> 'resolu' and due_at < now() and overdue_notified_at is null
    returning id, type, subject, handled_by
  loop
    if r.handled_by is not null then
      perform app.notify(r.handled_by, 'equipe_ticket_en_retard', jsonb_build_object(
        'ticket_id', r.id, 'type', r.type, 'objet', r.subject
      ));
    else
      perform app.notify(p.user_id, 'equipe_ticket_en_retard', jsonb_build_object(
        'ticket_id', r.id, 'type', r.type, 'objet', r.subject
      ))
      from public.profiles p
      where p.role in ('admin', 'support');
    end if;
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;
revoke execute on function app.notify_overdue_tickets() from public, anon, authenticated;

select cron.schedule('menao-tickets-en-retard', '0 7 * * *', 'select app.notify_overdue_tickets()');
