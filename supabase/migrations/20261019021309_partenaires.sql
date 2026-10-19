-- Programme Partenaires (F-59, ADR 0136) : partenaires professionnels (SIRET), attribution des
-- projets et des inscriptions d'artisans par lien (sans traceur), commissions fixes à la demande
-- qualifiée (au moins un artisan accepte) et à l'abonné payant (premier paiement réel), validées
-- après un délai anti-fraude, payées par virement depuis le back-office. Réservé aux admins.
-- MENAO ne prend rien sur les chantiers (CLAUDE.md règle 12) : les commissions sortent des
-- abonnements. Montants réglables, jamais fixés dans le code (règle 15).

create type public.partner_status as enum ('actif', 'suspendu');
create type public.partner_commission_kind as enum ('demande_qualifiee', 'abonne_payant');
create type public.partner_commission_status as enum ('en_attente', 'validee', 'payee', 'annulee');

-- ---------------------------------------------------------------------------
-- Partenaires
-- ---------------------------------------------------------------------------
create table public.partners (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[a-z0-9](?:[a-z0-9-]{1,30}[a-z0-9])$'),
  nom text not null check (char_length(btrim(nom)) between 2 and 120),
  siret text not null check (app.is_valid_siret(siret)),
  contact_email text not null check (
    char_length(contact_email) <= 254 and contact_email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
  ),
  status public.partner_status not null default 'actif',
  -- Montants négociés ; null : montants par défaut des réglages.
  montant_demande_centimes int check (montant_demande_centimes between 0 and 100000),
  montant_abonne_centimes int check (montant_abonne_centimes between 0 and 1000000),
  notes text check (char_length(notes) <= 2000),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index partners_created_by_idx on public.partners (created_by);
create trigger partners_set_updated_at before update on public.partners
  for each row execute function app.set_updated_at();

-- Réglages du programme (une seule ligne). Montants nuls tant qu'ils ne sont pas décidés.
create table public.partner_settings (
  id boolean primary key default true check (id),
  montant_demande_centimes int check (montant_demande_centimes between 0 and 100000),
  montant_abonne_centimes int check (montant_abonne_centimes between 0 and 1000000),
  delai_validation_jours int not null default 30 check (delai_validation_jours between 0 and 180),
  -- Demandes qualifiées rémunérées par partenaire et par mois ; null : sans plafond.
  plafond_demandes_mois int check (plafond_demandes_mois between 1 and 10000),
  updated_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now()
);
create index partner_settings_updated_by_idx on public.partner_settings (updated_by);
create trigger partner_settings_set_updated_at before update on public.partner_settings
  for each row execute function app.set_updated_at();
insert into public.partner_settings default values;

-- Attribution : un projet ou une fiche artisan, rattaché au partenaire dont le lien a été suivi.
-- Table à part : le partenaire n'apparaît ni dans les projets ni dans les fiches artisans.
create table public.partner_attributions (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partners (id) on delete cascade,
  project_id uuid unique references public.projects (id) on delete cascade,
  artisan_id uuid unique references public.artisans (id) on delete cascade,
  created_at timestamptz not null default now(),
  check (num_nonnulls(project_id, artisan_id) = 1)
);
create index partner_attributions_partner_idx on public.partner_attributions (partner_id);

-- Commissions : conservées si le projet ou la fiche est supprimé (comptabilité).
create table public.partner_commissions (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partners (id) on delete cascade,
  kind public.partner_commission_kind not null,
  project_id uuid references public.projects (id) on delete set null,
  artisan_id uuid references public.artisans (id) on delete set null,
  amount_cents int not null check (amount_cents between 0 and 1000000),
  status public.partner_commission_status not null default 'en_attente',
  validate_after timestamptz not null,
  validated_at timestamptz,
  paid_at timestamptz,
  payout_reference text check (char_length(payout_reference) <= 100),
  cancel_reason text check (char_length(cancel_reason) <= 300),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status <> 'annulee' or cancel_reason is not null),
  check (status <> 'payee' or paid_at is not null)
);
create unique index partner_commissions_project_uidx on public.partner_commissions (project_id)
  where kind = 'demande_qualifiee';
create unique index partner_commissions_artisan_uidx on public.partner_commissions (artisan_id)
  where kind = 'abonne_payant';
create index partner_commissions_partner_idx on public.partner_commissions (partner_id, status);
create index partner_commissions_due_idx on public.partner_commissions (validate_after)
  where status = 'en_attente';
create trigger partner_commissions_set_updated_at before update on public.partner_commissions
  for each row execute function app.set_updated_at();

-- Premier paiement réel de l'abonnement (facture payée après l'essai).
alter table public.subscriptions add column first_paid_at timestamptz;

