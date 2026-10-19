-- Parrainage entre artisans (F-60, ADR 0137) : chaque artisan validé reçoit un code, partagé par
-- le lien /p/<code>/pro (même circuit que les partenaires, sans traceur) ou saisi à l'inscription.
-- Au premier paiement réel du filleul, un mois est offert à chacun : un crédit par artisan, posé
-- sur l'abonnement Stripe par stripe-webhook (coupon à 100 %, une facture), un à la fois.

create type public.referral_status as enum ('en_attente', 'recompense', 'annule');
create type public.free_month_status as enum ('a_appliquer', 'applique');

-- Codes : 8 caractères sans ambiguïté (ni i, l, o, 0, 1), distincts des codes des partenaires.
create table public.artisan_referral_codes (
  artisan_id uuid primary key references public.artisans (id) on delete cascade,
  code text not null unique check (code ~ '^[a-z0-9]{8}$'),
  created_at timestamptz not null default now()
);

create table public.artisan_referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_artisan_id uuid not null references public.artisans (id) on delete cascade,
  referred_artisan_id uuid not null unique references public.artisans (id) on delete cascade,
  status public.referral_status not null default 'en_attente',
  rewarded_at timestamptz,
  created_at timestamptz not null default now(),
  check (referrer_artisan_id <> referred_artisan_id),
  check ((status = 'recompense') = (rewarded_at is not null))
);
create index artisan_referrals_referrer_idx on public.artisan_referrals (referrer_artisan_id);

-- Mois offerts : un crédit par artisan et par parrainage récompensé.
create table public.artisan_free_months (
  id uuid primary key default gen_random_uuid(),
  artisan_id uuid not null references public.artisans (id) on delete cascade,
  referral_id uuid references public.artisan_referrals (id) on delete set null,
  status public.free_month_status not null default 'a_appliquer',
  stripe_subscription_id text check (char_length(stripe_subscription_id) <= 255),
  applied_at timestamptz,
  created_at timestamptz not null default now(),
  check ((status = 'applique') = (applied_at is not null))
);
create index artisan_free_months_artisan_idx on public.artisan_free_months (artisan_id, status);
create index artisan_free_months_referral_idx on public.artisan_free_months (referral_id);

alter table public.artisan_referral_codes enable row level security;
alter table public.artisan_referrals enable row level security;
alter table public.artisan_free_months enable row level security;
revoke all on public.artisan_referral_codes, public.artisan_referrals, public.artisan_free_months
  from anon, authenticated;
grant select on public.artisan_referral_codes, public.artisan_referrals, public.artisan_free_months
  to authenticated;

create policy "artisan_referral_codes : lecture par l'artisan ou un admin"
  on public.artisan_referral_codes for select to authenticated
  using (artisan_id = (select app.my_artisan_id()) or (select app.is_admin()));
create policy "artisan_referrals : lecture par le parrain, le filleul ou un admin"
  on public.artisan_referrals for select to authenticated
  using (
    referrer_artisan_id = (select app.my_artisan_id())
    or referred_artisan_id = (select app.my_artisan_id())
    or (select app.is_admin())
  );
create policy "artisan_free_months : lecture par l'artisan ou un admin"
  on public.artisan_free_months for select to authenticated
  using (artisan_id = (select app.my_artisan_id()) or (select app.is_admin()));

create function app.new_referral_code()
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
    exit when not exists (select 1 from public.artisan_referral_codes where code = v_code)
      and not exists (select 1 from public.partners where code = v_code);
  end loop;
  return v_code;
end;
$$;
revoke execute on function app.new_referral_code() from public, anon, authenticated;

-- « Mon profil » : code (créé à la première demande) et bilan, pour un artisan validé seulement.
create function public.my_referral()
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_artisan uuid := app.my_artisan_id();
  v_code text;
begin
  if v_artisan is null or not exists (
    select 1 from public.artisans where id = v_artisan and status = 'valide'
  ) then
    return null;
  end if;
  select code into v_code from public.artisan_referral_codes where artisan_id = v_artisan;
  if v_code is null then
    insert into public.artisan_referral_codes (artisan_id, code)
    values (v_artisan, app.new_referral_code())
    on conflict (artisan_id) do nothing;
    select code into v_code from public.artisan_referral_codes where artisan_id = v_artisan;
  end if;
  return json_build_object(
    'code', v_code,
    'joined', (select count(*) from public.artisan_referrals
               where referrer_artisan_id = v_artisan and status <> 'annule'),
    'rewarded', (select count(*) from public.artisan_referrals
                 where referrer_artisan_id = v_artisan and status = 'recompense'),
    'months_earned', (select count(*) from public.artisan_free_months where artisan_id = v_artisan)
  );
end;
$$;
revoke execute on function public.my_referral() from public, anon;
grant execute on function public.my_referral() to authenticated;

-- Inscription : code d'un partenaire, sinon code de parrainage d'un artisan validé.
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

  -- Programme Partenaires (F-59) ou parrainage (F-60) : inscription arrivée par un lien.
  if jsonb_typeof(p_signup -> 'partner_code') = 'string' then
    v_partner := app.active_partner_id(p_signup ->> 'partner_code');
    if v_partner is not null then
      insert into public.partner_attributions (partner_id, artisan_id)
      values (v_partner, p_artisan)
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

