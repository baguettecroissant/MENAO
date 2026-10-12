-- F-56 (lot 4a, ADR 0049) : boîte de réception des tickets pour l'équipe (admin et support),
-- prise en charge et notes internes. Les notes ne sont jamais visibles du déclarant.

-- ---------------------------------------------------------------------------
-- Notes internes d'un ticket : lues et écrites par l'équipe seulement, jamais modifiées.
-- ---------------------------------------------------------------------------
create table public.ticket_notes (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets (id) on delete cascade,
  author_id uuid references auth.users (id) on delete set null default auth.uid(),
  body text not null check (char_length(btrim(body)) between 1 and 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index ticket_notes_ticket_id_idx on public.ticket_notes (ticket_id, created_at);
create index ticket_notes_author_id_idx on public.ticket_notes (author_id);

create trigger ticket_notes_set_updated_at before update on public.ticket_notes
  for each row execute function app.set_updated_at();

alter table public.ticket_notes enable row level security;
create policy "ticket_notes : lecture par l'équipe" on public.ticket_notes
  for select to authenticated using ((select app.is_staff()));
create policy "ticket_notes : ajout par l'équipe, en son nom" on public.ticket_notes
  for insert to authenticated
  with check ((select app.is_staff()) and author_id = (select auth.uid()));
-- Ni modification ni suppression : les notes forment le journal du traitement.
revoke all on public.ticket_notes from anon, authenticated;
grant select, insert on public.ticket_notes to authenticated;

-- ---------------------------------------------------------------------------
-- Boîte de réception : un ticket par ligne, déclarant, objet lié, prise en charge, échéance.
-- Filtres : a_traiter (ouverts et en cours), en_retard, mes_tickets, litiges, signalements
-- (avis, messages, expertises, réserves), messages (contact, dossiers de recherche),
-- suppressions, clos, tous.
-- ---------------------------------------------------------------------------
create function app.staff_ticket_rows()
returns table (
  ticket_id uuid, created_at timestamptz, type text, status text, subject text, message text,
  contact_email text, user_id uuid, declarant text, due_at timestamptz, resolved_at timestamptz,
  handled_by uuid, handler text, project_id uuid, chantier_id uuid, chantier_title text,
  notes integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select t.id, t.created_at, t.type::text, t.status::text, t.subject, t.message, t.contact_email,
    t.user_id, nullif(btrim(concat_ws(' ', pr.first_name, pr.last_name)), ''), t.due_at,
    t.resolved_at, t.handled_by, nullif(btrim(concat_ws(' ', hp.first_name, hp.last_name)), ''),
    t.project_id, t.chantier_id, c.title,
    (select count(*)::integer from public.ticket_notes n where n.ticket_id = t.id)
  from public.tickets t
  left join public.profiles pr on pr.user_id = t.user_id
  left join public.profiles hp on hp.user_id = t.handled_by
  left join public.chantiers c on c.id = t.chantier_id
$$;
revoke execute on function app.staff_ticket_rows() from public, anon, authenticated;

create function app.staff_ticket_matches(p_filter text, p_type text, p_status text, p_due timestamptz, p_handled_by uuid)
returns boolean
language sql
stable
set search_path = ''
as $$
  select case coalesce(p_filter, 'a_traiter')
    when 'a_traiter' then p_status <> 'resolu'
    when 'en_retard' then p_status <> 'resolu' and p_due < now()
    when 'mes_tickets' then p_status <> 'resolu' and p_handled_by = auth.uid()
    when 'litiges' then p_status <> 'resolu' and p_type = 'litige'
    when 'signalements' then p_status <> 'resolu' and p_type in ('avis', 'message', 'expertise', 'reserves')
    when 'messages' then p_status <> 'resolu' and p_type in ('contact', 'dossier_recherche')
    when 'suppressions' then p_status <> 'resolu' and p_type = 'suppression_compte'
    when 'clos' then p_status = 'resolu'
    else true
  end
$$;

create function public.staff_tickets(
  p_filter text default 'a_traiter',
  p_query text default null,
  p_limit integer default 50,
  p_offset integer default 0
)
returns table (
  ticket_id uuid, created_at timestamptz, type text, status text, subject text,
  contact_email text, declarant text, due_at timestamptz, handled_by uuid, handler text,
  chantier_title text, notes integer, total bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_like text := app.admin_like(p_query);
begin
  if not app.is_staff() then
    raise exception 'Réservé à l''équipe MENAO' using errcode = '42501';
  end if;
  return query
  select r.ticket_id, r.created_at, r.type, r.status, r.subject, r.contact_email, r.declarant,
    r.due_at, r.handled_by, r.handler, r.chantier_title, r.notes, count(*) over ()
  from app.staff_ticket_rows() r
  where app.staff_ticket_matches(p_filter, r.type, r.status, r.due_at, r.handled_by)
    and (
      v_like is null
      or r.subject ilike v_like or r.message ilike v_like or r.contact_email ilike v_like
      or r.declarant ilike v_like or r.chantier_title ilike v_like
    )
  -- Les plus urgents d'abord ; les tickets clos, du plus récent au plus ancien.
  order by (r.status = 'resolu'),
    case when r.status <> 'resolu' then r.due_at end asc,
    coalesce(r.resolved_at, r.created_at) desc
  limit least(greatest(coalesce(p_limit, 50), 1), 100)
  offset greatest(coalesce(p_offset, 0), 0);
end;
$$;

create function public.staff_ticket_counts(p_query text default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_like text := app.admin_like(p_query);
begin
  if not app.is_staff() then
    raise exception 'Réservé à l''équipe MENAO' using errcode = '42501';
  end if;
  return (
    select jsonb_object_agg(f.name, (
      select count(*) from app.staff_ticket_rows() r
      where app.staff_ticket_matches(f.name, r.type, r.status, r.due_at, r.handled_by)
        and (
          v_like is null
          or r.subject ilike v_like or r.message ilike v_like or r.contact_email ilike v_like
          or r.declarant ilike v_like or r.chantier_title ilike v_like
        )
    ))
    from unnest(array['a_traiter', 'en_retard', 'mes_tickets', 'litiges', 'signalements',
                      'messages', 'suppressions', 'clos', 'tous']) as f (name)
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Prise en charge : « Je m'en occupe » (le ticket passe en cours) ou rendre la main.
-- ---------------------------------------------------------------------------
create function public.staff_take_ticket(p_ticket_id uuid, p_take boolean default true)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not app.is_staff() then
    raise exception 'Réservé à l''équipe MENAO' using errcode = '42501';
  end if;
  update public.tickets set
    handled_by = case when p_take then auth.uid() end,
    status = case when p_take and status = 'ouvert' then 'en_cours'::public.ticket_status else status end
  where id = p_ticket_id and status <> 'resolu';
  if not found then
    raise exception 'Ticket introuvable ou clos.' using errcode = '22023';
  end if;
end;
$$;

revoke execute on function public.staff_tickets(text, text, integer, integer) from public, anon;
revoke execute on function public.staff_ticket_counts(text) from public, anon;
revoke execute on function public.staff_take_ticket(uuid, boolean) from public, anon;
grant execute on function public.staff_tickets(text, text, integer, integer) to authenticated;
grant execute on function public.staff_ticket_counts(text) to authenticated;
grant execute on function public.staff_take_ticket(uuid, boolean) to authenticated;
