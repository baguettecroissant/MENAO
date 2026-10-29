-- Espace commercial, lot 3 (F-65, ADR 0207) : résultats des commerciaux de terrain, primes,
-- tableau par commercial dans le back-office et zones de prospection.
-- - Une prime est créée quand un artisan inscrit avec le code d'un commercial actif est validé,
--   puis quand il paie son premier mois d'abonnement ; une seule de chaque sorte par artisan.
-- - Elle est vérifiée après un délai (dossier toujours validé, abonnement toujours actif), puis
--   payée par virement depuis le back-office, sur le modèle des commissions des partenaires (F-59).
-- - Montants non décidés (CLAUDE.md règle 15) : réglages nuls par défaut, jamais de montant dans
--   le code. Tant qu'un montant n'est pas réglé, la prime reste en attente.
-- - Zone : débuts de codes postaux attribués par un admin, pour le filtre « Ma zone » des prospects.

create type public.commercial_bonus_kind as enum ('validation', 'abonnement');
create type public.commercial_bonus_status as enum ('en_attente', 'validee', 'annulee', 'payee');

-- ---------------------------------------------------------------------------
-- Réglages des primes (une seule ligne). Montants nuls tant qu'ils ne sont pas décidés.
-- ---------------------------------------------------------------------------
create table public.commercial_bonus_settings (
  id boolean primary key default true check (id),
  prime_validation_centimes int check (prime_validation_centimes between 0 and 1000000),
  prime_abonnement_centimes int check (prime_abonnement_centimes between 0 and 1000000),
  delai_validation_jours int not null default 30 check (delai_validation_jours between 0 and 180),
  -- Objectif mensuel d'artisans validés, affiché au commercial ; null : aucun.
  objectif_valides_mois int check (objectif_valides_mois between 1 and 1000),
  updated_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now()
);
create index commercial_bonus_settings_updated_by_idx on public.commercial_bonus_settings (updated_by);
create trigger commercial_bonus_settings_set_updated_at before update on public.commercial_bonus_settings
  for each row execute function app.set_updated_at();
insert into public.commercial_bonus_settings default values;

-- ---------------------------------------------------------------------------
-- Zone du commercial : débuts de codes postaux (2 à 5 chiffres), 200 au plus.
-- ---------------------------------------------------------------------------
create function app.valid_zone_codes(p_codes text[])
returns boolean
language sql
immutable
set search_path = ''
as $$
  select p_codes is not null
    and coalesce(array_ndims(p_codes), 1) = 1
    and cardinality(p_codes) <= 200
    and not exists (
      select 1 from unnest(p_codes) as z (code) where z.code is null or z.code !~ '^[0-9]{2,5}$'
    )
$$;

alter table public.commercials
  add column zone_codes_postaux text[] not null default '{}' check (app.valid_zone_codes(zone_codes_postaux));

-- ---------------------------------------------------------------------------
-- Primes : conservées si la fiche de l'artisan est supprimée (comptabilité).
-- ---------------------------------------------------------------------------
create table public.commercial_bonuses (
  id uuid primary key default gen_random_uuid(),
  commercial_id uuid not null references public.commercials (id) on delete cascade,
  artisan_id uuid references public.artisans (id) on delete set null,
  kind public.commercial_bonus_kind not null,
  -- Montant des réglages au moment de la vérification ; nul tant qu'elle n'est pas faite.
  amount_cents int check (amount_cents between 0 and 1000000),
  status public.commercial_bonus_status not null default 'en_attente',
  validate_after timestamptz not null,
  validated_at timestamptz,
  paid_at timestamptz,
  payout_reference text check (char_length(payout_reference) <= 100),
  cancel_reason text check (char_length(cancel_reason) <= 300),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status <> 'annulee' or cancel_reason is not null),
  check (status <> 'payee' or paid_at is not null),
  check (status not in ('validee', 'payee') or amount_cents is not null)
);
create unique index commercial_bonuses_artisan_kind_uidx on public.commercial_bonuses (artisan_id, kind)
  where artisan_id is not null;
create index commercial_bonuses_commercial_idx on public.commercial_bonuses (commercial_id, status);
create index commercial_bonuses_due_idx on public.commercial_bonuses (validate_after)
  where status = 'en_attente';
