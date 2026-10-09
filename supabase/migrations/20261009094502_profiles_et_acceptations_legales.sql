-- Phase 0 — profils utilisateurs, acceptations des documents légaux (F-08),
-- attribution et synchronisation du rôle depuis auth.users.

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  role public.app_role not null default 'particulier',
  first_name text check (char_length(first_name) between 1 and 100),
  last_name text check (char_length(last_name) between 1 and 100),
  phone text check (phone ~ '^\+[1-9][0-9]{7,14}$'),
  avatar_path text,
  marketing_opt_in boolean not null default false,
  notification_preferences jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on column public.profiles.role is
  'Copie en lecture seule de auth.users.raw_app_meta_data ->> role (source de vérité), synchronisée par trigger.';

create index profiles_role_idx on public.profiles (role);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function app.set_updated_at();

alter table public.profiles enable row level security;

-- Privilèges : lecture, et modification des seules colonnes non sensibles.
-- Pas d'insertion ni de suppression côté client (trigger + cascade depuis auth.users).
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (first_name, last_name, phone, avatar_path, marketing_opt_in, notification_preferences)
  on public.profiles to authenticated;

create policy "profiles : lecture de son profil, ou par l'équipe MENAO"
  on public.profiles for select to authenticated
  using (user_id = (select auth.uid()) or (select app.is_staff()));

create policy "profiles : modification de son propre profil"
  on public.profiles for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- legal_acceptances (journal en ajout seul)
-- ---------------------------------------------------------------------------
create type public.legal_document as enum ('cgu', 'confidentialite');

create table public.legal_acceptances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  document public.legal_document not null,
  version text not null check (char_length(version) between 1 and 50),
  accepted_at timestamptz not null default now(),
  ip inet,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, document, version)
);

create trigger legal_acceptances_set_updated_at
  before update on public.legal_acceptances
  for each row execute function app.set_updated_at();

alter table public.legal_acceptances enable row level security;

revoke all on public.legal_acceptances from anon, authenticated;
grant select on public.legal_acceptances to authenticated;

create policy "legal_acceptances : lecture des siennes, ou par l'équipe MENAO"
  on public.legal_acceptances for select to authenticated
  using (user_id = (select auth.uid()) or (select app.is_staff()));

-- ---------------------------------------------------------------------------
-- Triggers sur auth.users
-- ---------------------------------------------------------------------------

-- Avant insertion : rôle par défaut `particulier` dans app_metadata.
-- Un client ne peut pas choisir son rôle : signUp() n'écrit que dans user_metadata.
-- Seul le serveur (clé service_role) peut créer un utilisateur avec un autre rôle.
create function app.before_auth_user_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested text := nullif(new.raw_app_meta_data ->> 'role', '');
begin
  if requested is null then
    new.raw_app_meta_data :=
      coalesce(new.raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('role', 'particulier');
  elsif not app.is_valid_role(requested) then
    raise exception 'Rôle inconnu : %', requested using errcode = '22023';
  end if;
  return new;
end;
$$;

create trigger before_auth_user_insert
  before insert on auth.users
  for each row execute function app.before_auth_user_insert();

-- Après insertion : création du profil et des acceptations légales à partir des
-- données d'inscription (user_metadata), puis retrait de ces données de
-- user_metadata (le profil devient la seule source, et elles ne restent pas dans le JWT).
create function app.after_auth_user_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  phone text := meta ->> 'phone';
begin
  insert into public.profiles (user_id, role, first_name, last_name, phone, marketing_opt_in)
  values (
    new.id,
    (new.raw_app_meta_data ->> 'role')::public.app_role,
    nullif(left(btrim(meta ->> 'first_name'), 100), ''),
    nullif(left(btrim(meta ->> 'last_name'), 100), ''),
    case when phone ~ '^\+[1-9][0-9]{7,14}$' then phone end,
    coalesce(meta -> 'marketing_opt_in' = 'true'::jsonb, false)
  );

  insert into public.legal_acceptances (user_id, document, version)
  select new.id, d.key::public.legal_document, left(btrim(d.value), 50)
  from jsonb_each_text(
    case when jsonb_typeof(meta -> 'legal') = 'object' then meta -> 'legal' else '{}'::jsonb end
  ) as d
  where d.key = any (enum_range(null::public.legal_document)::text[])
    and nullif(btrim(d.value), '') is not null;

  update auth.users
  set raw_user_meta_data = raw_user_meta_data - array['phone', 'marketing_opt_in', 'legal']
  where id = new.id
    and raw_user_meta_data ?| array['phone', 'marketing_opt_in', 'legal'];

  return null;
end;
$$;

create trigger after_auth_user_insert
  after insert on auth.users
  for each row execute function app.after_auth_user_insert();

-- Après changement de app_metadata : validation et copie du rôle dans profiles.
create function app.after_auth_user_role_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_role text := new.raw_app_meta_data ->> 'role';
begin
  if new_role is distinct from (old.raw_app_meta_data ->> 'role') then
    if not app.is_valid_role(new_role) then
      raise exception 'Rôle inconnu ou absent : %', new_role using errcode = '22023';
    end if;
    update public.profiles set role = new_role::public.app_role where user_id = new.id;
  end if;
  return null;
end;
$$;

create trigger after_auth_user_role_update
  after update of raw_app_meta_data on auth.users
  for each row execute function app.after_auth_user_role_update();

-- Les fonctions de trigger ne doivent pas être appelables via l'API.
revoke execute on function
  app.before_auth_user_insert(),
  app.after_auth_user_insert(),
  app.after_auth_user_role_update()
from public, anon, authenticated;
