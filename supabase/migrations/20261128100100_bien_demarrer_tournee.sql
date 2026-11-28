-- F-194 (lot 83, ADR 0394) : espace des conseillers, « Bien démarrer » et tournée.
--
-- Bien démarrer : contrat signé déposé par le conseiller puis confirmé par un admin, numéro RSAC,
-- attestation Urssaf (rappel tous les 6 mois), RIB pour les primes, icône sur l'écran d'accueil,
-- quiz de formation. Pièces dans un compartiment privé, lues par URL signée.
-- Tournée : arrêts proposés autour d'un point de départ (jamais enregistré), suivis par le
-- conseiller le temps de la tournée, suite donnée à chaque visite. Agents indépendants : rien
-- n'est imposé ni contrôlé (ni horaires, ni position) ; l'équipe ne voit que les pièces et la
-- formation dans le back-office.

-- ---------------------------------------------------------------------------------------------
-- Bien démarrer
-- ---------------------------------------------------------------------------------------------
create table public.commercial_onboarding (
  commercial_id uuid primary key references public.commercials (id) on delete cascade,
  contrat_path text check (char_length(contrat_path) <= 300),
  contrat_depose_le date,
  -- Confirmé par un admin après lecture du contrat signé.
  contrat_signe_le date,
  rsac_numero text check (char_length(rsac_numero) between 3 and 40),
  rsac_greffe text check (char_length(rsac_greffe) between 1 and 80),
  urssaf_path text check (char_length(urssaf_path) <= 300),
  urssaf_deposee_le date,
  -- Dernier rappel envoyé ; un nouveau dépôt rouvre le rappel suivant.
  urssaf_rappel_le date,
  rib_path text check (char_length(rib_path) <= 300),
  rib_depose_le date,
  ecran_installe_le date,
  badge_vu_le timestamptz,
  updated_at timestamptz not null default now()
);
create trigger commercial_onboarding_set_updated_at before update on public.commercial_onboarding
  for each row execute function app.set_updated_at();

create table public.commercial_formation_results (
  commercial_id uuid not null references public.commercials (id) on delete cascade,
  module text not null check (module in ('menao', 'parcours', 'objections', 'offre', 'regles')),
  -- Meilleure note sur 5.
  score int not null check (score between 0 and 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (commercial_id, module)
);
create trigger commercial_formation_results_set_updated_at
  before update on public.commercial_formation_results
  for each row execute function app.set_updated_at();

alter table public.commercial_onboarding enable row level security;
alter table public.commercial_formation_results enable row level security;
revoke all on public.commercial_onboarding, public.commercial_formation_results from anon, authenticated;
grant select on public.commercial_onboarding, public.commercial_formation_results to authenticated;

create policy "commercial_onboarding : lecture par le conseiller ou un admin"
  on public.commercial_onboarding for select to authenticated
  using (commercial_id = (select app.my_commercial_id()) or (select app.is_admin()));
create policy "commercial_formation_results : lecture par le conseiller ou un admin"
  on public.commercial_formation_results for select to authenticated
  using (commercial_id = (select app.my_commercial_id()) or (select app.is_admin()));

-- Pièces des conseillers : « <commercial_id>/<fichier> », rangées par process-upload (clé serveur).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('commercial-documents', 'commercial-documents', false, 10485760,
   array['application/pdf', 'image/jpeg', 'image/png'])
on conflict (id) do nothing;

create policy "commercial-documents : lecture par le conseiller ou un admin"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'commercial-documents'
    and (
      (storage.foldername(name))[1] = (select app.my_commercial_id())::text
      or (select app.is_admin())
    )
  );

