-- Tableaux de lancement, lot 2 (F-66, ADR 0209) : chiffres du lancement en direct, calculés sur les
-- vraies données de MENAO, et codes de suivi /p/<code> (publicité, flyers, salon, code personnel
-- d'un associé) pour attribuer les inscriptions d'artisans.
-- - Lecture seule, réservée aux admins (double authentification) : admin_launch_figures (réglages,
--   cibles, totaux, semaines, canaux, membres, qualité, activité) et admin_launch_coverage
--   (couverture métier × commune pilote). Rien n'est stocké : la page relit les chiffres en direct.
-- - Dépôt public : aucune cible réelle ici ni dans le seed. Les cibles sont importées en base avec le
--   plan (clé « cibles » de admin_import_launch_plan) depuis le fichier gardé hors du dépôt.
-- - Une seule règle par chiffre, commentée là où elle est écrite (app.launch_artisans pour les
--   inscrits, les validés et les canaux) ; semaines du lundi au dimanche et jours à l'heure de Paris.
-- - Codes de suivi : même format et même espace que les codes des partenaires, des commerciaux et des
--   parrains (jamais deux fois le même) ; le code est définitif (déjà imprimé), le reste modifiable.
-- - Écritures par les fonctions seulement, journalisées.

create type public.acquisition_channel as enum (
  'terrain', 'meta', 'google', 'flyer', 'salon', 'presse', 'radio', 'autre'
);

-- ---------------------------------------------------------------------------
-- Codes de suivi /p/<code>
-- ---------------------------------------------------------------------------
create table public.acquisition_codes (
  id uuid primary key default gen_random_uuid(),
  -- Même format que les codes des partenaires et des commerciaux (normalizePartnerCode) ; jamais
  -- modifié : liens, flyers et QR codes déjà diffusés.
  code text not null unique check (code ~ '^[a-z0-9](?:[a-z0-9-]{1,30}[a-z0-9])$'),
  libelle text not null check (char_length(btrim(libelle)) between 1 and 80),
  canal public.acquisition_channel not null,
  -- Membre responsable (code personnel d'un associé, flyers d'un commercial) : ses résultats.
  member_id uuid references public.launch_members (id) on delete set null,
  -- Inactif : le code n'attribue plus les nouvelles inscriptions (celles d'avant restent comptées).
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index acquisition_codes_member_idx on public.acquisition_codes (member_id);

create trigger acquisition_codes_set_updated_at before update on public.acquisition_codes
  for each row execute function app.set_updated_at();

-- Une ligne par artisan : le premier code reçu à l'inscription l'emporte.
create table public.acquisition_code_attributions (
  artisan_id uuid primary key references public.artisans (id) on delete cascade,
  code_id uuid not null references public.acquisition_codes (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index acquisition_code_attributions_code_idx on public.acquisition_code_attributions (code_id);

-- ---------------------------------------------------------------------------
-- Réglages des chiffres (une seule ligne)
-- ---------------------------------------------------------------------------
create table public.launch_settings (
  id boolean primary key default true check (id),
  -- Période de recrutement : bornes de la courbe ; null : les 12 dernières semaines.
  debut_recrutement date check (debut_recrutement between date '2020-01-01' and date '2040-12-31'),
  fin_recrutement date check (fin_recrutement between date '2020-01-01' and date '2040-12-31'),
  -- Artisans validés par case métier × commune pour qu'elle soit couverte.
  seuil_couverture integer not null default 3 check (seuil_couverture between 1 and 20),
  -- Jauge de « Mon profil » (pour cent) à partir de laquelle une fiche est complète.
  seuil_fiche_complete integer not null default 100 check (seuil_fiche_complete between 50 and 100),
  updated_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now(),
  check (debut_recrutement is null or fin_recrutement is null or debut_recrutement <= fin_recrutement)
);

create index launch_settings_updated_by_idx on public.launch_settings (updated_by);

create trigger launch_settings_set_updated_at before update on public.launch_settings
  for each row execute function app.set_updated_at();

insert into public.launch_settings default values;

-- ---------------------------------------------------------------------------
-- Cibles (importées depuis le fichier gardé hors du dépôt)
--   member_id null : cible de toute l'équipe ;
--   jour : lundi de la semaine pour une série hebdomadaire, date d'échéance sinon ; null : cible
--   permanente. Même liste d'indicateurs que LAUNCH_INDICATORS (@menao/core), dans le même ordre.
-- ---------------------------------------------------------------------------
create table public.launch_targets (
  id uuid primary key default gen_random_uuid(),
  indicateur text not null check (indicateur in (
    'valides_cumul', 'inscrits_cumul', 'valides_semaine', 'cases_sous_seuil', 'dossiers_48h_pct',
    'fiches_completes_pct', 'app_installee_pct', 'premier_devis_perso_pct', 'demandes_semaine',
    'demandes_par_artisan', 'reponse_72h_pct', 'devis_envoye_pct', 'abonnes_pct'
  )),
  member_id uuid references public.launch_members (id) on delete cascade,
  jour date check (jour between date '2020-01-01' and date '2040-12-31'),
  valeur numeric not null check (valeur between 0 and 1000000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique nulls not distinct (indicateur, member_id, jour)
);

create index launch_targets_member_idx on public.launch_targets (member_id);

create trigger launch_targets_set_updated_at before update on public.launch_targets
  for each row execute function app.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS : lecture par les admins seulement ; aucune écriture directe.
-- ---------------------------------------------------------------------------
alter table public.acquisition_codes enable row level security;
alter table public.acquisition_code_attributions enable row level security;
alter table public.launch_settings enable row level security;
alter table public.launch_targets enable row level security;
revoke all on public.acquisition_codes, public.acquisition_code_attributions, public.launch_settings,
  public.launch_targets from anon, authenticated;
grant select on public.acquisition_codes, public.acquisition_code_attributions, public.launch_settings,
  public.launch_targets to authenticated;

create policy "acquisition_codes : lecture par un admin"
  on public.acquisition_codes for select to authenticated
  using ((select app.is_admin()));

create policy "acquisition_code_attributions : lecture par un admin"
  on public.acquisition_code_attributions for select to authenticated
  using ((select app.is_admin()));

create policy "launch_settings : lecture par un admin"
  on public.launch_settings for select to authenticated
  using ((select app.is_admin()));

create policy "launch_targets : lecture par un admin"
  on public.launch_targets for select to authenticated
  using ((select app.is_admin()));

-- ---------------------------------------------------------------------------
-- Espace des liens /p/<code> : partenaires, parrains, commerciaux et codes de suivi
-- ---------------------------------------------------------------------------
-- Code déjà pris dans l'espace des liens /p/<code> (admin_register_commercial,
-- admin_commercial_code_available, app.new_referral_code, admin_save_acquisition_code).
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
$$;
revoke execute on function app.link_code_taken(text) from public, anon, authenticated;

-- Code de suivi : jamais un code déjà pris par un partenaire, un parrain, un commercial ou un autre
-- code de suivi ; jamais modifié une fois créé.
create function app.acquisition_codes_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' then
    if new.code is distinct from old.code then
      raise exception 'Un code ne change jamais : créez-en un nouveau.' using errcode = '22023';
    end if;
  elsif app.link_code_taken(new.code) then
    raise exception 'Ce code est déjà pris.' using errcode = '22023';
  end if;
  return new;
end;
$$;
revoke execute on function app.acquisition_codes_guard() from public, anon, authenticated;

create trigger acquisition_codes_guard before insert or update of code on public.acquisition_codes
  for each row execute function app.acquisition_codes_guard();

-- Un partenaire ne prend ni le code d'un commercial ni celui d'un code de suivi (admin_save_partner
-- affiche le message).
create or replace function app.partners_code_not_commercial()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (select 1 from public.commercials where code = new.code)
     or exists (select 1 from public.acquisition_codes where code = new.code) then
    raise exception 'Ce code est déjà utilisé.' using errcode = '22023';
  end if;
  return new;
end;
$$;

-- Codes des commerciaux et des parrains : jamais celui d'un code de suivi. admin_register_commercial
-- et app.new_referral_code passent déjà par app.link_code_taken ; ce déclencheur couvre toute autre
-- écriture.
create function app.link_code_not_tracking()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (select 1 from public.acquisition_codes where code = new.code) then
    raise exception 'Ce code est déjà utilisé.' using errcode = '22023';
  end if;
  return new;
end;
$$;
revoke execute on function app.link_code_not_tracking() from public, anon, authenticated;

create trigger commercials_code_not_tracking before insert or update of code on public.commercials
  for each row execute function app.link_code_not_tracking();

create trigger artisan_referral_codes_code_not_tracking before insert or update of code
  on public.artisan_referral_codes
  for each row execute function app.link_code_not_tracking();

-- Inscription : code d'un partenaire, d'un commercial, d'un code de suivi, sinon code de parrainage
-- d'un artisan validé (reprise de 20261029120100_espace_commercial.sql, code de suivi en plus).
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
  v_tracking uuid;
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
-- Définitions communes aux chiffres (une seule règle chacune)
-- ---------------------------------------------------------------------------
-- Une ligne par fiche artisan :
-- - inscrit_le : création de la fiche (inscription), quel que soit le statut ensuite. Un compte
--   radié reste compté : l'inscription a bien eu lieu ; une fiche supprimée disparaît.
-- - valide_le : date de la PREMIÈRE validation (décision « valide » la plus ancienne), même si
--   l'artisan a été suspendu ou radié depuis. Artisan validé sans décision enregistrée (dossier
--   validé hors du back-office, jeu de données) : envoi du dossier, sinon création de la fiche.
-- - canal : un seul, dans l'ordre d'attribution de app.apply_artisan_signup : partenaire,
--   commercial, code de suivi (son canal), puis parrainage, invitation d'un particulier (inscrit),
--   sinon « direct ».
-- - commercial_id, code_id : rattachements, pour les résultats des membres et des codes.
create function app.launch_artisans()
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
$$;
revoke execute on function app.launch_artisans() from public, anon, authenticated;

-- Jauge « Fiche complète à X % » de « Mon profil » (ADR 0129), miroir exact de profileStrength
-- (packages/core/src/profile.ts) avec les sources de la page mon-profil :
-- - badge « Assuré et vérifié » 25 (app.artisan_verified_badge, comme my_public_profile) ;
-- - photo de profil 20 (profiles.avatar_path) ;
-- - réalisations 20, au prorata jusqu'à 3 photos (artisan_photos) ;
-- - présentation 15, au prorata jusqu'à 300 caractères, comptés comme presentation.trim().length
--   en JavaScript (espaces et fins de ligne retirés au début et à la fin comme par trim(),
--   caractère hors du plan de base compté deux fois) ;
-- - spécialités 10 (artisan_work_types des spécialités actives) ;
-- - certifications 10 (certifications saisies, ou domaines RGE encore valides de l'annuaire) ;
-- arrondie à l'inférieur. Calcul en double précision, dans l'ordre du code : même résultat que le
-- navigateur, arrondis compris. Artisan inconnu : null.
create function app.artisan_profile_strength(p_artisan uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select floor(
    0::double precision
    + 25 * (case when f.verified then 1 else 0 end)::double precision
    + 20 * (case when f.avatar then 1 else 0 end)::double precision
    + 20 * least(f.photos::double precision / 3, 1::double precision)
    + 15 * least(f.presentation::double precision / 300, 1::double precision)
    + 10 * (case when f.work_types > 0 then 1 else 0 end)::double precision
    + 10 * (case when f.certifications > 0 then 1 else 0 end)::double precision
  )::integer
  from (
    select
      app.artisan_verified_badge(a.id) as verified,
      pr.avatar_path is not null as avatar,
      (select count(*) from public.artisan_photos p where p.artisan_id = a.id) as photos,
      -- Longueur JavaScript (unités UTF-16) : seule compte sa part de 300. À 300 caractères ou plus
      -- (jamais moins d'unités que de caractères), la note est pleine sans rien découper ; en
      -- dessous, 299 caractères au plus sont parcourus pour compter ceux hors du plan de base.
      case
        when char_length(t.txt) >= 300 then 300
        else coalesce(char_length(t.txt) + (
          select count(*) from string_to_table(t.txt, null) as s (ch) where ascii(s.ch) > 65535
        ), 0)
      end as presentation,
      (
        select count(*)
        from public.artisan_work_types aw
        join public.work_types w on w.code = aw.work_type_code
        where aw.artisan_id = a.id and w.active
      ) as work_types,
      (select count(*) from public.certifications c where c.artisan_id = a.id)
        + (
          select count(distinct r.domaine)
          from public.artisan_rge_qualifications r
          where r.artisan_id = a.id and r.date_fin >= (now() at time zone 'Europe/Paris')::date
        ) as certifications
    from public.artisans a
    left join public.profiles pr on pr.user_id = a.user_id
    -- Blancs retirés par String.prototype.trim() : espaces (dont insécables et ceux de la
    -- catégorie Zs), tabulations, fins de ligne et BOM.
    cross join lateral (
      select btrim(a.presentation, E' \t\n\r\f\u000B\u00A0\u1680\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200A\u2028\u2029\u202F\u205F\u3000\uFEFF') as txt
    ) t
    where a.id = p_artisan
  ) f
$$;
revoke execute on function app.artisan_profile_strength(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Chiffres du lancement (admins, lecture seule)
-- ---------------------------------------------------------------------------
-- Forme : {today, settings, targets, totals, weeks, channels, members, quality, activity}
-- (LaunchFigures dans @menao/core). Règles, en plus de celles de app.launch_artisans :
-- - weeks : une ligne par semaine, vides comprises, du début du recrutement (à défaut : 11 semaines
--   avant la semaine en cours) à sa fin (à défaut : la semaine en cours), 156 semaines au plus (les
--   plus récentes) ; les cumuls comptent aussi tout ce qui précède la première semaine.
-- - totals et quality : statut actuel (validés = statut « valide ») ; dossier envoyé : date d'envoi
--   connue ou statut déjà au-delà du brouillon ; essai (entonnoir) : essai commencé, en cours ou
--   terminé (cumul, comme les abonnés) ; abonné : premier paiement reçu.
-- - channels : une ligne par canal non vide, dans l'ordre de LAUNCH_CHANNELS ; valides_semaine :
--   première validation dans la semaine en cours.
-- - members : membres actifs (ordre, nom) ; réalisé : artisans inscrits avec le code commercial de
--   son compte relié ou avec un code de suivi dont il est responsable ; weeks : les 8 semaines qui
--   finissent à la semaine en cours (à la fin du recrutement, s'il est terminé) ; dossiers : décisions
--   prises par son compte relié (dossiers_traites : toutes ; dossiers_mesurables : celles dont le
--   délai se mesure, dénominateur de dossiers_48h).
-- - dossiers sous 48 h : décision (toutes décisions) prise moins de 48 h après l'envoi du dossier.
--   Approximation : la date d'envoi est réécrite à chaque renvoi ; une décision suivie d'un renvoi
--   n'est donc plus mesurable et sort du calcul du délai (quality.dossiers_decides et
--   dossiers_mesurables ne comptent que les décisions mesurables). En attente : dossiers « en
--   vérification » (depuis plus de 48 h).
-- - fiche complète : jauge de « Mon profil » au moins égale au seuil, parmi les validés actuels.
-- - application installée : au moins un appareil enregistré pour les notifications push.
-- - premier devis à ses propres clients : un devis envoyé sur un chantier né d'une demande directe
--   (sa fiche, sa carte de visite, « Redemander un devis » : ADR 0198), et non d'une demande
--   distribuée par MENAO ; tout devis naît d'une demande MENAO, c'est le seul cas mesurable.
--   Définition [À VALIDER] (ADR 0209).
-- - demandes : celles reçues par les artisans, hors demandes retenues pour vérification (« à
--   vérifier », ADR 0157), bloquées par l'équipe (annulées sans motif du client et sans réponse
--   de l'artisan : une demande annulée après acceptation, chantier annulé, reste comptée) et
--   annulées par le client avant d'être transmises (voir reqs) ; directe :
--   projects.preferred_artisan_id = requests.artisan_id (ADR 0198).
-- - demandes de la semaine : projets de clients (chaque lot d'un chantier à plusieurs métiers compte)
--   dont la première demande tombe dans la semaine en cours (précédente).
-- - demandes par artisan : demandes des 30 derniers jours, hors demandes directes, de chaque artisan
--   validé (0 sans demande) ; médiane et artisans à 4 demandes ou plus.
-- - réponse sous 72 h : demandes des 30 derniers jours envoyées il y a plus de 72 h (le délai est
--   écoulé pour toutes), hors demandes directes et hors demandes annulées par le client sans
--   réponse avant la fin du délai (l'artisan n'avait plus à répondre) ; répondues : acceptées ou
--   refusées dans les 72 h.
-- - abonnés après essai (abonnes_pct) : essai terminé et premier paiement reçu, pour rester parmi
--   les essais terminés (un abonné payé sans essai n'y entre pas).
create function public.admin_launch_figures()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := now();
  -- Jour et lundi de la semaine en cours, à Paris.
  v_today date := (now() at time zone 'Europe/Paris')::date;
  v_week date := date_trunc('week', now() at time zone 'Europe/Paris')::date;
  v_settings public.launch_settings;
  v_seuil_fiche int;
  v_first date;
  v_last date;
  v_recent date;
  v_result jsonb;
begin
  perform app.require_admin();
  select s.* into v_settings from public.launch_settings s;
  v_seuil_fiche := coalesce(v_settings.seuil_fiche_complete, 100);
  v_first := coalesce(date_trunc('week', v_settings.debut_recrutement::timestamp)::date, v_week - 77);
  v_last := greatest(coalesce(date_trunc('week', v_settings.fin_recrutement::timestamp)::date, v_week), v_first);
  v_first := greatest(v_first, v_last - 155 * 7);
  v_recent := least(v_week, v_last);

  with arts as (
    select l.artisan_id, l.user_id, l.status, l.canal, l.commercial_id, l.code_id,
      date_trunc('week', l.inscrit_le at time zone 'Europe/Paris')::date as inscrit_sem,
      date_trunc('week', l.valide_le at time zone 'Europe/Paris')::date as valide_sem
    from app.launch_artisans() l
  ),
  completes as (
    select a.artisan_id
    from arts a
    where a.status = 'valide' and app.artisan_profile_strength(a.artisan_id) >= v_seuil_fiche
  ),
  -- Toutes les décisions ; mesurables : dossier envoyé avant la décision.
  decisions as (
    select r.admin_id,
      coalesce(a.submitted_at <= r.created_at, false) as mesurable,
      coalesce(a.submitted_at <= r.created_at and r.created_at < a.submitted_at + interval '48 hours', false)
        as rapide
    from public.artisan_reviews r
    join public.artisans a on a.id = r.artisan_id
  ),
  team as (
    select m.id, m.nom, m.kind, m.objectif_valides, m.user_id, m.ordre
    from public.launch_members m
    where m.active
  ),
  -- Code commercial de son compte relié, ou code de suivi dont il est responsable (un artisan n'a
  -- qu'une attribution ; union : jamais compté deux fois).
  member_arts as (
    select t.id as member_id, a.artisan_id, a.valide_sem
    from team t
    join public.commercials c on c.user_id = t.user_id
    join arts a on a.commercial_id = c.id
    union
    select t.id, a.artisan_id, a.valide_sem
    from team t
    join public.acquisition_codes k on k.member_id = t.id
    join arts a on a.code_id = k.id
  ),
  -- Inscriptions et premières validations par semaine (courbe).
  ins_sem as (
    select a.inscrit_sem as sem, count(*) as n from arts a group by a.inscrit_sem
  ),
  val_sem as (
    select a.valide_sem as sem, count(*) as n from arts a where a.valide_sem is not null group by a.valide_sem
  ),
  -- Demande annulée par le client avant d'être transmise : retenue « à vérifier » à l'envoi
  -- (send_project_requests crée alors, dans la même transaction, le ticket « particulier à
  -- vérifier » du projet, au même horodatage) puis annulée par lui ; l'artisan ne l'a jamais vue.
  -- Une demande transmise par l'équipe a pris l'heure de la transmission (created_at) : comptée.
  reqs as (
    select r.project_id, r.artisan_id, r.created_at, r.responded_at, r.status, r.cancelled_at,
      coalesce(p.preferred_artisan_id = r.artisan_id, false) as directe
    from public.requests r
    join public.projects p on p.id = r.project_id
    where r.status <> 'a_verifier'
      and not (r.status = 'annulee' and r.cancellation_reason is null and r.responded_at is null)
      and not (r.status = 'annulee' and r.responded_at is null and exists (
        select 1 from public.tickets tk
        where tk.project_id = r.project_id and tk.type = 'particulier_a_verifier' and tk.created_at = r.created_at
      ))
  ),
  demandes as (
    select date_trunc('week', min(r.created_at) at time zone 'Europe/Paris')::date as sem
    from reqs r
    group by r.project_id
  ),
  par_artisan as (
    select a.artisan_id, count(r.artisan_id) as n
    from arts a
    left join reqs r on r.artisan_id = a.artisan_id and not r.directe and r.created_at >= v_now - interval '30 days'
    where a.status = 'valide'
    group by a.artisan_id
  )
  select jsonb_build_object(
    'today', v_today,
    'settings', jsonb_build_object(
      'debut_recrutement', v_settings.debut_recrutement,
      'fin_recrutement', v_settings.fin_recrutement,
      'seuil_couverture', coalesce(v_settings.seuil_couverture, 3),
      'seuil_fiche_complete', v_seuil_fiche
    ),
    'targets', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'indicateur', t.indicateur, 'member_id', t.member_id, 'jour', t.jour, 'valeur', t.valeur
      ) order by t.indicateur, t.member_id nulls first, t.jour nulls first), '[]'::jsonb)
      from public.launch_targets t
    ),
    'totals', jsonb_build_object(
      'inscrits', (select count(*) from arts),
      'dossiers_envoyes', (
        select count(*) from public.artisans a where a.submitted_at is not null or a.status <> 'brouillon'
      ),
      'valides', (select count(*) from arts a where a.status = 'valide'),
      'fiches_completes', (select count(*) from completes),
      'en_essai', (
        select count(*) from public.subscriptions s where s.trial_end is not null or s.status = 'trialing'
      ),
      'abonnes', (select count(*) from public.subscriptions s where s.first_paid_at is not null)
    ),
    -- Comptes de chaque semaine puis cumul courant, plus tout ce qui précède la première semaine.
    'weeks', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'semaine', w.semaine,
        'inscrits', w.inscrits,
        'valides', w.valides,
        'inscrits_cumul', w.inscrits_cumul,
        'valides_cumul', w.valides_cumul
      ) order by w.semaine), '[]'::jsonb)
      from (
        select g.d::date as semaine,
          coalesce(i.n, 0) as inscrits,
          coalesce(v.n, 0) as valides,
          ((select coalesce(sum(x.n), 0) from ins_sem x where x.sem < v_first)
            + sum(coalesce(i.n, 0)) over (order by g.d))::bigint as inscrits_cumul,
          ((select coalesce(sum(x.n), 0) from val_sem x where x.sem < v_first)
            + sum(coalesce(v.n, 0)) over (order by g.d))::bigint as valides_cumul
        from generate_series(v_first::timestamp, v_last::timestamp, interval '7 days') as g (d)
        left join ins_sem i on i.sem = g.d::date
        left join val_sem v on v.sem = g.d::date
      ) w
    ),
    'channels', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'canal', c.canal, 'inscrits', c.inscrits, 'valides', c.valides, 'valides_semaine', c.valides_semaine
      ) order by array_position(array['commercial', 'partenaire']
          || enum_range(null::public.acquisition_channel)::text[]
          || array['parrainage', 'invitation', 'direct'], c.canal), c.canal), '[]'::jsonb)
      from (
        select a.canal, count(*) as inscrits, count(a.valide_sem) as valides,
          count(*) filter (where a.valide_sem = v_week) as valides_semaine
        from arts a
        group by a.canal
      ) c
    ),
    'members', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'member_id', t.id,
        'nom', t.nom,
        'kind', t.kind,
        'objectif', t.objectif_valides,
        'inscrits', (select count(*) from member_arts x where x.member_id = t.id),
        'valides', (select count(*) from member_arts x where x.member_id = t.id and x.valide_sem is not null),
        'valides_semaine', (select count(*) from member_arts x where x.member_id = t.id and x.valide_sem = v_week),
        'weeks', (
          select jsonb_agg(jsonb_build_object(
            'semaine', g.semaine,
            'valides', (select count(*) from member_arts x where x.member_id = t.id and x.valide_sem = g.semaine)
          ) order by g.semaine)
          from (select v_recent - 7 * s.i as semaine from generate_series(0, 7) as s (i)) g
        ),
        'dossiers_traites', (select count(*) from decisions d where d.admin_id = t.user_id),
        'dossiers_mesurables', (select count(*) from decisions d where d.admin_id = t.user_id and d.mesurable),
        'dossiers_48h', (select count(*) from decisions d where d.admin_id = t.user_id and d.rapide)
      ) order by t.ordre, t.nom, t.id), '[]'::jsonb)
      from team t
    ),
    'quality', jsonb_build_object(
      'dossiers_decides', (select count(*) from decisions d where d.mesurable),
      'dossiers_48h', (select count(*) from decisions d where d.rapide),
      'en_attente', (select count(*) from public.artisans a where a.status = 'en_verification'),
      'en_attente_48h', (
        select count(*) from public.artisans a
        where a.status = 'en_verification' and a.submitted_at < v_now - interval '48 hours'
      ),
      'fiches_completes', (select count(*) from completes),
      'valides', (select count(*) from arts a where a.status = 'valide'),
      'app_installee', (
        select count(*) from arts a
        where a.status = 'valide' and exists (select 1 from public.push_tokens pt where pt.user_id = a.user_id)
      ),
      'premier_devis_perso', (
        select count(*) from arts a
        where a.status = 'valide' and exists (
          select 1
          from public.quotes q
          join public.chantiers c on c.id = q.chantier_id
          join public.projects p on p.id = c.project_id
          where q.artisan_id = a.artisan_id and q.sent_at is not null and p.preferred_artisan_id = q.artisan_id
        )
      )
    ),
    'activity', jsonb_build_object(
      'demandes_semaine', (select count(*) from demandes d where d.sem = v_week),
      'demandes_semaine_precedente', (select count(*) from demandes d where d.sem = v_week - 7),
      'artisans_actifs', (select count(*) from par_artisan),
      'artisans_4_demandes', (select count(*) from par_artisan pa where pa.n >= 4),
      'demandes_par_artisan_mediane', coalesce(
        (select percentile_cont(0.5) within group (order by pa.n) from par_artisan pa), 0),
      'demandes_72h', (
        select count(*) from reqs r
        where not r.directe and r.created_at >= v_now - interval '30 days'
          and r.created_at < v_now - interval '72 hours'
          and not (r.status = 'annulee' and r.responded_at is null
            and r.cancelled_at < r.created_at + interval '72 hours')
      ),
      'demandes_repondues_72h', (
        select count(*) from reqs r
        where not r.directe and r.created_at >= v_now - interval '30 days'
          and r.created_at < v_now - interval '72 hours'
          and r.responded_at < r.created_at + interval '72 hours'
      ),
      'artisans_devis_envoye', (
        select count(*) from arts a
        where a.status = 'valide'
          and exists (select 1 from public.quotes q where q.artisan_id = a.artisan_id and q.sent_at is not null)
      ),
      'essais', (select count(*) from public.subscriptions s where s.status = 'trialing'),
      'essais_termines', (select count(*) from public.subscriptions s where s.trial_end < v_now),
      'abonnes_apres_essai', (
        select count(*) from public.subscriptions s where s.trial_end < v_now and s.first_paid_at is not null
      ),
      'abonnes', (select count(*) from public.subscriptions s where s.first_paid_at is not null)
    )
  ) into v_result;
  return v_result;
