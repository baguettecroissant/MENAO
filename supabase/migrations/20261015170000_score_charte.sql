-- Score MENAO de la charte qualité (ADR 0105) : classement des artisans selon six critères pondérés
-- (notes des clients 40 %, règle des 72 h 20 %, réactivité 15 %, planning à jour 10 %, chantiers
-- menés à terme 10 %, ancienneté et badges 5 %). Mêmes formules que packages/core/src/ranking.ts :
-- taux lissés (valeur neutre 70 %, comptée comme 3 événements), planning plein jusqu'à 7 jours puis
-- nul à 28 jours, ancienneté sur 24 mois et badges à parts égales.
-- TODO(legal): faire valider la description publiée des critères de classement (art. L111-7 du Code
-- de la consommation, règlement P2B UE 2019/1150).

-- ---------------------------------------------------------------------------
-- Planning tenu à jour : date de la dernière mise à jour (horaires, absences, créneaux bloqués,
-- disponibilité, pause) ou de la dernière confirmation « Mon planning est à jour ».
-- ---------------------------------------------------------------------------
alter table public.artisans add column planning_updated_at timestamptz;

update public.artisans a set planning_updated_at = greatest(
  (select max(h.updated_at) from public.artisan_hours h where h.artisan_id = a.id),
  (select max(x.updated_at) from public.artisan_absences x where x.artisan_id = a.id),
  (select max(b.updated_at) from public.artisan_blocked_slots b where b.artisan_id = a.id)
);

create function app.touch_artisan_planning()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.artisans set planning_updated_at = now()
  where id = case when tg_op = 'DELETE' then old.artisan_id else new.artisan_id end;
  return null;
end;
$$;
revoke execute on function app.touch_artisan_planning() from public, anon, authenticated;

create trigger artisan_hours_planning after insert or update or delete on public.artisan_hours
  for each row execute function app.touch_artisan_planning();
create trigger artisan_absences_planning after insert or update or delete on public.artisan_absences
  for each row execute function app.touch_artisan_planning();
create trigger artisan_blocked_slots_planning after insert or update or delete on public.artisan_blocked_slots
  for each row execute function app.touch_artisan_planning();

create function app.artisans_planning_on_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.available_from is distinct from old.available_from or new.paused is distinct from old.paused then
    new.planning_updated_at := now();
  end if;
  return new;
end;
$$;
revoke execute on function app.artisans_planning_on_update() from public, anon, authenticated;

create trigger artisans_planning_on_update before update of available_from, paused on public.artisans
  for each row execute function app.artisans_planning_on_update();

-- « Mon planning est à jour » : confirmation sans modification.
create function public.artisan_confirm_planning()
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_at timestamptz := now();
begin
  update public.artisans set planning_updated_at = v_at where id = app.my_artisan_id();
  if not found then
    raise exception 'Aucune fiche artisan pour cet utilisateur.' using errcode = '42501';
  end if;
  return v_at;
end;
$$;
revoke execute on function public.artisan_confirm_planning() from public, anon;
grant execute on function public.artisan_confirm_planning() to authenticated;

-- ---------------------------------------------------------------------------
-- Calcul du score
-- ---------------------------------------------------------------------------
create function app.ranking_rate(p_successes numeric, p_total numeric)
returns numeric
language sql
immutable
set search_path = ''
as $$
  select (coalesce(p_successes, 0) + 0.7 * 3) / (coalesce(p_total, 0) + 3) * 100
$$;
revoke execute on function app.ranking_rate(numeric, numeric) from public, anon, authenticated;

