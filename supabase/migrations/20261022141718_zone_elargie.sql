-- Zone élargie (lot 1 du plan V1.1, reporté par l'ADR 0156 ; ADR 0165) : quand plus aucun artisan
-- de la zone n'est disponible pour un projet, le particulier peut contacter des artisans un peu plus
-- loin, jusqu'à 20 km au-delà de leur zone. `match_artisans` les renvoie après ceux de la zone,
-- signalés `hors_zone` ; l'interface ne les montre qu'en dernier recours. La demande est notée
-- « hors zone » pour l'artisan, qui peut la décliner sans pénalité (motif « hors zone »).
-- Même valeur dans packages/core/src/matching.ts (ZONE_WIDENING_KM).

alter table public.requests add column hors_zone boolean not null default false;

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
  verified boolean,
  menao_score smallint,
  hors_zone boolean
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
      ms.score,
      app.artisan_is_newcomer(a.id) as nouveau,
      md5(p_project_id::text || a.id::text) as tirage,
      (
        (a.zone_mode = 'communes' and exists (
          select 1 from public.artisan_zones z where z.artisan_id = a.id and z.code_insee = v.ville_code_insee
        ))
        or (a.zone_mode = 'rayon' and v_point is not null and a.base_location is not null
          and extensions.st_dwithin(a.base_location, v_point, a.radius_km * 1000))
      ) as en_zone,
      case when v_point is not null and a.base_location is not null
        then extensions.st_distance(a.base_location, v_point) end as distance_base
    from public.artisans a
    left join public.profiles pr on pr.user_id = a.user_id
    cross join lateral app.artisan_menao_score(a.id) ms
    where app.artisan_is_visible(a.id)
      and not a.paused
      and not app.artisan_absent(a.id, v_today)
      -- Budget minimum de l'artisan (ADR 0164) : seulement si la demande annonce un budget.
      and (v.budget is null or a.budget_minimum is null or v.budget >= a.budget_minimum)
      and exists (select 1 from public.artisan_trades t where t.artisan_id = a.id and t.trade_code = v.trade_code)
      and (
        (a.zone_mode = 'communes' and exists (
          select 1 from public.artisan_zones z where z.artisan_id = a.id and z.code_insee = v.ville_code_insee
        ))
        or (a.zone_mode = 'rayon' and v_point is not null and a.base_location is not null
          and extensions.st_dwithin(a.base_location, v_point, a.radius_km * 1000))
        -- Zone élargie (ADR 0165) : jusqu'à 20 km au-delà de sa zone (ZONE_WIDENING_KM).
        or (v_point is not null and a.base_location is not null
          and extensions.st_dwithin(a.base_location, v_point,
            ((case when a.zone_mode = 'rayon' then coalesce(a.radius_km, 0) else 0 end) + 20) * 1000))
      )
  ),
  -- Ordre au mérite : disponibles tout de suite d'abord, puis Score MENAO (ADR 0155), date de
  -- disponibilité, distance et tirage propre au projet.
  merite as (
    select c.*, row_number() over (
      order by c.dispo desc, c.score desc, c.dispo_le nulls first, c.distance_m nulls last, c.tirage
    ) as rang
    from candidats c
    where c.en_zone
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
  -- Hors de leur zone : après tous ceux de la zone, les plus proches d'abord.
  proches as (
    select c.*, row_number() over (
      order by c.distance_base, c.dispo desc, c.score desc, c.tirage
    ) as rang
    from candidats c
    where not c.en_zone
  ),
  liste as (
    select m.id, m.nom, m.avatar, m.experience, m.mode, m.rayon, m.commune, m.communes, m.dispo,
      m.dispo_le, round((m.distance_m / 1000)::numeric, 1) as km, m.specialites, m.verifie, m.score,
      false as hz, (case when m.id = (select p.id from place p) then 2.5 else m.rang end)::numeric as ordre
    from merite m
    union all
    select x.id, x.nom, x.avatar, x.experience, x.mode, x.rayon, x.commune, x.communes, x.dispo,
      x.dispo_le, round((x.distance_base / 1000)::numeric, 1), x.specialites, x.verifie, x.score,
      true, (1000000 + x.rang)::numeric
    from proches x
  )
  select l.id, l.nom, l.avatar, l.experience, l.mode, l.rayon, l.commune, l.communes, l.dispo, l.dispo_le,
    l.km, l.specialites, l.verifie, l.score, l.hz
  from liste l
  order by l.ordre
  limit least(greatest(coalesce(p_limit, 5), 1), 20);
end;
$$;
revoke execute on function public.match_artisans(uuid, int) from public, anon;
grant execute on function public.match_artisans(uuid, int) to authenticated;

-- Envoi des demandes : artisans de la zone ou de la zone élargie, ces derniers notés.
create or replace function public.send_project_requests(
  p_project_id uuid,
  p_artisan_ids uuid[],
  p_message text,
  p_phone text,
  p_callback_mode public.callback_mode,
  p_callback_from time,
  p_callback_to time
)
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_matched uuid[];
  v_outside uuid[];
  v_ids uuid[] := (select coalesce(array_agg(distinct x), '{}') from unnest(p_artisan_ids) x);
  v_active int;
  v_status public.project_status;
  v_motifs text[];
  v_suspects uuid[];
  v_email text;
  v_ticket uuid;
begin
  -- Compte particulier confirmé (F-08 : e-mail vérifié avant l'envoi d'une demande).
  if app.jwt_role() is distinct from 'particulier' or not exists (
    select 1 from auth.users where id = auth.uid() and not is_anonymous and email_confirmed_at is not null
  ) then
    raise exception 'Compte particulier confirmé requis' using errcode = '42501';
  end if;
  select status into v_status from public.projects where id = p_project_id and user_id = auth.uid();
  if not found then
    raise exception 'Projet introuvable' using errcode = '42501';
  end if;
  if v_status not in ('criteres_valides', 'demande_envoyee') then
    raise exception 'Validez d''abord vos critères de recherche' using errcode = '22023';
  end if;
  if cardinality(v_ids) = 0 then
    raise exception 'Sélectionnez au moins un artisan' using errcode = '22023';
  end if;
  select count(*) into v_active from public.requests
  where project_id = p_project_id and status in ('envoyee', 'acceptee', 'a_verifier');
  if v_active + cardinality(v_ids) > 3 then
    raise exception 'Vous pouvez contacter 3 artisans au plus pour ce projet' using errcode = '22023';
  end if;
  -- Collecteurs de devis (ADR 0157) : 2 projets en cours tant qu'aucun chantier n'est concrétisé.
  if not app.particulier_has_concretized(auth.uid())
     and app.particulier_open_projects(auth.uid(), p_project_id) >= 2 then
    raise exception 'Vous avez déjà 2 projets en attente de réponse. Vous pourrez en lancer un nouveau dès qu''un artisan vous aura répondu, ou après avoir annulé une demande.'
      using errcode = '22023';
  end if;
  if exists (select 1 from public.requests where project_id = p_project_id and artisan_id = any (v_ids)) then
    raise exception 'Demande déjà envoyée à cet artisan' using errcode = '22023';
  end if;
  -- Chaque artisan doit toujours correspondre au projet (visible, métier, zone ou zone élargie,
  -- hors pause) ; ceux de la zone élargie sont notés (ADR 0165).
  select array_agg(m.artisan_id) filter (where m.artisan_id = any (v_ids)),
    array_agg(m.artisan_id) filter (where m.hors_zone and m.artisan_id = any (v_ids))
  into v_matched, v_outside
  from public.match_artisans(p_project_id, 20) m;
  if cardinality(coalesce(v_matched, '{}')) < cardinality(v_ids) then
    raise exception 'Un des artisans choisis n''est plus disponible pour ce projet' using errcode = '22023';
  end if;
  if p_phone is null or p_phone !~ '^\+[1-9][0-9]{7,14}$' then
    raise exception 'Téléphone invalide' using errcode = '22023';
  end if;
  if p_callback_mode = 'plage' and (p_callback_from is null or p_callback_to is null or p_callback_to <= p_callback_from) then
    raise exception 'Plage horaire invalide' using errcode = '22023';
  end if;

  -- Faux particulier (ADR 0157) : recoupement avec les artisans inscrits.
  select array_agg(distinct s.motif order by s.motif), array_agg(distinct s.artisan_id)
  into v_motifs, v_suspects
  from app.request_suspicion(auth.uid(), p_project_id, p_phone) s;

  insert into public.requests (project_id, artisan_id, particulier_id, message, contact_phone,
    callback_mode, callback_from, callback_to, status, hors_zone)
  select p_project_id, x, auth.uid(), nullif(btrim(left(p_message, 10000)), ''), p_phone,
    p_callback_mode, case when p_callback_mode = 'plage' then p_callback_from end,
    case when p_callback_mode = 'plage' then p_callback_to end,
    case when v_motifs is null then 'envoyee' else 'a_verifier' end::public.request_status,
    x = any (coalesce(v_outside, '{}'))
  from unnest(v_ids) x;

  if v_motifs is not null then
    -- Ticket au nom du particulier, au texte neutre ; le détail du recoupement va dans une note
    -- interne, jamais visible du déclarant.
    select email into v_email from auth.users where id = auth.uid();
    insert into public.tickets (type, user_id, project_id, contact_email, subject, message, due_at)
    values ('particulier_a_verifier', auth.uid(), p_project_id, lower(v_email),
      'Demande en cours de vérification',
      'Demande retenue pour vérification avant sa transmission aux artisans.',
      now() + interval '1 day')
    returning id into v_ticket;
    insert into public.ticket_notes (ticket_id, author_id, body)
    values (v_ticket, null, left(format('Recoupement automatique avec des artisans inscrits (%s) : %s.',
      array_to_string(v_motifs, ', '),
      (select string_agg(app.artisan_label(s), ', ') from unnest(v_suspects) s)), 2000));
  end if;

  update public.projects set status = 'demande_envoyee' where id = p_project_id;
  update public.profiles set phone = p_phone where user_id = auth.uid() and phone is null;
  return cardinality(v_ids);
end;
$$;

-- Détail de la demande pour l'artisan : demande hors de sa zone habituelle.
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
      'email', case when r.status = 'acceptee' then u.email::text end
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