-- État de l'arrivée d'un conseiller (logique des étapes : commercialOnboardingSteps, @menao/core).
create function app.commercial_onboarding_json(p_commercial uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'contrat_depose_le', o.contrat_depose_le,
    'contrat_signe_le', o.contrat_signe_le,
    'contrat', o.contrat_path is not null,
    'rsac_numero', o.rsac_numero,
    'rsac_greffe', o.rsac_greffe,
    'urssaf_deposee_le', o.urssaf_deposee_le,
    'rib_depose_le', o.rib_depose_le,
    'ecran_installe_le', o.ecran_installe_le,
    'badge_vu_le', o.badge_vu_le,
    'rappels', coalesce((pr.notification_preferences #>> '{email,rappels}')::boolean, true),
    'modules', coalesce((
      select jsonb_object_agg(r.module, r.score)
      from public.commercial_formation_results r where r.commercial_id = c.id
    ), '{}'::jsonb),
    'meilleur_entrainement', (
      select max(t.score) from public.commercial_trainings t where t.commercial_id = c.id
    ),
    'premier_prospect', exists (
      select 1 from public.prospect_briefs b
      join public.prospect_follows f on f.prospect_id = b.prospect_id
      where f.commercial_id = c.id
    )
  )
  from public.commercials c
  left join public.commercial_onboarding o on o.commercial_id = c.id
  left join public.profiles pr on pr.user_id = c.user_id
  where c.id = p_commercial
$$;
revoke execute on function app.commercial_onboarding_json(uuid) from public, anon, authenticated;

create function public.commercial_onboarding_state()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_me uuid := app.my_commercial_id();
begin
  if v_me is null then
    raise exception 'Réservé aux commerciaux' using errcode = '42501';
  end if;
  return app.commercial_onboarding_json(v_me);
end;
$$;
revoke execute on function public.commercial_onboarding_state() from public, anon;
grant execute on function public.commercial_onboarding_state() to authenticated;

-- Numéro d'immatriculation au registre spécial des agents commerciaux et greffe (facultatif).
create function public.commercial_save_rsac(p_numero text, p_greffe text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := app.my_commercial_id();
  v_numero text := btrim(regexp_replace(coalesce(p_numero, ''), '\s+', ' ', 'g'));
  v_greffe text := nullif(btrim(regexp_replace(coalesce(p_greffe, ''), '\s+', ' ', 'g')), '');
begin
  if v_me is null then
    raise exception 'Réservé aux commerciaux' using errcode = '42501';
  end if;
  if char_length(v_numero) not between 3 and 40 then
    raise exception 'Numéro RSAC : entre 3 et 40 caractères.' using errcode = '22023';
  end if;
  if char_length(v_greffe) > 80 then
    raise exception 'Greffe : 80 caractères au plus.' using errcode = '22023';
  end if;
  insert into public.commercial_onboarding (commercial_id, rsac_numero, rsac_greffe)
  values (v_me, v_numero, v_greffe)
  on conflict (commercial_id) do update set rsac_numero = excluded.rsac_numero,
    rsac_greffe = excluded.rsac_greffe;
end;
$$;
revoke execute on function public.commercial_save_rsac(text, text) from public, anon;
grant execute on function public.commercial_save_rsac(text, text) to authenticated;

-- MENAO ouvert depuis l'icône de l'écran d'accueil (mode plein écran détecté par le navigateur).
create function public.commercial_mark_home_screen()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := app.my_commercial_id();
begin
  if v_me is null then
    raise exception 'Réservé aux commerciaux' using errcode = '42501';
  end if;
  insert into public.commercial_onboarding (commercial_id, ecran_installe_le)
  values (v_me, (now() at time zone 'Europe/Paris')::date)
  on conflict (commercial_id) do update
    set ecran_installe_le = coalesce(public.commercial_onboarding.ecran_installe_le, excluded.ecran_installe_le);
end;
$$;
revoke execute on function public.commercial_mark_home_screen() from public, anon;
grant execute on function public.commercial_mark_home_screen() to authenticated;

-- Note d'un quiz de formation, notée par le serveur du site ; la meilleure note est gardée.
create function public.commercial_save_formation(p_module text, p_score int)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := app.my_commercial_id();
begin
  if v_me is null then
    raise exception 'Réservé aux commerciaux' using errcode = '42501';
  end if;
  if p_module is null or p_module not in ('menao', 'parcours', 'objections', 'offre', 'regles') then
    raise exception 'Module inconnu.' using errcode = '22023';
  end if;
  if p_score is null or p_score not between 0 and 5 then
    raise exception 'Note : entre 0 et 5.' using errcode = '22023';
  end if;
  insert into public.commercial_formation_results (commercial_id, module, score)
  values (v_me, p_module, p_score)
  on conflict (commercial_id, module) do update
    set score = greatest(public.commercial_formation_results.score, excluded.score);
end;
$$;
revoke execute on function public.commercial_save_formation(text, int) from public, anon;
grant execute on function public.commercial_save_formation(text, int) to authenticated;

-- L'écran « Prêt pour le terrain » a été vu : il ne revient plus.
create function public.commercial_mark_badge_seen()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := app.my_commercial_id();
begin
  if v_me is null then
    raise exception 'Réservé aux commerciaux' using errcode = '42501';
  end if;
  insert into public.commercial_onboarding (commercial_id, badge_vu_le) values (v_me, now())
  on conflict (commercial_id) do update
    set badge_vu_le = coalesce(public.commercial_onboarding.badge_vu_le, excluded.badge_vu_le);
end;
$$;
revoke execute on function public.commercial_mark_badge_seen() from public, anon;
grant execute on function public.commercial_mark_badge_seen() to authenticated;

-- Back-office : l'arrivée de chaque conseiller (hors radiés), avec ses pièces et sa formation.
create function public.admin_commercials_onboarding()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform app.require_admin();
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', c.id,
      'nom', c.nom,
      'status', c.status,
      'zone', to_jsonb(c.zone_codes_postaux),
      'created_at', c.created_at,
      'state', app.commercial_onboarding_json(c.id)
    ) order by c.nom, c.id)
    from public.commercials c
    where c.status <> 'radie'
  ), '[]'::jsonb);