create trigger commercial_bonuses_set_updated_at before update on public.commercial_bonuses
  for each row execute function app.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS : réglages lus par les admins et les commerciaux actifs (estimation de leurs primes),
-- primes lues par le commercial concerné ou un admin ; écritures par les fonctions seulement.
-- ---------------------------------------------------------------------------
alter table public.commercial_bonus_settings enable row level security;
alter table public.commercial_bonuses enable row level security;
revoke all on public.commercial_bonus_settings, public.commercial_bonuses from anon, authenticated;
grant select on public.commercial_bonus_settings, public.commercial_bonuses to authenticated;

create policy "commercial_bonus_settings : lecture par un admin ou un commercial actif"
  on public.commercial_bonus_settings for select to authenticated
  using ((select app.is_admin()) or (select app.my_commercial_id()) is not null);

create policy "commercial_bonuses : lecture par le commercial concerné ou un admin"
  on public.commercial_bonuses for select to authenticated
  using (commercial_id = (select app.my_commercial_id()) or (select app.is_admin()));

-- ---------------------------------------------------------------------------
-- Création des primes
-- ---------------------------------------------------------------------------
-- Prime de l'artisan rattaché à un commercial actif, à vérifier après le délai des réglages.
-- Une seule de chaque sorte par artisan : un second passage est sans effet.
create function app.create_commercial_bonus(p_artisan_id uuid, p_kind public.commercial_bonus_kind)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_commercial uuid;
  v_delai int;
begin
  select ca.commercial_id into v_commercial
  from public.commercial_attributions ca
  join public.commercials c on c.id = ca.commercial_id and c.status = 'actif'
  where ca.artisan_id = p_artisan_id;
  if v_commercial is null then
    return;
  end if;
  select s.delai_validation_jours into v_delai from public.commercial_bonus_settings s;
  insert into public.commercial_bonuses (commercial_id, artisan_id, kind, validate_after)
  values (v_commercial, p_artisan_id, p_kind, now() + make_interval(days => coalesce(v_delai, 30)))
  on conflict do nothing;
end;
$$;
revoke execute on function app.create_commercial_bonus(uuid, public.commercial_bonus_kind)
  from public, anon, authenticated;

-- Dossier validé.
create function app.commercial_bonus_on_validation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform app.create_commercial_bonus(new.id, 'validation');
  return null;
end;
$$;
revoke execute on function app.commercial_bonus_on_validation() from public, anon, authenticated;
create trigger artisans_commercial_bonus after update of status on public.artisans
  for each row when (new.status = 'valide' and old.status is distinct from 'valide')
  execute function app.commercial_bonus_on_validation();

-- Premier paiement réel de l'abonnement (record_subscription_payment, stripe-webhook).
create function app.commercial_bonus_on_first_payment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform app.create_commercial_bonus(new.artisan_id, 'abonnement');
  return null;
end;
$$;
revoke execute on function app.commercial_bonus_on_first_payment() from public, anon, authenticated;
create trigger subscriptions_commercial_bonus after update of first_paid_at on public.subscriptions
  for each row when (old.first_paid_at is null and new.first_paid_at is not null)
  execute function app.commercial_bonus_on_first_payment();

-- ---------------------------------------------------------------------------
-- Vérification quotidienne, après le délai :
--   - dossier validé : validée si l'artisan l'est toujours, sinon annulée ;
--   - abonnement : validée si l'abonnement est toujours actif, sinon annulée ;
--   - montant pas encore réglé : la prime reste en attente (nouvel essai le lendemain).
-- Retourne le nombre de primes validées ou annulées.
-- ---------------------------------------------------------------------------
create function app.validate_commercial_bonuses()
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  r record;
  v_settings public.commercial_bonus_settings;
  v_ok boolean;
  v_amount int;
  v_count int := 0;
