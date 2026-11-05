-- Accepter en un toucher (F-73, ADR 0222). L'artisan accepte une demande en proposant 2 ou 3
-- créneaux (pré-remplis d'après son agenda) ; le client en choisit un, ce qui fixe le rendez-vous
-- comme « Fixer un rendez-vous » (chantier créé, coordonnées échangées, ADR 0016).
-- - La proposition compte comme réponse (responded_at) : plus de relance à l'artisan.
-- - La demande reste ouverte jusqu'au dernier créneau proposé, puis expire comme les autres.
-- - Une nouvelle proposition remplace la précédente ; un rendez-vous fixé directement aussi.

create table public.appointment_proposals (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.requests (id) on delete cascade,
  artisan_id uuid not null references public.artisans (id) on delete cascade,
  particulier_id uuid not null references auth.users (id) on delete cascade,
  slots timestamptz[] not null check (cardinality(slots) between 2 and 3),
  status text not null default 'proposee' check (status in ('proposee', 'choisie', 'remplacee')),
  chosen_slot timestamptz,
  chosen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index appointment_proposals_une_en_attente
  on public.appointment_proposals (request_id) where status = 'proposee';
create index appointment_proposals_particulier_idx on public.appointment_proposals (particulier_id, status);
create trigger appointment_proposals_set_updated_at before update on public.appointment_proposals
  for each row execute function app.set_updated_at();
alter table public.appointment_proposals enable row level security;

-- Lecture : l'artisan et le client concernés ; écriture par les fonctions seulement.
create policy "créneaux proposés : lecture par l'artisan ou le client"
  on public.appointment_proposals for select to authenticated
  using (artisan_id = (select app.my_artisan_id()) or particulier_id = (select auth.uid()));

-- Fixation du rendez-vous d'une demande (sans contrôle d'auteur : appelée par les fonctions
-- publiques après leurs propres contrôles). Crée le chantier, passe la demande en « acceptée » et
-- journalise demande_envoyee → rdv_planifie.
create function app.fix_request_appointment(p_request_id uuid, p_start timestamptz)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.requests;
  v_chantier uuid;
begin
  select * into v from public.requests where id = p_request_id for update;
  if not found then
    raise exception 'Demande introuvable' using errcode = '42501';
  end if;
  if exists (select 1 from public.chantiers where request_id = p_request_id) then
    raise exception 'Un rendez-vous est déjà fixé pour cette demande' using errcode = '22023';
  end if;
  if not ((v.status = 'envoyee' and v.expires_at > now()) or v.status = 'acceptee') then
    raise exception 'Cette demande n''attend plus de réponse' using errcode = '22023';
  end if;
  if p_start <= now() then
    raise exception 'Choisissez une date et une heure à venir' using errcode = '22023';
  end if;

  update public.requests set status = 'acceptee', responded_at = coalesce(responded_at, now())
  where id = p_request_id;
  update public.appointment_proposals set status = 'remplacee'
  where request_id = p_request_id and status = 'proposee';
  insert into public.chantiers (project_id, request_id, artisan_id, particulier_id, title, adresse,
    ville_nom, code_postal)
  select p.id, v.id, v.artisan_id, v.particulier_id,
    left(coalesce(nullif(btrim(p.summary), ''), t.label, 'Chantier'), 300),
    left(p.adresse, 300), p.ville_nom, p.code_postal
  from public.projects p
  left join public.trades t on t.code = p.trade_code
  where p.id = v.project_id
  returning id into v_chantier;
  perform public.transition_chantier(v_chantier, 'rdv_fixe', jsonb_build_object('rendez_vous', p_start));
  insert into public.appointments (chantier_id, starts_at) values (v_chantier, p_start);
  return v_chantier;
end;
$$;
revoke execute on function app.fix_request_appointment(uuid, timestamptz) from public, anon, authenticated;

-- « Fixer un rendez-vous » (F-17) : même effet, par la fonction commune.
create or replace function public.artisan_fix_appointment(p_request_id uuid, p_date date, p_time time)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.requests where id = p_request_id and artisan_id = app.my_artisan_id()
  ) then
    raise exception 'Demande introuvable' using errcode = '42501';
  end if;
  return app.fix_request_appointment(p_request_id, app.appointment_start(p_date, p_time));
end;
$$;
revoke execute on function public.artisan_fix_appointment(uuid, date, time) from public, anon;
grant execute on function public.artisan_fix_appointment(uuid, date, time) to authenticated;

-- L'artisan propose 2 ou 3 créneaux (à venir, distincts, dans les 6 mois) ; mêmes règles que
-- proposedSlotsError (packages/core/src/appointment.ts).
create function public.artisan_propose_slots(p_request_id uuid, p_slots timestamptz[])
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.requests;
  v_slots timestamptz[];
  v_id uuid;
begin
  select * into v from public.requests
  where id = p_request_id and artisan_id = app.my_artisan_id()
  for update;
  if not found then
    raise exception 'Demande introuvable' using errcode = '42501';
  end if;
  if v.status <> 'envoyee' or v.expires_at <= now()
     or exists (select 1 from public.chantiers where request_id = p_request_id) then
    raise exception 'Cette demande n''attend plus de réponse' using errcode = '22023';
  end if;
  select array_agg(distinct s order by s) into v_slots from unnest(p_slots) s;
  if coalesce(cardinality(v_slots), 0) not between 2 and 3 then
    raise exception 'Proposez 2 ou 3 créneaux différents' using errcode = '22023';
  end if;
  if v_slots[1] <= now() + interval '1 hour' then
    raise exception 'Proposez des créneaux à venir' using errcode = '22023';
  end if;
  if v_slots[cardinality(v_slots)] > now() + interval '180 days' then
    raise exception 'Les créneaux doivent être dans les 6 prochains mois' using errcode = '22023';
  end if;

  update public.appointment_proposals set status = 'remplacee'
  where request_id = p_request_id and status = 'proposee';
  insert into public.appointment_proposals (request_id, artisan_id, particulier_id, slots)
  values (v.id, v.artisan_id, v.particulier_id, v_slots)
  returning id into v_id;
  -- La proposition vaut réponse ; la demande attend le choix jusqu'au dernier créneau.
  update public.requests
  set responded_at = coalesce(responded_at, now()),
      expires_at = greatest(expires_at, v_slots[cardinality(v_slots)])
  where id = p_request_id;
  return v_id;
