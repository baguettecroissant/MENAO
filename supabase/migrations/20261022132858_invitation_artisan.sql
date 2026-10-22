-- « Invitez votre artisan de confiance » (lot 6 du plan V1.1, ADR 0162, d'après « Programme de
-- parrainage », partie 4) :
-- - un particulier invite un artisan qui n'est pas sur MENAO (nom de l'entreprise, téléphone ou
--   e-mail, métier, ville, message) ; un ticket « Invitation d'un artisan » arrive à l'équipe, qui
--   le rappelle : « Un de vos clients vous recommande » ;
-- - quand un artisan validé correspond (téléphone ou e-mail), l'invitation passe à « inscrit » et
--   une note sur le ticket prévient l'équipe (cadeau de remerciement du particulier, à définir) ;
-- - 5 invitations au plus par particulier sur 30 jours ; coordonnées d'un artisan resté hors de
--   MENAO effacées après 12 mois. Mêmes valeurs dans packages/core/src/referral.ts.

create type public.artisan_invitation_status as enum ('envoyee', 'inscrit');

create table public.artisan_invitations (
  id uuid primary key default gen_random_uuid(),
  particulier_id uuid not null references auth.users (id) on delete cascade,
  company text not null check (char_length(company) between 2 and 120),
  contact_name text check (char_length(contact_name) <= 120),
  phone text check (phone ~ '^\+[1-9][0-9]{7,14}$'),
  email text check (email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' and char_length(email) <= 254),
  trade_code text references public.trades (code) on update cascade on delete set null,
  city text check (char_length(city) <= 100),
  message text check (char_length(message) <= 500),
  status public.artisan_invitation_status not null default 'envoyee',
  artisan_id uuid references public.artisans (id) on delete set null,
  ticket_id uuid references public.tickets (id) on delete set null,
  joined_at timestamptz,
  created_at timestamptz not null default now(),
  check (phone is not null or email is not null),
  check ((status = 'inscrit') = (joined_at is not null))
);
create index artisan_invitations_particulier_idx on public.artisan_invitations (particulier_id, created_at desc);
create index artisan_invitations_phone_idx on public.artisan_invitations (phone) where status = 'envoyee';
create index artisan_invitations_email_idx on public.artisan_invitations (email) where status = 'envoyee';
create index artisan_invitations_artisan_idx on public.artisan_invitations (artisan_id);
create index artisan_invitations_ticket_idx on public.artisan_invitations (ticket_id);

alter table public.artisan_invitations enable row level security;
revoke all on public.artisan_invitations from anon, authenticated;
grant select on public.artisan_invitations to authenticated;
-- Écriture par les fonctions ci-dessous seulement.
create policy "artisan_invitations : lecture par le particulier ou l'équipe"
  on public.artisan_invitations for select to authenticated
  using (particulier_id = (select auth.uid()) or (select app.is_staff()));

-- Invitation par un particulier connecté (compte confirmé, non anonyme). Téléphone au format
-- international (+33…) ou e-mail, l'un des deux au moins. Erreurs 22023 : messages affichables.
create function public.invite_artisan(
  p_company text,
  p_contact_name text,
  p_phone text,
  p_email text,
  p_trade_code text,
  p_city text,
  p_message text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_account text;
  v_company text := nullif(btrim(coalesce(p_company, '')), '');
  v_contact text := nullif(btrim(coalesce(p_contact_name, '')), '');
  v_phone text := nullif(btrim(coalesce(p_phone, '')), '');
  v_email text := lower(nullif(btrim(coalesce(p_email, '')), ''));
  v_trade text := nullif(btrim(coalesce(p_trade_code, '')), '');
  v_city text := nullif(btrim(coalesce(p_city, '')), '');
  v_message text := nullif(btrim(coalesce(p_message, '')), '');
  v_trade_label text;
  v_id uuid;
  v_ticket uuid;
begin
  select u.email into v_account from auth.users u
  where u.id = v_user and not u.is_anonymous and u.email is not null;
  if v_account is null or app.jwt_role() is distinct from 'particulier' then
    raise exception 'Réservé aux particuliers connectés' using errcode = '42501';
  end if;
  if v_company is null or char_length(v_company) not between 2 and 120 then
    raise exception 'Indiquez le nom de l''artisan ou de son entreprise.' using errcode = '22023';
  end if;
  if v_phone is null and v_email is null then
    raise exception 'Indiquez le téléphone ou l''e-mail de l''artisan.' using errcode = '22023';
  end if;
  if v_phone is not null and v_phone !~ '^\+[1-9][0-9]{7,14}$' then
    raise exception 'Numéro de téléphone invalide.' using errcode = '22023';
  end if;
  if v_email is not null and (v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or char_length(v_email) > 254) then
    raise exception 'Adresse e-mail invalide.' using errcode = '22023';
  end if;
  if char_length(v_contact) > 120 or char_length(v_city) > 100 or char_length(v_message) > 500 then
    raise exception 'Texte trop long.' using errcode = '22023';
  end if;
  if v_trade is not null then
    select t.label into v_trade_label from public.trades t where t.code = v_trade;
    if v_trade_label is null then
      raise exception 'Métier inconnu.' using errcode = '22023';
    end if;
  end if;
  -- 5 et 30 : ARTISAN_INVITATIONS_PER_PERIOD, ARTISAN_INVITATION_PERIOD_DAYS (@menao/core).
  if (select count(*) from public.artisan_invitations i
      where i.particulier_id = v_user and i.created_at > now() - interval '30 days') >= 5 then
    raise exception 'Vous avez déjà invité 5 artisans ce mois-ci : merci ! Réessayez un peu plus tard.'
      using errcode = '22023';
  end if;
  if exists (
    select 1 from public.artisan_invitations i
    where i.particulier_id = v_user and i.status = 'envoyee'
      and (i.phone = v_phone or i.email = v_email)
  ) then
    raise exception 'Vous avez déjà invité cet artisan : l''équipe MENAO s''en occupe.' using errcode = '22023';
  end if;

  -- Échéance de 3 jours : rappeler l'artisan pendant que la recommandation est fraîche.
  insert into public.tickets (type, user_id, contact_email, subject, message, due_at)
  values ('invitation_artisan', v_user, lower(v_account),
    left(format('Invitation d''un artisan : %s', v_company), 150),
    -- Message lu aussi par le client dans « Mes échanges » : ce qu'il a saisi.
    left(concat_ws(E'\n',
      'Entreprise : ' || v_company,
      'Contact : ' || v_contact,
      'Téléphone : ' || v_phone,
      'E-mail : ' || v_email,
      'Métier : ' || v_trade_label,
      'Ville : ' || v_city,
      'Message du client : ' || v_message), 2000),
    now() + interval '3 days')
  returning id into v_ticket;
  insert into public.ticket_notes (ticket_id, author_id, body)
  values (v_ticket, null,
    'Un client recommande cet artisan, pas encore sur MENAO : le rappeler (« Un de vos clients vous recommande »).');
  insert into public.artisan_invitations (particulier_id, company, contact_name, phone, email,
    trade_code, city, message, ticket_id)
  values (v_user, v_company, v_contact, v_phone, v_email, v_trade, v_city, v_message, v_ticket)
  returning id into v_id;
  return v_id;
end;
$$;
revoke execute on function public.invite_artisan(text, text, text, text, text, text, text) from public, anon;
grant execute on function public.invite_artisan(text, text, text, text, text, text, text) to authenticated;

-- Artisan validé : les invitations encore ouvertes à son téléphone ou à son e-mail passent à
-- « inscrit », avec une note pour l'équipe sur chaque ticket.
create function app.match_artisan_invitations()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_phone text;
  v_email text;
  r record;
begin
  select p.phone, lower(u.email) into v_phone, v_email
  from auth.users u left join public.profiles p on p.user_id = u.id
  where u.id = new.user_id;
  for r in
    update public.artisan_invitations i
    set status = 'inscrit', artisan_id = new.id, joined_at = now()
    where i.status = 'envoyee'
      and ((v_phone is not null and i.phone = v_phone) or (v_email is not null and i.email = v_email))
    returning i.ticket_id
  loop
    if r.ticket_id is not null then
      insert into public.ticket_notes (ticket_id, author_id, body)
      values (r.ticket_id, null, left(format(
        'L''artisan invité a rejoint MENAO (%s) : dossier validé. Cadeau de remerciement du client à prévoir.',
        app.artisan_label(new.id)), 2000));
    end if;
  end loop;
  return null;
end;
$$;
revoke execute on function app.match_artisan_invitations() from public, anon, authenticated;
create trigger artisans_match_invitations after update of status on public.artisans
  for each row when (new.status = 'valide' and old.status is distinct from 'valide')
  execute function app.match_artisan_invitations();

-- Coordonnées d'un artisan resté hors de MENAO : effacées 12 mois après l'invitation
-- (ARTISAN_INVITATION_RETENTION_MONTHS), dans l'invitation comme dans le message du ticket.
-- Tâche pg_cron quotidienne. p_now : instant de référence (tests).
create function app.purge_artisan_invitations(p_now timestamptz default now())
returns integer
language sql
security definer
set search_path = ''
as $$
  with purged as (
    delete from public.artisan_invitations
    where status = 'envoyee' and created_at < p_now - interval '12 months'
    returning ticket_id
  ), scrubbed as (
    update public.tickets t
    set subject = 'Invitation d''un artisan',
      message = 'Invitation d''un artisan : coordonnées effacées 12 mois après l''invitation.'
    from purged
    where t.id = purged.ticket_id
    returning 1
  )
  select count(*)::int from purged
$$;
revoke execute on function app.purge_artisan_invitations(timestamptz) from public, anon, authenticated;
select cron.schedule('menao-purge-invitations', '45 3 * * *', 'select app.purge_artisan_invitations()');