begin
  select * into v_settings from public.commercial_bonus_settings;
  for r in
    select b.id, b.kind, b.artisan_id
    from public.commercial_bonuses b
    -- Commercial suspendu : ses primes attendent (comme les partenaires) ; l'admin décide.
    join public.commercials c on c.id = b.commercial_id and c.status = 'actif'
    where b.status = 'en_attente' and b.validate_after <= now()
    order by b.validate_after
    for update of b skip locked
  loop
    if r.kind = 'validation' then
      v_ok := exists (select 1 from public.artisans a where a.id = r.artisan_id and a.status = 'valide');
      v_amount := v_settings.prime_validation_centimes;
    else
      v_ok := exists (
        select 1 from public.subscriptions s where s.artisan_id = r.artisan_id and s.status = 'active'
      );
      v_amount := v_settings.prime_abonnement_centimes;
    end if;

    if not v_ok then
      update public.commercial_bonuses set
        status = 'annulee',
        cancel_reason = case r.kind
          when 'validation' then 'Dossier plus validé à la fin du délai'
          else 'Abonnement inactif à la fin du délai'
        end
      where id = r.id;
      v_count := v_count + 1;
    elsif v_amount is not null then
      update public.commercial_bonuses set status = 'validee', amount_cents = v_amount, validated_at = now()
      where id = r.id;
      v_count := v_count + 1;
    end if;
  end loop;
  return v_count;
end;
$$;
revoke execute on function app.validate_commercial_bonuses() from public, anon, authenticated;
select cron.schedule('menao-primes-commerciaux', '15 4 * * *', 'select app.validate_commercial_bonuses()');

