-- Carte du marché (ADR 0214) : la couverture d'une commune compte tous les modes de zone (rayon,
-- communes, départements, régions, France) et distingue les zones région et France, qui passent
-- après les artisans de proximité. Les communes ou territoires de chaque artisan sont renvoyés pour
-- être lus sur la carte. Mêmes droits qu'avant (ADR 0181) : réservé aux administrateurs.
create or replace function public.admin_market(p_days integer default 90)
returns json
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_days integer := least(greatest(coalesce(p_days, 90), 7), 730);
begin
  perform app.require_admin();
  return json_build_object(
    'jours', v_days,
    -- Un point par artisan : son adresse de base, sinon la première commune de sa zone, sinon
    -- son siège, quand la commune est connue. Les comptes radiés ne sont pas montrés.
    'artisans', (
      select coalesce(json_agg(json_build_object(
        'id', a.id,
        'nom', coalesce(a.nom_commercial, a.raison_sociale),
        'statut', a.status,
        'metiers', coalesce(
          (select json_agg(t.trade_code order by t.trade_code)
           from public.artisan_trades t where t.artisan_id = a.id),
          '[]'::json
        ),
        'lon', extensions.st_x(p.point::extensions.geometry),
        'lat', extensions.st_y(p.point::extensions.geometry),
        'rayon_km', case when a.zone_mode = 'rayon' then a.radius_km end,
        'zone_labels', case
          when a.zone_mode = 'rayon' then '{}'::text[]
          else app.artisan_zone_labels(a.id, a.zone_mode)
        end,
        'commune', coalesce(a.base_label, a.adresse_commune),
        'inscrit_le', a.created_at,
        'valide_le', (
          select min(r.created_at) from public.artisan_reviews r
          where r.artisan_id = a.id and r.decision = 'valide'
        )
      ) order by a.created_at), '[]'::json)
      from public.artisans a
      cross join lateral (
        select coalesce(
          a.base_location,
          (select c.location from public.artisan_zones z
           join public.communes c on c.code_insee = z.code_insee
           where z.artisan_id = a.id order by z.created_at limit 1),
          (select c.location from public.communes c where c.code_insee = a.adresse_code_insee)
        ) as point
      ) p
      where a.status <> 'radie'
    ),
    -- Recherches de la période par commune et par métier, placées au centre de la commune
    -- (référentiel, sinon position de commune enregistrée avec la recherche).
    'demande', (
      select coalesce(json_agg(json_build_object(
        'code_insee', d.code_insee,
        'ville', coalesce(c.nom, d.ville),
        'metier', d.metier,
        'lon', coalesce(extensions.st_x(c.location::extensions.geometry), d.lon),
        'lat', coalesce(extensions.st_y(c.location::extensions.geometry), d.lat),
        'recherches', d.recherches,
        'resultats', d.resultats,
        'demandes', d.demandes,
        'couverture', cov.total,
        'couverture_large', cov.larges
      ) order by d.recherches desc, d.code_insee), '[]'::json)
      from (
        select p.ville_code_insee as code_insee, max(p.ville_nom) as ville, p.trade_code as metier,
          max(extensions.st_x(p.ville_location::extensions.geometry)) as lon,
          max(extensions.st_y(p.ville_location::extensions.geometry)) as lat,
          count(*) as recherches,
          count(*) filter (where p.status <> 'brouillon') as resultats,
          count(*) filter (
            where exists (select 1 from public.requests r where r.project_id = p.id)
          ) as demandes
        from public.projects p
        where p.created_at >= now() - make_interval(days => v_days)
          and p.ville_code_insee is not null
        group by p.ville_code_insee, p.trade_code
      ) d
      left join public.communes c on c.code_insee = d.code_insee
      -- Artisans validés du métier qui couvrent la commune, comme admin_launch_coverage : la
      -- commune choisie, le rayon ou le territoire (ADR 0213).
      cross join lateral (
        select count(*) as total,
          count(*) filter (where a.zone_mode in ('regions', 'france')) as larges
        from public.artisans a
        where a.status = 'valide'
          and (d.metier is null or exists (
            select 1 from public.artisan_trades t
            where t.artisan_id = a.id and t.trade_code = d.metier
          ))
          and (
            (a.zone_mode = 'communes' and exists (
              select 1 from public.artisan_zones z
              where z.artisan_id = a.id and z.code_insee = d.code_insee
            ))
            or (a.zone_mode = 'rayon' and a.base_location is not null and extensions.st_dwithin(
              a.base_location,
              coalesce(
                c.location,
                extensions.st_setsrid(extensions.st_makepoint(d.lon, d.lat), 4326)::extensions.geography
              ),
              a.radius_km * 1000
            ))
            or app.artisan_couvre_territoire(a.id, a.zone_mode, d.code_insee)
          )
      ) cov
    ),
    'sans_commune', (
      select count(*) from public.projects p
      where p.created_at >= now() - make_interval(days => v_days) and p.ville_code_insee is null
    )
  );
end;
$$;