end;
$$;
revoke execute on function public.admin_commercials_onboarding() from public, anon;
grant execute on function public.admin_commercials_onboarding() to authenticated;

-- Back-office : contrat signé lu et confirmé (date de signature), ou confirmation retirée (null).
create function public.admin_set_commercial_contract(p_commercial uuid, p_signe_le date)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform app.require_admin();
  if p_signe_le is not null
     and (p_signe_le > (now() at time zone 'Europe/Paris')::date or p_signe_le < date '2026-01-01') then
    raise exception 'Date de signature invalide.' using errcode = '22023';
  end if;
  if not exists (select 1 from public.commercials c where c.id = p_commercial) then
    raise exception 'Conseiller introuvable.' using errcode = 'P0002';
  end if;
  insert into public.commercial_onboarding (commercial_id, contrat_signe_le)
  values (p_commercial, p_signe_le)
  on conflict (commercial_id) do update set contrat_signe_le = excluded.contrat_signe_le;
  perform app.audit('commercial.contrat', 'commercial', p_commercial,
    jsonb_build_object('contrat_signe_le', p_signe_le));
end;
$$;
revoke execute on function public.admin_set_commercial_contract(uuid, date) from public, anon;
grant execute on function public.admin_set_commercial_contract(uuid, date) to authenticated;

-- Chaque matin : rappel de l'attestation Urssaf 15 jours avant ses 6 mois (une fois par dépôt).
-- Transactionnel (obligation du contrat) : il ne se coupe pas dans les préférences. p_now : tests.
create function app.send_urssaf_reminders(p_now timestamptz default now())
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_today date := (p_now at time zone 'Europe/Paris')::date;
  v_sent integer := 0;
  v_row record;
begin
  for v_row in
    select o.commercial_id, c.user_id, (o.urssaf_deposee_le + interval '6 months')::date as expire_le
    from public.commercial_onboarding o
    join public.commercials c on c.id = o.commercial_id
    where c.status = 'actif' and c.user_id is not null
      and o.urssaf_deposee_le is not null
      and v_today >= (o.urssaf_deposee_le + interval '6 months')::date - 15
      and (o.urssaf_rappel_le is null or o.urssaf_rappel_le < o.urssaf_deposee_le)
    for update of o
  loop
    perform app.notify(v_row.user_id, 'conseiller_urssaf',
      jsonb_build_object('expire_le', v_row.expire_le));
    update public.commercial_onboarding set urssaf_rappel_le = v_today
    where commercial_id = v_row.commercial_id;
    v_sent := v_sent + 1;
  end loop;
  return v_sent;
end;
$$;
revoke execute on function app.send_urssaf_reminders(timestamptz) from public, anon, authenticated;

