-- Score MENAO sur 100 (F-10, ADR 0155 ; barème validé par les associés le 22 octobre 2026,
-- d'après « Mettre en avant les nouveaux artisans ») : visible du client, il remplace le score de
-- la charte V5 dans le classement au mérite. Il repose sur des critères remplis dès le premier
-- jour : badge « Assuré et vérifié » (20), expérience (10), diplôme et qualification (10), fiche
-- complète (10), réactivité (10) et avis (40 : note Google vérifiée en base, avis MENAO de plus en
-- plus lourds). Même barème que `menaoScore` (@menao/core).

create type public.diplome_metier as enum (
  'cap', 'bep', 'bac_pro', 'bp', 'bts', 'brevet_maitrise', 'titre_pro', 'autre'
);

alter table public.artisans
  -- Diplôme du métier le plus élevé, déclaré par l'artisan.
  add column diplome_metier public.diplome_metier,
  -- Date de création de l'entreprise (API Sirene) : ancienneté.
  add column date_creation_entreprise date,
  -- Avis Google lus sur la fiche Google de l'entreprise et saisis par l'équipe (source affichée).
  add column google_url text check (google_url ~ '^https://' and char_length(google_url) <= 500),
  add column google_rating numeric(2, 1) check (google_rating between 1 and 5),
  add column google_review_count integer check (google_review_count between 1 and 100000),
  add column google_checked_at timestamptz,
  add constraint artisans_avis_google_complets check (
    (google_checked_at is null) = (google_url is null)
    and (google_url is null) = (google_rating is null)
    and (google_rating is null) = (google_review_count is null)
  );
comment on column public.artisans.google_rating is
  'Note Google vérifiée par l''équipe (ADR 0155) : base des avis du Score MENAO.';

-- ---------------------------------------------------------------------------
-- Calcul : points de chaque critère, total arrondi, et faits utiles aux conseils.
-- ---------------------------------------------------------------------------
create function app.artisan_menao_score(p_artisan uuid)
returns table (
  score smallint,
  verifie numeric,
  experience numeric,
  diplomes numeric,
  profil numeric,
  reactivite numeric,
  avis numeric,
  annees integer,
  diplome boolean,
  qualification boolean,
  profil_pct integer,
  reponse_minutes integer,
  devis_taux numeric,
  avis_menao integer,
  note_menao numeric,
  avis_google integer,
  note_google numeric
)
language sql
stable
security definer
set search_path = ''
as $$
  with
  a as (
    select ar.*, pr.avatar_path as avatar, (now() at time zone 'Europe/Paris')::date as today
    from public.artisans ar
    left join public.profiles pr on pr.user_id = ar.user_id
    where ar.id = p_artisan
  ),
  -- Règle des 72 h de la charte : devis envoyé sous 72 h, demandes expirées comprises, sur 365 jours.
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
  f as (
    select
      app.artisan_verified_badge(a.id) as verified,
      greatest(coalesce(a.experience_years, 0),
        coalesce(extract(year from age(a.today, a.date_creation_entreprise))::int, 0)) as annees,
      a.diplome_metier is not null as diplome,
      exists (
        select 1 from public.certifications c
        where c.artisan_id = a.id and c.verified_at is not null and c.date_fin >= a.today
      ) or exists (
        select 1 from public.artisan_rge_qualifications r where r.artisan_id = a.id and r.date_fin >= a.today
      ) as qualification,
      -- Jauge « Fiche complète » (profileStrength, @menao/core).
      floor(
        25 * app.artisan_verified_badge(a.id)::int
        + 20 * (a.avatar is not null)::int
        + 20 * least((select count(*) from public.artisan_photos p where p.artisan_id = a.id) / 3.0, 1)
        + 15 * least(char_length(btrim(coalesce(a.presentation, ''))) / 300.0, 1)
        + 10 * (exists (
            select 1 from public.artisan_work_types aw join public.work_types w on w.code = aw.work_type_code
            where aw.artisan_id = a.id and w.active
          ))::int
        + 10 * (exists (select 1 from public.certifications c where c.artisan_id = a.id)
            or exists (
              select 1 from public.artisan_rge_qualifications r where r.artisan_id = a.id and r.date_fin >= a.today
            ))::int
      )::int as profil_pct,
      (select s.minutes from app.artisan_response_stats(a.id) s where s.responses >= 3) as reponse_minutes,
      app.ranking_rate((select ok from devis), (select n from devis)) as devis_taux,
      coalesce(sc.review_count, 0) as avis_menao,
      sc.global_score / 20.0 as note_menao,
      case when a.google_checked_at is not null then a.google_review_count end as avis_google,
      case when a.google_checked_at is not null then a.google_rating end as note_google
    from a
    left join public.artisan_scores sc on sc.artisan_id = a.id
  ),
  p as (
    select f.*,
      case when f.verified then 20 else 0 end::numeric as p_verifie,
      case when f.annees >= 10 then 10 when f.annees >= 5 then 8 when f.annees >= 2 then 6 else 3 end::numeric
        as p_experience,
      ((case when f.diplome then 5 else 0 end) + (case when f.qualification then 5 else 0 end))::numeric
        as p_diplomes,
      least(greatest(f.profil_pct, 0), 100) / 10.0 as p_profil,
      ((case
          when f.reponse_minutes is null then 7
          when f.reponse_minutes < 120 then 10
          when f.reponse_minutes < 720 then 8
          when f.reponse_minutes < 1440 then 6
          when f.reponse_minutes < 4320 then 3
          else 0
        end) + least(greatest(f.devis_taux, 0), 100) / 10.0) / 2 as p_reactivite,
      -- Note Google en base (sinon 3 sur 5), avis MENAO pesant n / (n + 5).
      (case when f.avis_menao > 0
        then f.avis_menao::numeric / (f.avis_menao + 5) * least(greatest(f.note_menao, 1), 5)
          + 5.0 / (f.avis_menao + 5) * coalesce(least(greatest(f.note_google, 1), 5), 3)
        else coalesce(least(greatest(f.note_google, 1), 5), 3)
      end) / 5 * 40 as p_avis
    from f
  )
  select
    round(p.p_verifie + p.p_experience + p.p_diplomes + p.p_profil + p.p_reactivite + p.p_avis)::smallint,
    p.p_verifie, p.p_experience, p.p_diplomes, round(p.p_profil, 1), round(p.p_reactivite, 1),
    round(p.p_avis, 1),
    p.annees::int, p.diplome, p.qualification, p.profil_pct, p.reponse_minutes::int, round(p.devis_taux, 1),
    p.avis_menao::int, round(p.note_menao, 2), p.avis_google::int, p.note_google::numeric
  from p
$$;
revoke execute on function app.artisan_menao_score(uuid) from public, anon, authenticated;

-- Score de l'artisan connecté, critère par critère, et la date de son planning (tableau de bord).
create function public.my_menao_score()
returns json
language sql
stable
security definer
set search_path = ''
as $$
  select json_build_object(
    'score', s.score,
    'parts', json_build_object('verifie', s.verifie, 'experience', s.experience, 'diplomes', s.diplomes,
      'profil', s.profil, 'reactivite', s.reactivite, 'avis', s.avis),
    'facts', json_build_object('verified', s.verifie > 0, 'annees', s.annees, 'diplome', s.diplome,
      'qualification', s.qualification, 'profil_pct', s.profil_pct, 'reponse_minutes', s.reponse_minutes,
      'devis_taux', s.devis_taux, 'avis_menao', s.avis_menao, 'note_menao', s.note_menao,
      'avis_google', s.avis_google, 'note_google', s.note_google),
    'planning_updated_at', a.planning_updated_at
  )
  from public.artisans a
  cross join lateral app.artisan_menao_score(a.id) s
  where a.id = app.my_artisan_id()
$$;
revoke execute on function public.my_menao_score() from public, anon;
grant execute on function public.my_menao_score() to authenticated;

-- Fiche d'un artisan dans le back-office : son score, critère par critère.
create function public.admin_artisan_menao_score(p_artisan_id uuid)
returns json
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform app.require_admin();
  return (
    select json_build_object('score', s.score, 'verifie', s.verifie, 'experience', s.experience,
      'diplomes', s.diplomes, 'profil', s.profil, 'reactivite', s.reactivite, 'avis', s.avis)
    from app.artisan_menao_score(p_artisan_id) s
    where exists (select 1 from public.artisans a where a.id = p_artisan_id)
  );
end;
$$;
revoke execute on function public.admin_artisan_menao_score(uuid) from public, anon;
grant execute on function public.admin_artisan_menao_score(uuid) to authenticated;

-- Diplôme déclaré par l'artisan (vide : aucun).
create function public.set_artisan_diploma(p_diplome text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_artisan uuid := app.my_artisan_id();
begin
  if v_artisan is null then
    raise exception 'Réservé aux artisans' using errcode = '42501';
  end if;
  if nullif(btrim(coalesce(p_diplome, '')), '') is not null
     and p_diplome not in ('cap', 'bep', 'bac_pro', 'bp', 'bts', 'brevet_maitrise', 'titre_pro', 'autre') then
    raise exception 'Diplôme inconnu.' using errcode = '22023';
  end if;
  update public.artisans
  set diplome_metier = nullif(btrim(coalesce(p_diplome, '')), '')::public.diplome_metier
  where id = v_artisan;
end;
$$;
revoke execute on function public.set_artisan_diploma(text) from public, anon;
grant execute on function public.set_artisan_diploma(text) to authenticated;

-- Avis Google lus par l'équipe sur la fiche Google de l'entreprise (vide : retirés). Journalisé.
create function public.admin_set_google_reviews(
  p_artisan_id uuid,
  p_url text,
  p_rating numeric,
  p_count integer
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_url text := nullif(btrim(coalesce(p_url, '')), '');
  v_found uuid;
begin
  perform app.require_admin();
  if v_url is not null and (
    v_url !~ '^https://' or char_length(v_url) > 500
    or v_url !~* '^https://([a-z0-9-]+\.)*(google\.[a-z.]+|goo\.gl|g\.page)/'
  ) then
    raise exception 'Indiquez le lien de la fiche Google de l''entreprise.' using errcode = '22023';
  end if;
  if v_url is not null and (p_rating is null or p_rating not between 1 and 5) then
    raise exception 'Note Google entre 1 et 5.' using errcode = '22023';
  end if;
  if v_url is not null and (p_count is null or p_count not between 1 and 100000) then
    raise exception 'Nombre d''avis Google invalide.' using errcode = '22023';
  end if;
  update public.artisans set
    google_url = v_url,
    google_rating = case when v_url is not null then round(p_rating, 1) end,
    google_review_count = case when v_url is not null then p_count end,
    google_checked_at = case when v_url is not null then now() end
  where id = p_artisan_id
  returning id into v_found;
  if v_found is null then
    raise exception 'Artisan introuvable.' using errcode = '22023';
  end if;
  perform app.audit(case when v_url is null then 'avis_google.retires' else 'avis_google.saisis' end,
    'artisan', p_artisan_id,
    case when v_url is null then '{}'::jsonb else jsonb_build_object('note', round(p_rating, 1), 'avis', p_count) end);
end;
$$;
revoke execute on function public.admin_set_google_reviews(uuid, text, numeric, integer) from public, anon;
grant execute on function public.admin_set_google_reviews(uuid, text, numeric, integer) to authenticated;

-- ---------------------------------------------------------------------------
-- Données Sirene : la date de création suit le SIRET (effacée s'il change).
-- ---------------------------------------------------------------------------

create or replace function app.artisans_guard_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;

  if new.siret is distinct from old.siret then
    if old.status <> 'brouillon' then
      raise exception 'Le SIRET ne peut plus être modifié après l''envoi en vérification.'
        using errcode = '42501';
    end if;
    -- Nouveau SIRET : les données Sirene précédentes ne valent plus.
    new.raison_sociale := null;
    new.forme_juridique_code := null;
    new.ape_code := null;
    new.ape_eligible := null;
    new.adresse_ligne := null;
    new.adresse_code_postal := null;
    new.adresse_commune := null;
    new.adresse_code_insee := null;
    new.sirene_checked_at := null;
    new.sirene_active := null;
    new.sirene_partial := false;
    new.date_creation_entreprise := null;
  elsif new.raison_sociale is distinct from old.raison_sociale and not old.sirene_partial then
    raise exception 'La raison sociale provient de Sirene et ne peut pas être modifiée.'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

create or replace function public.record_sirene_result(p_artisan_id uuid, p_siret text, p_result jsonb)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_partial boolean := coalesce((p_result ->> 'partialDiffusion')::boolean, false);
  v_ape text := nullif(p_result ->> 'apeCode', '');
begin
  update public.artisans set
    sirene_checked_at = now(),
    sirene_active = coalesce((p_result ->> 'active')::boolean, false),
    sirene_partial = v_partial,
    raison_sociale = coalesce(nullif(p_result ->> 'raisonSociale', ''), case when v_partial then raison_sociale end),
    forme_juridique_code = nullif(p_result ->> 'formeJuridiqueCode', ''),
    ape_code = v_ape,
    ape_eligible = exists (
      select 1 from public.ape_codes_btp a where v_ape like a.code_prefix || '%'
    ),
    adresse_ligne = nullif(p_result -> 'adresse' ->> 'ligne', ''),
    adresse_code_postal = nullif(p_result -> 'adresse' ->> 'codePostal', ''),
    adresse_commune = nullif(p_result -> 'adresse' ->> 'commune', ''),
    adresse_code_insee = nullif(p_result -> 'adresse' ->> 'codeInsee', ''),
    -- Ancienneté du Score MENAO (ADR 0155).
    date_creation_entreprise = case when p_result ->> 'dateCreation' ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
      then (p_result ->> 'dateCreation')::date end
  where id = p_artisan_id and siret = p_siret;
end;
$$;

-- ---------------------------------------------------------------------------
-- Fiche publique : Score MENAO, diplôme et avis Google.
-- ---------------------------------------------------------------------------
create or replace function app.artisan_profile_json(p_artisan_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', a.id,
    'display_name', coalesce(pr.first_name, a.nom_commercial, a.raison_sociale),
    'company_name', coalesce(a.nom_commercial, a.raison_sociale),
    'avatar_path', pr.avatar_path,
    'experience_years', a.experience_years,
    -- Score MENAO sur 100 et ses critères (ADR 0155), diplôme déclaré, avis Google vérifiés.
    'menao_score', (
      select jsonb_build_object('score', s.score, 'verifie', s.verifie, 'experience', s.experience,
        'diplomes', s.diplomes, 'profil', s.profil, 'reactivite', s.reactivite, 'avis', s.avis)
      from app.artisan_menao_score(a.id) s
    ),
    'diplome', a.diplome_metier,
    'google', case when a.google_checked_at is not null then jsonb_build_object(
      'rating', a.google_rating, 'count', a.google_review_count, 'url', a.google_url) end,
    'presentation', a.presentation,
    'paused', a.paused or app.artisan_absent(a.id, (now() at time zone 'Europe/Paris')::date),
    -- Temps de réponse moyen (F-10), publié à partir de 3 réponses.
    'response_minutes', (
      select s.minutes from app.artisan_response_stats(a.id) s where s.responses >= 3
    ),
    'available_from', a.available_from,
    'zone', jsonb_build_object(
      'mode', a.zone_mode,
      'radius_km', a.radius_km,
      'city', app.base_commune(a.base_label),
      'communes', (select coalesce(jsonb_agg(z.nom order by z.nom), '[]') from public.artisan_zones z where z.artisan_id = a.id)
    ),
    'trades', (
      select coalesce(jsonb_agg(jsonb_build_object('code', t.code, 'label', t.label) order by t.sort_order), '[]')
      from public.artisan_trades at join public.trades t on t.code = at.trade_code
      where at.artisan_id = a.id
    ),
    'work_types', (
      select coalesce(jsonb_agg(jsonb_build_object('code', w.code, 'label', w.label, 'trade', w.trade_code) order by w.sort_order), '[]')
      from public.artisan_work_types aw join public.work_types w on w.code = aw.work_type_code
      where aw.artisan_id = a.id and w.active
    ),
    -- Badge « Assuré et vérifié » (ADR 0119).
    'verified', app.artisan_verified_badge(a.id),
    'decennale_exempt', a.decennale_non_soumis,
    'decennale', (
      select jsonb_build_object('valid_until', d.date_fin, 'insurer', d.assureur)
      from public.artisan_documents d
      where d.artisan_id = a.id and d.type = 'decennale' and d.status = 'valide'
      order by d.date_fin desc nulls last limit 1
    ),
    'rc_pro', (
      select jsonb_build_object('valid_until', d.date_fin, 'insurer', d.assureur)
      from public.artisan_documents d
      where d.artisan_id = a.id and d.type = 'rc_pro' and d.status = 'valide'
      order by d.date_fin desc nulls last limit 1
    ),
    'certifications', (
      select coalesce(jsonb_agg(jsonb_build_object('type', c.type, 'numero', c.numero, 'valid_until', c.date_fin) order by c.type), '[]')
      from public.certifications c
      where c.artisan_id = a.id and c.verified_at is not null
        and c.date_fin >= (now() at time zone 'Europe/Paris')::date
    ),
    -- Domaines RGE lus dans l'annuaire officiel (ADR 0118), encore valides, sans doublon.
    'rge', (
      select coalesce(jsonb_agg(jsonb_build_object('domain', q.domaine, 'category', q.meta_domaine, 'valid_until', q.date_fin) order by q.domaine), '[]')
      from (
        select distinct on (r.domaine) r.domaine, r.meta_domaine, r.date_fin
        from public.artisan_rge_qualifications r
        where r.artisan_id = a.id and r.date_fin >= (now() at time zone 'Europe/Paris')::date
        order by r.domaine, r.date_fin desc
      ) q
    ),
    'photos', (
      select coalesce(jsonb_agg(p.storage_path order by p.sort_order, p.created_at), '[]')
      from public.artisan_photos p where p.artisan_id = a.id
    ),
    'score', (
      select jsonb_build_object(
        'review_count', s.review_count,
        'quality', s.quality,
        'delays', s.delays,
        'communication', s.communication,
        'value_for_money', s.value_for_money,
        'global', s.global_score
      )
      from public.artisan_scores s where s.artisan_id = a.id
    )
  )
  from public.artisans a
  left join public.profiles pr on pr.user_id = a.user_id
  where a.id = p_artisan_id
$$;

-- ---------------------------------------------------------------------------
-- Classement au mérite sur le Score MENAO, renvoyé aux cartes de résultats.
-- ---------------------------------------------------------------------------
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
revoke execute on function public.match_artisans(uuid, int) from public, anon;
grant execute on function public.match_artisans(uuid, int) to authenticated;
