-- Badge « Assuré et vérifié » (ADR 0119), demandé par le cahier des charges « Inscription et
-- vérification des artisans » : un seul badge, à la place de la seule mention de la décennale,
-- quand l'artisan validé a, vérifiés par l'équipe et en cours de validité : sa décennale (sauf
-- métiers déclarés non soumis, ADR 0116), sa responsabilité civile professionnelle, son
-- attestation de vigilance URSSAF, et une entreprise en activité selon l'INSEE.
-- Affiché sur la fiche publique, les résultats de recherche et les pages publiques métier/ville.

-- Document validé par l'équipe et en cours de validité (date de Paris).
create function app.artisan_document_current(p_artisan_id uuid, p_type public.document_type)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.artisan_documents d
    where d.artisan_id = p_artisan_id and d.type = p_type and d.status = 'valide'
      and d.date_fin >= (now() at time zone 'Europe/Paris')::date
  )
$$;
revoke execute on function app.artisan_document_current(uuid, public.document_type) from public, anon, authenticated;

-- Badge : artisan validé, entreprise active, décennale (ou non soumis), RC Pro et URSSAF à jour.
create function app.artisan_verified_badge(p_artisan_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select a.status = 'valide'
      and coalesce(a.sirene_active, false)
      and (a.decennale_non_soumis or app.artisan_document_current(a.id, 'decennale'))
      and app.artisan_document_current(a.id, 'rc_pro')
      and app.artisan_document_current(a.id, 'urssaf')
    from public.artisans a
    where a.id = p_artisan_id
  ), false)
$$;
revoke execute on function app.artisan_verified_badge(uuid) from public, anon, authenticated;

