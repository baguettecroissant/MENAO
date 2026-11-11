-- Objectif de demandes par artisan (F-131, ADR 0282).
--
-- Chaque artisan validé doit recevoir un minimum de demandes de devis par mois. Le back-office
-- suit, mois par mois, les demandes reçues de chaque artisan face à son objectif, avec les
-- recherches de son métier dans sa zone (pour savoir s'il manque des clients ou de la visibilité).
-- Les statuts (atteint, dans les temps, en retard) et les alertes sont calculés dans
-- @menao/core (lead-targets.ts) ; la base renvoie les chiffres.
--
-- Demandes comptées comme dans les chiffres de lancement (ADR 0209) : hors demandes retenues pour
-- vérification et hors demandes annulées avant d'être transmises. Les demandes directes (fiche,
-- carte de visite, « Redemander un devis ») sont comptées à part et n'entrent pas dans
-- l'objectif (ADR 0198 : hors des « 4 demandes par mois » de la garantie).

-- Objectif par défaut : 4 demandes par mois, le seuil de la garantie des formules (ADR 0200).
insert into public.platform_settings (key, value) values ('objectif_demandes_mois', '4');

-- Objectif propre à un artisan, fixé par un admin (0 : artisan hors suivi).
create table public.artisan_lead_targets (
  artisan_id uuid primary key references public.artisans (id) on delete cascade,
  objectif integer not null check (objectif between 0 and 100),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null
);

alter table public.artisan_lead_targets enable row level security;
revoke all on public.artisan_lead_targets from anon, authenticated;
grant select on public.artisan_lead_targets to authenticated;

create policy "artisan_lead_targets : lecture par les administrateurs"
  on public.artisan_lead_targets for select to authenticated
  using ((select app.is_admin()));

-- Réglage de l'objectif : par défaut (artisan nul) ou propre à un artisan (objectif nul : il
-- reprend l'objectif par défaut). Journalisé.
create function public.admin_set_lead_target(p_artisan_id uuid, p_objectif integer)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform app.require_admin();
  if p_objectif is not null and (p_objectif < 0 or p_objectif > 100) then
    raise exception 'L''objectif doit être compris entre 0 et 100 demandes par mois.'
      using errcode = '22023';
  end if;
  if p_artisan_id is null then
    if p_objectif is null or p_objectif < 1 then
      raise exception 'L''objectif par défaut doit être d''au moins 1 demande par mois.'
        using errcode = '22023';
    end if;
    update public.platform_settings
    set value = to_jsonb(p_objectif), updated_at = now(), updated_by = (select auth.uid())
    where key = 'objectif_demandes_mois';
    perform app.audit('objectif_demandes', 'platform_settings', null,
      jsonb_build_object('objectif', p_objectif));
    return;
  end if;
  if not exists (select 1 from public.artisans a where a.id = p_artisan_id) then
    raise exception 'Artisan introuvable.' using errcode = '22023';
  end if;
  if p_objectif is null then
    delete from public.artisan_lead_targets where artisan_id = p_artisan_id;
  else
    insert into public.artisan_lead_targets (artisan_id, objectif, updated_by)
    values (p_artisan_id, p_objectif, (select auth.uid()))
    on conflict (artisan_id) do update
      set objectif = excluded.objectif, updated_at = now(), updated_by = excluded.updated_by;
  end if;
  perform app.audit('objectif_demandes', 'artisan', p_artisan_id,
    jsonb_build_object('objectif', p_objectif));
end;
$$;
revoke execute on function public.admin_set_lead_target(uuid, integer) from public, anon;
grant execute on function public.admin_set_lead_target(uuid, integer) to authenticated;

-- Suivi d'un mois (le mois en cours par défaut) et des 5 mois qui le précèdent, pour chaque
-- artisan validé, ou pour un seul artisan (fiche du back-office).
create function public.admin_lead_targets(p_month date default null, p_artisan_id uuid default null)
returns json
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_today date := (now() at time zone 'Europe/Paris')::date;
  v_month date := date_trunc('month', coalesce(p_month, v_today))::date;
  v_first date := (v_month - interval '5 months')::date;
  v_from timestamptz := (v_month - interval '5 months')::timestamp at time zone 'Europe/Paris';
  v_start timestamptz := v_month::timestamp at time zone 'Europe/Paris';
  v_end timestamptz := (v_month + interval '1 month')::timestamp at time zone 'Europe/Paris';
  v_default integer;