-- ---------------------------------------------------------------------------
-- RLS : lecture par les admins ; écritures par les fonctions ci-dessous seulement.
-- ---------------------------------------------------------------------------
alter table public.partners enable row level security;
alter table public.partner_settings enable row level security;
alter table public.partner_attributions enable row level security;
alter table public.partner_commissions enable row level security;
revoke all on public.partners, public.partner_settings, public.partner_attributions,
  public.partner_commissions from anon, authenticated;
grant select on public.partners, public.partner_settings, public.partner_attributions,
  public.partner_commissions to authenticated;

create policy "partners : lecture par les admins"
  on public.partners for select to authenticated using ((select app.is_admin()));
create policy "partner_settings : lecture par les admins"
  on public.partner_settings for select to authenticated using ((select app.is_admin()));
create policy "partner_attributions : lecture par les admins"
  on public.partner_attributions for select to authenticated using ((select app.is_admin()));
create policy "partner_commissions : lecture par les admins"
  on public.partner_commissions for select to authenticated using ((select app.is_admin()));

-- ---------------------------------------------------------------------------
-- Attribution
-- ---------------------------------------------------------------------------
create function app.active_partner_id(p_code text)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select id from public.partners where code = lower(btrim(p_code)) and status = 'actif'
$$;
revoke execute on function app.active_partner_id(text) from public, anon, authenticated;