create function app.artisan_charter_score(p_artisan uuid)
returns table (
  notes numeric,
  delai72h numeric,
  reactivite numeric,
  planning numeric,
  chantiers_termines numeric,
  anciennete numeric,
  score smallint
)
language sql
stable
security definer
set search_path = ''
as $$
  with
  -- Notes des clients : moyenne des avis publiés (0 à 100), lissée.
  avis as (
    select case when s.review_count > 0
      then (s.global_score * s.review_count + 70 * 3)::numeric / (s.review_count + 3)
      else 70 end as v
    from (select 1) one
    left join public.artisan_scores s on s.artisan_id = p_artisan
  ),
  -- Règle des 72 h : demandes acceptées (devis envoyé sous 72 h ou non, une fois le délai passé)
  -- et demandes expirées sans réponse, sur 365 jours.
  devis as (
    select
      count(*) filter (where d.first_sent is not null and d.first_sent <= d.created_at + interval '72 hours') as ok,
      count(*) filter (where d.status = 'expiree'
        or d.first_sent is not null
        or now() > d.created_at + interval '72 hours') as n
    from (
      select r.status, r.created_at, (
        select min(q.sent_at) from public.quotes q
        join public.chantiers c on c.id = q.chantier_id
        where c.request_id = r.id and q.sent_at is not null
      ) as first_sent
      from public.requests r
      where r.artisan_id = p_artisan
        and r.status in ('acceptee', 'expiree')
        and r.created_at >= now() - interval '365 days'
    ) d
  ),
  -- Réactivité : demandes acceptées ou refusées sous 24 h (une demande expirée est un échec) et
  -- messages des clients suivis d'une réponse de l'artisan sous 24 h, sur 180 jours.
  reponses as (
    select
      count(*) filter (where r.responded_at is not null and r.responded_at <= r.created_at + interval '24 hours') as ok,
      count(*) as n
    from public.requests r
    where r.artisan_id = p_artisan
      and r.status in ('acceptee', 'refusee', 'expiree')
      and r.created_at >= now() - interval '180 days'
  ),
  messages as (
    select
      count(*) filter (where exists (
        select 1 from public.messages a
        where a.chantier_id = m.chantier_id and a.author_id = m.artisan_user
          and a.created_at > m.created_at and a.created_at <= m.created_at + interval '24 hours'
      )) as ok,
      count(*) as n
    from (
      -- Premier message d'une suite de messages du client (une seule réponse attendue).
      select x.chantier_id, x.created_at, x.artisan_user
      from (
        select mm.chantier_id, mm.created_at, mm.author_id, c.particulier_id, ar.user_id as artisan_user,
          lag(mm.author_id) over (partition by mm.chantier_id order by mm.created_at) as previous_author
        from public.messages mm
        join public.chantiers c on c.id = mm.chantier_id
        join public.artisans ar on ar.id = c.artisan_id
        where c.artisan_id = p_artisan and mm.created_at >= now() - interval '180 days'
      ) x
      where x.author_id = x.particulier_id
        and x.previous_author is distinct from x.particulier_id
        and x.created_at <= now() - interval '24 hours'
    ) m
  ),
  -- Chantiers menés à terme : réceptionnés ou clôturés, face aux annulations par l'artisan.
  chantiers as (
    select
      count(*) filter (where c.status in ('receptionne', 'cloture')) as ok,
      count(*) filter (where c.status in ('receptionne', 'cloture') or exists (
        select 1 from public.chantier_events e
        where e.chantier_id = c.id and e.event = 'annulation' and e.details ->> 'par' = 'artisan'
      )) as n
    from public.chantiers c
    where c.artisan_id = p_artisan and c.created_at >= now() - interval '365 days'
  ),
  -- Ancienneté depuis la validation du dossier (24 mois pour le maximum) et badges obtenus.
  anciennete as (
    select
      least(1, greatest(0, extract(epoch from now() - coalesce(
        (select min(v.created_at) from public.artisan_reviews v where v.artisan_id = p_artisan and v.decision = 'valide'),
        now())) / 86400 / 30.44 / 24)) as seniority,
      case when (select count(*) from public.badges b where b.active) > 0
        then least(1, (select count(*) from public.artisan_badges ab where ab.artisan_id = p_artisan)::numeric
          / (select count(*) from public.badges b where b.active))
        else 0 end as badges
  ),
  planning as (
    select case
      when a.planning_updated_at is null then 0
      when now() - a.planning_updated_at <= interval '7 days' then 100
      else greatest(0, least(1, (28 - extract(epoch from now() - a.planning_updated_at) / 86400) / 21)) * 100
    end as v
    from public.artisans a where a.id = p_artisan
  ),
  parts as (
    select
      (select v from avis) as notes,
      app.ranking_rate((select ok from devis), (select n from devis)) as delai72h,
      app.ranking_rate((select ok from reponses) + (select ok from messages),
                       (select n from reponses) + (select n from messages)) as reactivite,
      coalesce((select v from planning), 0) as planning,
      app.ranking_rate((select ok from chantiers), (select n from chantiers)) as chantiers_termines,
      ((select seniority from anciennete) * 0.5 + (select badges from anciennete) * 0.5) * 100 as anciennete
  )
  select
    round(p.notes, 1), round(p.delai72h, 1), round(p.reactivite, 1), round(p.planning, 1),
    round(p.chantiers_termines, 1), round(p.anciennete, 1),
    round((40 * p.notes + 20 * p.delai72h + 15 * p.reactivite + 10 * p.planning
           + 10 * p.chantiers_termines + 5 * p.anciennete) / 100)::smallint
  from parts p
$$;
revoke execute on function app.artisan_charter_score(uuid) from public, anon, authenticated;

-- Score de l'artisan connecté, critère par critère (tableau de bord, « Mon grade MENAO »).
create function public.my_charter_score()
returns table (
  notes numeric,
  delai72h numeric,
  reactivite numeric,
  planning numeric,
  chantiers_termines numeric,
  anciennete numeric,
  score smallint,
  planning_updated_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select s.notes, s.delai72h, s.reactivite, s.planning, s.chantiers_termines, s.anciennete, s.score,
    a.planning_updated_at
  from public.artisans a
  cross join lateral app.artisan_charter_score(a.id) s
  where a.id = app.my_artisan_id()
$$;
revoke execute on function public.my_charter_score() from public, anon;
grant execute on function public.my_charter_score() to authenticated;

-- ---------------------------------------------------------------------------
-- Classement des artisans proposés : score de la charte, puis disponibilité et distance.
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
  specialties jsonb
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
    )
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