end;
$$;
revoke execute on function public.admin_launch_figures() from public, anon;
grant execute on function public.admin_launch_figures() to authenticated;

-- Couverture métier × commune pilote : {seuil, communes, trades, cells} (LaunchCoverage dans
-- @menao/core). Communes pilotes dans leur ordre, métiers actifs ; une case seulement si au moins
-- un artisan la couvre. Artisans au statut « valide » qui exercent le métier et couvrent la commune
-- avec le prédicat de zone de la recherche (app.match_artisans_core) SANS la zone élargie : rayon
-- autour de leur adresse de base atteignant le centre de la commune, ou commune choisie.
create function public.admin_launch_coverage()
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
    'seuil', coalesce((select s.seuil_couverture from public.launch_settings s), 3),
    'communes', (
      select coalesce(jsonb_agg(jsonb_build_object('code_insee', c.code_insee, 'nom', c.nom)
        order by c.ordre, c.nom), '[]'::jsonb)
      from public.communes c
      where c.pilote
    ),
    'trades', (
      select coalesce(jsonb_agg(jsonb_build_object('code', t.code, 'label', t.label)
        order by t.sort_order, t.label), '[]'::jsonb)
      from public.trades t
      where t.active
    ),
    'cells', (
      select coalesce(jsonb_agg(jsonb_build_object('trade', x.trade, 'code_insee', x.code_insee, 'n', x.n)
        order by x.sort_order, x.ordre, x.code_insee), '[]'::jsonb)
      from (
        select t.code as trade, t.sort_order, c.code_insee, c.ordre, count(distinct a.id) as n
        from public.artisans a
        join public.artisan_trades atr on atr.artisan_id = a.id
        join public.trades t on t.code = atr.trade_code and t.active
        join public.communes c on c.pilote and (
          (a.zone_mode = 'communes' and exists (
            select 1 from public.artisan_zones z where z.artisan_id = a.id and z.code_insee = c.code_insee
          ))
          or (a.zone_mode = 'rayon' and a.base_location is not null
            and extensions.st_dwithin(a.base_location, c.location, a.radius_km * 1000))
        )
        where a.status = 'valide'
        group by t.code, t.sort_order, c.code_insee, c.ordre
      ) x
    )
  ) into v_result;
  return v_result;
