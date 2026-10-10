-- F-22 (phase 4c) — suivi du chantier par l'artisan :
-- - après l'acompte, l'artisan confirme la date et l'heure de démarrage (acompte_paye → planifie),
--   modifiables tant que les travaux n'ont pas commencé ;
-- - le chantier démarre seul à la date prévue (planifie → en_cours, tâche pg_cron) ;
-- - journal du chantier : messages et photos de l'artisan (photos rangées par process-upload) ;
-- - « Déclarer le chantier terminé » (en_cours → travaux_termines).
-- Le client est notifié de la date et de la fin des travaux. Sa vue du journal et les
-- notifications des nouveautés viennent avec « Mes chantiers » (F-12, phase 4d). ADR 0025.
-- TODO(legal) : contrat conclu hors établissement, travaux commencés avant la fin du délai de
-- rétractation (demande expresse du client, art. L221-25 du code de la consommation).

-- ---------------------------------------------------------------------------
-- Date de démarrage
-- ---------------------------------------------------------------------------
alter table public.chantiers add column start_at timestamptz;
create index chantiers_demarrage_idx on public.chantiers (start_at) where status = 'planifie';

-- Heure saisie à Paris ; à venir et au plus 365 jours plus tard
-- (packages/core/src/chantier-follow-up.ts).
create function app.chantier_start(p_date date, p_time time)
returns timestamptz
language plpgsql
stable
set search_path = ''
as $$
declare
  v_start timestamptz;
begin
  if p_date is null or p_time is null then
    raise exception 'Indiquez la date et l''heure de démarrage' using errcode = '22023';
  end if;
  v_start := (p_date + p_time) at time zone 'Europe/Paris';
  if v_start <= now() then
    raise exception 'Choisissez une date et une heure à venir' using errcode = '22023';
  end if;
  if v_start > now() + interval '365 days' then
    raise exception 'Le démarrage doit avoir lieu dans les 12 prochains mois' using errcode = '22023';
  end if;
  return v_start;
end;
$$;
revoke execute on function app.chantier_start(date, time) from public, anon, authenticated;

-- F-22 « Confirmez la date de démarrage » : après l'acompte, puis modification possible tant que
-- les travaux n'ont pas commencé (le client est prévenu).
create function public.artisan_confirm_start(p_chantier_id uuid, p_date date, p_time time)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.chantiers;
  v_start timestamptz;
begin
  select * into v from public.chantiers
  where id = p_chantier_id and artisan_id = app.my_artisan_id()
  for update;
  if not found then
    raise exception 'Chantier introuvable' using errcode = '42501';
  end if;
  if v.status in ('rdv_planifie', 'devis_envoye', 'devis_en_revision', 'devis_signe') then
    raise exception 'La date de démarrage se confirme après le paiement de l''acompte' using errcode = '22023';
  end if;
  if v.status not in ('acompte_paye', 'planifie') then
    raise exception 'La date de démarrage ne peut plus être modifiée' using errcode = '22023';
  end if;
  v_start := app.chantier_start(p_date, p_time);
  update public.chantiers set start_at = v_start where id = p_chantier_id;
  if v.status = 'acompte_paye' then
    perform public.transition_chantier(p_chantier_id, 'date_confirmee',
      jsonb_build_object('demarrage', v_start));
  elsif v.start_at is distinct from v_start then
    perform app.notify(v.particulier_id, 'demarrage_modifie', jsonb_build_object(
      'chantier_id', v.id,
      'titre', v.title,
      'artisan', app.artisan_display_name(v.artisan_id),
      'demarrage', v_start
    ));
  end if;
end;
$$;
revoke execute on function public.artisan_confirm_start(uuid, date, time) from public, anon;
grant execute on function public.artisan_confirm_start(uuid, date, time) to authenticated;

-- « Date de début atteinte » (spec §9) : planifie → en_cours. p_now : instant de référence (tests).
create function app.start_due_chantiers(p_now timestamptz default now())
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_count integer := 0;
begin
  for v_id in
    select id from public.chantiers
    where status = 'planifie' and start_at <= p_now
    order by start_at
    for update skip locked
  loop
    perform public.transition_chantier(v_id, 'demarrage');
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;
revoke execute on function app.start_due_chantiers(timestamptz) from public, anon, authenticated;
select cron.schedule('menao-demarrage-chantiers', '*/15 * * * *', 'select app.start_due_chantiers()');

