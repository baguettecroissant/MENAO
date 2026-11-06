-- Secrétaire dédiée (ADR 0232) : la zone annoncée tient compte des zones par territoire (ADR 0213)
-- : départements, régions ou toute la France, en plus du rayon et de la liste de communes.

create or replace function public.voice_secretary_context(p_artisan_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'artisan_id', a.id,
    'entreprise', coalesce(s.display_name, a.nom_commercial, a.raison_sociale),
    'metiers', coalesce((
      select string_agg(t.label, ', ' order by t.sort_order)
      from public.artisan_trades at join public.trades t on t.code = at.trade_code
      where at.artisan_id = a.id
    ), ''),
    'zone', case
      when a.zone_mode = 'rayon' then concat(
        'dans un rayon de ', a.radius_km, ' kilomètres autour de ',
        coalesce(substring(a.base_label from '[0-9]{5}\s+(.+)$'), 'son adresse'))
      when a.zone_mode = 'france' then 'dans toute la France'
      when a.zone_mode = 'departements' then coalesce('dans les départements suivants : ' || (
        select string_agg(d.nom, ', ' order by d.nom)
        from public.artisan_territories t join public.departements d on d.code = t.departement_code
        where t.artisan_id = a.id
      ), '')
      when a.zone_mode = 'regions' then coalesce('dans les régions suivantes : ' || (
        select string_agg(r.nom, ', ' order by r.nom)
        from public.artisan_territories t join public.regions r on r.code = t.region_code
        where t.artisan_id = a.id
      ), '')
      else coalesce((
        select string_agg(z.nom, ', ' order by z.nom) from public.artisan_zones z where z.artisan_id = a.id
      ), '')
    end,
    'horaires', coalesce((
      select jsonb_agg(jsonb_build_object('jour', h.weekday, 'debut', to_char(h.start_time, 'HH24:MI'),
        'fin', to_char(h.end_time, 'HH24:MI')) order by h.weekday, h.start_time)
      from public.artisan_hours h where h.artisan_id = a.id
    ), '[]'::jsonb),
    'consignes', s.instructions,
    'rendez_vous', coalesce(s.can_book, true),
    'duree_visite', coalesce(s.visit_minutes, 60),
    'droits', app.artisan_agents(a.id)
  )
  from public.artisans a
  left join public.secretary_settings s on s.artisan_id = a.id
  where a.id = p_artisan_id and a.status = 'valide'
$$;
