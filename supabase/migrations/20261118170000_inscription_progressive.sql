-- Inscription progressive (F-179, ADR 0376). Un artisan qui doit attendre son assureur avant
-- d'envoyer son dossier est souvent perdu. Le dossier part donc à l'équipe avec ce qu'il a toujours
-- sous la main : entreprise, métiers, zone, charte, Kbis, pièce d'identité et fiche. Les trois
-- attestations (décennale ou « non soumis », RC Pro, URSSAF) se déposent avant ou après l'envoi.
-- Elles restent obligatoires pour la mise en ligne : admin_decide_artisan ne valide toujours un
-- dossier que si tous les documents sont validés (app.documents_complete), et un artisan n'est
-- visible que validé (app.artisan_is_visible). Rien de cela ne change ici.

-- Documents de l'envoi : Kbis de moins de 3 mois et pièce d'identité en cours de validité.
-- Miroir de SEND_DOCUMENT_TYPES (packages/core/src/onboarding.ts).
create function app.send_documents_complete(p_artisan_id uuid, p_statuses public.document_status[])
returns boolean
language sql
stable
set search_path = ''
as $$
  select (
    select count(distinct d.type)
    from public.artisan_documents d
    where d.artisan_id = p_artisan_id and d.status = any (p_statuses) and (
      (d.type = 'kbis' and d.date_emission >= (current_date - interval '3 months')::date)
      or (d.type = 'identite' and (d.date_fin is null or d.date_fin >= current_date))
    )
  ) = 2
$$;
revoke execute on function app.send_documents_complete(uuid, public.document_status[])
  from public, anon, authenticated;

-- Attestations qui manquent encore pour la mise en ligne : ni déposées ni validées, ou périmées.
-- Sans la décennale pour un artisan « non soumis » (ADR 0116). Miroir de attestationsProgress.
create function app.attestations_missing(p_artisan_id uuid)
returns text[]
language sql
stable
set search_path = ''
as $$
  select coalesce(array_agg(t.type order by t.rang), '{}')
  from public.artisans a
  cross join (values ('decennale', 1), ('rc_pro', 2), ('urssaf', 3)) as t (type, rang)
  where a.id = p_artisan_id
    and not (t.type = 'decennale' and a.decennale_non_soumis)
    and not exists (
      select 1 from public.artisan_documents d
      where d.artisan_id = a.id and d.type::text = t.type
        and d.status in ('en_attente', 'valide')
        and (
          (d.type in ('decennale', 'rc_pro') and d.date_fin >= current_date)
          or (d.type = 'urssaf' and d.date_emission >= (current_date - interval '6 months')::date)
        )
    )
$$;
revoke execute on function app.attestations_missing(uuid) from public, anon, authenticated;

-- Étapes manquantes avant l'envoi : « documents » ne couvre plus que le Kbis et la pièce
-- d'identité. Le reste de la fonction est celui de 20261117000000_image_au_choix.sql.
create or replace function app.onboarding_missing_steps(p_artisan_id uuid)
returns text[]
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  a public.artisans;
  v_missing text[] := '{}';
begin
  select * into a from public.artisans where id = p_artisan_id;
  if not found then
    return null;
  end if;

  if not (a.sirene_checked_at is not null and a.sirene_active and a.raison_sociale is not null
          and a.assujetti_tva is not null) then
    v_missing := array_append(v_missing, 'entreprise');
  end if;
  if not exists (select 1 from public.artisan_trades t where t.artisan_id = a.id) then
    v_missing := array_append(v_missing, 'metiers');
  end if;
  if not ((a.zone_mode = 'rayon' and a.base_location is not null and a.radius_km is not null)
          or (a.zone_mode = 'communes' and exists (select 1 from public.artisan_zones z where z.artisan_id = a.id))
          or (a.zone_mode = 'france' and a.base_location is not null)
          or (a.zone_mode in ('departements', 'regions') and a.base_location is not null
              and exists (select 1 from public.artisan_territories t where t.artisan_id = a.id))) then
    v_missing := array_append(v_missing, 'zone');
  end if;
  if not app.charter_signed(a.id) then
    v_missing := array_append(v_missing, 'charte');
  end if;
  -- Inscription progressive (ADR 0376) : les attestations ne retardent plus l'envoi.
  if not app.send_documents_complete(a.id, array['en_attente', 'valide']::public.document_status[]) then
    v_missing := array_append(v_missing, 'documents');
  end if;
  -- Image facultative (ADR 0355) : la présentation suffit.
  if not (char_length(coalesce(a.presentation, '')) >= 100) then
    v_missing := array_append(v_missing, 'profil');
  end if;
  return v_missing;
end;
$$;