-- ---------------------------------------------------------------------------
-- Journal du chantier : messages et photos de l'artisan (F-22), lus par les parties (F-12).
-- ---------------------------------------------------------------------------
create type public.chantier_update_kind as enum ('message', 'photo');

create table public.chantier_updates (
  id uuid primary key default gen_random_uuid(),
  chantier_id uuid not null references public.chantiers (id) on delete cascade,
  author_id uuid references auth.users (id) on delete set null,
  kind public.chantier_update_kind not null,
  message text check (char_length(message) between 1 and 2000),
  -- Photo rangée par process-upload dans « chantier-photos/<chantier_id>/<fichier> ».
  storage_path text unique check (char_length(storage_path) <= 300),
  -- Heure réelle : ordre fiable du journal, même pour plusieurs ajouts d'une transaction.
  created_at timestamptz not null default clock_timestamp(),
  check (
    (kind = 'message' and message is not null and storage_path is null)
    or (kind = 'photo' and message is null and storage_path is not null
        and starts_with(storage_path, chantier_id::text || '/'))
  )
);
create index chantier_updates_chantier_idx on public.chantier_updates (chantier_id, created_at);
create index chantier_updates_author_idx on public.chantier_updates (author_id);
alter table public.chantier_updates enable row level security;
-- Écriture par les fonctions ci-dessous seulement.
revoke all on public.chantier_updates from anon, authenticated;
grant select on public.chantier_updates to authenticated;

create policy "chantier_updates : lecture par les parties ou l'équipe"
  on public.chantier_updates for select to authenticated
  using (
    (select app.is_staff())
    or exists (
      select 1 from public.chantiers c
      where c.id = chantier_id
        and (c.particulier_id = (select auth.uid()) or c.artisan_id = (select app.my_artisan_id()))
    )
  );

-- Photos du chantier : privées, servies par URL signées aux parties et à l'équipe.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('chantier-photos', 'chantier-photos', false, 10485760, array['image/jpeg', 'image/png'])
on conflict (id) do nothing;

create function app.can_read_chantier_folder(p_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.chantiers c
    where c.id::text = (storage.foldername(p_name))[1]
      and (c.particulier_id = auth.uid() or c.artisan_id = app.my_artisan_id())
  )
$$;
revoke execute on function app.can_read_chantier_folder(text) from public, anon;
grant execute on function app.can_read_chantier_folder(text) to authenticated;

create policy "chantier-photos : lecture par les parties du chantier ou l'équipe"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'chantier-photos'
    and ((select app.can_read_chantier_folder(name)) or (select app.is_staff()))
  );

-- Journal ouvert de la planification à la réception (packages/core : CHANTIER_JOURNAL_STATUSES).
create function app.chantier_journal_open(p_status public.chantier_status)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select p_status in ('planifie', 'en_cours', 'travaux_termines', 'reserves_a_lever')
$$;
revoke execute on function app.chantier_journal_open(public.chantier_status) from public, anon, authenticated;

