-- Budget minimum de l'artisan (ADR 0164, d'après le « Plan anti-problèmes V2 » : « filtres réglés
-- par l'artisan : rayon, budget minimum, types de travaux ») : une demande dont le budget annoncé
-- est inférieur au minimum de l'artisan ne lui est pas proposée ; une demande sans budget reste
-- proposée à tous. Réglage facultatif, dans « Métiers et certifications ». Mêmes valeurs dans
-- packages/core/src/project.ts (BUDGET_MINIMUM_OPTIONS, budgetMeetsMinimum).

alter table public.artisans add column budget_minimum public.project_budget
  check (budget_minimum is distinct from 'moins_1000');

-- Réglage par l'artisan connecté : chaîne vide pour « tous les budgets ».
create function public.set_artisan_budget_minimum(p_budget text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_artisan uuid := app.my_artisan_id();
  v_budget text := nullif(btrim(coalesce(p_budget, '')), '');
begin
  if v_artisan is null then
    raise exception 'Réservé aux artisans' using errcode = '42501';
  end if;
  if v_budget is not null and v_budget not in ('1000_5000', '5000_15000', '15000_50000', 'plus_50000') then
    raise exception 'Budget minimum inconnu.' using errcode = '22023';
  end if;
  update public.artisans set budget_minimum = v_budget::public.project_budget where id = v_artisan;
end;
$$;
revoke execute on function public.set_artisan_budget_minimum(text) from public, anon;
grant execute on function public.set_artisan_budget_minimum(text) to authenticated;

-- Recherche d'artisans (et contrôle à l'envoi des demandes, qui la reprend) : budget minimum en plus.
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
  menao_score smallint
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
      md5(p_project_id::text || a.id::text) as tirage
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
      )
  ),
  -- Ordre au mérite : disponibles tout de suite d'abord, puis Score MENAO (ADR 0155), date de
  -- disponibilité, distance et tirage propre au projet.
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
    round((m.distance_m / 1000)::numeric, 1), m.specialites, m.verifie, m.score
  from merite m
  order by case when m.id = (select p.id from place p) then 2.5 else m.rang end
  limit least(greatest(coalesce(p_limit, 5), 1), 20);
end;
$$;
