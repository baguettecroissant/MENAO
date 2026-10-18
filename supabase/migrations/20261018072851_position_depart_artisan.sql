-- Aperçu de la zone d'intervention sur l'écran « Zone » (ADR 0127) : l'artisan relit les
-- coordonnées de sa propre adresse de départ, enregistrée en geography (illisible telle quelle
-- côté client). Aucune ligne si la zone est une liste de communes. Jamais celles d'un autre artisan.
create function public.my_artisan_base_point()
returns table (lon double precision, lat double precision)
language sql
stable
security definer
set search_path = ''
as $$
  select extensions.st_x(a.base_location::extensions.geometry),
         extensions.st_y(a.base_location::extensions.geometry)
  from public.artisans a
  where a.id = app.my_artisan_id() and a.base_location is not null
$$;

revoke execute on function public.my_artisan_base_point() from public, anon;
grant execute on function public.my_artisan_base_point() to authenticated;
