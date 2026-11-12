-- Limites des formules (F-139, ADR 0290), décidées le 12/11/2026 :
-- - demandes reçues par mois (plans.limites.demandes_mois) : comptées, jamais bloquées avant le
--   lancement ; l'artisan est prévenu à l'approche (my_plan_usage), l'équipe voit les dépassements
--   (admin_plan_usage) ;
-- - métiers proposés (plans.limites.metiers) : 2 au plus en Base ; au-delà, on ne peut que retirer
--   (un artisan inscrit avant garde ses métiers) ;
-- - comparatif : ligne « Appels d'offres » (Entreprise, ADR 0287).
-- Sans formule en cours (inscription, essai terminé), les limites de Base s'appliquent.

-- Limites de la formule en cours de l'artisan, celles de Base à défaut.
create function app.plan_limits(p_artisan_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select p.limites from public.plans p where p.code = app.artisan_agents(p_artisan_id) ->> 'formule'),
    (select p.limites from public.plans p where p.code = 'base'),
    '{}'::jsonb)
$$;
revoke execute on function app.plan_limits(uuid) from public, anon, authenticated;

-- Refus d'un choix de métiers au-delà de la limite, sauf s'il ne fait que retirer.
create function app.check_trades_limit(p_artisan_id uuid, p_trade_codes text[])
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_limit integer := (app.plan_limits(p_artisan_id) ->> 'metiers')::integer;
begin
  if v_limit is not null
    and (select count(distinct c) from unnest(p_trade_codes) as c) > v_limit
    and exists (
      select 1 from unnest(p_trade_codes) as c
      where not exists (
        select 1 from public.artisan_trades t where t.artisan_id = p_artisan_id and t.trade_code = c
      )
    )
  then
    raise exception 'Votre formule permet % métiers au plus.', v_limit
      using errcode = '22023', hint = 'metiers_limite';
  end if;
end;
$$;
revoke execute on function app.check_trades_limit(uuid, text[]) from public, anon, authenticated;

-- Demandes reçues ce mois-ci (heure de Paris), comptées comme pour les objectifs (ADR 0282) :
-- hors demandes retenues pour vérification, annulées avant d'être transmises, et directes.
create function app.artisan_month_requests(p_artisan_id uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::integer
  from public.requests r
  join public.projects p on p.id = r.project_id
  where r.artisan_id = p_artisan_id
    and r.created_at >= date_trunc('month', now() at time zone 'Europe/Paris') at time zone 'Europe/Paris'
    and r.status <> 'a_verifier'
    and not (r.status = 'annulee' and r.cancellation_reason is null and r.responded_at is null)
    and not (r.status = 'annulee' and r.responded_at is null and exists (
      select 1 from public.tickets tk
      where tk.project_id = r.project_id and tk.type = 'particulier_a_verifier'
        and tk.created_at = r.created_at
    ))
    and coalesce(p.preferred_artisan_id = r.artisan_id, false) is false
$$;
revoke execute on function app.artisan_month_requests(uuid) from public, anon, authenticated;

-- Usage de sa formule par l'entreprise connectée (patron, chef d'équipe, ou artisan en inscription).
create function public.my_plan_usage()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'formule', app.artisan_agents(a.id) ->> 'formule',
    'demandes', jsonb_build_object(
      'recues', app.artisan_month_requests(a.id),
      'limite', (app.plan_limits(a.id) ->> 'demandes_mois')::integer
    ),
    'metiers', jsonb_build_object(
      'nombre', (select count(*) from public.artisan_trades t where t.artisan_id = a.id),
      'limite', (app.plan_limits(a.id) ->> 'metiers')::integer
    )
  )
  from public.artisans a
  where a.id = coalesce(app.my_owned_artisan_id(), app.my_manager_artisan_id())
$$;
revoke execute on function public.my_plan_usage() from public, anon;
grant execute on function public.my_plan_usage() to authenticated;