-- ---------------------------------------------------------------------------
-- Prospects : filtre 'zone' en plus (reprise de 20261029150000_prospects_commerciaux.sql).
-- ---------------------------------------------------------------------------
-- Espace commercial : liste des prospects. Filtres : 'tous', 'miens' (suivis par moi), 'relances'
-- (miens dont la prochaine action tombe avant demain, heure de Paris), 'libres' (aucun suivi),
-- 'zone' (code postal commençant par l'un des codes de ma zone ; zone vide : comme 'tous').
-- Étape et prochaine action : seulement pour mes suivis.
create or replace function public.commercial_prospects(
  p_search text default null,
  p_filter text default 'tous',
  p_limit int default 50,
  p_offset int default 0
)
returns table (
  id uuid,
  nom text,
  ape_code text,
  commune text,
  code_postal text,
  lon double precision,
  lat double precision,
  rge boolean,
  mine boolean,
  followed_by_other boolean,
  status public.prospect_status,
  next_action_at timestamptz,
  stage text,
  total bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_me uuid := app.my_commercial_id();
  v_filter text := case when p_filter in ('miens', 'relances', 'libres', 'zone') then p_filter else 'tous' end;
  -- Motifs LIKE des codes de ma zone (chiffres seulement : rien à échapper).
  v_zone text[] := array(
    select z.code || '%'
    from public.commercials c
    cross join lateral unnest(c.zone_codes_postaux) as z (code)
    where c.id = v_me
  );
  v_like text := app.admin_like(left(p_search, 100));
  v_cp text := case when btrim(coalesce(p_search, '')) ~ '^[0-9]{1,5}$' then btrim(p_search) end;
  v_tomorrow timestamptz := (date_trunc('day', now() at time zone 'Europe/Paris') + interval '1 day')
    at time zone 'Europe/Paris';
begin
  if v_me is null then
    raise exception 'Réservé aux commerciaux' using errcode = '42501';
  end if;
  return query
  with filtered as (
    select p.id as pid, coalesce(p.enseigne, p.denomination) as pnom, p.ape_code as pape,
      p.commune as pcommune, p.code_postal as pcp, p.location as ploc, p.rge as prge, p.siren as psiren,
      f.commercial_id as fcom, f.status as fstatus, f.next_action_at as fnext
    from public.prospects p
    left join public.prospect_follows f on f.prospect_id = p.id
    where (
        v_like is null
        or p.denomination ilike v_like
        or p.enseigne ilike v_like
        or p.commune ilike v_like
        or p.code_postal like v_cp || '%'
      )
      and case v_filter
        when 'miens' then f.commercial_id = v_me
        when 'relances' then f.commercial_id = v_me and f.next_action_at < v_tomorrow
        when 'libres' then f.prospect_id is null
        when 'zone' then cardinality(v_zone) = 0 or p.code_postal like any (v_zone)
        else true
      end
  ),
  page as (
    select x.*,
      count(*) over () as cnt,
      row_number() over (order by
        case when v_filter in ('miens', 'relances') then x.fnext end asc nulls last,
        case when v_filter not in ('miens', 'relances') then x.pcommune end asc nulls last,
        x.pnom, x.pid) as rn
    from filtered x
    order by rn
    limit greatest(1, least(coalesce(p_limit, 50), 500))
    offset greatest(coalesce(p_offset, 0), 0)
  )
  select pg.pid, pg.pnom, pg.pape, pg.pcommune, pg.pcp,
    extensions.st_x(pg.ploc::extensions.geometry), extensions.st_y(pg.ploc::extensions.geometry),
    pg.prge,
    coalesce(pg.fcom = v_me, false),
    coalesce(pg.fcom <> v_me, false),
    case when pg.fcom = v_me then pg.fstatus end,
    case when pg.fcom = v_me then pg.fnext end,
    app.prospect_stage(pg.psiren),
    pg.cnt
  from page pg
  order by pg.rn;
end;
$$;

-- ---------------------------------------------------------------------------
-- Espace commercial
-- ---------------------------------------------------------------------------
-- « Mes résultats » : inscrits (rattachement), validés (dernière décision « valide » d'un dossier
-- toujours validé) et abonnés (premier paiement réel), au total, ce mois-ci et sur les six derniers
-- mois (heure de Paris, le plus ancien d'abord) ; étapes de mes prospects ; mes primes ; réglages.
create function public.commercial_results()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_me uuid := app.my_commercial_id();
  v_month timestamp := date_trunc('month', now() at time zone 'Europe/Paris');
  v_settings public.commercial_bonus_settings;
  v_result jsonb;
begin
  if v_me is null then
    raise exception 'Réservé aux commerciaux' using errcode = '42501';
  end if;
  select * into v_settings from public.commercial_bonus_settings;

  with mine as (
    select
      date_trunc('month', ca.created_at at time zone 'Europe/Paris') as signup_month,
      a.status = 'valide' as is_validated,
      case when a.status = 'valide' then date_trunc('month', (
        select max(r.created_at) from public.artisan_reviews r
        where r.artisan_id = a.id and r.decision = 'valide'
      ) at time zone 'Europe/Paris') end as validated_month,
      s.first_paid_at is not null as is_subscribed,
      date_trunc('month', s.first_paid_at at time zone 'Europe/Paris') as subscribed_month
    from public.commercial_attributions ca
    join public.artisans a on a.id = ca.artisan_id
    left join public.subscriptions s on s.artisan_id = ca.artisan_id
    where ca.commercial_id = v_me
  ),
  months as (
    select g.m from generate_series(v_month - interval '5 months', v_month, interval '1 month') as g (m)
  )
  select jsonb_build_object(
    'signups', (select count(*) from mine),
    'validated', (select count(*) from mine where mine.is_validated),
    'subscribed', (select count(*) from mine where mine.is_subscribed),
    'signups_month', (select count(*) from mine where mine.signup_month = v_month),
    'validated_month', (select count(*) from mine where mine.validated_month = v_month),
    'subscribed_month', (select count(*) from mine where mine.subscribed_month = v_month),
    'by_month', (
      select jsonb_agg(jsonb_build_object(
        'month', to_char(months.m, 'YYYY-MM'),
        'signups', (select count(*) from mine where mine.signup_month = months.m),
        'validated', (select count(*) from mine where mine.validated_month = months.m),
        'subscribed', (select count(*) from mine where mine.subscribed_month = months.m)
      ) order by months.m)
      from months
    ),
    'pipeline', (
      select jsonb_build_object(
        'followed', count(*),
        'a_contacter', count(*) filter (where f.status = 'a_contacter'),
        'rdv_pris', count(*) filter (where f.status = 'rdv_pris'),
        'demo_faite', count(*) filter (where f.status = 'demo_faite'),
        'pas_interesse', count(*) filter (where f.status = 'pas_interesse')
      )
      from public.prospect_follows f
      where f.commercial_id = v_me
    ),
    'bonuses', (
      select jsonb_build_object(
        'pending', count(*) filter (where b.status = 'en_attente'),
        'validated_cents', coalesce(sum(b.amount_cents) filter (where b.status = 'validee'), 0),
        'paid_cents', coalesce(sum(b.amount_cents) filter (where b.status = 'payee'), 0)
      )
      from public.commercial_bonuses b
      where b.commercial_id = v_me
    ),
    'prime_validation_centimes', v_settings.prime_validation_centimes,
    'prime_abonnement_centimes', v_settings.prime_abonnement_centimes,
    'objectif_valides_mois', v_settings.objectif_valides_mois
  ) into v_result;
  return v_result;
end;
$$;
revoke execute on function public.commercial_results() from public, anon;
grant execute on function public.commercial_results() to authenticated;

-- Mes primes, des plus récentes aux plus anciennes (200 au plus) ; artisan : nom commercial, sinon
-- raison sociale (vide si la fiche a été supprimée).
create function public.commercial_bonuses_list()
returns table (
  id uuid,
  artisan text,
  kind public.commercial_bonus_kind,
  amount_cents int,
  status public.commercial_bonus_status,
  validate_after timestamptz,
  validated_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_me uuid := app.my_commercial_id();
begin
  if v_me is null then
    raise exception 'Réservé aux commerciaux' using errcode = '42501';
  end if;
  return query
  select b.id, coalesce(a.nom_commercial, a.raison_sociale), b.kind, b.amount_cents, b.status,
    b.validate_after, b.validated_at, b.paid_at, b.created_at
  from public.commercial_bonuses b
  left join public.artisans a on a.id = b.artisan_id
  where b.commercial_id = v_me
  order by b.created_at desc, b.id
  limit 200;
end;
$$;
revoke execute on function public.commercial_bonuses_list() from public, anon;
grant execute on function public.commercial_bonuses_list() to authenticated;

-- ---------------------------------------------------------------------------
-- Back-office (admins, journalisé)
-- ---------------------------------------------------------------------------
-- Tableau des commerciaux : inscrits, validés, abonnés, prospects suivis, primes.
create function public.admin_commercials_dashboard()
returns table (
  id uuid,
  nom text,
  code text,
  status public.commercial_status,
  email text,
  signups int,
  validated int,
  subscribed int,
  followed int,
  pending_bonuses int,
  to_pay_cents bigint,
  paid_cents bigint,
  zone_codes_postaux text[]
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform app.require_admin();
  return query
  select c.id, c.nom, c.code, c.status, u.email::text,
    (select count(*)::int from public.commercial_attributions ca where ca.commercial_id = c.id),
    (select count(*)::int from public.commercial_attributions ca
       join public.artisans a on a.id = ca.artisan_id
       where ca.commercial_id = c.id and a.status = 'valide'),
    (select count(*)::int from public.commercial_attributions ca
       join public.subscriptions s on s.artisan_id = ca.artisan_id
       where ca.commercial_id = c.id and s.first_paid_at is not null),
    (select count(*)::int from public.prospect_follows f where f.commercial_id = c.id),
    (select count(*)::int from public.commercial_bonuses b
       where b.commercial_id = c.id and b.status = 'en_attente'),
    (select coalesce(sum(b.amount_cents), 0)::bigint from public.commercial_bonuses b
       where b.commercial_id = c.id and b.status = 'validee'),
    (select coalesce(sum(b.amount_cents), 0)::bigint from public.commercial_bonuses b
       where b.commercial_id = c.id and b.status = 'payee'),
    c.zone_codes_postaux
  from public.commercials c
  left join auth.users u on u.id = c.user_id
  order by c.created_at desc;
end;
$$;
revoke execute on function public.admin_commercials_dashboard() from public, anon;
grant execute on function public.admin_commercials_dashboard() to authenticated;

-- Fiche d'un commercial : zone, prospects suivis, artisans inscrits avec son code, primes.
-- Null si le commercial est introuvable.
create function public.admin_commercial_detail(p_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_result jsonb;
begin
  perform app.require_admin();
  select jsonb_build_object(
    'id', c.id,
    'nom', c.nom,
    'code', c.code,
    'status', c.status,
    'email', u.email,
    'zone_codes_postaux', to_jsonb(c.zone_codes_postaux),
    'followed', (select count(*) from public.prospect_follows f where f.commercial_id = c.id),
    'artisans', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'nom', coalesce(a.nom_commercial, a.raison_sociale),
        'status', a.status,
        'signed_up_at', ca.created_at,
        'subscribed', s.first_paid_at is not null
      ) order by ca.created_at desc, a.id), '[]'::jsonb)
      from public.commercial_attributions ca
      join public.artisans a on a.id = ca.artisan_id
      left join public.subscriptions s on s.artisan_id = ca.artisan_id
      where ca.commercial_id = c.id
    ),
    'bonuses', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', b.id,
        'artisan', coalesce(a.nom_commercial, a.raison_sociale),
        'kind', b.kind,
        'amount_cents', b.amount_cents,
        'status', b.status,
        'validate_after', b.validate_after,
        'validated_at', b.validated_at,
        'paid_at', b.paid_at,
        'payout_reference', b.payout_reference,
        'cancel_reason', b.cancel_reason,
        'created_at', b.created_at
      ) order by b.created_at desc, b.id), '[]'::jsonb)
      from public.commercial_bonuses b
      left join public.artisans a on a.id = b.artisan_id
      where b.commercial_id = c.id
    )
  ) into v_result
  from public.commercials c
  left join auth.users u on u.id = c.user_id
  where c.id = p_id;
  return v_result;
