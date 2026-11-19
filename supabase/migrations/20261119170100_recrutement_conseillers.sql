-- Recrutement des conseillers MENAO (F-183, lot 77, ADR 0380).
--
-- La page publique /devenir-conseiller reçoit les candidatures (sans compte), puis le candidat
-- réserve une réunion d'information collective en visio. L'équipe suit les candidats dans le
-- back-office (Apporteurs › Candidats) : grille d'entretien, test de vente, décision.
--
-- - Candidats et réunions : lus et modifiés par les administrateurs seulement (RLS). Le public ne
--   passe que par les fonctions ci-dessous, avec des limites d'envoi.
-- - Le candidat n'a pas de compte : un jeton secret (dans l'adresse de la page et des e-mails)
--   lui permet de réserver ou de changer de réunion pendant 60 jours.
-- - E-mails sans compte : une notification peut viser un candidat ; l'adresse est lue au moment
--   de l'envoi (même principe que les tickets, ADR 0140).
-- - Conservation : 2 ans après le dernier échange (accord donné dans le formulaire).

-- ---------------------------------------------------------------------------------------------
-- Réunions d'information
-- ---------------------------------------------------------------------------------------------
create table public.recruitment_meetings (
  id uuid primary key default gen_random_uuid(),
  starts_at timestamptz not null,
  duration_minutes int not null default 30 check (duration_minutes in (30, 45, 60)),
  capacity int not null default 10 check (capacity between 1 and 50),
  meet_url text not null
    check (meet_url ~ '^https://[^\s/]+\.[^\s]+$' and char_length(meet_url) <= 300),
  active boolean not null default true,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
create index recruitment_meetings_starts_idx on public.recruitment_meetings (starts_at);

alter table public.recruitment_meetings enable row level security;
revoke all on public.recruitment_meetings from anon, authenticated;
grant select on public.recruitment_meetings to authenticated;
grant insert (starts_at, duration_minutes, capacity, meet_url, created_by)
  on public.recruitment_meetings to authenticated;
grant update (starts_at, duration_minutes, capacity, meet_url) on public.recruitment_meetings
  to authenticated;

create policy "recruitment_meetings : lecture par les administrateurs"
  on public.recruitment_meetings for select to authenticated using (app.is_admin());
create policy "recruitment_meetings : création par les administrateurs"
  on public.recruitment_meetings for insert to authenticated with check (app.is_admin());
create policy "recruitment_meetings : modification par les administrateurs"
  on public.recruitment_meetings for update to authenticated
  using (app.is_admin()) with check (app.is_admin());

-- ---------------------------------------------------------------------------------------------
-- Candidats
-- ---------------------------------------------------------------------------------------------
create table public.commercial_candidates (
  id uuid primary key default gen_random_uuid(),
  first_name text not null check (char_length(first_name) between 1 and 60),
  last_name text not null check (char_length(last_name) between 1 and 60),
  email text not null check (email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' and char_length(email) <= 254),
  phone text not null check (phone ~ '^\+[1-9][0-9]{7,14}$'),
  sector text not null check (char_length(sector) between 2 and 120),
  legal_status text not null check (legal_status in ('auto_entrepreneur', 'societe', 'aucun')),
  sees_artisans boolean not null,
  experience text not null check (experience in ('aucune', 'moins_2_ans', 'plus_2_ans')),
  availability text not null check (availability in ('temps_plein', 'temps_partiel')),
  source text not null
    check (source in ('linkedin', 'facebook', 'indeed', 'leboncoin', 'bouche_a_oreille', 'autre')),
  motivation text check (char_length(motivation) <= 1000),
  consent_at timestamptz not null default now(),
  stage text not null default 'nouveau'
    check (stage in ('nouveau', 'a_appeler', 'reunion_prevue', 'entretien', 'retenu', 'non_retenu')),
  booking_token uuid not null default gen_random_uuid() unique,
  meeting_id uuid references public.recruitment_meetings (id) on delete set null,
  booked_at timestamptz,
  attendance text check (attendance in ('present', 'absent')),
  callback_requested boolean not null default false,
  interview_grid jsonb not null default '{}'::jsonb check (jsonb_typeof(interview_grid) = 'object'),
  interview_notes text check (char_length(interview_notes) <= 4000),
  interviewed_by uuid references auth.users (id) on delete set null,
  interviewed_at timestamptz,
  test_persona text check (char_length(test_persona) <= 40),
  test_score int check (test_score between 0 and 20),
  test_review jsonb check (test_review is null or jsonb_typeof(test_review) = 'object'),
  tested_at timestamptz,
  last_contact_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index commercial_candidates_stage_idx on public.commercial_candidates (stage, created_at desc);
create index commercial_candidates_meeting_idx on public.commercial_candidates (meeting_id)
  where meeting_id is not null;
create index commercial_candidates_email_idx on public.commercial_candidates (email);
create index commercial_candidates_phone_idx on public.commercial_candidates (phone);
create trigger commercial_candidates_updated_at
  before update on public.commercial_candidates
  for each row execute function app.set_updated_at();

alter table public.commercial_candidates enable row level security;
revoke all on public.commercial_candidates from anon, authenticated;
grant select on public.commercial_candidates to authenticated;
-- L'équipe modifie le suivi ; l'identité, le jeton et les réponses du candidat restent tels quels.
grant update (stage, attendance, callback_requested, interview_grid, interview_notes,
  interviewed_by, interviewed_at, last_contact_at) on public.commercial_candidates to authenticated;

create policy "commercial_candidates : lecture par les administrateurs"
  on public.commercial_candidates for select to authenticated using (app.is_admin());
create policy "commercial_candidates : suivi par les administrateurs"
  on public.commercial_candidates for update to authenticated
  using (app.is_admin()) with check (app.is_admin());

-- ---------------------------------------------------------------------------------------------
-- E-mails aux candidats (sans compte)
-- ---------------------------------------------------------------------------------------------
alter table public.notifications
  add column candidate_id uuid references public.commercial_candidates (id) on delete cascade;
alter table public.notifications drop constraint notifications_destinataire;
alter table public.notifications add constraint notifications_destinataire
  check (user_id is not null
    or ((ticket_id is not null or candidate_id is not null) and channel = 'email'));
create index notifications_candidate_idx on public.notifications (candidate_id)
  where candidate_id is not null;

-- Même forme et mêmes règles qu'avant (ADR 0140) ; l'adresse et le prénom viennent du compte,
-- sinon du ticket ou du candidat.
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
    returning n.id, n.user_id, n.ticket_id, n.candidate_id, n.type, n.data
  )
  select c.id, c.user_id, c.type, c.data,
    coalesce(u.email::text, t.contact_email, k.email), coalesce(p.first_name, k.first_name)
  from claimed c
  left join auth.users u on u.id = c.user_id
  left join public.tickets t on t.id = c.ticket_id
  left join public.commercial_candidates k on k.id = c.candidate_id
  left join public.profiles p on p.user_id = c.user_id
$$;

-- Données de la réunion reprises dans les e-mails (date, durée, lien de visio, jeton du candidat).
create function app.recruitment_meeting_data(p_meeting public.recruitment_meetings, p_token uuid)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'reunion', p_meeting.id,
    'debut', p_meeting.starts_at,
    'duree', p_meeting.duration_minutes,
    'lien', p_meeting.meet_url,
    'jeton', p_token
  )
$$;
revoke execute on function app.recruitment_meeting_data(public.recruitment_meetings, uuid)
  from public, anon, authenticated;

create function app.notify_candidate(
  p_candidate uuid,
  p_type public.notification_type,
  p_data jsonb
)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.notifications (candidate_id, type, channel, data)
  values (p_candidate, p_type, 'email', coalesce(p_data, '{}'::jsonb))
$$;
revoke execute on function app.notify_candidate(uuid, public.notification_type, jsonb)
  from public, anon, authenticated;

-- ---------------------------------------------------------------------------------------------
-- Fonctions publiques (page /devenir-conseiller)
-- ---------------------------------------------------------------------------------------------

-- Barème des primes affiché sur la page (montants seulement, réglés dans le back-office).
create function public.commercial_bonus_rates()
returns table (
  prime_validation_centimes int,
  prime_abonnement_centimes int,
  prime_abonnement_premium_centimes int,
  prime_abonnement_entreprise_centimes int
)
language sql
stable
security definer
set search_path = ''
as $$
  select s.prime_validation_centimes, s.prime_abonnement_centimes,
    s.prime_abonnement_premium_centimes, s.prime_abonnement_entreprise_centimes
  from public.commercial_bonus_settings s
$$;
revoke execute on function public.commercial_bonus_rates() from public;
grant execute on function public.commercial_bonus_rates() to anon, authenticated;

-- Réunions à venir où il reste de la place (jamais moins de 2 heures avant), sans leur lien.
create function public.recruitment_open_meetings()
returns table (id uuid, starts_at timestamptz, duration_minutes int, remaining int)
language sql
stable
security definer
set search_path = ''
as $$
  select m.id, m.starts_at, m.duration_minutes,
    m.capacity - (select count(*)::int from public.commercial_candidates c
                  where c.meeting_id = m.id and c.stage = 'reunion_prevue')
  from public.recruitment_meetings m
  where m.active and m.starts_at > now() + interval '2 hours'
    and m.capacity > (select count(*) from public.commercial_candidates c
                      where c.meeting_id = m.id and c.stage = 'reunion_prevue')
  order by m.starts_at
  limit 8
$$;
revoke execute on function public.recruitment_open_meetings() from public;
grant execute on function public.recruitment_open_meetings() to anon, authenticated;

-- Candidature : renvoie le jeton qui permet ensuite de réserver une réunion.
create function public.apply_as_commercial(
  p_first_name text,
  p_last_name text,
  p_email text,
  p_phone text,
  p_sector text,
  p_legal_status text,
  p_sees_artisans boolean,
  p_experience text,
  p_availability text,
  p_source text,
  p_motivation text,
  p_consent boolean
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_first_name text := btrim(coalesce(p_first_name, ''));
  v_last_name text := btrim(coalesce(p_last_name, ''));
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_phone text := btrim(coalesce(p_phone, ''));
  v_sector text := btrim(coalesce(p_sector, ''));
  v_motivation text := nullif(btrim(coalesce(p_motivation, '')), '');
  v_token uuid;
begin
  if p_consent is not true then
    raise exception 'Cochez la case pour que nous puissions traiter votre candidature.'
      using errcode = '22023';
  end if;
  if char_length(v_first_name) not between 1 and 60 or char_length(v_last_name) not between 1 and 60 then
    raise exception 'Indiquez votre prénom et votre nom.' using errcode = '22023';
  end if;
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or char_length(v_email) > 254 then
    raise exception 'Adresse e-mail invalide.' using errcode = '22023';
  end if;
  if v_phone !~ '^\+[1-9][0-9]{7,14}$' then
    raise exception 'Numéro de téléphone invalide.' using errcode = '22023';
  end if;
  if char_length(v_sector) not between 2 and 120 then
    raise exception 'Indiquez la ville ou le secteur où vous aimeriez travailler.' using errcode = '22023';
  end if;
  if p_sees_artisans is null
    or coalesce(p_legal_status, '') not in ('auto_entrepreneur', 'societe', 'aucun')
    or coalesce(p_experience, '') not in ('aucune', 'moins_2_ans', 'plus_2_ans')
    or coalesce(p_availability, '') not in ('temps_plein', 'temps_partiel')
    or coalesce(p_source, '') not in ('linkedin', 'facebook', 'indeed', 'leboncoin', 'bouche_a_oreille', 'autre')
  then
    raise exception 'Répondez à toutes les questions du formulaire.' using errcode = '22023';
  end if;
  if char_length(v_motivation) > 1000 then
    raise exception 'Votre message est trop long.' using errcode = '22023';
  end if;
  if (select count(*) from public.commercial_candidates
      where created_at > now() - interval '1 hour') >= 60 then
    raise exception 'Trop de candidatures reçues en ce moment. Réessayez dans une heure.'
      using errcode = '22023';
  end if;
  if exists (select 1 from public.commercial_candidates
             where (email = v_email or phone = v_phone)
               and created_at > now() - interval '90 days') then
    raise exception 'Nous avons déjà votre candidature : l''équipe revient vers vous très vite.'
      using errcode = '22023';
  end if;
  insert into public.commercial_candidates (first_name, last_name, email, phone, sector,
    legal_status, sees_artisans, experience, availability, source, motivation)
  values (v_first_name, v_last_name, v_email, v_phone, v_sector, p_legal_status, p_sees_artisans,
    p_experience, p_availability, p_source, v_motivation)
  returning booking_token into v_token;
  return v_token;
end;
$$;
revoke execute on function public.apply_as_commercial(text, text, text, text, text, text, boolean,
  text, text, text, text, boolean) from public;
grant execute on function public.apply_as_commercial(text, text, text, text, text, text, boolean,
  text, text, text, text, boolean) to anon, authenticated;

-- Candidature lue par son jeton (page de réservation) : 60 jours, avant toute décision.
create function app.candidate_by_token(p_token uuid, p_lock boolean default false)
returns public.commercial_candidates
language plpgsql
security definer
set search_path = ''
as $$
declare
  c public.commercial_candidates;
begin
  if p_lock then
    select * into c from public.commercial_candidates where booking_token = p_token for update;
  else
    select * into c from public.commercial_candidates where booking_token = p_token;
  end if;
  if not found or c.created_at < now() - interval '60 days'
    or c.stage not in ('nouveau', 'a_appeler', 'reunion_prevue') then
    raise exception 'Ce lien n''est plus valable : écrivez-nous depuis la page Contact.'
      using errcode = '22023';
  end if;
  return c;
end;
$$;
revoke execute on function app.candidate_by_token(uuid, boolean) from public, anon, authenticated;

create function public.recruitment_candidate(p_token uuid)
returns table (first_name text, email text, stage text, meeting_id uuid,
  meeting_starts_at timestamptz, meeting_duration int)
language plpgsql
security definer
set search_path = ''
as $$
declare
  c public.commercial_candidates := app.candidate_by_token(p_token);
begin
  return query
    select c.first_name, c.email, c.stage, m.id, m.starts_at, m.duration_minutes
    from (select 1) x
    left join public.recruitment_meetings m on m.id = c.meeting_id and c.stage = 'reunion_prevue';
end;
$$;
revoke execute on function public.recruitment_candidate(uuid) from public;
grant execute on function public.recruitment_candidate(uuid) to anon, authenticated;

-- Réservation (ou changement) de la réunion : place vérifiée sous verrou, e-mail avec le lien.
create function public.recruitment_book_meeting(p_token uuid, p_meeting uuid)
returns table (starts_at timestamptz, duration_minutes int)
language plpgsql
security definer
set search_path = ''
as $$
declare
  c public.commercial_candidates := app.candidate_by_token(p_token, true);
  m public.recruitment_meetings;
begin
  if not public.consume_rate_limit('recrutement-reunion:' || p_token::text, 10, 3600) then
    raise exception 'Trop de changements : réessayez dans une heure.' using errcode = '22023';
  end if;
  select * into m from public.recruitment_meetings r where r.id = p_meeting for update;
  if not found or not m.active or m.starts_at <= now() + interval '2 hours' then
    raise exception 'Cette réunion n''est plus proposée : choisissez-en une autre.'
      using errcode = '22023';
  end if;
  if c.meeting_id = m.id and c.stage = 'reunion_prevue' then
    return query select m.starts_at, m.duration_minutes;
    return;
  end if;
  if (select count(*) from public.commercial_candidates k
      where k.meeting_id = m.id and k.stage = 'reunion_prevue' and k.id <> c.id) >= m.capacity then
    raise exception 'Cette réunion est complète : choisissez-en une autre.' using errcode = '22023';
  end if;
  update public.commercial_candidates
  set meeting_id = m.id, booked_at = now(), stage = 'reunion_prevue', attendance = null,
    callback_requested = false, last_contact_at = now()
  where id = c.id;
  perform app.notify_candidate(c.id, 'recrutement_reunion',
    app.recruitment_meeting_data(m, c.booking_token));
  return query select m.starts_at, m.duration_minutes;
end;
$$;
revoke execute on function public.recruitment_book_meeting(uuid, uuid) from public;
grant execute on function public.recruitment_book_meeting(uuid, uuid) to anon, authenticated;

-- « Aucun créneau ne vous va ? » : l'équipe rappelle le candidat.
create function public.recruitment_request_callback(p_token uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  c public.commercial_candidates := app.candidate_by_token(p_token, true);
begin
  update public.commercial_candidates
  set stage = 'a_appeler', callback_requested = true, meeting_id = null, booked_at = null,
    last_contact_at = now()
  where id = c.id;
end;
$$;
revoke execute on function public.recruitment_request_callback(uuid) from public;
grant execute on function public.recruitment_request_callback(uuid) to anon, authenticated;

-- ---------------------------------------------------------------------------------------------
-- Fonctions de l'équipe
-- ---------------------------------------------------------------------------------------------

-- Réunion annulée : elle n'est plus proposée ; les inscrits sont prévenus et peuvent en choisir
-- une autre avec leur lien.
create function public.admin_cancel_recruitment_meeting(p_id uuid)
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  m public.recruitment_meetings;
  c record;
  v_count int := 0;
begin
  perform app.require_admin();
  update public.recruitment_meetings set active = false where id = p_id and active
  returning * into m;
  if not found then
    raise exception 'Réunion introuvable ou déjà annulée' using errcode = '22023';
  end if;
  for c in
    select id, booking_token from public.commercial_candidates
    where meeting_id = m.id and stage = 'reunion_prevue'
  loop
    update public.commercial_candidates
    set stage = 'nouveau', meeting_id = null, booked_at = null, last_contact_at = now()
    where id = c.id;
    perform app.notify_candidate(c.id, 'recrutement_annulation',
      app.recruitment_meeting_data(m, c.booking_token));
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;
revoke execute on function public.admin_cancel_recruitment_meeting(uuid) from public, anon;
grant execute on function public.admin_cancel_recruitment_meeting(uuid) to authenticated;

-- Candidat non retenu : réponse polie par e-mail.
create function public.admin_decline_candidate(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform app.require_admin();
  update public.commercial_candidates
  set stage = 'non_retenu', meeting_id = null, last_contact_at = now()
  where id = p_id and stage <> 'non_retenu';
  if not found then
    raise exception 'Candidat introuvable ou déjà non retenu' using errcode = '22023';
  end if;
  perform app.notify_candidate(p_id, 'recrutement_reponse', '{}'::jsonb);
end;
$$;
revoke execute on function public.admin_decline_candidate(uuid) from public, anon;
grant execute on function public.admin_decline_candidate(uuid) to authenticated;

-- Lien de démo de l'espace conseiller (ADR 0344) envoyé au candidat ; le lien doit être activé.
create function public.admin_send_candidate_demo(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  d public.commercial_demo;
begin
  perform app.require_admin();
  select * into d from public.commercial_demo;
  if not found or not d.enabled then
    raise exception 'Activez d''abord le lien de démo dans l''onglet Commerciaux.' using errcode = '22023';
  end if;
  update public.commercial_candidates set last_contact_at = now()
  where id = p_id and stage <> 'non_retenu';
  if not found then
    raise exception 'Candidat introuvable' using errcode = '22023';
  end if;
  perform app.notify_candidate(p_id, 'recrutement_demo', jsonb_build_object('cle', d.key));
end;
$$;
revoke execute on function public.admin_send_candidate_demo(uuid) from public, anon;
grant execute on function public.admin_send_candidate_demo(uuid) to authenticated;

-- Test de vente passé en entretien (simulateur de l'espace conseiller, Edge Function
-- commercial-copilot) : prénom pour le coach, puis note et compte rendu gardés sur la fiche.
create function public.admin_candidate_test_context(p_id uuid)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_first_name text;
begin
  perform app.require_admin();
  select first_name into v_first_name from public.commercial_candidates where id = p_id;
  if not found then
    raise exception 'Candidat introuvable' using errcode = '22023';
  end if;
  return v_first_name;
end;
$$;
revoke execute on function public.admin_candidate_test_context(uuid) from public, anon;
grant execute on function public.admin_candidate_test_context(uuid) to authenticated;

create function public.admin_save_candidate_test(
  p_id uuid,
  p_persona text,
  p_score int,
  p_review jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform app.require_admin();
  if p_score not between 0 and 20 or char_length(coalesce(p_persona, '')) not between 1 and 40
    or jsonb_typeof(coalesce(p_review, 'null'::jsonb)) <> 'object' then
    raise exception 'Test incomplet' using errcode = '22023';
  end if;
  update public.commercial_candidates
  set test_persona = p_persona, test_score = p_score, test_review = p_review, tested_at = now(),
    last_contact_at = now()
  where id = p_id;
  if not found then
    raise exception 'Candidat introuvable' using errcode = '22023';
  end if;
end;
$$;
revoke execute on function public.admin_save_candidate_test(uuid, text, int, jsonb) from public, anon;
grant execute on function public.admin_save_candidate_test(uuid, text, int, jsonb) to authenticated;

-- ---------------------------------------------------------------------------------------------
-- Rappels et conservation
-- ---------------------------------------------------------------------------------------------

-- Rappel la veille (24 h avant) et une heure avant, une seule fois chacun, s'il a été réservé avant.
create function app.remind_recruitment_meetings(p_now timestamptz default now())
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  r record;
  v_count int := 0;
begin
  for r in
    select c.id, c.booking_token, m as meeting, w.moment
    from public.commercial_candidates c
    join public.recruitment_meetings m on m.id = c.meeting_id
    cross join lateral (values ('veille', interval '24 hours'), ('heure', interval '1 hour'))
      as w(moment, avance)
    where c.stage = 'reunion_prevue' and m.active
      and m.starts_at > p_now
      and m.starts_at - w.avance <= p_now
      and c.booked_at < m.starts_at - w.avance
      and (w.moment = 'heure' or m.starts_at > p_now + interval '2 hours')
      and not exists (
        select 1 from public.notifications n
        where n.candidate_id = c.id and n.type = 'recrutement_rappel'
          and n.data ->> 'reunion' = m.id::text and n.data ->> 'moment' = w.moment
      )
  loop
    perform app.notify_candidate(r.id, 'recrutement_rappel',
      app.recruitment_meeting_data(r.meeting, r.booking_token)
        || jsonb_build_object('moment', r.moment));
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;
revoke execute on function app.remind_recruitment_meetings(timestamptz) from public, anon, authenticated;

-- Candidatures supprimées 2 ans après le dernier échange ; réunions passées depuis 2 ans aussi.
create function app.purge_commercial_candidates(p_now timestamptz default now())
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count int;
begin
  delete from public.commercial_candidates where last_contact_at < p_now - interval '2 years';
  get diagnostics v_count = row_count;
  delete from public.recruitment_meetings m
  where m.starts_at < p_now - interval '2 years'
    and not exists (select 1 from public.commercial_candidates c where c.meeting_id = m.id);
  return v_count;
end;
$$;
revoke execute on function app.purge_commercial_candidates(timestamptz) from public, anon, authenticated;

select cron.schedule('menao-rappel-reunions-recrutement', '*/10 * * * *',
  'select app.remind_recruitment_meetings()');
select cron.schedule('menao-purge-candidats', '55 3 * * *', 'select app.purge_commercial_candidates()');
