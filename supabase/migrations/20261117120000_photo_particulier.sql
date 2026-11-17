-- Photo de profil du particulier (F-169, ADR 0360) : facultative, déposée depuis « Mon compte »
-- (process-upload, usage « avatar », déjà ouvert à tout compte). L'artisan la voit dans la
-- messagerie (conversation_list, depuis la migration 20261010152143) et, ici, sur la fiche d'une
-- demande acceptée et de son chantier (artisan_chantier_detail reprend artisan_request_detail).
-- Comme le nom de famille, le téléphone et l'e-mail : jamais avant l'acceptation.

create or replace function public.artisan_request_detail(p_request_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', r.id,
    'status', r.status,
    'created_at', r.created_at,
    'expires_at', r.expires_at,
    'refusal_reason', r.refusal_reason,
    'callback_mode', r.callback_mode,
    'callback_from', to_char(r.callback_from, 'HH24:MI'),
    'callback_to', to_char(r.callback_to, 'HH24:MI'),
    'message', case when r.status = 'acceptee' then r.message else app.scrub_contacts(r.message) end,
    'description', case when r.status = 'acceptee' then p.description else app.scrub_contacts(p.description) end,
    'summary', app.scrub_contacts(p.summary),
    -- Demande reformulée par l'IA et budget approximatif (ADR 0163).
    'artisan_brief', app.scrub_contacts(p.artisan_brief),
    'budget', p.budget,
    -- Demande venue de la zone élargie (ADR 0165).
    'hors_zone', r.hors_zone,
    -- Autres métiers du même chantier (ADR 0167), sans les artisans contactés.
    'autres_metiers', (
      select coalesce(jsonb_agg(tg.label order by tg.sort_order), '[]')
      from public.projects g
      join public.trades tg on tg.code = g.trade_code
      where coalesce(g.parent_project_id, g.id) = coalesce(p.parent_project_id, p.id) and g.id <> p.id
    ),
    'trade', t.label,
    'lieu_type', p.lieu_type,
    'surface', p.surface,
    'rooms', (select coalesce(jsonb_agg(ro.label order by ro.sort_order), '[]') from public.rooms ro where ro.code = any (p.room_codes)),
    'work_types', (select coalesce(jsonb_agg(w.label order by w.sort_order), '[]') from public.work_types w where w.code = any (p.work_type_codes)),
    'urgence', p.urgence,
    'date_mode', p.date_mode,
    'date_souhaitee', p.date_souhaitee,
    'ville_nom', p.ville_nom,
    'code_postal', p.code_postal,
    -- Adresse exacte et coordonnées : après acceptation seulement.
    'adresse', case when r.status = 'acceptee' then p.adresse end,
    'lat', case when r.status = 'acceptee' then extensions.st_y(coalesce(p.location, p.ville_location)::extensions.geometry) end,
    'lon', case when r.status = 'acceptee' then extensions.st_x(coalesce(p.location, p.ville_location)::extensions.geometry) end,
    'photos', (select coalesce(jsonb_agg(ph.storage_path order by ph.sort_order, ph.created_at), '[]') from public.project_photos ph where ph.project_id = p.id),
    'client', jsonb_build_object(
      'first_name', cp.first_name,
      'last_name', case when r.status = 'acceptee' then cp.last_name end,
      'phone', case when r.status = 'acceptee' then r.contact_phone end,
      'email', case when r.status = 'acceptee' then u.email::text end,
      -- Photo de profil du particulier (ADR 0360) : comme ses coordonnées, après acceptation.
      'avatar_path', case when r.status = 'acceptee' then cp.avatar_path end
    ),
    'chantier_id', (select ch.id from public.chantiers ch where ch.request_id = r.id)
  )
  from public.requests r
  join public.projects p on p.id = r.project_id
  left join public.trades t on t.code = p.trade_code
  left join public.profiles cp on cp.user_id = r.particulier_id
  left join auth.users u on u.id = r.particulier_id
  where r.id = p_request_id and r.artisan_id = app.my_artisan_id() and r.status <> 'a_verifier'
$$;