select cron.schedule('menao-rappel-urssaf-conseillers', '20 7 * * *', 'select app.send_urssaf_reminders()');

-- ---------------------------------------------------------------------------------------------
-- Tournée
-- ---------------------------------------------------------------------------------------------
create type public.tour_outcome as enum ('interesse', 'a_rappeler', 'absent', 'pas_interesse');

create table public.commercial_tours (
  id uuid primary key default gen_random_uuid(),
  commercial_id uuid not null references public.commercials (id) on delete cascade,
  metiers text[] not null default '{}' check (cardinality(metiers) <= 11),
  duree text not null check (duree in ('court', 'matinee', 'journee')),
  distance_m int not null check (distance_m between 0 and 200000),
  status text not null default 'en_cours' check (status in ('en_cours', 'terminee')),
  created_at timestamptz not null default now(),
  ended_at timestamptz
);
create unique index commercial_tours_en_cours_idx on public.commercial_tours (commercial_id)
  where status = 'en_cours';
create index commercial_tours_commercial_idx on public.commercial_tours (commercial_id, created_at desc);

create table public.commercial_tour_stops (
  tour_id uuid not null references public.commercial_tours (id) on delete cascade,
  position int not null check (position between 1 and 30),
  prospect_id uuid not null references public.prospects (id) on delete cascade,
  -- Suivi ouvert par la tournée : rendu à la fin s'il n'a servi à rien.
  suivi_cree boolean not null default false,
  outcome public.tour_outcome,
  visited_at timestamptz,
  primary key (tour_id, position),
  unique (tour_id, prospect_id)
);
create index commercial_tour_stops_prospect_idx on public.commercial_tour_stops (prospect_id);

-- Recherche des prospects autour d'un point (tournée, carte).
create index if not exists prospects_location_idx on public.prospects using gist (location);

alter table public.commercial_tours enable row level security;
alter table public.commercial_tour_stops enable row level security;
revoke all on public.commercial_tours, public.commercial_tour_stops from anon, authenticated;
grant select on public.commercial_tours, public.commercial_tour_stops to authenticated;

create policy "commercial_tours : lecture par le conseiller"
  on public.commercial_tours for select to authenticated
  using (commercial_id = (select app.my_commercial_id()));
create policy "commercial_tour_stops : lecture par le conseiller"
  on public.commercial_tour_stops for select to authenticated
  using (exists (
    select 1 from public.commercial_tours t
    where t.id = tour_id and t.commercial_id = (select app.my_commercial_id())
  ));

