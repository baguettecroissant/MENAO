-- Engagement de l'artisan (ADR 0117), demandé par le cahier des charges « Inscription et
-- vérification des artisans » : travail déclaré et exactitude des documents. Signé avec la charte
-- qualité, d'une seule signature (date, heure, adresse IP, version), puis à chaque nouvelle version.
-- TODO(legal) : texte provisoire (packages/core/src/engagement.ts), à remplacer par le texte validé.

-- Version en vigueur (miroir de ENGAGEMENT_VERSION ; « B » : brouillon).
create function app.current_engagement_version()
returns text
language sql
immutable
set search_path = ''
as $$
  select 'B1'
$$;

alter table public.artisan_charter_acceptances
  add column engagement_version text check (char_length(engagement_version) between 1 and 20);
comment on column public.artisan_charter_acceptances.engagement_version is
  'Version de l''engagement de l''artisan signée avec la charte ; null pour une signature antérieure.';

-- Une signature par version de la charte et de l'engagement.
alter table public.artisan_charter_acceptances
  drop constraint artisan_charter_acceptances_artisan_id_version_key;
alter table public.artisan_charter_acceptances
  add constraint artisan_charter_acceptances_versions_key
  unique nulls not distinct (artisan_id, version, engagement_version);

-- Charte et engagement en vigueur signés.
create function app.charter_signed(p_artisan_id uuid)
returns boolean
language sql
stable
set search_path = ''
as $$
  select exists (
    select 1 from public.artisan_charter_acceptances c
    where c.artisan_id = p_artisan_id
      and c.version = app.current_charter_version()
      and c.engagement_version = app.current_engagement_version()
  )
$$;
revoke execute on function app.charter_signed(uuid) from public, anon, authenticated;

-- Même fonction qu'avant (ADR 0111), avec l'engagement en vigueur.
drop function public.accept_artisan_charter(text, int, text, text, text, text, text);
create function public.accept_artisan_charter(
  p_version text,
  p_rules_count int,
  p_signer_name text,
  p_company text,
  p_siret text,
  p_signature_path text,
  p_ip text default null,
  p_engagement_version text default null
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
  if p_engagement_version is distinct from app.current_engagement_version() then
    raise exception 'L''engagement de l''artisan en vigueur doit être certifié.' using errcode = '22023';
  end if;

  insert into public.artisan_charter_acceptances
    (artisan_id, version, rules_count, signer_name, company, siret, signature_path, signer_ip,
     engagement_version)
  values
    (v_artisan_id, p_version, p_rules_count, btrim(p_signer_name), btrim(p_company),
     regexp_replace(p_siret, '\s', '', 'g'), p_signature_path,
     coalesce(app.parse_ip(p_ip), app.request_ip()), p_engagement_version)
  on conflict (artisan_id, version, engagement_version) do nothing
  returning accepted_at into v_at;

  if v_at is null then
    select c.accepted_at into v_at from public.artisan_charter_acceptances c
    where c.artisan_id = v_artisan_id and c.version = p_version
      and c.engagement_version = p_engagement_version;
  end if;
  return v_at;
end;
$$;
revoke execute on function public.accept_artisan_charter(text, int, text, text, text, text, text, text)
  from public, anon;
grant execute on function public.accept_artisan_charter(text, int, text, text, text, text, text, text)
  to authenticated;

-- Étapes manquantes avant l'envoi (même fonction qu'avant, ADR 0115) : charte et engagement en
-- vigueur signés.
create or replace function app.onboarding_missing_steps(p_artisan_id uuid)
returns text[]
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  a public.artisans;
  v_missing text[] := '{}';
begin
  select * into a from public.artisans where id = p_artisan_id;
  if not found then
    return null;
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
  if not app.charter_signed(a.id) then
    v_missing := array_append(v_missing, 'charte');
  end if;
  if not app.documents_complete(a.id, array['en_attente', 'valide']::public.document_status[]) then
    v_missing := array_append(v_missing, 'documents');
  end if;
  if not (char_length(coalesce(a.presentation, '')) >= 100
          and exists (select 1 from public.profiles p where p.user_id = a.user_id and p.avatar_path is not null)) then
    v_missing := array_append(v_missing, 'profil');
  end if;
  return v_missing;
end;
$$;
