-- Demande de la zone (F-14, ADR 0182) : l'artisan qui s'inscrit voit combien de particuliers ont
-- cherché ses métiers dans sa zone ces 30 derniers jours. Des nombres seulement, jamais une
-- recherche ni un particulier.
create function public.my_zone_demand()
returns json
language sql
stable
security definer
set search_path = ''
as $$
  with artisan as (
    select a.id, a.zone_mode, a.base_location, a.radius_km
    from public.artisans a
    where a.user_id = (select auth.uid())
  ),
  searches as (
    select p.trade_code
    from public.projects p, artisan a
    where p.created_at >= now() - interval '30 days'
      and p.trade_code in (select t.trade_code from public.artisan_trades t where t.artisan_id = a.id)
      and (
        (a.zone_mode = 'rayon' and a.base_location is not null and a.radius_km is not null
          and extensions.st_dwithin(
            coalesce(p.location, p.ville_location), a.base_location, a.radius_km * 1000
          ))
        or (a.zone_mode = 'communes' and p.ville_code_insee in (
          select z.code_insee from public.artisan_zones z where z.artisan_id = a.id
        ))
      )
  )
  select json_build_object(
    'jours', 30,
    'recherches', (select count(*) from searches),
    'metiers', (
      select coalesce(json_agg(json_build_object('metier', m.trade_code, 'recherches', m.n)
        order by m.n desc, m.trade_code), '[]'::json)
      from (select s.trade_code, count(*) as n from searches s group by s.trade_code) m
    )
  )
$$;

revoke execute on function public.my_zone_demand() from public, anon;
grant execute on function public.my_zone_demand() to authenticated;
