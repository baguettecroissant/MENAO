-- Classement des artisans proposés (ADR 0151, modifie l'ADR 0105) :
-- 1. les artisans disponibles tout de suite passent avant les autres, puis le score de la charte ;
-- 2. une place réservée aux nouveaux artisans : si aucun ne figure parmi les 5 premiers, l'un
--    d'eux (disponible d'abord, puis tiré au sort pour le projet) prend la 3e place.
-- Mêmes règles dans packages/core/src/matching.ts (NEWCOMER, rankCandidates), testées.

-- ---------------------------------------------------------------------------
-- Nouvel artisan : moins de 90 jours depuis la validation du dossier, ou moins de 3 chantiers
-- menés à terme (réceptionnés ou clôturés). Sans validation enregistrée, il est nouveau.
-- ---------------------------------------------------------------------------
create function app.artisan_is_newcomer(p_artisan uuid)
returns boolean
language sql
stable
set search_path = ''
as $$
  select
    coalesce(
      (select min(v.created_at) from public.artisan_reviews v
       where v.artisan_id = p_artisan and v.decision = 'valide'),
      now()
    ) > now() - interval '90 days'
    or (
      select count(*) from public.chantiers c
      where c.artisan_id = p_artisan and c.status in ('receptionne', 'cloture')
    ) < 3
$$;
revoke execute on function app.artisan_is_newcomer(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Artisans proposés pour un projet : mêmes colonnes et mêmes filtres, nouvel ordre.
-- ---------------------------------------------------------------------------
create or replace function public.match_artisans(p_project_id uuid, p_limit int default 5)
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
  with candidats as (
    select
      a.id,
      coalesce(pr.first_name, a.nom_commercial, a.raison_sociale) as nom,
      pr.avatar_path as avatar,
      a.experience_years as experience,
      a.zone_mode as mode,
      a.radius_km as rayon,
      app.base_commune(a.base_label) as commune,
      (select coalesce(array_agg(z.nom order by z.nom), '{}') from public.artisan_zones z where z.artisan_id = a.id)
        as communes,
      (a.available_from is null or a.available_from <= v_today) as dispo,
      a.available_from as dispo_le,
      case when a.zone_mode = 'rayon' and v_point is not null
        then extensions.st_distance(a.base_location, v_point) end as distance_m,
      (
        select coalesce(jsonb_agg(jsonb_build_object('code', w.code, 'label', w.label) order by w.sort_order), '[]')
        from public.artisan_work_types aw
        join public.work_types w on w.code = aw.work_type_code
        where aw.artisan_id = a.id and w.trade_code = v.trade_code and w.active
      ) as specialites,
      app.artisan_verified_badge(a.id) as verifie,
      cs.score,
      app.artisan_is_newcomer(a.id) as nouveau,
      md5(p_project_id::text || a.id::text) as tirage
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
  ),
  -- Ordre au mérite : disponibles tout de suite d'abord, puis score, date de disponibilité,
  -- distance et tirage propre au projet.
  merite as (
    select c.*, row_number() over (
      order by c.dispo desc, c.score desc, c.dispo_le nulls first, c.distance_m nulls last, c.tirage
    ) as rang
    from candidats c
  ),
  -- Place réservée (MAX_SEARCH_RESULTS = 5, NEWCOMER.position = 3) : seulement si aucun nouveau
  -- n'est déjà parmi les 5 premiers.
  place as (
    select m.id from merite m
    where m.nouveau and m.rang > 5
      and not exists (select 1 from merite x where x.nouveau and x.rang <= 5)
    order by m.dispo desc, m.tirage
    limit 1
  )
  select
    m.id, m.nom, m.avatar, m.experience, m.mode, m.rayon, m.commune, m.communes, m.dispo, m.dispo_le,
    round((m.distance_m / 1000)::numeric, 1), m.specialites, m.verifie
  from merite m
  order by case when m.id = (select p.id from place p) then 2.5 else m.rang end
  limit least(greatest(coalesce(p_limit, 5), 1), 20);
end;
$$;
revoke execute on function public.match_artisans(uuid, int) from public, anon;
grant execute on function public.match_artisans(uuid, int) to authenticated;