end;
$$;
revoke execute on function public.artisan_propose_slots(uuid, timestamptz[]) from public, anon;
grant execute on function public.artisan_propose_slots(uuid, timestamptz[]) to authenticated;

-- Le client choisit l'un des créneaux : le rendez-vous est fixé.
create function public.particulier_choose_slot(p_proposal_id uuid, p_slot timestamptz)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.appointment_proposals;
  v_chantier uuid;
begin
  select * into v from public.appointment_proposals
  where id = p_proposal_id and particulier_id = auth.uid()
  for update;
  if not found then
    raise exception 'Proposition introuvable' using errcode = '42501';
  end if;
  if v.status <> 'proposee' then
    raise exception 'Ces créneaux ne sont plus proposés' using errcode = '22023';
  end if;
  if not (p_slot = any (v.slots)) then
    raise exception 'Choisissez l''un des créneaux proposés' using errcode = '22023';
  end if;
  v_chantier := app.fix_request_appointment(v.request_id, p_slot);
  update public.appointment_proposals
  set status = 'choisie', chosen_slot = p_slot, chosen_at = now()
  where id = p_proposal_id;
  perform app.notify(
    (select a.user_id from public.artisans a where a.id = v.artisan_id),
    'creneau_choisi',
    jsonb_build_object('chantier_id', v_chantier, 'rendez_vous', p_slot)
  );
  return v_chantier;
end;
$$;
revoke execute on function public.particulier_choose_slot(uuid, timestamptz) from public, anon;
grant execute on function public.particulier_choose_slot(uuid, timestamptz) to authenticated;

-- Espace client : créneaux en attente de choix, avec l'artisan et le projet.
create function public.particulier_slot_proposals()
returns table (
  proposal_id uuid,
  request_id uuid,
  project_id uuid,
  artisan_name text,
  slots timestamptz[]
)
language sql
stable
security definer
set search_path = ''
as $$
  select ap.id, ap.request_id, r.project_id, coalesce(a.nom_commercial, a.raison_sociale),
    array(select s from unnest(ap.slots) s where s > now() order by s)
  from public.appointment_proposals ap
  join public.requests r on r.id = ap.request_id
  join public.artisans a on a.id = ap.artisan_id
  where ap.particulier_id = auth.uid() and ap.status = 'proposee'
    and r.status = 'envoyee' and r.expires_at > now()
    and exists (select 1 from unnest(ap.slots) s where s > now())
  order by ap.created_at desc
$$;
revoke execute on function public.particulier_slot_proposals() from public, anon;
grant execute on function public.particulier_slot_proposals() to authenticated;

-- Client prévenu des créneaux proposés.
create function app.appointment_proposals_notify()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform app.notify(new.particulier_id, 'creneaux_proposes', jsonb_build_object(
    'request_id', new.request_id,
    'artisan', (select coalesce(a.nom_commercial, a.raison_sociale) from public.artisans a
                where a.id = new.artisan_id),
    'creneaux', to_jsonb(new.slots)
  ));
  return null;
end;
$$;
revoke execute on function app.appointment_proposals_notify() from public, anon, authenticated;
create trigger appointment_proposals_notify after insert on public.appointment_proposals
  for each row execute function app.appointment_proposals_notify();

-- Relances 24 h / 48 h (ADR 0156) : plus pour une demande à laquelle l'artisan a répondu
-- (créneaux proposés).
create or replace function app.remind_pending_requests(p_now timestamptz default now())
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
    select q.id, q.created_at, q.expires_at, a.user_id, p.ville_nom, cp.first_name as client,
      coalesce(nullif(btrim(app.scrub_contacts(p.summary)), ''), t.label) as titre,
      count(n.id)::int as sent, max(n.created_at) as last_sent
    from public.requests q
    join public.artisans a on a.id = q.artisan_id
    join public.projects p on p.id = q.project_id
    left join public.trades t on t.code = p.trade_code
    left join public.profiles cp on cp.user_id = q.particulier_id
    left join public.notifications n on n.user_id = a.user_id and n.type = 'demande_relance'
      and n.data ->> 'request_id' = q.id::text
    where q.status = 'envoyee'
      and q.responded_at is null
      and q.expires_at > p_now
      and q.created_at <= p_now - interval '24 hours'
    group by q.id, a.user_id, p.ville_nom, cp.first_name, p.summary, t.label
  loop
    continue when r.sent >= 2;
    continue when r.sent = 1 and (
      r.created_at > p_now - interval '48 hours' or r.last_sent > p_now - interval '12 hours'
    );
    perform app.notify(r.user_id, 'demande_relance', jsonb_build_object(
      'request_id', r.id,
      'etape', r.sent + 1,
      'titre', r.titre,
      'ville', r.ville_nom,
      'client', r.client,
      'expire_le', r.expires_at
    ));
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;
revoke execute on function app.remind_pending_requests(timestamptz) from public, anon, authenticated;
