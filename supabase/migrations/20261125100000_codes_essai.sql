-- Codes d'essai de l'inscription artisan (F-192, ADR 0392, maquette lot 82).
--
-- Un admin crée un code (durée, nombre d'utilisations). Saisi dans « J'ai un code » à
-- l'inscription, il fait du compte un compte d'essai : masqué des clients (masque_public), rempli
-- de données fictives étape par étape (fill_test_onboarding), validé automatiquement à l'envoi du
-- dossier, hors chiffres de lancement, sans parrainage ni prime. Un admin le supprime en un clic.

-- ---------------------------------------------------------------- comptes d'essai
alter table public.artisans
  add column compte_essai boolean not null default false,
  add column essai_code_id uuid;

comment on column public.artisans.compte_essai is
  'Compte d''essai créé avec un code d''essai (ADR 0392) : données fictives, jamais visible des clients.';

-- Documents d'exemple (aucun fichier derrière) : source « essai ».
alter table public.artisan_documents drop constraint artisan_documents_source_check;
alter table public.artisan_documents
  add constraint artisan_documents_source_check check (source in ('depot', 'registre', 'essai'));

-- ---------------------------------------------------------------- codes
create table public.test_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[a-z0-9](?:[a-z0-9-]{1,30}[a-z0-9])$'),
  expires_at timestamptz not null,
  max_uses integer not null check (max_uses between 1 and 500),
  uses integer not null default 0 check (uses >= 0),
  disabled_at timestamptz,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
comment on table public.test_codes is 'Codes d''essai de l''inscription artisan (ADR 0392).';

alter table public.artisans
  add constraint artisans_essai_code_id_fkey foreign key (essai_code_id)
  references public.test_codes (id) on delete set null;
create index artisans_essai_code_id_idx on public.artisans (essai_code_id);
create index test_codes_created_by_idx on public.test_codes (created_by);

alter table public.test_codes enable row level security;
revoke all on public.test_codes from anon, authenticated;
grant select on public.test_codes to authenticated;
create policy test_codes_admin_select on public.test_codes
  for select to authenticated using ((select app.is_admin()));

-- Un code d'essai partage l'espace des autres codes (partenaires, parrains, commerciaux, suivi).
create or replace function app.link_code_taken(p_code text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.partners where code = p_code)
    or exists (select 1 from public.artisan_referral_codes where code = p_code)
    or exists (select 1 from public.commercials where code = p_code)
    or exists (select 1 from public.acquisition_codes where code = p_code)
    or exists (select 1 from public.test_codes where code = p_code)
$$;

create function public.admin_create_test_code(p_code text, p_days integer, p_max_uses integer)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_code text := lower(btrim(coalesce(p_code, '')));
  v_id uuid;
begin
  perform app.require_admin();
  if v_code !~ '^[a-z0-9](?:[a-z0-9-]{1,30}[a-z0-9])$' then
    raise exception 'Code invalide : lettres minuscules, chiffres et tirets, 3 à 32 caractères.'
      using errcode = '22023';
  end if;
  if p_days is null or p_days not between 1 and 90 then
    raise exception 'Durée attendue : de 1 à 90 jours.' using errcode = '22023';
  end if;
  if p_max_uses is null or p_max_uses not between 1 and 500 then
    raise exception 'Utilisations attendues : de 1 à 500.' using errcode = '22023';
  end if;
  if app.link_code_taken(v_code) then
    raise exception 'Ce code est déjà utilisé.' using errcode = '23505';
  end if;
  insert into public.test_codes (code, expires_at, max_uses, created_by)
  values (v_code, now() + make_interval(days => p_days), p_max_uses, (select auth.uid()))
  returning id into v_id;
  perform app.audit('code_essai.cree', 'test_code', v_id,
    jsonb_build_object('code', v_code, 'jours', p_days, 'utilisations', p_max_uses));
  return v_id;
end;
$$;

create function public.admin_disable_test_code(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform app.require_admin();
  update public.test_codes set disabled_at = now() where id = p_id and disabled_at is null;
  if not found then
    raise exception 'Code introuvable ou déjà désactivé.' using errcode = '22023';
  end if;
  perform app.audit('code_essai.desactive', 'test_code', p_id, '{}');
end;
$$;

-- Comptes d'essai pour le back-office : entreprise, code utilisé, état, date.
create function public.admin_test_accounts()
returns table (
  artisan_id uuid,
  nom text,
  code text,
  status public.artisan_status,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform app.require_admin();
  return query
    select a.id, coalesce(a.nom_commercial, a.raison_sociale), c.code, a.status, a.created_at
    from public.artisans a
    left join public.test_codes c on c.id = a.essai_code_id
    where a.compte_essai
    order by a.created_at desc;
end;
$$;

-- Suppression d'un compte d'essai : l'utilisateur, sa fiche et ce qui en dépend (cascade).
create function public.admin_delete_test_account(p_artisan_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid;
begin
  perform app.require_admin();
  select a.user_id into v_user from public.artisans a where a.id = p_artisan_id and a.compte_essai;
  if v_user is null then
    raise exception 'Compte d''essai introuvable.' using errcode = '22023';
  end if;
  delete from auth.users where id = v_user;
  perform app.audit('compte_essai.supprime', 'artisan', p_artisan_id, '{}');
end;
$$;

-- ---------------------------------------------------------------- inscription avec un code
-- SIRET d'essai : 14 chiffres commençant par 999, clé de Luhn juste, libre.
create function app.test_siret()
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_base text;
  v_siret text;
begin
  loop
    v_base := '999' || lpad((floor(random() * 10000000000))::bigint::text, 10, '0');
    for d in 0..9 loop
      v_siret := v_base || d::text;
      exit when app.is_valid_siret(v_siret);
    end loop;
    exit when not exists (select 1 from public.artisans where siret = v_siret);
  end loop;
  return v_siret;
end;
$$;
revoke execute on function app.test_siret() from public, anon, authenticated;

-- Code d'essai valable : le compte devient un compte d'essai, masqué des clients, et le SIRET
-- saisi est remplacé par un SIRET d'essai (le vrai reste libre pour son entreprise).
create function app.redeem_test_code(p_artisan uuid, p_code text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if p_artisan is null or p_code is null then
    return false;
  end if;
  select c.id into v_id from public.test_codes c
  where c.code = lower(btrim(p_code)) and c.disabled_at is null and c.expires_at > now()
    and c.uses < c.max_uses
  for update;
  if v_id is null then
    return false;
  end if;
  update public.test_codes set uses = uses + 1 where id = v_id;
  update public.artisans set
    compte_essai = true,
    essai_code_id = v_id,
    masque_public = true,
    siret = app.test_siret()
  where id = p_artisan;
  return true;
end;
$$;
revoke execute on function app.redeem_test_code(uuid, text) from public, anon, authenticated;

-- Le traitement existant (partenaire, commercial, code de suivi, parrainage) est gardé tel quel,
-- sans le code quand c'est un code d'essai : ni attribution, ni parrainage, ni prime.
alter function app.apply_artisan_signup(uuid, jsonb) rename to apply_artisan_signup_attributions;

create function app.apply_artisan_signup(p_artisan uuid, p_signup jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if jsonb_typeof(p_signup -> 'partner_code') = 'string'
     and app.redeem_test_code(p_artisan, p_signup ->> 'partner_code') then
    perform app.apply_artisan_signup_attributions(p_artisan, p_signup - 'partner_code');
  else
    perform app.apply_artisan_signup_attributions(p_artisan, p_signup);
  end if;
end;
$$;
revoke execute on function app.apply_artisan_signup(uuid, jsonb) from public, anon, authenticated;
revoke execute on function app.apply_artisan_signup_attributions(uuid, jsonb)
  from public, anon, authenticated;

-- ---------------------------------------------------------------- remplissage
-- Étapes : entreprise, metiers, zone, charte, identite (Kbis et pièce d'identité), profil,
-- attestations. Rien n'est écrasé : une étape déjà faite est laissée telle quelle.
create function public.fill_test_onboarding(p_steps text[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  a public.artisans;
  v_step text;
  v_trade text;
  v_signer text;
begin
  select * into a from public.artisans where user_id = (select auth.uid()) for update;
  if not found or not a.compte_essai then
    raise exception 'Réservé aux comptes d''essai.' using errcode = '42501';
  end if;
  if a.status not in ('brouillon', 'refuse') then
    raise exception 'Le dossier a déjà été envoyé.' using errcode = '22023';
  end if;

  foreach v_step in array coalesce(p_steps, '{}') loop
    if v_step = 'entreprise' then
      update public.artisans set
        raison_sociale = 'ESSAI · Entreprise d''essai MENAO',
        nom_commercial = null,
        assujetti_tva = coalesce(assujetti_tva, true),
        sirene_checked_at = coalesce(sirene_checked_at, now()),
        sirene_active = true,
        adresse_commune = coalesce(adresse_commune, 'Grasse'),
        adresse_code_postal = coalesce(adresse_code_postal, '06130'),
        date_creation_entreprise = coalesce(date_creation_entreprise, date '2019-03-01')
      where id = a.id;
    elsif v_step = 'metiers' then
      if not exists (select 1 from public.artisan_trades t where t.artisan_id = a.id) then
        select t.code into v_trade from public.trades t where t.active order by t.sort_order limit 1;
        insert into public.artisan_trades (artisan_id, trade_code) values (a.id, v_trade);
      end if;
    elsif v_step = 'zone' then
      update public.artisans set
        zone_mode = 'rayon',
        base_label = 'Grasse',
        base_code_insee = '06069',
        base_location = extensions.st_setsrid(extensions.st_makepoint(6.9237, 43.6589), 4326)::extensions.geography,
        radius_km = 30
      where id = a.id and base_location is null;
    elsif v_step = 'charte' then
      if not app.charter_signed(a.id) then
        select coalesce(nullif(btrim(concat_ws(' ', p.first_name, p.last_name)), ''), 'Testeur MENAO')
        into v_signer from public.profiles p where p.user_id = a.user_id;
        insert into public.artisan_charter_acceptances
          (artisan_id, version, rules_count, signer_name, company, siret, signature_path,
           engagement_version)
        select a.id, app.current_charter_version(), app.current_charter_rule_count(),
          left(coalesce(v_signer, 'Testeur MENAO'), 120),
          coalesce(a2.raison_sociale, 'Entreprise d''essai'), a2.siret,
          'M10 30 L30 10 L50 30 L70 12 L90 28', app.current_engagement_version()
        from public.artisans a2 where a2.id = a.id
        on conflict do nothing;
      end if;
    elsif v_step = 'identite' then
      insert into public.artisan_documents
        (artisan_id, type, source, storage_path, mime_type, size_bytes, status, date_emission)
      select a.id, 'kbis', 'essai', 'essai/' || a.id || '/kbis.png', 'image/png', 1, 'en_attente', current_date
      where not exists (select 1 from public.artisan_documents d
        where d.artisan_id = a.id and d.type = 'kbis' and d.status in ('en_attente', 'valide'));
      insert into public.artisan_documents
        (artisan_id, type, source, storage_path, mime_type, size_bytes, status, date_fin, piece)
      select a.id, 'identite', 'essai', 'essai/' || a.id || '/identite.png', 'image/png', 1,
        'en_attente', (current_date + interval '5 years')::date, 'passeport'
      where not exists (select 1 from public.artisan_documents d
        where d.artisan_id = a.id and d.type = 'identite' and d.status in ('en_attente', 'valide'));
    elsif v_step = 'profil' then
      update public.artisans set presentation =
        'Entreprise d''essai MENAO : cette présentation est un exemple, écrite automatiquement pour '
        || 'tester l''inscription. Aucun client ne la verra.'
      where id = a.id and char_length(coalesce(presentation, '')) < 100;
    elsif v_step = 'attestations' then
      insert into public.artisan_documents
        (artisan_id, type, source, storage_path, mime_type, size_bytes, status, date_emission,
         date_fin, numero, assureur)
      select a.id, t.type, 'essai', 'essai/' || a.id || '/' || t.type::text || '.png', 'image/png', 1,
        'en_attente',
        case when t.type = 'urssaf' then current_date - 10 end,
        case when t.type = 'urssaf' then (current_date + interval '6 months' - interval '10 days')::date
             else make_date(extract(year from current_date)::int + 1, 12, 31) end,
        case t.type when 'decennale' then 'ESSAI-DEC-0001' when 'rc_pro' then 'ESSAI-RC-0001'
             else 'ESSAI0001' end,
        case when t.type in ('decennale', 'rc_pro') then 'Assureur d''essai' end
      from (values ('decennale'::public.document_type), ('rc_pro'), ('urssaf')) as t (type)
      where not exists (select 1 from public.artisan_documents d
        where d.artisan_id = a.id and d.type = t.type and d.status in ('en_attente', 'valide'));
    else
      raise exception 'Étape inconnue : %', v_step using errcode = '22023';
    end if;
  end loop;
end;
$$;
revoke execute on function public.fill_test_onboarding(text[]) from public, anon;
grant execute on function public.fill_test_onboarding(text[]) to authenticated;

-- « Vider et déposer de vrais documents » : retire les attestations d'exemple.
create function public.clear_test_attestations()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_artisan uuid;
begin
  select a.id into v_artisan from public.artisans a
  where a.user_id = (select auth.uid()) and a.compte_essai and a.status in ('brouillon', 'refuse');
  if v_artisan is null then
    raise exception 'Réservé aux comptes d''essai.' using errcode = '42501';
  end if;
  delete from public.artisan_documents
  where artisan_id = v_artisan and source = 'essai' and type in ('decennale', 'rc_pro', 'urssaf');
end;
$$;
revoke execute on function public.clear_test_attestations() from public, anon;
grant execute on function public.clear_test_attestations() to authenticated;

-- ---------------------------------------------------------------- envoi : validé tout de suite
create or replace function public.submit_artisan_onboarding()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  a public.artisans;
  v_missing text[];
begin
  select * into a from public.artisans where user_id = (select auth.uid());
  if not found then
    raise exception 'Aucune fiche artisan pour cet utilisateur.' using errcode = '42501';
  end if;
  if a.status not in ('brouillon', 'refuse') then
    raise exception 'Le dossier a déjà été envoyé.' using errcode = '22023';
  end if;

  v_missing := app.onboarding_missing_steps(a.id);
  if cardinality(v_missing) > 0 then
    raise exception 'Étapes incomplètes : %', array_to_string(v_missing, ', ') using errcode = '22023';
  end if;
  -- Liste noire (ADR 0158) : identité d'un artisan radié.
  if app.identity_blocked(a.id) then
    raise exception 'Votre inscription ne peut pas aboutir. Contactez l''équipe MENAO.' using errcode = '42501';
  end if;

  -- Compte d'essai (ADR 0392) : validé sans passer par l'équipe, documents d'exemple compris.
  if a.compte_essai then
    update public.artisan_documents set status = 'valide', verified_at = now()
    where artisan_id = a.id and status = 'en_attente';
    update public.artisans
    set status = 'valide', submitted_at = now(), refusal_reason = null, masque_public = true
    where id = a.id;
    update auth.users
    set raw_app_meta_data = raw_app_meta_data || jsonb_build_object('role', 'artisan')
    where id = a.user_id;
    insert into public.artisan_reviews (artisan_id, admin_id, decision, message)
    values (a.id, null, 'valide', 'Compte d''essai : validé automatiquement.');
    return;
  end if;

  update public.artisans
  set status = 'en_verification', submitted_at = now(), refusal_reason = null
  where id = a.id;
end;
$$;

-- ---------------------------------------------------------------- chiffres de lancement
-- Les comptes d'essai ne comptent pas (inscrits, validés, canaux, rythme des conseillers).
create or replace function app.launch_artisans()
returns table (
  artisan_id uuid,
  user_id uuid,
  status public.artisan_status,
  inscrit_le timestamptz,
  valide_le timestamptz,
  canal text,
  commercial_id uuid,
  code_id uuid
)
language sql
stable
security definer
set search_path = ''
as $$
  select a.id, a.user_id, a.status, a.created_at,
    coalesce(
      (select min(r.created_at) from public.artisan_reviews r where r.artisan_id = a.id and r.decision = 'valide'),
      case when a.status = 'valide' then coalesce(a.submitted_at, a.created_at) end
    ),
    case
      when pa.artisan_id is not null then 'partenaire'
      when ca.artisan_id is not null then 'commercial'
      when k.id is not null then k.canal::text
      when exists (select 1 from public.artisan_referrals rr where rr.referred_artisan_id = a.id) then 'parrainage'
      when exists (
        select 1 from public.artisan_invitations i where i.artisan_id = a.id and i.status = 'inscrit'
      ) then 'invitation'
      else 'direct'
    end,
    ca.commercial_id,
    ka.code_id
  from public.artisans a
  left join public.partner_attributions pa on pa.artisan_id = a.id
  left join public.commercial_attributions ca on ca.artisan_id = a.id
  left join public.acquisition_code_attributions ka on ka.artisan_id = a.id
  left join public.acquisition_codes k on k.id = ka.code_id
  where not a.compte_essai
$$;

-- ---------------------------------------------------------------- droits
revoke execute on function public.admin_create_test_code(text, integer, integer) from public, anon;
grant execute on function public.admin_create_test_code(text, integer, integer) to authenticated;
revoke execute on function public.admin_disable_test_code(uuid) from public, anon;
grant execute on function public.admin_disable_test_code(uuid) to authenticated;
revoke execute on function public.admin_test_accounts() from public, anon;
grant execute on function public.admin_test_accounts() to authenticated;
revoke execute on function public.admin_delete_test_account(uuid) from public, anon;
grant execute on function public.admin_delete_test_account(uuid) to authenticated;