-- Back-office (page Objectifs) : demandes du mois face à la limite de la formule, artisans validés.
create function public.admin_plan_usage()
returns table (artisan_id uuid, formule text, limite integer, recues integer)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform app.require_admin();
  return query
  select a.id, app.artisan_agents(a.id) ->> 'formule',
    (app.plan_limits(a.id) ->> 'demandes_mois')::integer, app.artisan_month_requests(a.id)
  from public.artisans a
  where a.status = 'valide';
end;
$$;
revoke execute on function public.admin_plan_usage() from public, anon;
grant execute on function public.admin_plan_usage() to authenticated;

-- Fonctions en vigueur reprises : seule la limite de métiers s'ajoute.
CREATE OR REPLACE FUNCTION public.set_artisan_trades(p_trade_codes text[], p_work_type_codes text[], p_experience_years integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_artisan uuid := app.my_owned_artisan_id();
begin
  if v_artisan is null then
    raise exception 'Aucune fiche artisan pour cet utilisateur.' using errcode = '42501';
  end if;
  if coalesce(cardinality(p_trade_codes), 0) = 0 then
    raise exception 'Au moins un métier est requis.' using errcode = '22023';
  end if;
  if exists (
    select 1 from unnest(p_trade_codes) as c
    where not exists (select 1 from public.trades t where t.code = c and t.active)
  ) then
    raise exception 'Métier inconnu.' using errcode = '22023';
  end if;
  if exists (
    select 1 from unnest(coalesce(p_work_type_codes, '{}')) as c
    where not exists (
      select 1 from public.work_types w
      where w.code = c and w.active and w.trade_code = any (p_trade_codes)
    )
  ) then
    raise exception 'Spécialité inconnue ou hors des métiers choisis.' using errcode = '22023';
  end if;
  -- Limite de métiers de la formule (ADR 0290) : au-delà, on ne peut que retirer.
  perform app.check_trades_limit(v_artisan, p_trade_codes);

  delete from public.artisan_work_types where artisan_id = v_artisan;
  delete from public.artisan_trades where artisan_id = v_artisan;
  insert into public.artisan_trades (artisan_id, trade_code)
    select distinct v_artisan, c from unnest(p_trade_codes) as c;
  insert into public.artisan_work_types (artisan_id, work_type_code)
    select distinct v_artisan, c from unnest(coalesce(p_work_type_codes, '{}')) as c;
  update public.artisans set experience_years = p_experience_years where id = v_artisan;
end;
$function$;

CREATE OR REPLACE FUNCTION app.apply_artisan_signup(p_artisan uuid, p_signup jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_zone jsonb;
  v_radius numeric;
  v_lon double precision;
  v_lat double precision;
  v_label text;
  v_insee text;
  v_partner uuid;
  v_commercial uuid;
  v_tracking uuid;
begin
  if p_artisan is null or jsonb_typeof(p_signup) is distinct from 'object' then
    return;
  end if;

  if jsonb_typeof(p_signup -> 'trade_codes') = 'array' then
    -- Limite de métiers de la formule de Base (ADR 0290) : les premiers choisis sont gardés, sans
    -- faire échouer l'inscription (anciennes versions de l'application).
    insert into public.artisan_trades (artisan_id, trade_code)
    select p_artisan, s.code
    from (
      select distinct on (t.code) t.code, c.ord
      from jsonb_array_elements(p_signup -> 'trade_codes') with ordinality as c (value, ord)
      join public.trades t on t.active and to_jsonb(t.code) = c.value
      order by t.code, c.ord
    ) s
    order by s.ord
    limit coalesce((app.plan_limits(p_artisan) ->> 'metiers')::integer, 1000)
    on conflict (artisan_id, trade_code) do nothing;
  end if;

  update public.artisans set
    assujetti_tva = case
      when jsonb_typeof(p_signup -> 'assujetti_tva') = 'boolean'
      then (p_signup ->> 'assujetti_tva')::boolean else assujetti_tva end,
    is_dirigeant = case
      when jsonb_typeof(p_signup -> 'is_dirigeant') = 'boolean'
      then (p_signup ->> 'is_dirigeant')::boolean else is_dirigeant end
  where id = p_artisan;

  -- Programme Partenaires (F-59), commercial (F-65), code de suivi (F-66) ou parrainage (F-60) :
  -- inscription arrivée par un lien ou un code saisi.
  if jsonb_typeof(p_signup -> 'partner_code') = 'string' then
    v_partner := app.active_partner_id(p_signup ->> 'partner_code');
    if v_partner is not null then
      insert into public.partner_attributions (partner_id, artisan_id)
      values (v_partner, p_artisan)
      on conflict (artisan_id) do nothing;
    else
      select c.id into v_commercial
      from public.commercials c
      where c.code = lower(btrim(p_signup ->> 'partner_code')) and c.status = 'actif';
      if v_commercial is not null then
        insert into public.commercial_attributions (commercial_id, artisan_id)
        values (v_commercial, p_artisan)
        on conflict (artisan_id) do nothing;
      else
        -- Code de suivi actif (publicité, flyers, salon, code d'un associé : F-66, ADR 0209).
        select k.id into v_tracking
        from public.acquisition_codes k
        where k.code = lower(btrim(p_signup ->> 'partner_code')) and k.active;
        if v_tracking is not null then
          insert into public.acquisition_code_attributions (code_id, artisan_id)
          values (v_tracking, p_artisan)
          on conflict (artisan_id) do nothing;
        else
          -- Parrainage (F-60) : code d'un artisan validé, jamais le sien.
          insert into public.artisan_referrals (referrer_artisan_id, referred_artisan_id)
          select c.artisan_id, p_artisan
          from public.artisan_referral_codes c
          join public.artisans a on a.id = c.artisan_id and a.status = 'valide'
          where c.code = lower(btrim(p_signup ->> 'partner_code')) and c.artisan_id <> p_artisan
          on conflict (referred_artisan_id) do nothing;
        end if;
      end if;
    end if;
  end if;

  v_zone := case when jsonb_typeof(p_signup -> 'zone') = 'object' then p_signup -> 'zone' end;
  -- Zone par territoire (ADR 0213).
  if v_zone ->> 'mode' in ('departements', 'regions', 'france') then
    perform app.apply_signup_territories(p_artisan, v_zone);
    return;
  end if;
  if v_zone is null or v_zone ->> 'mode' is distinct from 'rayon'
     or jsonb_typeof(v_zone -> 'radius_km') is distinct from 'number'
     or jsonb_typeof(v_zone -> 'lon') is distinct from 'number'
     or jsonb_typeof(v_zone -> 'lat') is distinct from 'number' then
    return;
  end if;
  v_radius := (v_zone ->> 'radius_km')::numeric;
  v_lon := (v_zone ->> 'lon')::double precision;
  v_lat := (v_zone ->> 'lat')::double precision;
  v_label := nullif(left(btrim(coalesce(v_zone ->> 'base_label', '')), 300), '');
  v_insee := v_zone ->> 'base_citycode';
  -- Mêmes rayons et même boîte englobante que zoneStepSchema (@menao/validation).
  if v_radius in (10, 20, 30, 50, 75, 100)
     and v_lon between -63 and 56 and v_lat between -22 and 52
     and v_label is not null and v_insee ~ '^([0-9]{5}|2[AB][0-9]{3})$' then
    update public.artisans set
      zone_mode = 'rayon',
      base_label = v_label,
      base_code_insee = v_insee,
      base_location = extensions.st_setsrid(extensions.st_makepoint(v_lon, v_lat), 4326)::extensions.geography,
      radius_km = v_radius::int
    where id = p_artisan;
  end if;
end;
$function$;

-- Comparatif des formules (ADR 0200) : appels d'offres, Entreprise seulement (ADR 0287).
insert into public.plan_features (categorie, libelle, detail, valeurs, ordre)
values ('Devis et signature', 'Appels d''offres : DPGF chiffré avec vos prix',
  'Le DPGF de l''architecte lu, chiffré avec vos prix habituels et rendu dans son fichier.',
  '{"base": false, "premium": false, "entreprise": true}'::jsonb, 170);