-- Fiche publique (même fonction qu'avant, ADR 0118) : badge, décennale non soumise, RC Pro.
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

-- Résultats de recherche (même fonction qu'avant, ADR 0105), avec le badge. Nouvelle colonne :
-- la fonction est recréée.
drop function public.match_artisans(uuid, int);
create function public.match_artisans(p_project_id uuid, p_limit int default 5)
returns table (
  artisan_id uuid,
  display_name text,
  avatar_path text,
  experience_years smallint,
  zone_mode public.zone_mode,
  zone_radius_km smallint,
  zone_city text,
  zone_communes text[],
  available_now boolean,
  available_from date,
  distance_km numeric,
  specialties jsonb,
  verified boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v public.projects;
  v_point extensions.geography;
  v_today date := (now() at time zone 'Europe/Paris')::date;
begin
  select * into v from public.projects p
  where p.id = p_project_id and (p.user_id = auth.uid() or app.is_staff());
  if not found then
    raise exception 'Projet introuvable' using errcode = '42501';
  end if;
  if v.trade_code is null or v.ville_code_insee is null then
    return;
  end if;
  v_point := coalesce(v.location, v.ville_location);

  return query
  select
    a.id,
    coalesce(pr.first_name, a.nom_commercial, a.raison_sociale),
    pr.avatar_path,
    a.experience_years,
    a.zone_mode,
    a.radius_km,
    app.base_commune(a.base_label),
    (select coalesce(array_agg(z.nom order by z.nom), '{}') from public.artisan_zones z where z.artisan_id = a.id),
    (a.available_from is null or a.available_from <= v_today),
    a.available_from,
    case when a.zone_mode = 'rayon' and v_point is not null
      then round((extensions.st_distance(a.base_location, v_point) / 1000)::numeric, 1)
    end,
    (
      select coalesce(jsonb_agg(jsonb_build_object('code', w.code, 'label', w.label) order by w.sort_order), '[]')
      from public.artisan_work_types aw
      join public.work_types w on w.code = aw.work_type_code
      where aw.artisan_id = a.id and w.trade_code = v.trade_code and w.active
    ),
    app.artisan_verified_badge(a.id)
  from public.artisans a
  left join public.profiles pr on pr.user_id = a.user_id
  cross join lateral app.artisan_charter_score(a.id) cs
  where app.artisan_is_visible(a.id)
    and not a.paused
    and not app.artisan_absent(a.id, v_today)
    and exists (select 1 from public.artisan_trades t where t.artisan_id = a.id and t.trade_code = v.trade_code)
    and (
      (a.zone_mode = 'communes' and exists (
        select 1 from public.artisan_zones z where z.artisan_id = a.id and z.code_insee = v.ville_code_insee
      ))
      or (a.zone_mode = 'rayon' and v_point is not null and a.base_location is not null
        and extensions.st_dwithin(a.base_location, v_point, a.radius_km * 1000))
    )
  order by
    cs.score desc,
    (a.available_from is null or a.available_from <= v_today) desc,
    a.available_from nulls first,
    case when a.zone_mode = 'rayon' and v_point is not null
      then extensions.st_distance(a.base_location, v_point) end nulls last,
    md5(p_project_id::text || a.id::text)
  limit least(greatest(coalesce(p_limit, 5), 1), 20);
end;
$$;
revoke execute on function public.match_artisans(uuid, int) from public, anon;
grant execute on function public.match_artisans(uuid, int) to authenticated;

-- Pages publiques métier/ville (même fonction qu'avant, F-02), avec le badge.
drop function public.public_artisans_for_commune(text, text, int);
create function public.public_artisans_for_commune(p_trade_code text, p_code_insee text, p_limit int default 12)
returns table (
  artisan_id uuid,
  display_name text,
  avatar_path text,
  experience_years smallint,
  zone_mode public.zone_mode,
  zone_radius_km smallint,
  zone_city text,
  zone_communes text[],
  available_now boolean,
  available_from date,
  specialties jsonb,
  verified boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_point extensions.geography;
  v_today date := (now() at time zone 'Europe/Paris')::date;
begin
  select c.location into v_point from public.communes c where c.code_insee = p_code_insee;
  return query
  select
    a.id,
    coalesce(pr.first_name, a.nom_commercial, a.raison_sociale),
    pr.avatar_path,
    a.experience_years,
    a.zone_mode,
    a.radius_km,
    app.base_commune(a.base_label),
    (select coalesce(array_agg(z.nom order by z.nom), '{}') from public.artisan_zones z where z.artisan_id = a.id),
    (a.available_from is null or a.available_from <= v_today),
    a.available_from,
    (
      select coalesce(jsonb_agg(jsonb_build_object('code', w.code, 'label', w.label) order by w.sort_order), '[]')
      from public.artisan_work_types aw
      join public.work_types w on w.code = aw.work_type_code
      where aw.artisan_id = a.id and w.trade_code = p_trade_code and w.active
    ),
    app.artisan_verified_badge(a.id)
  from public.artisans a
  left join public.profiles pr on pr.user_id = a.user_id
  where app.artisan_is_visible(a.id)
    and not a.paused
    and not app.artisan_absent(a.id, v_today)
    and exists (select 1 from public.artisan_trades t where t.artisan_id = a.id and t.trade_code = p_trade_code)
    and (
      (a.zone_mode = 'communes' and exists (
        select 1 from public.artisan_zones z where z.artisan_id = a.id and z.code_insee = p_code_insee
      ))
      or (a.zone_mode = 'rayon' and v_point is not null and a.base_location is not null
        and extensions.st_dwithin(a.base_location, v_point, a.radius_km * 1000))
    )
  order by
    (a.available_from is null or a.available_from <= v_today) desc,
    a.available_from nulls first,
    md5(p_trade_code || p_code_insee || a.id::text)
  limit least(greatest(coalesce(p_limit, 12), 1), 50);
end;
$$;
revoke execute on function public.public_artisans_for_commune(text, text, int) from public;
grant execute on function public.public_artisans_for_commune(text, text, int) to anon, authenticated;
