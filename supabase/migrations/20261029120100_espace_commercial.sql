-- Espace commercial, lot 1 (F-65, ADR 0205) : fiche de chaque commercial de terrain, son code
-- d'inscription et les artisans inscrits avec ce code.
-- - Le code partage l'espace des liens /p/<code> avec les partenaires (F-59) et les parrains
--   (F-60) : il est unique dans les trois, et ne change jamais (liens et QR codes déjà imprimés).
-- - L'attribution passe par le même champ que les partenaires (`signup.partner_code`), lu dans
--   l'adresse sur le site (aucun traceur) ou saisi dans l'application.
-- - Le commercial ne voit que ses propres inscrits, avec le seul nom de l'entreprise et l'étape.

create type public.commercial_status as enum ('actif', 'suspendu');

create table public.commercials (
  id uuid primary key default gen_random_uuid(),
  -- Compte du commercial. S'il est supprimé, la fiche reste : historique des inscriptions.
  user_id uuid unique references auth.users (id) on delete set null,
  code text not null unique check (code ~ '^[a-z0-9](?:[a-z0-9-]{1,30}[a-z0-9])$'),
  nom text not null check (char_length(btrim(nom)) between 1 and 120),
  status public.commercial_status not null default 'actif',
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger commercials_set_updated_at before update on public.commercials
  for each row execute function app.set_updated_at();

-- Une ligne par artisan : le premier code reçu à l'inscription l'emporte.
create table public.commercial_attributions (
  artisan_id uuid primary key references public.artisans (id) on delete cascade,
  commercial_id uuid not null references public.commercials (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index commercial_attributions_commercial_idx
  on public.commercial_attributions (commercial_id, created_at desc);

-- Commercial connecté et actif (jamais suspendu), sinon null.
create function app.my_commercial_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select c.id
  from public.commercials c
  where c.user_id = (select auth.uid())
    and c.status = 'actif'
    and app.jwt_role()::text = 'commercial'
$$;
revoke execute on function app.my_commercial_id() from public, anon;
grant execute on function app.my_commercial_id() to authenticated;

alter table public.commercials enable row level security;
alter table public.commercial_attributions enable row level security;
revoke all on public.commercials, public.commercial_attributions from anon, authenticated;
grant select on public.commercials, public.commercial_attributions to authenticated;

create policy "commercials : lecture par le commercial ou un admin"
  on public.commercials for select to authenticated
  using (user_id = (select auth.uid()) or (select app.is_admin()));

create policy "commercial_attributions : lecture par le commercial ou un admin"
  on public.commercial_attributions for select to authenticated
  using (commercial_id = (select app.my_commercial_id()) or (select app.is_admin()));

-- Code déjà pris dans l'espace des liens /p/<code> (partenaires, parrains, commerciaux).
create function app.link_code_taken(p_code text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.partners where code = p_code)
    or exists (select 1 from public.artisan_referral_codes where code = p_code)
    or exists (select 1 from public.commercials where code = p_code)
$$;
revoke execute on function app.link_code_taken(text) from public, anon, authenticated;

-- Un partenaire ne peut pas prendre le code d'un commercial (admin_save_partner affiche le message).
create function app.partners_code_not_commercial()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (select 1 from public.commercials where code = new.code) then
    raise exception 'Ce code est déjà utilisé.' using errcode = '22023';
  end if;
  return new;
end;
$$;

create trigger partners_code_not_commercial before insert or update of code on public.partners
  for each row execute function app.partners_code_not_commercial();

-- Codes de parrainage : jamais celui d'un partenaire ni d'un commercial.
create or replace function app.new_referral_code()
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_alphabet constant text := 'abcdefghjkmnpqrstuvwxyz23456789';
  v_code text;
begin
  loop
    select string_agg(substr(v_alphabet, 1 + floor(random() * char_length(v_alphabet))::int, 1), '')
    into v_code
    from generate_series(1, 8);
    exit when not app.link_code_taken(v_code);
  end loop;
  return v_code;
end;
$$;
revoke execute on function app.new_referral_code() from public, anon, authenticated;

-- Inscription : code d'un partenaire, d'un commercial, sinon code de parrainage d'un artisan validé.
create or replace function app.apply_artisan_signup(p_artisan uuid, p_signup jsonb)
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
  v_partner uuid;
  v_commercial uuid;
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

  -- Programme Partenaires (F-59), commercial (F-65) ou parrainage (F-60) : inscription arrivée
  -- par un lien ou un code saisi.
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

-- Espace commercial : ses inscrits, du plus récent au plus ancien (nom de l'entreprise et étape).
create function public.my_commercial_signups()
returns table (
  raison_sociale text,
  status public.artisan_status,
  signed_up_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(a.nom_commercial, a.raison_sociale), a.status, ca.created_at
  from public.commercial_attributions ca
  join public.artisans a on a.id = ca.artisan_id
  where ca.commercial_id = app.my_commercial_id()
  order by ca.created_at desc
  limit 500
$$;
revoke execute on function public.my_commercial_signups() from public, anon;
grant execute on function public.my_commercial_signups() to authenticated;

-- Back-office : liste des commerciaux et de leurs inscrits.
create function public.admin_commercials()
returns table (
  id uuid,
  code text,
  nom text,
  status public.commercial_status,
  email text,
  created_at timestamptz,
  signups int,
  validated int
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform app.require_admin();
  return query
  select c.id, c.code, c.nom, c.status, u.email::text, c.created_at,
    (select count(*)::int from public.commercial_attributions ca where ca.commercial_id = c.id),
    (select count(*)::int from public.commercial_attributions ca
       join public.artisans a on a.id = ca.artisan_id
       where ca.commercial_id = c.id and a.status = 'valide')
  from public.commercials c
  left join auth.users u on u.id = c.user_id
  order by c.created_at desc;
end;
$$;
revoke execute on function public.admin_commercials() from public, anon;
grant execute on function public.admin_commercials() to authenticated;

-- Code libre et bien formé (invitation d'un commercial, avant la création du compte).
create function public.admin_commercial_code_available(p_code text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_code text := lower(btrim(coalesce(p_code, '')));
begin
  perform app.require_admin();
  return v_code ~ '^[a-z0-9](?:[a-z0-9-]{1,30}[a-z0-9])$' and not app.link_code_taken(v_code);
end;
$$;
revoke execute on function public.admin_commercial_code_available(text) from public, anon;
grant execute on function public.admin_commercial_code_available(text) to authenticated;

-- Fiche d'un commercial dont le compte vient d'être créé (rôle « commercial » déjà posé).
create function public.admin_register_commercial(p_user_id uuid, p_nom text, p_code text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_code text := lower(btrim(coalesce(p_code, '')));
  v_nom text := btrim(coalesce(p_nom, ''));
  v_id uuid;
begin
  perform app.require_admin();
  if not exists (
    select 1 from auth.users u
    where u.id = p_user_id and u.raw_app_meta_data ->> 'role' = 'commercial'
  ) then
    raise exception 'Compte commercial introuvable.' using errcode = '22023';
  end if;
  if char_length(v_nom) not between 1 and 120 then
    raise exception 'Indiquez le nom du commercial.' using errcode = '22023';
  end if;
  if v_code !~ '^[a-z0-9](?:[a-z0-9-]{1,30}[a-z0-9])$' then
    raise exception 'Code invalide : 3 à 32 caractères, minuscules, chiffres et tirets.' using errcode = '22023';
  end if;
  if app.link_code_taken(v_code) then
    raise exception 'Ce code est déjà utilisé.' using errcode = '22023';
  end if;
  insert into public.commercials (user_id, code, nom, created_by)
  values (p_user_id, v_code, v_nom, (select auth.uid()))
  returning id into v_id;
  perform app.audit('commercial.cree', 'commercial', v_id, jsonb_build_object('code', v_code));
  return v_id;
end;
$$;
revoke execute on function public.admin_register_commercial(uuid, text, text) from public, anon;
grant execute on function public.admin_register_commercial(uuid, text, text) to authenticated;

-- Suspendre ou réactiver un commercial (son code cesse alors d'attribuer les inscriptions).
create function public.admin_set_commercial_status(p_id uuid, p_status public.commercial_status)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform app.require_admin();
  update public.commercials set status = p_status where id = p_id;
  if not found then
    raise exception 'Commercial introuvable.' using errcode = '22023';
  end if;
  perform app.audit('commercial.statut', 'commercial', p_id, jsonb_build_object('status', p_status));
end;
$$;
revoke execute on function public.admin_set_commercial_status(uuid, public.commercial_status) from public, anon;
grant execute on function public.admin_set_commercial_status(uuid, public.commercial_status) to authenticated;

-- Invitation (Edge Function commercial-invite) : jamais sur l'adresse d'un compte existant, même non
-- confirmé (l'invitation reprendrait ce compte et changerait son rôle). Clé serveur seulement.
create function public.auth_email_exists(p_email text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from auth.users where lower(email) = lower(btrim(p_email)))
$$;
revoke execute on function public.auth_email_exists(text) from public, anon, authenticated;
grant execute on function public.auth_email_exists(text) to service_role;

-- Démo d'un commercial dans l'espace d'exemples (ADR 0184) : le barème du grade (niveaux,
-- objectifs, badges), sans progression ni donnée d'artisan.
create function public.grade_scale()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if app.my_commercial_id() is null then
    raise exception 'Réservé aux commerciaux' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'xp', 0,
    'level', 1,
    'levels', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'level', l.level, 'xp_min', l.xp_min, 'reward', l.reward, 'reward_detail', l.reward_detail
      ) order by l.level), '[]'::jsonb)
      from public.gamification_levels l
    ),
    'objectives', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'code', g.code, 'title', g.title, 'description', g.description, 'xp', g.xp,
        'target', g.target, 'progress', 0, 'achieved_at', null
      ) order by g.position), '[]'::jsonb)
      from public.gamification_objectives g
      where g.active
    ),
    'badges', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'code', g.code, 'label', g.label, 'description', g.description, 'target', g.target,
        'progress', 0, 'unlocked_at', null, 'seen', false
      ) order by g.position), '[]'::jsonb)
      from public.badges g
      where g.active
    ),
    'claims', '[]'::jsonb
  );
end;
$$;
revoke execute on function public.grade_scale() from public, anon;
grant execute on function public.grade_scale() to authenticated;
