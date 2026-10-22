-- Réseau du parrain (lot 6 du plan V1.1, ADR 0161, d'après « Programme de parrainage ») :
-- - fiche : « Artisans partenaires » (filleuls visibles) et « Recommandé par » (parrain visible) ;
-- - suivi de chaque filleul dans l'espace du parrain (`my_referrals`) ;
-- - proposition de parrainer un confrère (notification « parrainage_suggestion », rappel
--   facultatif) au premier devis signé, au premier paiement de l'abonnement (début du 3e mois,
--   après les 2 mois d'essai) et à chaque avis 5 étoiles ; une au plus tous les 7 jours.
-- Mêmes valeurs dans packages/core/src/referral.ts.

-- ---------------------------------------------------------------------------
-- Fiche : artisans partenaires et « Recommandé par »
-- ---------------------------------------------------------------------------
create or replace function app.artisan_profile_json(p_artisan_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', a.id,
    'display_name', coalesce(pr.first_name, a.nom_commercial, a.raison_sociale),
    'company_name', coalesce(a.nom_commercial, a.raison_sociale),
    'avatar_path', pr.avatar_path,
    'experience_years', a.experience_years,
    -- Score MENAO sur 100 et ses critères (ADR 0155), diplôme déclaré, avis Google vérifiés.
    'menao_score', (
      select jsonb_build_object('score', s.score, 'verifie', s.verifie, 'experience', s.experience,
        'diplomes', s.diplomes, 'profil', s.profil, 'reactivite', s.reactivite, 'avis', s.avis)
      from app.artisan_menao_score(a.id) s
    ),
    'diplome', a.diplome_metier,
    'google', case when a.google_checked_at is not null then jsonb_build_object(
      'rating', a.google_rating, 'count', a.google_review_count, 'url', a.google_url) end,
    'presentation', a.presentation,
    'paused', a.paused or app.artisan_absent(a.id, (now() at time zone 'Europe/Paris')::date),
    -- Temps de réponse moyen (F-10), publié à partir de 3 réponses.
    'response_minutes', (
      select s.minutes from app.artisan_response_stats(a.id) s where s.responses >= 3
    ),
    'available_from', a.available_from,
    'zone', jsonb_build_object(
      'mode', a.zone_mode,
      'radius_km', a.radius_km,
      'city', app.base_commune(a.base_label),
      'communes', (select coalesce(jsonb_agg(z.nom order by z.nom), '[]') from public.artisan_zones z where z.artisan_id = a.id)
    ),
    'trades', (
      select coalesce(jsonb_agg(jsonb_build_object('code', t.code, 'label', t.label) order by t.sort_order), '[]')
      from public.artisan_trades at join public.trades t on t.code = at.trade_code
      where at.artisan_id = a.id
    ),
    'work_types', (
      select coalesce(jsonb_agg(jsonb_build_object('code', w.code, 'label', w.label, 'trade', w.trade_code) order by w.sort_order), '[]')
      from public.artisan_work_types aw join public.work_types w on w.code = aw.work_type_code
      where aw.artisan_id = a.id and w.active
    ),
    -- Badge « Assuré et vérifié » (ADR 0119).
    'verified', app.artisan_verified_badge(a.id),
    'decennale_exempt', a.decennale_non_soumis,
    'decennale', (
      select jsonb_build_object('valid_until', d.date_fin, 'insurer', d.assureur)
      from public.artisan_documents d
      where d.artisan_id = a.id and d.type = 'decennale' and d.status = 'valide'
      order by d.date_fin desc nulls last limit 1
    ),
    'rc_pro', (
      select jsonb_build_object('valid_until', d.date_fin, 'insurer', d.assureur)
      from public.artisan_documents d
      where d.artisan_id = a.id and d.type = 'rc_pro' and d.status = 'valide'
      order by d.date_fin desc nulls last limit 1
    ),
    'certifications', (
      select coalesce(jsonb_agg(jsonb_build_object('type', c.type, 'numero', c.numero, 'valid_until', c.date_fin) order by c.type), '[]')
      from public.certifications c
      where c.artisan_id = a.id and c.verified_at is not null
        and c.date_fin >= (now() at time zone 'Europe/Paris')::date
    ),
    -- Domaines RGE lus dans l'annuaire officiel (ADR 0118), encore valides, sans doublon.
    'rge', (
      select coalesce(jsonb_agg(jsonb_build_object('domain', q.domaine, 'category', q.meta_domaine, 'valid_until', q.date_fin) order by q.domaine), '[]')
      from (
        select distinct on (r.domaine) r.domaine, r.meta_domaine, r.date_fin
        from public.artisan_rge_qualifications r
        where r.artisan_id = a.id and r.date_fin >= (now() at time zone 'Europe/Paris')::date
        order by r.domaine, r.date_fin desc
      ) q
    ),
    'photos', (
      select coalesce(jsonb_agg(p.storage_path order by p.sort_order, p.created_at), '[]')
      from public.artisan_photos p where p.artisan_id = a.id
    ),
    -- Réseau du parrainage (ADR 0161) : filleuls visibles (« Artisans partenaires », 6 au plus) et
    -- parrain visible (« Recommandé par »), sous leur nom public.
    'partners', (
      select coalesce(jsonb_agg(jsonb_build_object('id', f.id, 'name', f.name, 'trade', f.trade, 'slug', f.slug)
        order by f.created_at), '[]')
      from (
        select fa.id, fa.slug, r.created_at,
          coalesce(app.artisan_public_name(fa.nom_commercial, fa.raison_sociale, fa.sirene_partial),
            nullif(btrim(fp.first_name), ''), 'Artisan') as name,
          (select t.label from public.artisan_trades at join public.trades t on t.code = at.trade_code
           where at.artisan_id = fa.id order by t.sort_order limit 1) as trade
        from public.artisan_referrals r
        join public.artisans fa on fa.id = r.referred_artisan_id
        left join public.profiles fp on fp.user_id = fa.user_id
        -- 6 : REFERRAL_PARTNERS_SHOWN (@menao/core).
        where r.referrer_artisan_id = a.id and r.status <> 'annule' and app.artisan_is_visible(fa.id)
        order by r.created_at
        limit 6
      ) f
    ),
    'recommended_by', (
      select jsonb_build_object('id', pa.id, 'slug', pa.slug,
        'name', coalesce(app.artisan_public_name(pa.nom_commercial, pa.raison_sociale, pa.sirene_partial),
          nullif(btrim(pp.first_name), ''), 'Artisan'))
      from public.artisan_referrals r
      join public.artisans pa on pa.id = r.referrer_artisan_id
      left join public.profiles pp on pp.user_id = pa.user_id
      where r.referred_artisan_id = a.id and r.status <> 'annule' and app.artisan_is_visible(pa.id)
    ),
    'score', (
      select jsonb_build_object(
        'review_count', s.review_count,
        'quality', s.quality,
        'delays', s.delays,
        'communication', s.communication,
        'value_for_money', s.value_for_money,
        'global', s.global_score
      )
      from public.artisan_scores s where s.artisan_id = a.id
    )
  )
  from public.artisans a
  left join public.profiles pr on pr.user_id = a.user_id
  where a.id = p_artisan_id
$$;

-- ---------------------------------------------------------------------------
-- Suivi de chaque filleul
-- ---------------------------------------------------------------------------
-- Filleuls de l'artisan connecté, les plus récents d'abord : nom (public, sinon prénom et nom),
-- date d'inscription et étape (REFERRAL_STEPS) : inscription en cours, dossier validé, abonné
-- (parrainage récompensé) ou non retenu.
create function public.my_referrals()
returns table (id uuid, nom text, created_at timestamptz, etape text)
language sql
stable
security definer
set search_path = ''
as $$
  select r.id,
    coalesce(app.artisan_public_name(f.nom_commercial, f.raison_sociale, f.sirene_partial),
      nullif(btrim(concat_ws(' ', p.first_name, p.last_name)), ''), 'Artisan'),
    r.created_at,
    case
      when r.status = 'annule' or f.status in ('refuse', 'radie') then 'annule'
      when r.status = 'recompense' then 'abonne'
      when f.status in ('valide', 'suspendu') then 'valide'
      else 'inscription'
    end
  from public.artisan_referrals r
  join public.artisans f on f.id = r.referred_artisan_id
  left join public.profiles p on p.user_id = f.user_id
  where r.referrer_artisan_id = app.my_artisan_id()
  order by r.created_at desc, r.id
$$;
revoke execute on function public.my_referrals() from public, anon;
grant execute on function public.my_referrals() to authenticated;

-- ---------------------------------------------------------------------------
-- Propositions de parrainer
-- ---------------------------------------------------------------------------
create or replace function app.notification_category(p_type public.notification_type)
returns text
language sql
immutable
set search_path = ''
as $$
  select case p_type
    when 'chantier_nouveautes' then 'activite'
    when 'nouveaux_messages' then 'activite'
    when 'rdv_rappel' then 'rappels'
    when 'avis_relance' then 'rappels'
    when 'levee_relance' then 'rappels'
    when 'acompte_relance' then 'rappels'
    when 'planning_relance' then 'rappels'
    when 'inscription_relance' then 'rappels'
    when 'parrainage_suggestion' then 'rappels'
    else 'transactionnel'
  end
$$;
revoke execute on function app.notification_category(public.notification_type) from public, anon, authenticated;

-- Artisans validés seulement ; au plus une proposition tous les 7 jours
-- (REFERRAL_SUGGESTION_COOLDOWN_DAYS), quel que soit le moment.
create function app.suggest_referral(p_artisan_id uuid, p_moment text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid;
begin
  select a.user_id into v_user from public.artisans a where a.id = p_artisan_id and a.status = 'valide';
  if v_user is null or exists (
    select 1 from public.notifications n
    where n.user_id = v_user and n.type = 'parrainage_suggestion' and n.created_at > now() - interval '7 days'
  ) then
    return;
  end if;
  perform app.notify(v_user, 'parrainage_suggestion', jsonb_build_object('moment', p_moment));
end;
$$;
revoke execute on function app.suggest_referral(uuid, text) from public, anon, authenticated;

-- Premier devis signé de l'artisan.
create function app.referral_suggestion_on_signature()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.quotes q
    where q.artisan_id = new.artisan_id and q.signed_at is not null and q.id <> new.id
  ) then
    perform app.suggest_referral(new.artisan_id, 'premier_chantier');
  end if;
  return null;
end;
$$;
revoke execute on function app.referral_suggestion_on_signature() from public, anon, authenticated;
create trigger quotes_referral_suggestion after update of signed_at on public.quotes
  for each row when (old.signed_at is null and new.signed_at is not null)
  execute function app.referral_suggestion_on_signature();

-- Premier paiement de l'abonnement : début du 3e mois, après les 2 mois d'essai.
create function app.referral_suggestion_on_first_payment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform app.suggest_referral(new.artisan_id, 'trois_mois');
  return null;
end;
$$;
revoke execute on function app.referral_suggestion_on_first_payment() from public, anon, authenticated;
create trigger subscriptions_referral_suggestion after update of first_paid_at on public.subscriptions
  for each row when (old.first_paid_at is null and new.first_paid_at is not null)
  execute function app.referral_suggestion_on_first_payment();

-- Avis publié à 5 étoiles : note d'au moins 90 sur 100 (`reviewStars`, @menao/core).
create function app.referral_suggestion_on_review()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Déjà publié : pas de nouvel avis.
  if tg_op = 'UPDATE' then
    if old.status = 'publie' then
      return null;
    end if;
  end if;
  perform app.suggest_referral(new.artisan_id, 'avis_5_etoiles');
  return null;
end;
$$;
revoke execute on function app.referral_suggestion_on_review() from public, anon, authenticated;
create trigger reviews_referral_suggestion after insert or update of status on public.reviews
  for each row when (new.status = 'publie' and new.score >= 90)
  execute function app.referral_suggestion_on_review();