end;
$$;
revoke execute on function public.admin_commercial_detail(uuid) from public, anon;
grant execute on function public.admin_commercial_detail(uuid) to authenticated;

-- Réglages des primes : montants nuls permis (pas encore décidés), délai obligatoire.
-- Paramètres facultatifs : une valeur absente vaut null (le délai absent est refusé).
create function public.admin_save_commercial_bonus_settings(
  p_prime_validation_centimes int default null,
  p_prime_abonnement_centimes int default null,
  p_delai_validation_jours int default null,
  p_objectif_valides_mois int default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform app.require_admin();
  if p_prime_validation_centimes not between 0 and 1000000
     or p_prime_abonnement_centimes not between 0 and 1000000 then
    raise exception 'Montant hors limites.' using errcode = '22023';
  end if;
  if p_delai_validation_jours is null or p_delai_validation_jours not between 0 and 180 then
    raise exception 'Délai de vérification : entre 0 et 180 jours.' using errcode = '22023';
  end if;
  if p_objectif_valides_mois not between 1 and 1000 then
    raise exception 'Objectif mensuel : entre 1 et 1 000, ou vide.' using errcode = '22023';
  end if;
  update public.commercial_bonus_settings set
    prime_validation_centimes = p_prime_validation_centimes,
    prime_abonnement_centimes = p_prime_abonnement_centimes,
    delai_validation_jours = p_delai_validation_jours,
    objectif_valides_mois = p_objectif_valides_mois,
    updated_by = (select auth.uid())
  where id;
  perform app.audit('commerciaux.reglages_primes', 'commerciaux', null, jsonb_build_object(
    'prime_validation_centimes', p_prime_validation_centimes,
    'prime_abonnement_centimes', p_prime_abonnement_centimes,
    'delai_validation_jours', p_delai_validation_jours,
    'objectif_valides_mois', p_objectif_valides_mois));
end;
$$;
revoke execute on function public.admin_save_commercial_bonus_settings(int, int, int, int) from public, anon;
grant execute on function public.admin_save_commercial_bonus_settings(int, int, int, int) to authenticated;

-- Zone d'un commercial : débuts de codes postaux, espaces retirés, vides ignorés, dédoublonnés et
-- triés ; tableau vide : aucune zone.
create function public.admin_set_commercial_zone(p_id uuid, p_codes text[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_codes text[];
begin
  perform app.require_admin();
  select coalesce(array_agg(x.code order by x.code collate "C"), '{}') into v_codes
  from (
    select distinct btrim(z.code) as code
    from unnest(coalesce(p_codes, '{}')) as z (code)
    where z.code is null or btrim(z.code) <> ''
  ) x;
  if not app.valid_zone_codes(v_codes) then
    raise exception 'Zone invalide : 200 codes au plus, chacun de 2 à 5 chiffres (début de code postal).'
      using errcode = '22023';
  end if;
  update public.commercials set zone_codes_postaux = v_codes where id = p_id;
  if not found then
    raise exception 'Commercial introuvable.' using errcode = '22023';
  end if;
  perform app.audit('commercial.zone', 'commercial', p_id, jsonb_build_object('codes', to_jsonb(v_codes)));
end;
$$;
revoke execute on function public.admin_set_commercial_zone(uuid, text[]) from public, anon;
grant execute on function public.admin_set_commercial_zone(uuid, text[]) to authenticated;

-- Prospects d'un commercial qui part : transférés à un commercial actif, ou libérés (suivis
-- supprimés, notes comprises) si p_to est absent. Retourne le nombre de prospects concernés.
create function public.admin_transfer_prospects(p_from uuid, p_to uuid default null)
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count int;
begin
  perform app.require_admin();
  if not exists (select 1 from public.commercials c where c.id = p_from) then
    raise exception 'Commercial introuvable.' using errcode = '22023';
  end if;
  if p_to is null then
    delete from public.prospect_follows f where f.commercial_id = p_from;
    get diagnostics v_count = row_count;
    perform app.audit('commercial.prospects_liberes', 'commercial', p_from, jsonb_build_object('nombre', v_count));
  else
    if p_to = p_from or not exists (
      select 1 from public.commercials c where c.id = p_to and c.status = 'actif'
    ) then
      raise exception 'Choisissez un autre commercial, actif.' using errcode = '22023';
    end if;
    update public.prospect_follows f set commercial_id = p_to where f.commercial_id = p_from;
    get diagnostics v_count = row_count;
    perform app.audit('commercial.prospects_transferes', 'commercial', p_from,
      jsonb_build_object('vers', p_to, 'nombre', v_count));
  end if;
  return v_count;
end;
$$;
revoke execute on function public.admin_transfer_prospects(uuid, uuid) from public, anon;
grant execute on function public.admin_transfer_prospects(uuid, uuid) to authenticated;

-- Virement fait : primes vérifiées (« à payer ») marquées payées, avec la référence du virement.
create function public.admin_mark_commercial_bonuses_paid(p_ids uuid[], p_reference text)
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reference text := nullif(btrim(coalesce(p_reference, '')), '');
  v_count int;
begin
  perform app.require_admin();
  if v_reference is null then
    raise exception 'Indiquez la référence du virement.' using errcode = '22023';
  end if;
  if char_length(v_reference) > 100 then
    raise exception 'Référence trop longue : 100 caractères au plus.' using errcode = '22023';
  end if;
  update public.commercial_bonuses set status = 'payee', paid_at = now(), payout_reference = v_reference
  where id = any (coalesce(p_ids, '{}')) and status = 'validee';
  get diagnostics v_count = row_count;
  perform app.audit('commerciaux.primes_payees', 'commerciaux', null,
    jsonb_build_object('primes', to_jsonb(p_ids), 'nombre', v_count, 'reference', v_reference));
  return v_count;
end;
$$;
revoke execute on function public.admin_mark_commercial_bonuses_paid(uuid[], text) from public, anon;
grant execute on function public.admin_mark_commercial_bonuses_paid(uuid[], text) to authenticated;

-- Annulation d'une prime en attente ou à payer, avec son motif (jamais d'une prime payée).
create function public.admin_cancel_commercial_bonus(p_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
  v_commercial uuid;
begin
  perform app.require_admin();
  if v_reason is null then
    raise exception 'Indiquez le motif de l''annulation.' using errcode = '22023';
  end if;
  if char_length(v_reason) > 300 then
    raise exception 'Motif trop long : 300 caractères au plus.' using errcode = '22023';
  end if;
  update public.commercial_bonuses set status = 'annulee', cancel_reason = v_reason, validated_at = null
  where id = p_id and status in ('en_attente', 'validee')
  returning commercial_id into v_commercial;
  if v_commercial is null then
    raise exception 'Prime introuvable ou déjà payée.' using errcode = '22023';
  end if;
  perform app.audit('commercial.prime_annulee', 'commercial', v_commercial,
    jsonb_build_object('prime', p_id, 'motif', v_reason));
end;
$$;
revoke execute on function public.admin_cancel_commercial_bonus(uuid, text) from public, anon;
grant execute on function public.admin_cancel_commercial_bonus(uuid, text) to authenticated;

-- Export des primes à payer (CSV du back-office).
create function public.admin_commercial_bonuses_to_pay()
returns table (
  id uuid,
  commercial text,
  code text,
  artisan text,
  kind public.commercial_bonus_kind,
  amount_cents int,
  validated_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform app.require_admin();
  return query
  select b.id, c.nom, c.code, coalesce(a.nom_commercial, a.raison_sociale), b.kind, b.amount_cents,
    b.validated_at
  from public.commercial_bonuses b
  join public.commercials c on c.id = b.commercial_id
  left join public.artisans a on a.id = b.artisan_id
  where b.status = 'validee'
  order by c.nom, b.validated_at, b.id;
end;
$$;
revoke execute on function public.admin_commercial_bonuses_to_pay() from public, anon;
grant execute on function public.admin_commercial_bonuses_to_pay() to authenticated;
