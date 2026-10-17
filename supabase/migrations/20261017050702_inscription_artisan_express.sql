-- Inscription artisan en un seul parcours (ADR 0110) : métiers, entreprise et zone choisis avant
-- la création du compte, enregistrés en une fois.
-- - Inscription par e-mail : objet « signup » des métadonnées, lu par after_auth_user_insert.
-- - Google ou Apple : complete_artisan_oauth_signup, qui transforme le compte à finaliser
--   (ADR 0108) en compte artisan en attente.

alter table public.artisans add column is_dirigeant boolean;
comment on column public.artisans.is_dirigeant is
  'Réponse à l''inscription : l''artisan se déclare dirigeant de l''entreprise (sinon, le '
  'dirigeant signera l''engagement). Déclaratif, contrôlé par l''équipe.';

-- Applique les choix du parcours à une fiche en brouillon. Les métadonnées d'inscription sont
-- envoyées par le navigateur : chaque valeur est revérifiée, et une valeur invalide est ignorée
-- sans erreur (la création du compte ne doit pas échouer ; l'artisan complète dans son espace).
create function app.apply_artisan_signup(p_artisan uuid, p_signup jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_zone jsonb;
  v_radius numeric;
  v_lon double precision;
  v_lat double precision;
  v_label text;
  v_insee text;
begin
  if p_artisan is null or jsonb_typeof(p_signup) is distinct from 'object' then
    return;
  end if;

  if jsonb_typeof(p_signup -> 'trade_codes') = 'array' then
    insert into public.artisan_trades (artisan_id, trade_code)
    select distinct p_artisan, t.code
    from jsonb_array_elements(p_signup -> 'trade_codes') as c (value)
    join public.trades t on t.active and to_jsonb(t.code) = c.value
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

  v_zone := case when jsonb_typeof(p_signup -> 'zone') = 'object' then p_signup -> 'zone' end;
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
$$;
revoke execute on function app.apply_artisan_signup(uuid, jsonb) from public, anon, authenticated;

-- Même fonction qu'avant (ADR 0108), avec les choix du parcours pour une fiche artisan.
create or replace function app.after_auth_user_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  phone text := meta ->> 'phone';
  v_siret text := meta ->> 'siret';
  v_role public.app_role := (new.raw_app_meta_data ->> 'role')::public.app_role;
  v_full text := btrim(coalesce(meta ->> 'full_name', meta ->> 'name', ''));
  v_first text := coalesce(nullif(btrim(meta ->> 'first_name'), ''), nullif(btrim(meta ->> 'given_name'), ''));
  v_last text := coalesce(nullif(btrim(meta ->> 'last_name'), ''), nullif(btrim(meta ->> 'family_name'), ''));
  v_artisan uuid;
begin
  if v_first is null and v_last is null and v_full <> '' and v_full !~ '@' then
    v_first := split_part(v_full, ' ', 1);
    v_last := nullif(btrim(substr(v_full, char_length(v_first) + 1)), '');
  end if;

  insert into public.profiles (user_id, role, first_name, last_name, phone, marketing_opt_in)
  values (
    new.id,
    v_role,
    nullif(left(v_first, 100), ''),
    nullif(left(v_last, 100), ''),
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

  -- Fiche artisan en brouillon. Un SIRET invalide ou déjà utilisé n'est pas repris :
  -- l'artisan le saisira à l'étape « Entreprise ».
  if v_role = 'artisan_en_attente' then
    insert into public.artisans (user_id, siret)
    values (
      new.id,
      case
        when app.is_valid_siret(v_siret)
          and not exists (select 1 from public.artisans a where a.siret = v_siret)
        then v_siret
      end
    )
    returning id into v_artisan;
    perform app.apply_artisan_signup(v_artisan, meta -> 'signup');
  end if;

  update auth.users
  set raw_user_meta_data = raw_user_meta_data
    - array['phone', 'marketing_opt_in', 'legal', 'siret', 'account_type', 'signup']
  where id = new.id
    and raw_user_meta_data ?| array['phone', 'marketing_opt_in', 'legal', 'siret', 'account_type', 'signup'];

  return null;
end;
$$;

-- Compte Google ou Apple à finaliser, ouvert depuis l'inscription artisan : il devient un compte
-- artisan en attente, avec les mêmes informations que l'inscription par e-mail (nom, téléphone
-- obligatoire, CGU, politique de confidentialité et CGV artisans, choix du parcours). Possible
-- une seule fois, et seulement pour un compte tout neuf (particulier, sans fiche artisan).
create function public.complete_artisan_oauth_signup(
  p_first_name text,
  p_last_name text,
  p_phone text,
  p_marketing_opt_in boolean,
  p_legal jsonb,
  p_siret text,
  p_signup jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_first text := btrim(coalesce(p_first_name, ''));
  v_last text := btrim(coalesce(p_last_name, ''));
  v_phone text := nullif(btrim(coalesce(p_phone, '')), '');
  v_siret text := regexp_replace(coalesce(p_siret, ''), '\s', '', 'g');
  v_artisan uuid;
begin
  if v_user is null or coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then
    raise exception 'Connexion requise' using errcode = '42501';
  end if;
  if not exists (
    select 1 from auth.users u
    where u.id = v_user and u.raw_app_meta_data -> 'signup_pending' = 'true'::jsonb
  ) then
    raise exception 'Votre compte est déjà finalisé.' using errcode = '22023';
  end if;
  if (select u.raw_app_meta_data ->> 'role' from auth.users u where u.id = v_user) <> 'particulier'
     or exists (select 1 from public.artisans a where a.user_id = v_user) then
    raise exception 'Ce compte ne peut pas devenir un compte professionnel.' using errcode = '22023';
  end if;
  if char_length(v_first) not between 1 and 100 or char_length(v_last) not between 1 and 100 then
    raise exception 'Indiquez votre prénom et votre nom.' using errcode = '22023';
  end if;
  if v_phone is null or v_phone !~ '^\+[1-9][0-9]{7,14}$' then
    raise exception 'Le téléphone est obligatoire pour un compte professionnel.' using errcode = '22023';
  end if;
  if jsonb_typeof(p_legal) is distinct from 'object'
     or nullif(btrim(p_legal ->> 'cgu'), '') is null
     or nullif(btrim(p_legal ->> 'confidentialite'), '') is null
     or nullif(btrim(p_legal ->> 'cgv_artisan'), '') is null then
    raise exception 'Acceptez les conditions d''utilisation, la politique de confidentialité et les conditions de vente artisans.'
      using errcode = '22023';
  end if;

  update public.profiles
  set first_name = left(v_first, 100), last_name = left(v_last, 100), phone = v_phone,
      marketing_opt_in = coalesce(p_marketing_opt_in, false)
  where user_id = v_user;

  insert into public.legal_acceptances (user_id, document, version)
  select v_user, d.key::public.legal_document, left(btrim(d.value), 50)
  from jsonb_each_text(p_legal) as d
  where d.key in ('cgu', 'confidentialite', 'cgv_artisan') and nullif(btrim(d.value), '') is not null
  on conflict (user_id, document, version) do nothing;

  -- Le rôle est recopié dans profiles par after_auth_user_role_update.
  update auth.users
  set raw_app_meta_data = (raw_app_meta_data - 'signup_pending') || '{"role":"artisan_en_attente"}'::jsonb
  where id = v_user;

  insert into public.artisans (user_id, siret)
  values (
    v_user,
    case
      when app.is_valid_siret(v_siret)
        and not exists (select 1 from public.artisans a where a.siret = v_siret)
      then v_siret
    end
  )
  returning id into v_artisan;
  perform app.apply_artisan_signup(v_artisan, p_signup);
end;
$$;
revoke execute on function public.complete_artisan_oauth_signup(text, text, text, boolean, jsonb, text, jsonb)
  from public, anon;
grant execute on function public.complete_artisan_oauth_signup(text, text, text, boolean, jsonb, text, jsonb)
  to authenticated;