-- Les codes des partenaires et des parrains partagent l'espace des liens /p/<code>.
create or replace function public.admin_save_partner(
  p_code text,
  p_nom text,
  p_siret text,
  p_contact_email text,
  p_status public.partner_status,
  p_montant_demande_centimes int default null,
  p_montant_abonne_centimes int default null,
  p_notes text default null,
  -- Absent : création ; sinon modification (le code ne change pas).
  p_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_code text := lower(btrim(coalesce(p_code, '')));
  v_nom text := btrim(coalesce(p_nom, ''));
  v_siret text := regexp_replace(coalesce(p_siret, ''), '\s', '', 'g');
  v_email text := lower(btrim(coalesce(p_contact_email, '')));
begin
  perform app.require_admin();
  if char_length(v_nom) not between 2 and 120 then
    raise exception 'Indiquez le nom du partenaire.' using errcode = '22023';
  end if;
  if not app.is_valid_siret(v_siret) then
    raise exception 'SIRET invalide : le programme est réservé aux professionnels.' using errcode = '22023';
  end if;
  if char_length(v_email) > 254 or v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception 'Adresse e-mail de contact invalide.' using errcode = '22023';
  end if;
  if p_montant_demande_centimes not between 0 and 100000 or p_montant_abonne_centimes not between 0 and 1000000 then
    raise exception 'Montant hors limites.' using errcode = '22023';
  end if;

  if p_id is null then
    if v_code !~ '^[a-z0-9](?:[a-z0-9-]{1,30}[a-z0-9])$' then
      raise exception 'Code invalide : 3 à 32 caractères, minuscules, chiffres et tirets.' using errcode = '22023';
    end if;
    -- Un code de parrainage (F-60) occupe aussi l'espace des liens /p/<code>.
    if exists (select 1 from public.partners where code = v_code)
       or exists (select 1 from public.artisan_referral_codes where code = v_code) then
      raise exception 'Ce code est déjà utilisé.' using errcode = '22023';
    end if;
    insert into public.partners (code, nom, siret, contact_email, status, montant_demande_centimes,
      montant_abonne_centimes, notes, created_by)
    values (v_code, v_nom, v_siret, v_email, coalesce(p_status, 'actif'), p_montant_demande_centimes,
      p_montant_abonne_centimes, nullif(left(btrim(coalesce(p_notes, '')), 2000), ''), (select auth.uid()))
    returning id into v_id;
    perform app.audit('partenaire.cree', 'partenaire', v_id, jsonb_build_object('code', v_code));
  else
    -- Le code ne change jamais : les liens déjà diffusés restent valables.
    update public.partners set
      nom = v_nom, siret = v_siret, contact_email = v_email, status = coalesce(p_status, status),
      montant_demande_centimes = p_montant_demande_centimes,
      montant_abonne_centimes = p_montant_abonne_centimes,
      notes = nullif(left(btrim(coalesce(p_notes, '')), 2000), '')
    where id = p_id
    returning id into v_id;
    if v_id is null then
      raise exception 'Partenaire introuvable.' using errcode = '22023';
    end if;
    perform app.audit('partenaire.modifie', 'partenaire', v_id, jsonb_build_object('statut', p_status));
  end if;
  return v_id;
end;
$$;

-- Premier paiement réel : prime du prescripteur (F-59) et mois offerts du parrainage (F-60).
create or replace function public.record_subscription_payment(p_stripe_subscription_id text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_artisan uuid;
  v_referral uuid;
  v_referrer uuid;
begin
  update public.subscriptions set first_paid_at = now()
  where stripe_subscription_id = p_stripe_subscription_id and first_paid_at is null
  returning artisan_id into v_artisan;
  if v_artisan is null then
    return false;
  end if;
  perform app.create_partner_commission('abonne_payant', null, v_artisan);
  -- Parrainage (F-60) : un mois offert au filleul et à son parrain.
  update public.artisan_referrals set status = 'recompense', rewarded_at = now()
  where referred_artisan_id = v_artisan and status = 'en_attente'
  returning id, referrer_artisan_id into v_referral, v_referrer;
  if v_referral is not null then
    insert into public.artisan_free_months (artisan_id, referral_id)
    values (v_artisan, v_referral), (v_referrer, v_referral);
  end if;
  return true;
end;
$$;

-- Mois offerts à poser (stripe-webhook, clé serveur) après une facture payée : le plus ancien
-- crédit du titulaire de l'abonnement et de son parrain récompensé, sur leur abonnement en cours.
create function public.free_month_candidates(p_stripe_subscription_id text)
returns table (grant_id uuid, stripe_subscription_id text)
language sql
stable
security definer
set search_path = ''
as $$
  with owner as (
    select s.artisan_id from public.subscriptions s where s.stripe_subscription_id = p_stripe_subscription_id
  ), concerned as (
    select o.artisan_id from owner o
    union
    select r.referrer_artisan_id
    from public.artisan_referrals r
    join owner o on o.artisan_id = r.referred_artisan_id
    where r.status = 'recompense'
  )
  select distinct on (g.artisan_id) g.id, s.stripe_subscription_id
  from public.artisan_free_months g
  join concerned c on c.artisan_id = g.artisan_id
  join public.subscriptions s on s.artisan_id = g.artisan_id
    and s.status in ('trialing', 'active', 'past_due')
  where g.status = 'a_appliquer'
  order by g.artisan_id, g.created_at
$$;
revoke execute on function public.free_month_candidates(text) from public, anon, authenticated;
grant execute on function public.free_month_candidates(text) to service_role;

create function public.mark_free_month_applied(p_grant_id uuid, p_stripe_subscription_id text)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.artisan_free_months
  set status = 'applique', applied_at = now(), stripe_subscription_id = p_stripe_subscription_id
  where id = p_grant_id and status = 'a_appliquer'
$$;
revoke execute on function public.mark_free_month_applied(uuid, text) from public, anon, authenticated;
grant execute on function public.mark_free_month_applied(uuid, text) to service_role;
