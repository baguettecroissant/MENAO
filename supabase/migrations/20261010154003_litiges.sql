-- F-42 (phase 5f) — « Signaler un problème lié au chantier » : catégorie, description, photos ;
-- ticket pour l'équipe MENAO, suivi visible par le déclarant avec ses échanges avec le support.
-- Un chantier actif passe en litige (transition litige_ouvert) : ses étapes sont suspendues
-- jusqu'à la décision de l'équipe, reprise (litige_resolu, retour à l'état d'avant) ou annulation
-- (litige_annule). Aucun versement n'est gelé : MENAO ne détient pas les fonds et n'a pas la main
-- sur les versements des comptes Stripe des artisans (ADR 0011). ADR 0032.
-- TODO(legal) : information des parties et médiation de la consommation (art. L612-1 du Code de
-- la consommation) à faire valider par l'avocat.

create type public.dispute_category as enum ('retard', 'malfacon', 'comportement', 'paiement', 'autre');

alter table public.tickets
  add column chantier_id uuid references public.chantiers (id) on delete cascade,
  add column category public.dispute_category,
  add constraint tickets_litige_chantier check (
    type <> 'litige' or (chantier_id is not null and category is not null)
  );
create index tickets_chantier_idx on public.tickets (chantier_id) where chantier_id is not null;
-- Un seul signalement ouvert par personne et par chantier.
create unique index tickets_un_litige_ouvert
  on public.tickets (chantier_id, user_id) where type = 'litige' and status <> 'resolu';

-- ---------------------------------------------------------------------------
-- Échanges du ticket entre le déclarant et l'équipe MENAO.
-- ---------------------------------------------------------------------------
create table public.ticket_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets (id) on delete cascade,
  author_id uuid references auth.users (id) on delete set null,
  from_staff boolean not null,
  body text check (char_length(body) between 1 and 2000),
  -- Photo rangée par process-upload dans « ticket-photos/<ticket_id>/<fichier> ».
  storage_path text unique check (char_length(storage_path) <= 300),
  created_at timestamptz not null default clock_timestamp(),
  check (
    (body is not null and storage_path is null)
    or (body is null and storage_path is not null and starts_with(storage_path, ticket_id::text || '/'))
  )
);
create index ticket_messages_ticket_idx on public.ticket_messages (ticket_id, created_at);
create index ticket_messages_author_idx on public.ticket_messages (author_id);
alter table public.ticket_messages enable row level security;
-- Écriture par les fonctions ci-dessous seulement.
revoke all on public.ticket_messages from anon, authenticated;
grant select on public.ticket_messages to authenticated;

create policy "ticket_messages : lecture par le déclarant ou l'équipe"
  on public.ticket_messages for select to authenticated
  using (
    (select app.is_staff())
    or exists (select 1 from public.tickets t where t.id = ticket_id and t.user_id = (select auth.uid()))
  );

-- Photos des signalements : privées, servies par URL signées au déclarant et à l'équipe.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('ticket-photos', 'ticket-photos', false, 10485760, array['image/jpeg', 'image/png'])
on conflict (id) do nothing;

create function app.can_read_ticket_folder(p_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.tickets t
    where t.id::text = (storage.foldername(p_name))[1] and t.user_id = auth.uid()
  )
$$;
revoke execute on function app.can_read_ticket_folder(text) from public, anon;
grant execute on function app.can_read_ticket_folder(text) to authenticated;

create policy "ticket-photos : lecture par le déclarant ou l'équipe"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'ticket-photos'
    and ((select app.can_read_ticket_folder(name)) or (select app.is_staff()))
  );

-- ---------------------------------------------------------------------------
-- « Signaler un problème lié au chantier » (client ou artisan du chantier).
-- ---------------------------------------------------------------------------
create function public.report_chantier_problem(
  p_chantier_id uuid,
  p_category public.dispute_category,
  p_description text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  c public.chantiers;
  v_description text := btrim(p_description);
  v_side text;
  v_email text;
  v_ticket uuid;
begin
  select * into c from public.chantiers
  where id = p_chantier_id
    and (particulier_id = auth.uid() or artisan_id = app.my_artisan_id())
  for update;
  if not found then
    raise exception 'Chantier introuvable' using errcode = '42501';
  end if;
  if p_category is null then
    raise exception 'Choisissez la nature du problème' using errcode = '22023';
  end if;
  if coalesce(char_length(v_description) not between 20 and 2000, true) then
    raise exception 'Décrivez le problème en 20 à 2 000 caractères' using errcode = '22023';
  end if;
  select id into v_ticket from public.tickets
  where type = 'litige' and chantier_id = c.id and user_id = auth.uid() and status <> 'resolu';
  if found then
    return v_ticket;
  end if;
  select email into v_email from auth.users where id = auth.uid();
  v_side := case when c.particulier_id = auth.uid() then 'client' else 'artisan' end;
  insert into public.tickets (type, user_id, project_id, chantier_id, category, contact_email, subject, message)
  values ('litige', auth.uid(), c.project_id, c.id, p_category, lower(v_email),
    left('Litige : ' || c.title, 150), v_description)
  returning id into v_ticket;

  -- Chantier actif : étapes suspendues jusqu'à la décision de l'équipe (spec §9).
  if exists (select 1 from public.chantier_transitions t
             where t.from_status = c.status and t.event = 'litige_ouvert') then
    perform public.transition_chantier(c.id, 'litige_ouvert', jsonb_build_object(
      'ticket_id', v_ticket, 'categorie', p_category, 'par', v_side));
  end if;
  -- L'autre partie est informée (sans la description, réservée à l'équipe).
  perform app.notify(
    case when v_side = 'client' then (select a.user_id from public.artisans a where a.id = c.artisan_id)
      else c.particulier_id end,
    'litige_ouvert',
    jsonb_build_object(
      'chantier_id', c.id,
      'titre', c.title,
      'destinataire', case when v_side = 'client' then 'artisan' else 'client' end,
      'categorie', p_category
    ));
  return v_ticket;
