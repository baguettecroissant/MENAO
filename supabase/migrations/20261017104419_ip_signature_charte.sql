-- Adresse IP de la signature de la charte qualité (ADR 0111), demandée par le cahier des charges
-- « Inscription et vérification des artisans » : date, heure, adresse IP et version signée.
-- TODO(legal) : durée de conservation (5 ans après la fin de l'abonnement, selon le cahier des
-- charges) et mention dans la politique de confidentialité.

alter table public.artisan_charter_acceptances add column signer_ip inet;
comment on column public.artisan_charter_acceptances.signer_ip is
  'Adresse IP au moment de la signature : transmise par le site (adresse du visiteur), sinon '
  'celle de la requête (application).';

-- Première adresse d'une liste « x-forwarded-for » ; null si elle est absente ou invalide.
create function app.parse_ip(p_value text)
returns inet
language plpgsql
immutable
set search_path = ''
as $$
begin
  return nullif(btrim(split_part(coalesce(p_value, ''), ',', 1)), '')::inet;
exception when others then
  return null;
end;
$$;
revoke execute on function app.parse_ip(text) from public, anon, authenticated;

-- Adresse de la requête reçue par l'API : celle de l'appareil pour l'application ; celle du
-- serveur pour le site, qui transmet donc l'adresse de son visiteur (p_ip).
create function app.request_ip()
returns inet
language sql
stable
set search_path = ''
as $$
  select app.parse_ip(
    coalesce(nullif(current_setting('request.headers', true), ''), '{}')::json ->> 'x-forwarded-for'
  )
$$;
revoke execute on function app.request_ip() from public, anon, authenticated;

-- Même fonction qu'avant (ADR 0104), avec l'adresse IP.
drop function public.accept_artisan_charter(text, int, text, text, text, text);
create function public.accept_artisan_charter(
  p_version text,
  p_rules_count int,
  p_signer_name text,
  p_company text,
  p_siret text,
  p_signature_path text,
  p_ip text default null
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
    (artisan_id, version, rules_count, signer_name, company, siret, signature_path, signer_ip)
  values
    (v_artisan_id, p_version, p_rules_count, btrim(p_signer_name), btrim(p_company),
     regexp_replace(p_siret, '\s', '', 'g'), p_signature_path,
     coalesce(app.parse_ip(p_ip), app.request_ip()))
  on conflict (artisan_id, version) do nothing
  returning accepted_at into v_at;

  if v_at is null then
    select c.accepted_at into v_at from public.artisan_charter_acceptances c
    where c.artisan_id = v_artisan_id and c.version = p_version;
  end if;
  return v_at;
end;
$$;
revoke execute on function public.accept_artisan_charter(text, int, text, text, text, text, text)
  from public, anon;
grant execute on function public.accept_artisan_charter(text, int, text, text, text, text, text)
  to authenticated;