begin
  perform app.require_admin();
  if v_month > date_trunc('month', v_today)::date then
    raise exception 'Ce mois n''a pas encore commencé.' using errcode = '22023';
  end if;
  v_default := coalesce(
    (select (s.value #>> '{}')::integer from public.platform_settings s
     where s.key = 'objectif_demandes_mois'),
    4);

  return (
    with arts as (
      select a.id, coalesce(a.nom_commercial, a.raison_sociale) as nom, a.paused, a.zone_mode,
        a.radius_km, a.base_location, a.base_label, a.adresse_commune, a.budget_minimum,
        fv.valide_le, lt.objectif as objectif_propre
      from public.artisans a
      join lateral (
        select min(r.created_at) as valide_le
        from public.artisan_reviews r
        where r.artisan_id = a.id and r.decision = 'valide'
      ) fv on fv.valide_le is not null
      left join public.artisan_lead_targets lt on lt.artisan_id = a.id
      where a.status = 'valide'
        and fv.valide_le < v_end
        and (p_artisan_id is null or a.id = p_artisan_id)
    ),
    -- Mêmes règles que les chiffres de lancement (ADR 0209).
    reqs as (
      select r.artisan_id, r.status,
        date_trunc('month', r.created_at at time zone 'Europe/Paris')::date as mois,
        coalesce(p.preferred_artisan_id = r.artisan_id, false) as directe
      from public.requests r
      join public.projects p on p.id = r.project_id
      join arts a on a.id = r.artisan_id
      where r.created_at >= v_from and r.created_at < v_end
        and r.status <> 'a_verifier'
        and not (r.status = 'annulee' and r.cancellation_reason is null and r.responded_at is null)
        and not (r.status = 'annulee' and r.responded_at is null and exists (
          select 1 from public.tickets tk
          where tk.project_id = r.project_id and tk.type = 'particulier_a_verifier'
            and tk.created_at = r.created_at
        ))
    ),
    -- Recherches du mois choisi pour un métier de l'artisan, dans sa zone (critères validés).
    searches as (
      select a.id as artisan_id, count(distinct p.id) as n
      from arts a
      join public.projects p
        on p.status <> 'brouillon'
        and p.created_at >= v_start and p.created_at < v_end
        and p.trade_code in (select t.trade_code from public.artisan_trades t where t.artisan_id = a.id)
        and (
          (a.zone_mode = 'rayon' and a.base_location is not null and a.radius_km is not null
            and coalesce(p.location, p.ville_location) is not null
            and extensions.st_dwithin(
              coalesce(p.location, p.ville_location), a.base_location, a.radius_km * 1000))
          or (a.zone_mode = 'communes' and p.ville_code_insee in (
            select z.code_insee from public.artisan_zones z where z.artisan_id = a.id))
          or app.artisan_couvre_territoire(a.id, a.zone_mode, p.ville_code_insee)
        )
      group by a.id
    )
    select json_build_object(
      'mois', v_month,
      'aujourdhui', v_today,
      'objectif_defaut', v_default,
      'artisans', coalesce((
        select json_agg(json_build_object(
          'id', a.id,
          'nom', a.nom,
          'ville', coalesce(a.base_label, a.adresse_commune),
          'metiers', coalesce((
            select json_agg(tr.label order by tr.sort_order)
            from public.artisan_trades t join public.trades tr on tr.code = t.trade_code
            where t.artisan_id = a.id), '[]'::json),
          'valide_le', (a.valide_le at time zone 'Europe/Paris')::date,
          'objectif', coalesce(a.objectif_propre, v_default),
          'objectif_propre', a.objectif_propre is not null,
          'en_pause', a.paused,
          'absent', app.artisan_absent(a.id, v_today),
          'visible', app.artisan_is_visible(a.id),
          'budget_minimum', a.budget_minimum,
          'recherches_zone', coalesce((select s.n from searches s where s.artisan_id = a.id), 0),
          'recues', (select count(*) from reqs r
                     where r.artisan_id = a.id and r.mois = v_month and not r.directe),
          'directes', (select count(*) from reqs r
                       where r.artisan_id = a.id and r.mois = v_month and r.directe),
          'acceptees', (select count(*) from reqs r
                        where r.artisan_id = a.id and r.mois = v_month and not r.directe
                          and r.status = 'acceptee'),
          'historique', (
            select json_agg(json_build_object(
              'mois', m.mois,
              'recues', (select count(*) from reqs r
                         where r.artisan_id = a.id and r.mois = m.mois and not r.directe)
            ) order by m.mois)
            from (select (v_first + make_interval(months => i))::date as mois
                  from generate_series(0, 5) i) m
          )
        ) order by a.nom)
        from arts a
      ), '[]'::json)
    )
  );
end;
$$;
revoke execute on function public.admin_lead_targets(date, uuid) from public, anon;
grant execute on function public.admin_lead_targets(date, uuid) to authenticated;