-- Prospects pour une tournée autour d'un point : libres (sans suivi, pas encore sur MENAO) de ma
-- zone, ou les miens encore à contacter dont la relance tombe aujourd'hui ou avant. Les plus
-- proches d'abord, 120 au plus. Le point n'est pas enregistré.
create function public.commercial_tour_candidates(
  p_lat double precision,
  p_lng double precision,
  p_ape text[],
  p_radius_m int default 3500
)
returns table (
  id uuid,
  nom text,
  ape_code text,
  adresse text,
  commune text,
  lat double precision,
  lng double precision,
  rge boolean,
  tranche_effectif text,
  date_creation date,
  mine boolean,
  distance_m int
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_me uuid := app.my_commercial_id();
  v_zone text[] := array(
    select z.code || '%'
    from public.commercials c
    cross join lateral unnest(c.zone_codes_postaux) as z (code)
    where c.id = v_me
  );
  v_point extensions.geography;
  v_radius int := greatest(200, least(coalesce(p_radius_m, 3500), 10000));
  v_tomorrow timestamptz := (date_trunc('day', now() at time zone 'Europe/Paris') + interval '1 day')
    at time zone 'Europe/Paris';
begin
  if v_me is null then
    raise exception 'Réservé aux commerciaux' using errcode = '42501';
  end if;
  if p_lat is null or p_lng is null or abs(p_lat) > 90 or abs(p_lng) > 180 then
    raise exception 'Point de départ invalide.' using errcode = '22023';
  end if;
  if coalesce(cardinality(p_ape), 0) = 0 or cardinality(p_ape) > 40 then
    raise exception 'Choisissez au moins un métier.' using errcode = '22023';
  end if;
  v_point := extensions.st_setsrid(extensions.st_makepoint(p_lng, p_lat), 4326)::extensions.geography;
  return query
  select p.id, coalesce(p.enseigne, p.denomination), p.ape_code, p.adresse, p.commune,
    extensions.st_y(p.location::extensions.geometry), extensions.st_x(p.location::extensions.geometry),
    p.rge, p.tranche_effectif, p.date_creation,
    f.commercial_id is not null,
    round(extensions.st_distance(p.location, v_point))::int
  from public.prospects p
  left join public.prospect_follows f on f.prospect_id = p.id
  where p.location is not null
    and extensions.st_dwithin(p.location, v_point, v_radius)
    and p.ape_code = any (p_ape)
    and (
      (f.prospect_id is null
        and app.prospect_stage(p.siren) is null
        and (cardinality(v_zone) = 0 or p.code_postal like any (v_zone)))
      or (f.commercial_id = v_me and f.status = 'a_contacter'
        and (f.next_action_at is null or f.next_action_at < v_tomorrow))
    )
  order by extensions.st_distance(p.location, v_point), p.id
  limit 120;
end;
$$;
revoke execute on function public.commercial_tour_candidates(double precision, double precision, text[], int)
  from public, anon;
grant execute on function public.commercial_tour_candidates(double precision, double precision, text[], int)
  to authenticated;

-- Points de départ possibles sans géolocalisation : les communes de ma zone (toutes sans zone),
-- au centre de leurs prospects, les plus fournies d'abord.
create function public.commercial_tour_starts()
returns table (
  commune text,
  code_postal text,
  lat double precision,
  lng double precision,
  prospects bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_me uuid := app.my_commercial_id();
  v_zone text[] := array(
    select z.code || '%'
    from public.commercials c
    cross join lateral unnest(c.zone_codes_postaux) as z (code)
    where c.id = v_me
  );
begin
  if v_me is null then
    raise exception 'Réservé aux commerciaux' using errcode = '42501';
  end if;
  return query
  select p.commune, min(p.code_postal),
    extensions.st_y(extensions.st_centroid(extensions.st_collect(p.location::extensions.geometry))),
    extensions.st_x(extensions.st_centroid(extensions.st_collect(p.location::extensions.geometry))),
    count(*)
  from public.prospects p
  where p.location is not null and p.commune is not null
    and (cardinality(v_zone) = 0 or p.code_postal like any (v_zone))
  group by p.commune
  order by count(*) desc, p.commune
  limit 300;
end;
$$;
revoke execute on function public.commercial_tour_starts() from public, anon;
grant execute on function public.commercial_tour_starts() to authenticated;

-- Fin d'une tournée : les suivis ouverts par elle et restés sans suite sont rendus.
create function app.end_commercial_tour(p_tour uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.commercial_tours set status = 'terminee', ended_at = now()
  where id = p_tour and status = 'en_cours';
  delete from public.prospect_follows f
  using public.commercial_tour_stops s, public.commercial_tours t
  where s.tour_id = p_tour and t.id = s.tour_id
    and f.prospect_id = s.prospect_id and f.commercial_id = t.commercial_id
    and s.suivi_cree and s.outcome is null
    and f.status = 'a_contacter' and f.next_action_at is null and f.notes is null and f.phone is null
    and not exists (select 1 from public.prospect_briefs b where b.prospect_id = f.prospect_id)
    and not exists (select 1 from public.prospect_reports r where r.prospect_id = f.prospect_id);
end;
$$;
revoke execute on function app.end_commercial_tour(uuid) from public, anon, authenticated;

-- Commencer une tournée : les arrêts dans l'ordre donné (calculé par planTour, @menao/core). Un
-- prospect libre est suivi par moi ; un prospect devenu indisponible est ignoré. La tournée en
-- cours, s'il y en a une, est terminée.
create function public.commercial_start_tour(
  p_prospects uuid[],
  p_metiers text[],
  p_duree text,
  p_distance_m int
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := app.my_commercial_id();
  v_tour uuid;
  v_previous uuid;
  v_pos int := 0;
  v_pid uuid;
  v_siren text;
  v_owner uuid;
begin
  if v_me is null then
    raise exception 'Réservé aux commerciaux' using errcode = '42501';
  end if;
  if coalesce(cardinality(p_prospects), 0) = 0 or cardinality(p_prospects) > 30 then
    raise exception 'Une tournée compte de 1 à 30 arrêts.' using errcode = '22023';
  end if;
  if p_duree is null or p_duree not in ('court', 'matinee', 'journee') then
    raise exception 'Durée inconnue.' using errcode = '22023';
  end if;
  if cardinality(coalesce(p_metiers, '{}')) > 11 then
    raise exception 'Trop de métiers.' using errcode = '22023';
  end if;
  select t.id into v_previous from public.commercial_tours t
  where t.commercial_id = v_me and t.status = 'en_cours' for update;
  if v_previous is not null then
    perform app.end_commercial_tour(v_previous);
  end if;
  insert into public.commercial_tours (commercial_id, metiers, duree, distance_m)
  values (v_me, coalesce(p_metiers, '{}'), p_duree, greatest(0, least(coalesce(p_distance_m, 0), 200000)))
  returning id into v_tour;
  foreach v_pid in array p_prospects loop
    continue when v_pid is null
      or exists (select 1 from public.commercial_tour_stops s where s.tour_id = v_tour and s.prospect_id = v_pid);
    select p.siren into v_siren from public.prospects p where p.id = v_pid for key share;
    continue when v_siren is null;
    select f.commercial_id into v_owner from public.prospect_follows f where f.prospect_id = v_pid;
    if v_owner is null then
      continue when app.prospect_stage(v_siren) is not null;
      insert into public.prospect_follows (prospect_id, commercial_id) values (v_pid, v_me)
      on conflict (prospect_id) do nothing;
      continue when not found;
      v_pos := v_pos + 1;
      insert into public.commercial_tour_stops (tour_id, position, prospect_id, suivi_cree)
      values (v_tour, v_pos, v_pid, true);
    elsif v_owner = v_me then
      v_pos := v_pos + 1;
      insert into public.commercial_tour_stops (tour_id, position, prospect_id)
      values (v_tour, v_pos, v_pid);
    end if;
  end loop;
  if v_pos = 0 then
    raise exception 'Ces prospects ne sont plus libres.' using errcode = '22023';
  end if;
  return v_tour;
end;
$$;
revoke execute on function public.commercial_start_tour(uuid[], text[], text, int) from public, anon;
grant execute on function public.commercial_start_tour(uuid[], text[], text, int) to authenticated;

create function public.commercial_end_tour(p_tour uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := app.my_commercial_id();
begin
  if v_me is null then
    raise exception 'Réservé aux commerciaux' using errcode = '42501';
  end if;
  perform 1 from public.commercial_tours t where t.id = p_tour and t.commercial_id = v_me for update;
  if not found then
    raise exception 'Tournée introuvable.' using errcode = 'P0002';
  end if;
  perform app.end_commercial_tour(p_tour);
end;
$$;
revoke execute on function public.commercial_end_tour(uuid) from public, anon;
grant execute on function public.commercial_end_tour(uuid) to authenticated;

-- Suite d'une visite. Intéressé : démo faite ; pas intéressé : étape « pas intéressé », sans
-- relance ; à rappeler et absent : à contacter, relance à la date donnée (outcomeNextAction).
-- Modifiable tant que la tournée est en cours (« Corriger »).
create function public.commercial_tour_outcome(
  p_tour uuid,
  p_prospect uuid,
  p_outcome public.tour_outcome,
  p_next_action_at timestamptz default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := app.my_commercial_id();
begin
  if v_me is null then
    raise exception 'Réservé aux commerciaux' using errcode = '42501';
  end if;
  if p_outcome is null then
    raise exception 'Suite de la visite manquante.' using errcode = '22023';
  end if;
  if p_outcome in ('a_rappeler', 'absent')
     and (p_next_action_at is null or p_next_action_at < now() - interval '1 hour'
       or p_next_action_at > now() + interval '90 days') then
    raise exception 'Date de relance invalide.' using errcode = '22023';
  end if;
  update public.commercial_tour_stops s set outcome = p_outcome, visited_at = now()
  from public.commercial_tours t
  where s.tour_id = p_tour and s.prospect_id = p_prospect
    and t.id = s.tour_id and t.commercial_id = v_me and t.status = 'en_cours';
  if not found then
    raise exception 'Arrêt introuvable dans une tournée en cours.' using errcode = 'P0002';
  end if;
  insert into public.prospect_follows (prospect_id, commercial_id) values (p_prospect, v_me)
  on conflict (prospect_id) do nothing;
  update public.prospect_follows f set
    status = case p_outcome
      when 'interesse' then 'demo_faite'::public.prospect_status
      when 'pas_interesse' then 'pas_interesse'::public.prospect_status
      else 'a_contacter'::public.prospect_status
    end,
    next_action_at = case p_outcome
      when 'interesse' then f.next_action_at
      when 'pas_interesse' then null
      else p_next_action_at
    end
  where f.prospect_id = p_prospect and f.commercial_id = v_me;
  if not found then
    raise exception 'Déjà suivi par un collègue.' using errcode = '22023';
  end if;
end;
$$;
revoke execute on function public.commercial_tour_outcome(uuid, uuid, public.tour_outcome, timestamptz)
  from public, anon;
grant execute on function public.commercial_tour_outcome(uuid, uuid, public.tour_outcome, timestamptz)
  to authenticated;

-- Une tournée et ses arrêts (fiche, suite, accroche du copilote si une fiche existe), les
-- inscriptions avec mon code pendant la tournée et le montant de la prime de validation.
create function public.commercial_tour(p_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_me uuid := app.my_commercial_id();
  v_tour public.commercial_tours;
begin
  if v_me is null then
    raise exception 'Réservé aux commerciaux' using errcode = '42501';
  end if;
  select * into v_tour from public.commercial_tours t where t.id = p_id and t.commercial_id = v_me;
  if v_tour.id is null then
    return null;
  end if;
  return jsonb_build_object(
    'id', v_tour.id,
    'status', v_tour.status,
    'duree', v_tour.duree,
    'metiers', to_jsonb(v_tour.metiers),
    'distance_m', v_tour.distance_m,
    'created_at', v_tour.created_at,
    'ended_at', v_tour.ended_at,
    'inscriptions', (
      select count(*) from public.commercial_attributions a
      where a.commercial_id = v_me
        and a.created_at between v_tour.created_at and coalesce(v_tour.ended_at, now())
    ),
    'prime_validation_centimes', (
      select s.prime_validation_centimes from public.commercial_bonus_settings s limit 1
    ),
    'stops', coalesce((
      select jsonb_agg(jsonb_build_object(
        'position', s.position,
        'prospect_id', p.id,
        'nom', coalesce(p.enseigne, p.denomination),
        'ape_code', p.ape_code,
        'adresse', p.adresse,
        'commune', p.commune,
        'lat', extensions.st_y(p.location::extensions.geometry),
        'lng', extensions.st_x(p.location::extensions.geometry),
        'rge', p.rge,
        'tranche_effectif', p.tranche_effectif,
        'date_creation', p.date_creation,
        'outcome', s.outcome,
        'visited_at', s.visited_at,
        'phone', case when f.commercial_id = v_me then f.phone end,
        'next_action_at', case when f.commercial_id = v_me then f.next_action_at end,
        'accroche', case when f.commercial_id = v_me then b.content ->> 'openingQuestion' end
      ) order by s.position)
      from public.commercial_tour_stops s
      join public.prospects p on p.id = s.prospect_id
      left join public.prospect_follows f on f.prospect_id = p.id
      left join public.prospect_briefs b on b.prospect_id = f.prospect_id
      where s.tour_id = v_tour.id
    ), '[]'::jsonb)
  );
end;
$$;
revoke execute on function public.commercial_tour(uuid) from public, anon;
grant execute on function public.commercial_tour(uuid) to authenticated;

-- Purge quotidienne : tournées terminées depuis plus de 13 mois.
create function app.purge_commercial_tours()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  delete from public.commercial_tours t
  where t.status = 'terminee' and t.ended_at < now() - interval '13 months';
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;
revoke execute on function app.purge_commercial_tours() from public, anon, authenticated;

select cron.schedule('menao-purge-tournees', '40 3 * * *', 'select app.purge_commercial_tours()');