-- Projet créé depuis un lien partenaire (analyze-need, clé serveur) : jamais par le navigateur,
-- qui pourrait sinon s'attribuer n'importe quel code.
create function public.attribute_project_partner(p_project_id uuid, p_code text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_partner uuid := app.active_partner_id(p_code);
begin
  if v_partner is null or p_project_id is null then
    return false;
  end if;
  insert into public.partner_attributions (partner_id, project_id)
  values (v_partner, p_project_id)
  on conflict (project_id) do nothing;
  return found;
end;
$$;
revoke execute on function public.attribute_project_partner(uuid, text) from public, anon, authenticated;
grant execute on function public.attribute_project_partner(uuid, text) to service_role;

-- Inscription artisan (e-mail ou Google/Apple) : code partenaire lu dans les choix du parcours.
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

  -- Programme Partenaires (F-59) : inscription arrivée par un lien partenaire.
  if jsonb_typeof(p_signup -> 'partner_code') = 'string' then
    v_partner := app.active_partner_id(p_signup ->> 'partner_code');
    if v_partner is not null then
      insert into public.partner_attributions (partner_id, artisan_id)
      values (v_partner, p_artisan)
      on conflict (artisan_id) do nothing;
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

-- ---------------------------------------------------------------------------
-- Commissions
-- ---------------------------------------------------------------------------
-- Une commission par projet (demande qualifiée) ou par artisan (abonné payant), au montant du
-- moment. Annulée d'office si le client ou l'artisan est le partenaire lui-même, ou si le
-- plafond mensuel de demandes est atteint (gardée pour la transparence).
create function app.create_partner_commission(
  p_kind public.partner_commission_kind,
  p_project_id uuid,
  p_artisan_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_partner public.partners;
  v_settings public.partner_settings;
  v_user uuid;
  v_reason text;
begin
  select p.* into v_partner
  from public.partner_attributions a
  join public.partners p on p.id = a.partner_id and p.status = 'actif'
  where (p_kind = 'demande_qualifiee' and a.project_id = p_project_id)
     or (p_kind = 'abonne_payant' and a.artisan_id = p_artisan_id);
  if v_partner.id is null then
    return;
  end if;
  select * into v_settings from public.partner_settings;

  v_user := case p_kind
    when 'demande_qualifiee' then (select user_id from public.projects where id = p_project_id)
    else (select user_id from public.artisans where id = p_artisan_id)
  end;
  if exists (select 1 from auth.users u where u.id = v_user and lower(u.email) = lower(v_partner.contact_email)) then
    v_reason := 'Compte du partenaire lui-même';
  elsif p_kind = 'demande_qualifiee' and v_settings.plafond_demandes_mois is not null and (
    select count(*) from public.partner_commissions c
    where c.partner_id = v_partner.id and c.kind = 'demande_qualifiee' and c.status <> 'annulee'
      and date_trunc('month', c.created_at at time zone 'Europe/Paris')
        = date_trunc('month', now() at time zone 'Europe/Paris')
  ) >= v_settings.plafond_demandes_mois then
    v_reason := 'Plafond mensuel de demandes atteint';
  end if;

  insert into public.partner_commissions (partner_id, kind, project_id, artisan_id, amount_cents,
    status, cancel_reason, validate_after)
  values (
    v_partner.id,
    p_kind,
    case when p_kind = 'demande_qualifiee' then p_project_id end,
    case when p_kind = 'abonne_payant' then p_artisan_id end,
    case p_kind
      when 'demande_qualifiee' then coalesce(v_partner.montant_demande_centimes, v_settings.montant_demande_centimes, 0)
      else coalesce(v_partner.montant_abonne_centimes, v_settings.montant_abonne_centimes, 0)
    end,
    case when v_reason is null then 'en_attente' else 'annulee' end::public.partner_commission_status,
    v_reason,
    now() + make_interval(days => v_settings.delai_validation_jours)
  )
  on conflict do nothing;
end;
$$;
revoke execute on function app.create_partner_commission(public.partner_commission_kind, uuid, uuid)
  from public, anon, authenticated;

-- Demande qualifiée : la première acceptation d'un artisan sur un projet attribué.
create function app.partner_on_request_accepted()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform app.create_partner_commission('demande_qualifiee', new.project_id, null);
  return null;
end;
$$;
revoke execute on function app.partner_on_request_accepted() from public, anon, authenticated;
create trigger requests_partner_on_accept_insert after insert on public.requests
  for each row when (new.status = 'acceptee')
  execute function app.partner_on_request_accepted();
create trigger requests_partner_on_accept_update after update of status on public.requests
  for each row when (new.status = 'acceptee' and old.status is distinct from 'acceptee')
  execute function app.partner_on_request_accepted();

-- Abonné payant : première facture payée (stripe-webhook, clé serveur). Renvoie vrai au premier
-- paiement seulement (les suivants sont sans effet).
create function public.record_subscription_payment(p_stripe_subscription_id text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_artisan uuid;
begin
  update public.subscriptions set first_paid_at = now()
  where stripe_subscription_id = p_stripe_subscription_id and first_paid_at is null
  returning artisan_id into v_artisan;
  if v_artisan is null then
    return false;
  end if;
  perform app.create_partner_commission('abonne_payant', null, v_artisan);
  return true;
end;
$$;
revoke execute on function public.record_subscription_payment(text) from public, anon, authenticated;
grant execute on function public.record_subscription_payment(text) to service_role;

-- Validation quotidienne après le délai anti-fraude. Un abonné qui n'est plus actif à la fin du
-- délai annule la prime ; un partenaire suspendu garde ses commissions en attente.
create function app.validate_partner_commissions()
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count int;
begin
  with due as (
    select c.id, c.kind, c.artisan_id
    from public.partner_commissions c
    join public.partners p on p.id = c.partner_id and p.status = 'actif'
    where c.status = 'en_attente' and c.validate_after <= now()
    for update of c skip locked
  ), checked as (
    select due.id,
      due.kind = 'abonne_payant' and not exists (
        select 1 from public.subscriptions s where s.artisan_id = due.artisan_id and s.status = 'active'
      ) as lost
    from due
  )
  update public.partner_commissions c set
    status = case when checked.lost then 'annulee' else 'validee' end::public.partner_commission_status,
    validated_at = case when checked.lost then null else now() end,
    cancel_reason = case when checked.lost then 'Abonnement inactif à la fin du délai de validation' end
  from checked
  where c.id = checked.id;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;
revoke execute on function app.validate_partner_commissions() from public, anon, authenticated;
select cron.schedule('menao-commissions-partenaires', '45 3 * * *', 'select app.validate_partner_commissions()');

-- ---------------------------------------------------------------------------
-- Back-office (admins, journalisé)
-- ---------------------------------------------------------------------------
create function public.admin_save_partner(
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
    if exists (select 1 from public.partners where code = v_code) then
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
revoke execute on function public.admin_save_partner(text, text, text, text, public.partner_status, int, int, text, uuid)
  from public, anon;
grant execute on function public.admin_save_partner(text, text, text, text, public.partner_status, int, int, text, uuid)
  to authenticated;

create function public.admin_save_partner_settings(
  p_delai_validation_jours int,
  p_montant_demande_centimes int default null,
  p_montant_abonne_centimes int default null,
  p_plafond_demandes_mois int default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform app.require_admin();
  if p_montant_demande_centimes not between 0 and 100000 or p_montant_abonne_centimes not between 0 and 1000000 then
    raise exception 'Montant hors limites.' using errcode = '22023';
  end if;
  if p_delai_validation_jours is null or p_delai_validation_jours not between 0 and 180 then
    raise exception 'Délai de validation : entre 0 et 180 jours.' using errcode = '22023';
  end if;
  if p_plafond_demandes_mois not between 1 and 10000 then
    raise exception 'Plafond mensuel : entre 1 et 10 000 demandes, ou vide.' using errcode = '22023';
  end if;
  update public.partner_settings set
    montant_demande_centimes = p_montant_demande_centimes,
    montant_abonne_centimes = p_montant_abonne_centimes,
    delai_validation_jours = p_delai_validation_jours,
    plafond_demandes_mois = p_plafond_demandes_mois,
    updated_by = (select auth.uid())
  where id;
  perform app.audit('partenaires.reglages', 'partenaires', null, jsonb_build_object(
    'montant_demande_centimes', p_montant_demande_centimes,
    'montant_abonne_centimes', p_montant_abonne_centimes,
    'delai_validation_jours', p_delai_validation_jours,
    'plafond_demandes_mois', p_plafond_demandes_mois));
end;
$$;
revoke execute on function public.admin_save_partner_settings(int, int, int, int) from public, anon;
grant execute on function public.admin_save_partner_settings(int, int, int, int) to authenticated;

-- Virement fait : commissions validées marquées payées, avec la référence (facture du partenaire).
create function public.admin_mark_commissions_paid(p_ids uuid[], p_reference text)
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reference text := nullif(left(btrim(coalesce(p_reference, '')), 100), '');
  v_count int;
begin
  perform app.require_admin();
  if v_reference is null then
    raise exception 'Indiquez la référence du paiement (facture du partenaire, virement).' using errcode = '22023';
  end if;
  update public.partner_commissions set status = 'payee', paid_at = now(), payout_reference = v_reference
  where id = any (coalesce(p_ids, '{}')) and status = 'validee';
  get diagnostics v_count = row_count;
  perform app.audit('partenaires.commissions_payees', 'partenaires', null,
    jsonb_build_object('commissions', to_jsonb(p_ids), 'nombre', v_count, 'reference', v_reference));
  return v_count;
end;
$$;
revoke execute on function public.admin_mark_commissions_paid(uuid[], text) from public, anon;
grant execute on function public.admin_mark_commissions_paid(uuid[], text) to authenticated;

create function public.admin_cancel_partner_commission(p_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reason text := nullif(left(btrim(coalesce(p_reason, '')), 300), '');
  v_partner uuid;
begin
  perform app.require_admin();
  if v_reason is null then
    raise exception 'Indiquez le motif de l''annulation.' using errcode = '22023';
  end if;
  update public.partner_commissions set status = 'annulee', cancel_reason = v_reason, validated_at = null
  where id = p_id and status in ('en_attente', 'validee')
  returning partner_id into v_partner;
  if v_partner is null then
    raise exception 'Commission introuvable ou déjà payée.' using errcode = '22023';
  end if;
  perform app.audit('partenaires.commission_annulee', 'partenaire', v_partner,
    jsonb_build_object('commission', p_id, 'motif', v_reason));
end;
$$;
revoke execute on function public.admin_cancel_partner_commission(uuid, text) from public, anon;
grant execute on function public.admin_cancel_partner_commission(uuid, text) to authenticated;

-- Liste du back-office : partenaires et chiffres clés.
create function public.admin_partners()
returns table (
  id uuid,
  code text,
  nom text,
  status public.partner_status,
  created_at timestamptz,
  projects int,
  qualified int,
  artisans int,
  paying int,
  pending_cents bigint,
  validated_cents bigint,
  paid_cents bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform app.require_admin();
  return query
  select p.id, p.code, p.nom, p.status, p.created_at,
    (select count(*)::int from public.partner_attributions a where a.partner_id = p.id and a.project_id is not null),
    (select count(*)::int from public.partner_commissions c where c.partner_id = p.id
       and c.kind = 'demande_qualifiee' and c.status <> 'annulee'),
    (select count(*)::int from public.partner_attributions a where a.partner_id = p.id and a.artisan_id is not null),
    (select count(*)::int from public.partner_commissions c where c.partner_id = p.id
       and c.kind = 'abonne_payant' and c.status <> 'annulee'),
    (select coalesce(sum(c.amount_cents), 0)::bigint from public.partner_commissions c
       where c.partner_id = p.id and c.status = 'en_attente'),
    (select coalesce(sum(c.amount_cents), 0)::bigint from public.partner_commissions c
       where c.partner_id = p.id and c.status = 'validee'),
    (select coalesce(sum(c.amount_cents), 0)::bigint from public.partner_commissions c
       where c.partner_id = p.id and c.status = 'payee')
  from public.partners p
  order by p.created_at desc;
end;
$$;
revoke execute on function public.admin_partners() from public, anon;
grant execute on function public.admin_partners() to authenticated;
