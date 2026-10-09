-- Phase 0 — extensions, schéma interne `app`, rôles et fonctions utilitaires.

-- Extensions (dans le schéma `extensions`, jamais dans `public`).
create extension if not exists postgis with schema extensions;
create extension if not exists citext with schema extensions;

-- Rôles applicatifs (spec §3). `visiteur` = pas de session, jamais stocké.
-- Source de vérité : auth.users.raw_app_meta_data ->> 'role' (jamais user_metadata).
create type public.app_role as enum (
  'particulier',
  'artisan',
  'artisan_en_attente',
  'admin',
  'support'
);

-- Schéma interne : fonctions utilisées par les politiques RLS et les triggers.
-- Il n'est pas exposé par l'API Data (absent de api.schemas dans config.toml).
create schema if not exists app;
grant usage on schema app to anon, authenticated, service_role;

-- Rôle de l'utilisateur courant, lu dans le JWT (app_metadata). NULL si absent ou inconnu.
create function app.jwt_role()
returns public.app_role
language sql
stable
security invoker
set search_path = ''
as $$
  select r
  from unnest(enum_range(null::public.app_role)) as r
  where r::text = (auth.jwt() -> 'app_metadata' ->> 'role')
$$;

create function app.is_admin()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce(app.jwt_role() = 'admin', false)
$$;

-- Équipe MENAO : admin + support (lecture, modération, litiges).
create function app.is_staff()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce(app.jwt_role() in ('admin', 'support'), false)
$$;

-- Vrai si la chaîne est un rôle stocké valide.
create function app.is_valid_role(value text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select coalesce(value = any (enum_range(null::public.app_role)::text[]), false)
$$;

-- Trigger générique de mise à jour de updated_at.
create function app.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