end;
$$;
revoke execute on function public.admin_launch_coverage() from public, anon;
grant execute on function public.admin_launch_coverage() to authenticated;

-- ---------------------------------------------------------------------------
-- Codes de suivi (admins, journalisé)
-- ---------------------------------------------------------------------------
-- Liste des codes, du plus récent au plus ancien : membre responsable, inscrits avec ce code et
-- validés parmi eux (première validation, comme les canaux et les membres).
create function public.admin_acquisition_codes()
returns table (
  id uuid,
  code text,
  libelle text,
  canal public.acquisition_channel,
  member_id uuid,
  member_nom text,
  active boolean,
  inscrits integer,
  valides integer,
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
  with par_code as (
    select l.code_id, count(*)::int as nb_inscrits, count(l.valide_le)::int as nb_valides
    from app.launch_artisans() l
    where l.code_id is not null
    group by l.code_id
  )
  select k.id, k.code, k.libelle, k.canal, k.member_id, m.nom, k.active,
    coalesce(pc.nb_inscrits, 0), coalesce(pc.nb_valides, 0), k.created_at
  from public.acquisition_codes k
  left join public.launch_members m on m.id = k.member_id
  left join par_code pc on pc.code_id = k.id
  order by k.created_at desc, k.code;
end;
$$;
revoke execute on function public.admin_acquisition_codes() from public, anon;
grant execute on function public.admin_acquisition_codes() to authenticated;

-- Code de suivi : création (p_id absent) ou modification du libellé, du canal, du membre et de
-- l'état. Le code est définitif : en modification, p_code vide est ignoré, sinon il doit être le
-- même. Code normalisé (minuscules, sans espaces autour), unique dans l'espace /p/<code>.
create function public.admin_save_acquisition_code(
  p_code text,
  p_libelle text,
  p_canal public.acquisition_channel,
  p_id uuid default null,
  p_member_id uuid default null,
  p_active boolean default true
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_code text := lower(btrim(coalesce(p_code, '')));
  v_libelle text := btrim(coalesce(p_libelle, ''));
  v_current text;
  v_active boolean;
  v_id uuid;
begin
  perform app.require_admin();
  if char_length(v_libelle) not between 1 and 80 then
    raise exception 'Indiquez le libellé (80 caractères au plus).' using errcode = '22023';
  end if;
  if p_canal is null then
    raise exception 'Choisissez le canal.' using errcode = '22023';
  end if;
  if p_member_id is not null and not exists (select 1 from public.launch_members m where m.id = p_member_id) then
    raise exception 'Membre introuvable.' using errcode = '22023';
  end if;

  if p_id is null then
    if v_code !~ '^[a-z0-9](?:[a-z0-9-]{1,30}[a-z0-9])$' then
      raise exception 'Code invalide : 3 à 32 caractères, minuscules, chiffres et tirets.' using errcode = '22023';
    end if;
    if app.link_code_taken(v_code) then
      raise exception 'Ce code est déjà pris.' using errcode = '22023';
    end if;
    insert into public.acquisition_codes (code, libelle, canal, member_id, active)
    values (v_code, v_libelle, p_canal, p_member_id, coalesce(p_active, true))
    returning id, active into v_id, v_active;
  else
    select k.code into v_current from public.acquisition_codes k where k.id = p_id;
    if v_current is null then
      raise exception 'Code introuvable.' using errcode = '22023';
    end if;
    -- Liens, flyers et QR codes déjà diffusés : le code ne change jamais.
    if v_code <> '' and v_code <> v_current then
      raise exception 'Un code ne change jamais : créez-en un nouveau.' using errcode = '22023';
    end if;
    v_code := v_current;
    update public.acquisition_codes k set
      libelle = v_libelle,
      canal = p_canal,
      member_id = p_member_id,
      active = coalesce(p_active, k.active)
    where k.id = p_id
    returning k.id, k.active into v_id, v_active;
  end if;
  perform app.audit('lancement.code_enregistre', 'lancement_code', v_id, jsonb_build_object(
    'creation', p_id is null, 'code', v_code, 'canal', p_canal, 'member_id', p_member_id, 'active', v_active));
  return v_id;
end;
$$;
revoke execute on function public.admin_save_acquisition_code(text, text, public.acquisition_channel, uuid, uuid, boolean)
  from public, anon;
grant execute on function public.admin_save_acquisition_code(text, text, public.acquisition_channel, uuid, uuid, boolean)
  to authenticated;

-- ---------------------------------------------------------------------------
-- Réglages (admins, journalisé)
-- ---------------------------------------------------------------------------
-- Remplacement complet : dates absentes (null) : aucune ; seuils absents : 3 artisans par case et
-- fiche complète à 100 %.
create function public.admin_save_launch_settings(
  p_debut_recrutement date default null,
  p_fin_recrutement date default null,
  p_seuil_couverture integer default null,
  p_seuil_fiche_complete integer default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_couverture int := coalesce(p_seuil_couverture, 3);
  v_fiche int := coalesce(p_seuil_fiche_complete, 100);
begin
  perform app.require_admin();
  if p_debut_recrutement not between date '2020-01-01' and date '2040-12-31'
     or p_fin_recrutement not between date '2020-01-01' and date '2040-12-31' then
    raise exception 'Indiquez des dates entre 2020 et 2040.' using errcode = '22023';
  end if;
  if p_debut_recrutement > p_fin_recrutement then
    raise exception 'Le début du recrutement doit précéder sa fin.' using errcode = '22023';
  end if;
  if v_couverture not between 1 and 20 then
    raise exception 'Seuil de couverture : entre 1 et 20 artisans.' using errcode = '22023';
  end if;
  if v_fiche not between 50 and 100 then
    raise exception 'Seuil d''une fiche complète : entre 50 et 100 %%.' using errcode = '22023';
  end if;
  insert into public.launch_settings (id, debut_recrutement, fin_recrutement, seuil_couverture,
    seuil_fiche_complete, updated_by)
  values (true, p_debut_recrutement, p_fin_recrutement, v_couverture, v_fiche, (select auth.uid()))
  on conflict (id) do update set
    debut_recrutement = excluded.debut_recrutement,
    fin_recrutement = excluded.fin_recrutement,
    seuil_couverture = excluded.seuil_couverture,
    seuil_fiche_complete = excluded.seuil_fiche_complete,
    updated_by = excluded.updated_by;
  perform app.audit('lancement.reglages', 'lancement', null, jsonb_build_object(
    'debut_recrutement', p_debut_recrutement, 'fin_recrutement', p_fin_recrutement,
    'seuil_couverture', v_couverture, 'seuil_fiche_complete', v_fiche));
end;
$$;
revoke execute on function public.admin_save_launch_settings(date, date, integer, integer) from public, anon;
grant execute on function public.admin_save_launch_settings(date, date, integer, integer) to authenticated;

-- ---------------------------------------------------------------------------
-- Import du plan : lot 1 inchangé (20261029213000_tableaux_lancement.sql), plus deux clés
-- facultatives (lot 2) :
--   "reglages": {"debut_recrutement", "fin_recrutement", "seuil_couverture", "seuil_fiche_complete"}
--     présente, elle remplace les réglages (date absente : aucune ; seuil absent : valeur par
--     défaut) ; une valeur invalide les fait ignorer en entier (settings_updated false) ;
--   "cibles": [{"indicateur", "member" (repère du membre ou null), "jour" (AAAA-MM-JJ ou null),
--     "valeur"}], 2 000 au plus, mise à jour par indicateur, membre et jour. Ligne invalide
--     (indicateur inconnu, membre inconnu, jour mal écrit ou hors de 2020-2040, valeur hors de 0 à
--     1 000 000) : ignorée et comptée dans skipped. Présente, la liste remplace toutes les cibles :
--     celles absentes du fichier (série décalée, échéance déplacée) sont retirées (targets_deleted),
--     sinon elles resteraient lues pour toujours. Clé absente : cibles en place gardées.
-- ---------------------------------------------------------------------------
create or replace function public.admin_import_launch_plan(p_plan jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_members jsonb;
  v_tasks jsonb;
  v_targets jsonb;
  v_reglages jsonb;
  v_row jsonb;
  v_ref text;
  v_id uuid;
  v_member uuid;
  v_kind public.launch_member_kind;
  v_indicateur text;
  v_jour date;
  v_valeur numeric;
  v_members_created int := 0;
  v_members_updated int := 0;
  v_tasks_created int := 0;
  v_tasks_updated int := 0;
  v_targets_created int := 0;
  v_targets_updated int := 0;
  v_targets_deleted int := 0;
  v_kept uuid[] := '{}';
  v_settings_updated boolean := false;
  v_skipped int := 0;
  v_result jsonb;
begin
  perform app.require_admin();
  if jsonb_typeof(p_plan) is distinct from 'object' or (p_plan -> 'version') is distinct from '1'::jsonb then
    raise exception 'Fichier non reconnu : version 1 attendue.' using errcode = '22023';
  end if;
  v_members := coalesce(p_plan -> 'members', '[]'::jsonb);
  v_tasks := coalesce(p_plan -> 'tasks', '[]'::jsonb);
  v_targets := coalesce(p_plan -> 'cibles', '[]'::jsonb);
  if jsonb_typeof(v_members) <> 'array' or jsonb_typeof(v_tasks) <> 'array' then
    raise exception 'Fichier non reconnu : listes des membres et des tâches attendues.' using errcode = '22023';
  end if;
  if jsonb_typeof(v_targets) <> 'array' then
    raise exception 'Fichier non reconnu : liste des cibles attendue.' using errcode = '22023';
  end if;
  if jsonb_array_length(v_members) > 50 then
    raise exception 'Trop de membres : 50 au plus.' using errcode = '22023';
  end if;
  if jsonb_array_length(v_tasks) > 2000 then
    raise exception 'Trop de tâches : 2 000 au plus.' using errcode = '22023';
  end if;
  if jsonb_array_length(v_targets) > 2000 then
    raise exception 'Trop de cibles : 2 000 au plus.' using errcode = '22023';
  end if;

  -- Membres d'abord : les tâches et les cibles s'y rattachent par leur repère.
  for v_row in select x.e from jsonb_array_elements(v_members) as x (e) loop
    begin
      v_ref := nullif(btrim(v_row ->> 'ref'), '');
      v_kind := (v_row ->> 'kind')::public.launch_member_kind;
      v_id := null;
      if v_ref is not null then
        select m.id into v_id from public.launch_members m where m.ref = v_ref;
      end if;
      if v_id is null then
        insert into public.launch_members (ref, nom, mission, kind, ordre, objectif_valides)
        values (v_ref, btrim(v_row ->> 'nom'), nullif(btrim(v_row ->> 'mission'), ''), coalesce(v_kind, 'autre'),
          coalesce((v_row ->> 'ordre')::int, 0), (v_row ->> 'objectif_valides')::int);
        v_members_created := v_members_created + 1;
      else
        update public.launch_members m set
          mission = nullif(btrim(v_row ->> 'mission'), ''),
          kind = case
            when v_kind is null then m.kind
            when m.user_id is null then v_kind
            when (v_kind = 'commercial') = exists (
              select 1 from auth.users u where u.id = m.user_id and u.raw_app_meta_data ->> 'role' = 'commercial'
            ) then v_kind
            else m.kind
          end,
          ordre = coalesce((v_row ->> 'ordre')::int, m.ordre),
          objectif_valides = (v_row ->> 'objectif_valides')::int
        where m.id = v_id;
        v_members_updated := v_members_updated + 1;
      end if;
    exception when data_exception or integrity_constraint_violation then
      v_skipped := v_skipped + 1;
    end;
  end loop;

  for v_row in select x.e from jsonb_array_elements(v_tasks) as x (e) loop
    begin
      -- Dates au format AAAA-MM-JJ seulement (jamais « today » ni « tomorrow »).
      if (v_row ->> 'debut') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
         or (v_row ->> 'echeance') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then
        raise exception 'Date invalide.' using errcode = '22023';
      end if;
      v_ref := nullif(btrim(v_row ->> 'ref'), '');
      v_member := null;
      if nullif(btrim(v_row ->> 'member'), '') is not null then
        select m.id into v_member from public.launch_members m where m.ref = btrim(v_row ->> 'member');
      end if;
      v_id := null;
      if v_ref is not null then
        select t.id into v_id from public.launch_tasks t where t.ref = v_ref;
      end if;
      if v_id is null then
        insert into public.launch_tasks (ref, member_id, titre, detail, phase, categorie, debut, echeance,
          recurrence, jalon, partage, created_by)
        values (v_ref, v_member, btrim(v_row ->> 'titre'), nullif(btrim(v_row ->> 'detail'), ''),
          coalesce((v_row ->> 'phase')::public.launch_phase, 'preparation'),
          coalesce(nullif(btrim(v_row ->> 'categorie'), ''), 'pilotage'),
          (v_row ->> 'debut')::date, (v_row ->> 'echeance')::date, nullif(btrim(v_row ->> 'recurrence'), ''),
          coalesce((v_row ->> 'jalon')::boolean, false), coalesce((v_row ->> 'partage')::boolean, false),
          (select auth.uid()));
        v_tasks_created := v_tasks_created + 1;
      else
        update public.launch_tasks t set
          member_id = v_member,
          titre = btrim(v_row ->> 'titre'),
          detail = nullif(btrim(v_row ->> 'detail'), ''),
          phase = coalesce((v_row ->> 'phase')::public.launch_phase, 'preparation'),
          categorie = coalesce(nullif(btrim(v_row ->> 'categorie'), ''), 'pilotage'),
          debut = (v_row ->> 'debut')::date,
          echeance = (v_row ->> 'echeance')::date,
          recurrence = nullif(btrim(v_row ->> 'recurrence'), ''),
          jalon = coalesce((v_row ->> 'jalon')::boolean, false),
          partage = coalesce((v_row ->> 'partage')::boolean, false)
        where t.id = v_id;
        v_tasks_updated := v_tasks_updated + 1;
      end if;
    exception when data_exception or integrity_constraint_violation then
      v_skipped := v_skipped + 1;
    end;
  end loop;

  -- Réglages des chiffres (lot 2) : seulement si la clé est présente ; tout ou rien.
  if p_plan ? 'reglages' then
    begin
      v_reglages := p_plan -> 'reglages';
      if jsonb_typeof(v_reglages) is distinct from 'object'
         or (v_reglages ->> 'debut_recrutement') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
         or (v_reglages ->> 'fin_recrutement') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then
        raise exception 'Réglages invalides.' using errcode = '22023';
      end if;
      -- Dates hors de 2020-2040, début après la fin, seuils hors bornes : contrôles de la table.
      insert into public.launch_settings (id, debut_recrutement, fin_recrutement, seuil_couverture,
        seuil_fiche_complete, updated_by)
      values (true, (v_reglages ->> 'debut_recrutement')::date, (v_reglages ->> 'fin_recrutement')::date,
        coalesce((v_reglages ->> 'seuil_couverture')::int, 3),
        coalesce((v_reglages ->> 'seuil_fiche_complete')::int, 100), (select auth.uid()))
      on conflict (id) do update set
        debut_recrutement = excluded.debut_recrutement,
        fin_recrutement = excluded.fin_recrutement,
        seuil_couverture = excluded.seuil_couverture,
        seuil_fiche_complete = excluded.seuil_fiche_complete,
        updated_by = excluded.updated_by;
      v_settings_updated := true;
    exception when data_exception or integrity_constraint_violation then
      v_settings_updated := false;
    end;
  end if;

  -- Cibles (lot 2) : mise à jour par indicateur, membre et jour (membre et jour pouvant être vides).
  for v_row in select x.e from jsonb_array_elements(v_targets) as x (e) loop
    begin
      if jsonb_typeof(v_row) is distinct from 'object'
         or (v_row ->> 'jour') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then
        raise exception 'Cible invalide.' using errcode = '22023';
      end if;
      v_member := null;
      if nullif(btrim(v_row ->> 'member'), '') is not null then
        select m.id into v_member from public.launch_members m where m.ref = btrim(v_row ->> 'member');
        -- Membre inconnu : jamais reportée sur toute l'équipe.
        if v_member is null then
          raise exception 'Membre inconnu.' using errcode = '22023';
        end if;
      end if;
      v_indicateur := v_row ->> 'indicateur';
      v_jour := (v_row ->> 'jour')::date;
      v_valeur := (v_row ->> 'valeur')::numeric;
      select t.id into v_id
      from public.launch_targets t
      where t.indicateur = v_indicateur
        and t.member_id is not distinct from v_member
        and t.jour is not distinct from v_jour;
      if v_id is null then
        insert into public.launch_targets (indicateur, member_id, jour, valeur)
        values (v_indicateur, v_member, v_jour, v_valeur)
        returning id into v_id;
        v_targets_created := v_targets_created + 1;
      else
        update public.launch_targets t set valeur = v_valeur where t.id = v_id;
        v_targets_updated := v_targets_updated + 1;
      end if;
      v_kept := v_kept || v_id;
    exception when data_exception or integrity_constraint_violation then
      v_skipped := v_skipped + 1;
    end;
  end loop;
  -- Remplacement complet : les cibles absentes du fichier sont retirées.
  if p_plan ? 'cibles' then
    delete from public.launch_targets t where t.id <> all (v_kept);
    get diagnostics v_targets_deleted = row_count;
  end if;

  v_result := jsonb_build_object(
    'members_created', v_members_created,
    'members_updated', v_members_updated,
    'tasks_created', v_tasks_created,
    'tasks_updated', v_tasks_updated,
    'targets_created', v_targets_created,
    'targets_updated', v_targets_updated,
    'targets_deleted', v_targets_deleted,
    'settings_updated', v_settings_updated,
    'skipped', v_skipped);
  perform app.audit('lancement.import', 'lancement', null, v_result);
  return v_result;
end;
$$;
revoke execute on function public.admin_import_launch_plan(jsonb) from public, anon;
grant execute on function public.admin_import_launch_plan(jsonb) to authenticated;
