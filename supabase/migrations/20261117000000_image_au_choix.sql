-- Une seule image, photo ou logo, au choix de l'artisan, et facultative (F-165, lot 64, ADR 0355).
-- L'image ne bloque plus l'envoi du dossier ; quand c'est un logo, la fiche publique l'affiche en
-- entier et il sert aussi sur les documents.

alter table public.artisans add column image_logo boolean not null default false;

comment on column public.artisans.image_logo is
  'L''image de la fiche (profiles.avatar_path) est un logo, affiché en entier (ADR 0355).';

-- Étapes manquantes : la présentation suffit pour « profil », l'image n'est plus exigée.
create or replace function app.onboarding_missing_steps(p_artisan_id uuid)
returns text[]
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  a public.artisans;
  v_missing text[] := '{}';
begin
  select * into a from public.artisans where id = p_artisan_id;
  if not found then
    return null;
  end if;

  if not (a.sirene_checked_at is not null and a.sirene_active and a.raison_sociale is not null
          and a.assujetti_tva is not null) then
    v_missing := array_append(v_missing, 'entreprise');
  end if;
  if not exists (select 1 from public.artisan_trades t where t.artisan_id = a.id) then
    v_missing := array_append(v_missing, 'metiers');
  end if;
  if not ((a.zone_mode = 'rayon' and a.base_location is not null and a.radius_km is not null)
          or (a.zone_mode = 'communes' and exists (select 1 from public.artisan_zones z where z.artisan_id = a.id))
          or (a.zone_mode = 'france' and a.base_location is not null)
          or (a.zone_mode in ('departements', 'regions') and a.base_location is not null
              and exists (select 1 from public.artisan_territories t where t.artisan_id = a.id))) then
    v_missing := array_append(v_missing, 'zone');
  end if;
  if not app.charter_signed(a.id) then
    v_missing := array_append(v_missing, 'charte');
  end if;
  if not app.documents_complete(a.id, array['en_attente', 'valide']::public.document_status[]) then
    v_missing := array_append(v_missing, 'documents');
  end if;
  -- Image facultative (ADR 0355) : la présentation suffit.
  if not (char_length(coalesce(a.presentation, '')) >= 100) then
    v_missing := array_append(v_missing, 'profil');
  end if;
  return v_missing;
end;
$$;

-- Fiche publique : dit si l'image est un logo.
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
    -- L'image est un logo, à afficher en entier (ADR 0355).
    'image_logo', a.image_logo,
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
      'communes', to_jsonb(app.artisan_zone_labels(a.id, a.zone_mode))
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