-- F-22 « Ajouter un message ».
create function public.artisan_add_chantier_message(p_chantier_id uuid, p_message text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_status public.chantier_status;
  v_message text := btrim(p_message);
  v_id uuid;
begin
  select status into v_status from public.chantiers
  where id = p_chantier_id and artisan_id = app.my_artisan_id();
  if not found then
    raise exception 'Chantier introuvable' using errcode = '42501';
  end if;
  if not app.chantier_journal_open(v_status) then
    raise exception 'Le journal du chantier n''est pas ouvert à cette étape' using errcode = '22023';
  end if;
  if coalesce(v_message, '') = '' then
    raise exception 'Écrivez votre message' using errcode = '22023';
  end if;
  if char_length(v_message) > 2000 then
    raise exception 'Votre message dépasse 2 000 caractères' using errcode = '22023';
  end if;
  insert into public.chantier_updates (chantier_id, author_id, kind, message)
  values (p_chantier_id, auth.uid(), 'message', v_message)
  returning id into v_id;
  return v_id;
end;
$$;
revoke execute on function public.artisan_add_chantier_message(uuid, text) from public, anon;
grant execute on function public.artisan_add_chantier_message(uuid, text) to authenticated;

-- F-22 « Ajouter une photo » : enregistrée par process-upload (service_role) une fois le fichier
-- contrôlé et rangé ; la fonction supprime le fichier si l'ajout est refusé. 100 photos au plus
-- par chantier (packages/core : MAX_CHANTIER_PHOTOS).
create function public.record_chantier_photo(p_chantier_id uuid, p_user_id uuid, p_storage_path text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_status public.chantier_status;
begin
  select c.status into v_status
  from public.chantiers c
  join public.artisans a on a.id = c.artisan_id
  where c.id = p_chantier_id and a.user_id = p_user_id
  for update of c;
  if not found then
    return 'forbidden';
  end if;
  if not app.chantier_journal_open(v_status) then
    return 'locked';
  end if;
  if (select count(*) from public.chantier_updates
      where chantier_id = p_chantier_id and kind = 'photo') >= 100 then
    return 'limit';
  end if;
  insert into public.chantier_updates (chantier_id, author_id, kind, storage_path)
  values (p_chantier_id, p_user_id, 'photo', p_storage_path);
  return 'ok';
end;
$$;
revoke execute on function public.record_chantier_photo(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.record_chantier_photo(uuid, uuid, text) to service_role;

-- F-22 « Déclarer le chantier terminé » : le client est invité à réceptionner les travaux
-- (procès-verbal de réception, phase 5).
create function public.artisan_declare_finished(p_chantier_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_status public.chantier_status;
begin
  select status into v_status from public.chantiers
  where id = p_chantier_id and artisan_id = app.my_artisan_id()
  for update;
  if not found then
    raise exception 'Chantier introuvable' using errcode = '42501';
  end if;
  if v_status <> 'en_cours' then
    raise exception 'Seul un chantier en cours peut être déclaré terminé' using errcode = '22023';
  end if;
  perform public.transition_chantier(p_chantier_id, 'fin_declaree', jsonb_build_object(
    'photos', (select count(*) from public.chantier_updates
               where chantier_id = p_chantier_id and kind = 'photo')
  ));
end;
$$;
revoke execute on function public.artisan_declare_finished(uuid) from public, anon;
grant execute on function public.artisan_declare_finished(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Notifications (F-41) : chantier planifié et travaux terminés, au client.
-- ---------------------------------------------------------------------------
create or replace function app.notify_chantier_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  c public.chantiers;
begin
  if new.event in ('rdv_fixe', 'devis_envoye')
     or (new.event = 'annulation' and new.details ->> 'par' = 'artisan') then
    select * into c from public.chantiers where id = new.chantier_id;
    perform app.notify(c.particulier_id,
      case new.event
        when 'rdv_fixe' then 'rdv_fixe'::public.notification_type
        when 'devis_envoye' then 'devis_recu'::public.notification_type
        else 'chantier_annule'::public.notification_type
      end,
      jsonb_build_object(
        'chantier_id', c.id,
        'titre', c.title,
        'artisan', app.artisan_display_name(c.artisan_id),
        'rendez_vous', new.details ->> 'rendez_vous',
        'motif', new.details ->> 'motif',
        'quote_id', new.details ->> 'quote_id',
        'numero', new.details ->> 'numero',
        'montant_ttc', new.details -> 'montant_ttc'
      ));
  elsif new.event in ('devis_refuse', 'revision_demandee', 'devis_signe') then
    select * into c from public.chantiers where id = new.chantier_id;
    perform app.notify(a.user_id,
      case new.event
        when 'devis_refuse' then 'devis_refuse'::public.notification_type
        when 'devis_signe' then 'devis_signe'::public.notification_type
        else 'devis_modification'::public.notification_type
      end,
      jsonb_build_object(
        'chantier_id', c.id,
        'titre', c.title,
        'client', cp.first_name,
        'numero', new.details ->> 'numero',
        'motif', new.details ->> 'motif',
        'message', new.details ->> 'message',
        'montant_ttc', new.details -> 'montant_ttc'
      ))
    from public.artisans a
    left join public.profiles cp on cp.user_id = c.particulier_id
    where a.id = c.artisan_id;
  elsif new.event = 'acompte_paye' then
    select * into c from public.chantiers where id = new.chantier_id;
    perform app.notify(a.user_id, 'acompte_paye'::public.notification_type, jsonb_build_object(
      'destinataire', 'artisan',
      'chantier_id', c.id,
      'titre', c.title,
      'client', cp.first_name,
      'montant', new.details -> 'montant'
    ))
    from public.artisans a
    left join public.profiles cp on cp.user_id = c.particulier_id
    where a.id = c.artisan_id;
    perform app.notify(c.particulier_id, 'acompte_paye'::public.notification_type, jsonb_build_object(
      'destinataire', 'client',
      'chantier_id', c.id,
      'titre', c.title,
      'artisan', app.artisan_display_name(c.artisan_id),
      'montant', new.details -> 'montant'
    ));
  elsif new.event in ('date_confirmee', 'fin_declaree') then
    select * into c from public.chantiers where id = new.chantier_id;
    perform app.notify(c.particulier_id,
      case new.event
        when 'date_confirmee' then 'chantier_planifie'::public.notification_type
        else 'travaux_termines'::public.notification_type
      end,
      jsonb_build_object(
        'chantier_id', c.id,
        'titre', c.title,
        'artisan', app.artisan_display_name(c.artisan_id),
        'demarrage', new.details ->> 'demarrage',
        'photos', new.details -> 'photos'
      ));
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Lectures : date de démarrage sur la fiche et la liste de l'artisan, et dans le suivi du client.
-- ---------------------------------------------------------------------------
create or replace function public.artisan_chantier_detail(p_chantier_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select public.artisan_request_detail(c.request_id) || jsonb_build_object(
    'chantier', jsonb_build_object(
      'id', c.id,
      'status', c.status,
      'title', c.title,
      'created_at', c.created_at,
      'start_at', c.start_at,
      'cancelled_at', (select e.created_at from public.chantier_events e
                       where e.chantier_id = c.id and e.event = 'annulation'
                       order by e.created_at desc limit 1)
    ),
    'appointment', (select jsonb_build_object('starts_at', a.starts_at, 'status', a.status, 'notes', a.artisan_notes)
                    from public.appointments a where a.chantier_id = c.id
                    order by a.created_at desc limit 1)
  )
  from public.chantiers c
  where c.id = p_chantier_id and c.artisan_id = app.my_artisan_id()
$$;

-- Le type de retour change (date de démarrage) : suppression puis recréation.
drop function public.artisan_chantiers();
create function public.artisan_chantiers()
returns table (
  chantier_id uuid,
  request_id uuid,
  status public.chantier_status,
  title text,
  particulier_id uuid,
  client_first_name text,
  client_last_name text,
  adresse text,
  ville_nom text,
  code_postal text,
  appointment_at timestamptz,
  created_at timestamptz,
  start_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select c.id, c.request_id, c.status, c.title, c.particulier_id, cp.first_name, cp.last_name,
    case when c.status <> 'annule' then c.adresse end, c.ville_nom, c.code_postal,
    (select a.starts_at from public.appointments a where a.chantier_id = c.id and a.status = 'planifie'),
    c.created_at, c.start_at
  from public.chantiers c
  left join public.profiles cp on cp.user_id = c.particulier_id
  where c.artisan_id = app.my_artisan_id()
  order by c.created_at desc
$$;
revoke execute on function public.artisan_chantiers() from public, anon;
grant execute on function public.artisan_chantiers() to authenticated;

drop function public.particulier_requests();
create function public.particulier_requests()
returns table (
  request_id uuid,
  project_id uuid,
  trade_label text,
  ville_nom text,
  summary text,
  artisan_id uuid,
  artisan_name text,
  artisan_avatar_path text,
  status public.request_status,
  created_at timestamptz,
  expires_at timestamptz,
  refusal_reason public.refusal_reason,
  artisan_phone text,
  artisan_email text,
  chantier_id uuid,
  chantier_status public.chantier_status,
  appointment_at timestamptz,
  chantier_start_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select r.id, p.id, t.label, p.ville_nom, p.summary, a.id,
    coalesce(pr.first_name, a.nom_commercial, a.raison_sociale), pr.avatar_path,
    r.status, r.created_at, r.expires_at, r.refusal_reason,
    case when r.status = 'acceptee' then pr.phone end,
    case when r.status = 'acceptee' then u.email::text end,
    ch.id, ch.status,
    (select ap.starts_at from public.appointments ap where ap.chantier_id = ch.id and ap.status = 'planifie'),
    ch.start_at
  from public.requests r
  join public.projects p on p.id = r.project_id
  join public.artisans a on a.id = r.artisan_id
  left join public.trades t on t.code = p.trade_code
  left join public.profiles pr on pr.user_id = a.user_id
  left join auth.users u on u.id = a.user_id
  left join public.chantiers ch on ch.request_id = r.id
  where r.particulier_id = auth.uid()
  order by r.created_at desc, coalesce(pr.first_name, a.raison_sociale)
$$;
revoke execute on function public.particulier_requests() from public, anon;
grant execute on function public.particulier_requests() to authenticated;
