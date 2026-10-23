-- « Recommander un partenaire » (ADR 0174, pistes du « Programme de parrainage ») : un artisan
-- qui a reçu une demande recommande au particulier un de ses partenaires MENAO (son parrain ou ses
-- filleuls, ADR 0161), à sa place ou pour un autre métier du chantier (ADR 0167). Le particulier
-- décide de le contacter ; le partenaire ne voit rien de la demande avant. Un devis par artisan,
-- jamais de devis commun. TODO(legal) : recommandation signalée comme venant d'un partenaire,
-- jamais rémunérée, hors du classement ; à mentionner dans les CGV artisans et les CGU.

-- Sélection et classement des artisans, sans contrôle d'accès : réservés aux fonctions de la base
-- (un artisan ne voit jamais la liste des autres artisans d'un projet).
create function app.match_artisans_core(p_project_id uuid, p_limit int)
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
  where p.id = p_project_id;
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
  ),
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
revoke execute on function app.match_artisans_core(uuid, int) from public, anon, authenticated;

-- Artisans proposés au particulier : son projet seulement (ou l'équipe), calcul inchangé.
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
  verified boolean,
  menao_score smallint,
  hors_zone boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.projects p where p.id = p_project_id and (p.user_id = auth.uid() or app.is_staff())
  ) then
    raise exception 'Projet introuvable' using errcode = '42501';
  end if;
  return query select * from app.match_artisans_core(p_project_id, p_limit);
end;
$$;

-- Partenaires d'un artisan : son parrain et ses filleuls, parrainages non annulés.
create function app.artisan_partners(p_artisan_id uuid)
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select r.referred_artisan_id from public.artisan_referrals r
  where r.referrer_artisan_id = p_artisan_id and r.status <> 'annule'
  union
  select r.referrer_artisan_id from public.artisan_referrals r
  where r.referred_artisan_id = p_artisan_id and r.status <> 'annule'
$$;
revoke execute on function app.artisan_partners(uuid) from public, anon, authenticated;

create table public.partner_recommendations (
  id uuid primary key default gen_random_uuid(),
  -- Demande par laquelle l'artisan connaît le chantier.
  request_id uuid not null references public.requests (id) on delete cascade,
  -- Projet (chantier ou lot) pour lequel le partenaire est recommandé.
  project_id uuid not null references public.projects (id) on delete cascade,
  from_artisan_id uuid not null references public.artisans (id) on delete cascade,
  to_artisan_id uuid not null references public.artisans (id) on delete cascade,
  status text not null default 'proposee' check (status in ('proposee', 'envoyee')),
  created_at timestamptz not null default now(),
  check (from_artisan_id <> to_artisan_id),
  unique (project_id, to_artisan_id)
);
create index partner_recommendations_request_idx on public.partner_recommendations (request_id);
create index partner_recommendations_from_idx on public.partner_recommendations (from_artisan_id);

alter table public.partner_recommendations enable row level security;
revoke all on public.partner_recommendations from anon, authenticated;
grant select on public.partner_recommendations to authenticated;
create policy "partner_recommendations : lecture par le particulier, l'artisan qui recommande ou l'équipe"
  on public.partner_recommendations for select to authenticated
  using (
    from_artisan_id = app.my_artisan_id()
    or exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid())
    or app.is_staff()
  );

