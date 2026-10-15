-- Charte qualité de l'artisan partenaire (F-14, ADR 0104) : signée pendant l'inscription pro, avant
-- le dépôt des documents. Une signature par version (contenu : packages/core/src/charter.ts).
-- TODO(legal): valeur de la signature (cases cochées, tracé et horodatage) et annexe aux CGV artisans.

-- Version en cours (miroir de CHARTER_VERSION) et nombre de règles à cocher (CHARTER_RULE_COUNT).
create function app.current_charter_version()
returns text
language sql
immutable
set search_path = ''
as $$
  select 'V5'
$$;

create function app.current_charter_rule_count()
returns smallint
language sql
immutable
set search_path = ''
as $$
  select 25::smallint
$$;

create table public.artisan_charter_acceptances (
  id uuid primary key default gen_random_uuid(),
  artisan_id uuid not null references public.artisans (id) on delete cascade,
  version text not null check (char_length(version) between 1 and 20),
  rules_count smallint not null check (rules_count > 0),
  signer_name text not null check (char_length(btrim(signer_name)) between 2 and 120),
  company text not null check (char_length(btrim(company)) between 1 and 160),
  siret text not null check (siret ~ '^[0-9]{14}$'),
  -- Tracé de la signature : chemin SVG (M, L et coordonnées) dans un cadre de 600 × 150.
  signature_path text not null
    check (char_length(signature_path) between 10 and 20000 and signature_path ~ '^[ML0-9 .-]+$'),
  accepted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (artisan_id, version)
);

alter table public.artisan_charter_acceptances enable row level security;

revoke all on public.artisan_charter_acceptances from anon, authenticated;
grant select on public.artisan_charter_acceptances to authenticated;

create policy "artisan_charter_acceptances : lecture par l'artisan, ou par l'équipe MENAO"
  on public.artisan_charter_acceptances for select to authenticated
  using (
    artisan_id in (select a.id from public.artisans a where a.user_id = (select auth.uid()))
    or (select app.is_staff())
  );

-- Signature de la charte par l'artisan connecté. Idempotente : une seule signature par version.
create function public.accept_artisan_charter(
  p_version text,
  p_rules_count int,
  p_signer_name text,
  p_company text,
  p_siret text,
  p_signature_path text
)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_artisan_id uuid;
  v_at timestamptz;
begin
  select a.id into v_artisan_id from public.artisans a where a.user_id = (select auth.uid());
  if v_artisan_id is null then
    raise exception 'Aucune fiche artisan pour cet utilisateur.' using errcode = '42501';
  end if;
  if p_version is distinct from app.current_charter_version() then
    raise exception 'Cette version de la charte n''est plus en vigueur.' using errcode = '22023';
  end if;
  if p_rules_count is distinct from app.current_charter_rule_count() then
    raise exception 'Toutes les règles de la charte doivent être validées.' using errcode = '22023';
  end if;

  insert into public.artisan_charter_acceptances
    (artisan_id, version, rules_count, signer_name, company, siret, signature_path)
  values
    (v_artisan_id, p_version, p_rules_count, btrim(p_signer_name), btrim(p_company),
     regexp_replace(p_siret, '\s', '', 'g'), p_signature_path)
  on conflict (artisan_id, version) do nothing
  returning accepted_at into v_at;

  if v_at is null then
    select c.accepted_at into v_at from public.artisan_charter_acceptances c
    where c.artisan_id = v_artisan_id and c.version = p_version;
  end if;
  return v_at;
end;
$$;

revoke execute on function public.accept_artisan_charter(text, int, text, text, text, text) from public, anon;
grant execute on function public.accept_artisan_charter(text, int, text, text, text, text) to authenticated;

-- Envoi du dossier : la charte en vigueur doit être signée (miroir de canSubmitOnboarding).
create or replace function public.submit_artisan_onboarding()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  a public.artisans;
  v_missing text[] := '{}';
begin
  select * into a from public.artisans where user_id = (select auth.uid());
  if not found then
    raise exception 'Aucune fiche artisan pour cet utilisateur.' using errcode = '42501';
  end if;
  if a.status not in ('brouillon', 'refuse') then
    raise exception 'Le dossier a déjà été envoyé.' using errcode = '22023';
  end if;

  if not (a.sirene_checked_at is not null and a.sirene_active and a.raison_sociale is not null
          and a.assujetti_tva is not null) then
    v_missing := array_append(v_missing, 'entreprise');
  end if;
  if not exists (select 1 from public.artisan_trades t where t.artisan_id = a.id) then
    v_missing := array_append(v_missing, 'metiers');
  end if;
  if not ((a.zone_mode = 'rayon' and a.base_location is not null and a.radius_km is not null)
          or (a.zone_mode = 'communes' and exists (select 1 from public.artisan_zones z where z.artisan_id = a.id))) then
    v_missing := array_append(v_missing, 'zone');
  end if;
  if not exists (
    select 1 from public.artisan_charter_acceptances c
    where c.artisan_id = a.id and c.version = app.current_charter_version()
  ) then
    v_missing := array_append(v_missing, 'charte');
  end if;
  if (
    select count(*) from public.artisan_documents d
    where d.artisan_id = a.id and d.status in ('en_attente', 'valide') and (
      (d.type = 'kbis' and d.date_emission >= (current_date - interval '3 months')::date)
      or (d.type in ('decennale', 'rc_pro') and d.date_fin >= current_date)
      or (d.type = 'identite' and (d.date_fin is null or d.date_fin >= current_date))
    )
  ) < 4 then
    v_missing := array_append(v_missing, 'documents');
  end if;
  if not (char_length(coalesce(a.presentation, '')) >= 100
          and exists (select 1 from public.profiles p where p.user_id = a.user_id and p.avatar_path is not null)) then
    v_missing := array_append(v_missing, 'profil');
  end if;

  if cardinality(v_missing) > 0 then
    raise exception 'Étapes incomplètes : %', array_to_string(v_missing, ', ') using errcode = '22023';
  end if;

  update public.artisans
  set status = 'en_verification', submitted_at = now(), refusal_reason = null
  where id = a.id;
end;
$$;