-- « Non soumis » à la décennale : déclarable aussi une fois le dossier envoyé, tant que l'équipe
-- ne l'a pas validé (l'attestation se dépose désormais après l'envoi). Patron seul, comme depuis
-- 20261107150000_droits_equipe.sql.
create or replace function public.set_decennale_non_soumis(p_value boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_artisan uuid := app.my_owned_artisan_id();
begin
  if v_artisan is null then
    raise exception 'Aucune fiche artisan pour cet utilisateur.' using errcode = '42501';
  end if;
  update public.artisans set decennale_non_soumis = coalesce(p_value, false)
  where id = v_artisan and status in ('brouillon', 'refuse', 'en_verification');
  if not found then
    raise exception 'Le dossier ne peut plus être modifié.' using errcode = '22023';
  end if;
end;
$$;

-- Relance des attestations : dossier envoyé, mais il manque encore une attestation pour la mise
-- en ligne. Quatre rappels au plus, à J+3, J+7, J+14 et J+30 de l'envoi. Même type que la relance
-- de l'inscription (catégorie « rappels », désactivable), distingué par data.phase.
create function app.remind_attestations(p_now timestamptz default now())
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  r record;
  v_offsets interval[] := array[interval '3 days', interval '7 days', interval '14 days', interval '30 days'];
  v_count integer := 0;
  v_missing text[];
begin
  for r in
    select a.id, a.user_id, a.submitted_at,
           count(n.id)::int as sent, max(n.created_at) as last_sent
    from public.artisans a
    left join public.notifications n
      on n.user_id = a.user_id and n.type = 'inscription_relance'
     and n.data ->> 'phase' = 'attestations' and n.created_at >= a.submitted_at
    where a.status = 'en_verification' and a.submitted_at is not null
      and not app.identity_blocked(a.id)
    group by a.id, a.user_id, a.submitted_at
  loop
    continue when r.sent >= 4;
    continue when r.submitted_at > p_now - v_offsets[r.sent + 1];
    -- Jamais deux rappels à moins de deux jours d'écart (relance rattrapée après une panne).
    continue when r.last_sent is not null and r.last_sent > p_now - interval '2 days';
    v_missing := app.attestations_missing(r.id);
    continue when cardinality(v_missing) = 0;
    perform app.notify(r.user_id, 'inscription_relance', jsonb_build_object(
      'phase', 'attestations',
      'etape', r.sent + 1,
      'manque', to_jsonb(v_missing)
    ));
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;
revoke execute on function app.remind_attestations(timestamptz) from public, anon, authenticated;

-- Chaque jour à 8 h 30 UTC, après les autres relances de l'inscription (8 h à 8 h 20).
select cron.schedule('menao-relance-attestations', '30 8 * * *', 'select app.remind_attestations()');

-- Back-office, « Inscriptions en cours » : les dossiers envoyés qui attendent encore des
-- attestations de l'artisan, à côté des brouillons et des artisans validés pas encore visibles.
-- L'équipe sait ainsi qu'elle n'a rien à vérifier de plus pour l'instant.
create or replace function public.admin_stalled_signups()
returns table (
  artisan_id uuid,
  entreprise text,
  etat text,
  manque text[],
  depuis timestamptz,
  relances integer,
  derniere_relance timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not (app.is_staff() or app.is_verifier()) then
    raise exception 'Réservé à l''équipe MENAO' using errcode = '42501';
  end if;
  return query
  select s.id, s.entreprise, s.etat, s.manque, s.depuis,
         (select count(*)::int from public.notifications n
          where n.user_id = s.user_id and n.type = s.relance and n.created_at >= s.depuis
            and coalesce(n.data ->> 'phase', '') = s.phase),
         (select max(n.created_at) from public.notifications n
          where n.user_id = s.user_id and n.type = s.relance and n.created_at >= s.depuis
            and coalesce(n.data ->> 'phase', '') = s.phase)
  from (
    select a.id, a.user_id, coalesce(a.nom_commercial, a.raison_sociale) as entreprise,
           case when a.refusal_reason is not null then 'complement' else 'dossier' end as etat,
           app.onboarding_missing_steps(a.id) as manque,
           app.signup_cycle_start(a.id) as depuis,
           'inscription_relance'::public.notification_type as relance,
           -- Rappels des attestations : même type, distingués par data.phase.
           ''::text as phase
    from public.artisans a
    where a.status = 'brouillon'
    union all
    select a.id, a.user_id, coalesce(a.nom_commercial, a.raison_sociale), 'attestations',
           app.attestations_missing(a.id),
           coalesce(a.submitted_at, a.created_at),
           'inscription_relance'::public.notification_type, 'attestations'
    from public.artisans a
    where a.status = 'en_verification' and cardinality(app.attestations_missing(a.id)) > 0
    union all
    select a.id, a.user_id, coalesce(a.nom_commercial, a.raison_sociale), 'activation',
           app.activation_missing_steps(a.id),
           coalesce((select max(rv.created_at) from public.artisan_reviews rv
                     where rv.artisan_id = a.id and rv.decision = 'valide'), a.created_at),
           'activation_relance'::public.notification_type, ''
    from public.artisans a
    where a.status = 'valide' and not app.artisan_is_visible(a.id)
  ) s
  order by s.depuis
  limit 500;
end;
$$;