-- Partenaires que l'artisan d'une demande peut recommander : pour ce projet ou pour un autre métier
-- du chantier, dans la zone (pas en zone élargie), pas encore contactés.
create function public.partner_recommendation_options(p_request_id uuid)
returns table (
  project_id uuid,
  trade_label text,
  same_project boolean,
  artisan_id uuid,
  display_name text,
  recommended boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  q public.requests;
  v_root uuid;
begin
  select r.* into q from public.requests r
  join public.artisans a on a.id = r.artisan_id
  where r.id = p_request_id and a.user_id = auth.uid();
  if not found then
    raise exception 'Demande introuvable' using errcode = '42501';
  end if;
  if q.status not in ('envoyee', 'acceptee', 'refusee') then
    return;
  end if;
  select coalesce(p.parent_project_id, p.id) into v_root from public.projects p where p.id = q.project_id;
  return query
  select p.id, t.label, p.id = q.project_id, m.artisan_id, m.display_name,
    exists (
      select 1 from public.partner_recommendations x
      where x.project_id = p.id and x.to_artisan_id = m.artisan_id
    )
  from public.projects p
  join public.trades t on t.code = p.trade_code
  cross join lateral app.match_artisans_core(p.id, 50) m
  where (p.id = v_root or p.parent_project_id = v_root)
    and not m.hors_zone
    and m.artisan_id <> q.artisan_id
    and m.artisan_id in (select app.artisan_partners(q.artisan_id))
    and not exists (
      select 1 from public.requests o where o.project_id = p.id and o.artisan_id = m.artisan_id
    )
  order by p.id = q.project_id desc, t.label, m.display_name;
end;
$$;
revoke execute on function public.partner_recommendation_options(uuid) from public, anon;
grant execute on function public.partner_recommendation_options(uuid) to authenticated;

-- Recommandation d'un partenaire (3 au plus par demande) ; le particulier est prévenu, au plus une
-- fois par quart d'heure pour une même demande.
create function public.recommend_partner(p_request_id uuid, p_project_id uuid, p_partner_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  q public.requests;
  v_id uuid;
  v_from text;
  v_partner text;
  v_trade text;
begin
  select r.* into q from public.requests r
  join public.artisans a on a.id = r.artisan_id
  where r.id = p_request_id and a.user_id = auth.uid();
  if not found then
    raise exception 'Demande introuvable' using errcode = '42501';
  end if;
  select o.display_name, o.trade_label into v_partner, v_trade
  from public.partner_recommendation_options(p_request_id) o
  where o.project_id = p_project_id and o.artisan_id = p_partner_id and not o.recommended;
  if not found then
    raise exception 'Ce partenaire ne peut pas être recommandé pour ce chantier' using errcode = '22023';
  end if;
  if (select count(*) from public.partner_recommendations x where x.request_id = p_request_id) >= 3 then
    raise exception 'Vous pouvez recommander 3 partenaires au plus pour une demande' using errcode = '22023';
  end if;
  insert into public.partner_recommendations (request_id, project_id, from_artisan_id, to_artisan_id)
  values (p_request_id, p_project_id, q.artisan_id, p_partner_id)
  returning id into v_id;

  v_from := app.artisan_display_name(q.artisan_id);
  if not exists (
    select 1 from public.notifications n
    where n.user_id = q.particulier_id and n.type = 'recommandation_partenaire'
      and n.data ->> 'request_id' = p_request_id::text and n.created_at > now() - interval '15 minutes'
  ) then
    perform app.notify(q.particulier_id, 'recommandation_partenaire', jsonb_build_object(
      'request_id', p_request_id, 'project_id', p_project_id, 'artisan', v_from,
      'partenaire', v_partner, 'metier', v_trade));
  end if;
  return v_id;
end;
$$;
revoke execute on function public.recommend_partner(uuid, uuid, uuid) from public, anon;
grant execute on function public.recommend_partner(uuid, uuid, uuid) to authenticated;

-- Le particulier a contacté le partenaire recommandé : la recommandation est suivie.
create function app.partner_recommendation_sent()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.partner_recommendations
  set status = 'envoyee'
  where project_id = new.project_id and to_artisan_id = new.artisan_id and status = 'proposee';
  return null;
end;
$$;
revoke execute on function app.partner_recommendation_sent() from public, anon, authenticated;
create trigger requests_partner_recommendation_sent after insert on public.requests
  for each row execute function app.partner_recommendation_sent();

-- Recommandation d'un partenaire : notification d'activité, désactivable par le particulier.
create or replace function app.notification_category(p_type public.notification_type)
returns text
language sql
immutable
set search_path = ''
as $$
  select case p_type
    when 'chantier_nouveautes' then 'activite'
    when 'nouveaux_messages' then 'activite'
    when 'recommandation_partenaire' then 'activite'
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