end;
$$;
revoke execute on function public.report_chantier_problem(uuid, public.dispute_category, text) from public, anon;
grant execute on function public.report_chantier_problem(uuid, public.dispute_category, text) to authenticated;

-- Message du déclarant ou de l'équipe dans le ticket ; réponse de l'équipe notifiée au déclarant.
create function public.add_ticket_message(p_ticket_id uuid, p_body text)
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
        'titre', coalesce(t.subject, 'votre signalement')
      ));
    end if;
  end if;
  return v_id;
end;
$$;
revoke execute on function public.add_ticket_message(uuid, text) from public, anon;
grant execute on function public.add_ticket_message(uuid, text) to authenticated;

-- Photo d'un signalement, vérifiée et rangée par process-upload (service_role), par le déclarant.
create function public.record_ticket_photo(p_ticket_id uuid, p_user_id uuid, p_storage_path text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  t public.tickets;
begin
  select * into t from public.tickets where id = p_ticket_id and user_id = p_user_id;
  if not found or t.type <> 'litige' then
    return 'forbidden';
  end if;
  if t.status = 'resolu' then
    return 'locked';
  end if;
  if (select count(*) from public.ticket_messages
      where ticket_id = t.id and storage_path is not null) >= 20 then
    return 'limit';
  end if;
  insert into public.ticket_messages (ticket_id, author_id, from_staff, storage_path)
  values (t.id, p_user_id, false, p_storage_path);
  return 'ok';
end;
$$;
revoke execute on function public.record_ticket_photo(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.record_ticket_photo(uuid, uuid, text) to service_role;

-- ---------------------------------------------------------------------------
-- Décision de l'équipe : reprise du chantier (retour à l'état d'avant le litige) ou annulation.
-- Le message de décision est ajouté aux échanges ; les deux parties sont notifiées.
-- ---------------------------------------------------------------------------
create function public.admin_close_dispute(p_ticket_id uuid, p_outcome text, p_message text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  t public.tickets;
  c public.chantiers;
  v_message text := btrim(p_message);
begin
  if not app.is_staff() then
    raise exception 'Réservé à l''équipe MENAO' using errcode = '42501';
  end if;
  select * into t from public.tickets where id = p_ticket_id and type = 'litige' for update;
  if not found then
    raise exception 'Signalement introuvable' using errcode = '22023';
  end if;
  if t.status = 'resolu' then
    raise exception 'Ce signalement est déjà clos' using errcode = '22023';
  end if;
  if p_outcome is null or p_outcome not in ('reprise', 'annulation') then
    raise exception 'Choisissez la décision : reprise ou annulation du chantier' using errcode = '22023';
  end if;
  if coalesce(char_length(v_message) not between 10 and 2000, true) then
    raise exception 'Expliquez la décision en 10 à 2 000 caractères' using errcode = '22023';
  end if;
  select * into c from public.chantiers where id = t.chantier_id for update;
  if c.status = 'en_litige' then
    perform public.transition_chantier(c.id,
      case when p_outcome = 'reprise' then 'litige_resolu' else 'litige_annule' end::public.chantier_event,
      jsonb_build_object('ticket_id', t.id, 'decision', p_outcome));
  elsif p_outcome = 'annulation' then
    raise exception 'Seul un chantier en litige peut être annulé par l''équipe' using errcode = '22023';
  end if;
  insert into public.ticket_messages (ticket_id, author_id, from_staff, body)
  values (t.id, auth.uid(), true, v_message);
  update public.tickets set status = 'resolu', resolved_at = now(), handled_by = auth.uid()
  where id = t.id;
  perform app.notify(u.user_id, 'litige_clos', jsonb_build_object(
    'chantier_id', c.id,
    'titre', c.title,
    'destinataire', u.side,
    'decision', p_outcome,
    'ticket_id', case when u.user_id = t.user_id then t.id end
  ))
  from (
    select c.particulier_id as user_id, 'client' as side
    union all
    select a.user_id, 'artisan' from public.artisans a where a.id = c.artisan_id
  ) u
  where u.user_id is not null;
  perform app.audit('litige.clos', 'ticket', t.id, jsonb_build_object('decision', p_outcome));
end;
$$;
revoke execute on function public.admin_close_dispute(uuid, text, text) from public, anon;
grant execute on function public.admin_close_dispute(uuid, text, text) to authenticated;
