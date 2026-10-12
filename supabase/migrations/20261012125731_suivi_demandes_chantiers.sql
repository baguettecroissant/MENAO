-- F-53 et suivi des demandes (ADR 0046) : listes filtrables des demandes et des chantiers pour le
-- back-office, avec recherche (client, e-mail, artisan, ville, métier, description), réservées
-- aux admins en session aal2 (app.is_admin). Lecture seule ; les messages restent privés.

-- ---------------------------------------------------------------------------
-- Recherche : texte libre échappé pour ILIKE (les % et _ saisis ne sont pas des jokers).
-- ---------------------------------------------------------------------------
create function app.admin_like(p_query text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when nullif(btrim(coalesce(p_query, '')), '') is null then null
    else '%' || replace(replace(replace(btrim(p_query), '\', '\\'), '%', '\%'), '_', '\_') || '%'
  end
$$;

-- ---------------------------------------------------------------------------
-- Demandes : un projet par ligne (recherche, demandes aux artisans, chantier), avec son étape.
--   non_envoyee : recherche sans demande ; en_attente : au moins une demande ouverte ;
--   chantier : rendez-vous fixé (ou demande acceptée) ; sans_suite : demandes refusées,
--   expirées ou annulées.
-- ---------------------------------------------------------------------------
create function app.admin_project_rows()
returns table (
  project_id uuid, created_at timestamptz, etape text, metier text, ville text, client text,
  email text, description text, artisans text, demandes integer, acceptees integer,
  en_attente integer, prochaine_echeance timestamptz, chantier_id uuid
)
language sql
stable
security definer
set search_path = ''
as $$
  with base as (
    select p.id, p.created_at, tr.label as metier, p.ville_nom as ville, p.description,
      nullif(btrim(concat_ws(' ', pr.first_name, pr.last_name)), '') as client, u.email::text as email,
      count(r.id)::integer as demandes,
      (count(r.id) filter (where r.status = 'acceptee'))::integer as acceptees,
      (count(r.id) filter (where r.status = 'envoyee' and r.expires_at > now()))::integer as en_attente,
      min(r.expires_at) filter (where r.status = 'envoyee' and r.expires_at > now()) as prochaine_echeance,
      string_agg(coalesce(a.nom_commercial, a.raison_sociale), ' ') as artisans,
      (select c.id from public.chantiers c where c.project_id = p.id order by c.created_at limit 1) as chantier_id
    from public.projects p
    left join public.trades tr on tr.code = p.trade_code
    left join public.profiles pr on pr.user_id = p.user_id
    left join auth.users u on u.id = p.user_id
    left join public.requests r on r.project_id = p.id
    left join public.artisans a on a.id = r.artisan_id
    group by p.id, tr.label, pr.first_name, pr.last_name, u.email
  )
  select b.id, b.created_at,
    case
      when b.chantier_id is not null or b.acceptees > 0 then 'chantier'
      when b.en_attente > 0 then 'en_attente'
      when b.demandes > 0 then 'sans_suite'
      else 'non_envoyee'
    end,
    b.metier, b.ville, b.client, b.email, b.description, b.artisans, b.demandes, b.acceptees,
    b.en_attente, b.prochaine_echeance, b.chantier_id
  from base b
$$;
revoke execute on function app.admin_project_rows() from public, anon, authenticated;

create function public.admin_projects(
  p_filter text default 'toutes',
  p_query text default null,
  p_limit integer default 50,
  p_offset integer default 0
)
returns table (
  project_id uuid, created_at timestamptz, etape text, metier text, ville text, client text,
  demandes integer, acceptees integer, en_attente integer, prochaine_echeance timestamptz,
  chantier_id uuid, total bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_like text := app.admin_like(p_query);
begin
  if not app.is_admin() then
    raise exception 'Réservé à l''équipe MENAO' using errcode = '42501';
  end if;
  return query
  select r.project_id, r.created_at, r.etape, r.metier, r.ville, r.client, r.demandes,
    r.acceptees, r.en_attente, r.prochaine_echeance, r.chantier_id, count(*) over ()
  from app.admin_project_rows() r
  where (
      coalesce(p_filter, 'toutes') = 'toutes'
      or r.etape = p_filter
      or (p_filter = 'expirent' and r.prochaine_echeance <= now() + interval '12 hours')
    )
    and (
      v_like is null
      or r.metier ilike v_like or r.ville ilike v_like or r.client ilike v_like
      or r.email ilike v_like or r.artisans ilike v_like or r.description ilike v_like
    )
  order by r.created_at desc
  limit least(greatest(coalesce(p_limit, 50), 1), 100)
  offset greatest(coalesce(p_offset, 0), 0);
end;
$$;

-- Nombre de demandes par filtre, pour les pastilles de la liste (même recherche).
create function public.admin_project_counts(p_query text default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_like text := app.admin_like(p_query);
begin
  if not app.is_admin() then
    raise exception 'Réservé à l''équipe MENAO' using errcode = '42501';
  end if;
  return (
    select jsonb_build_object(
      'toutes', count(*),
      'non_envoyee', count(*) filter (where r.etape = 'non_envoyee'),
      'en_attente', count(*) filter (where r.etape = 'en_attente'),
      'expirent', count(*) filter (where r.prochaine_echeance <= now() + interval '12 hours'),
      'chantier', count(*) filter (where r.etape = 'chantier'),
      'sans_suite', count(*) filter (where r.etape = 'sans_suite')
    )
    from app.admin_project_rows() r
    where v_like is null
      or r.metier ilike v_like or r.ville ilike v_like or r.client ilike v_like
      or r.email ilike v_like or r.artisans ilike v_like or r.description ilike v_like
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Chantiers : statut, parties, dernière activité, devis retenu et montant déjà payé.
-- ---------------------------------------------------------------------------
create function app.admin_chantier_rows()
returns table (
  chantier_id uuid, created_at timestamptz, status public.chantier_status, title text, ville text,
  artisan_id uuid, artisan text, client text, email text, derniere_activite timestamptz,
  devis_ttc_cents bigint, paye_cents bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  select c.id, c.created_at, c.status, c.title, c.ville_nom, c.artisan_id,
    coalesce(a.nom_commercial, a.raison_sociale),
    nullif(btrim(concat_ws(' ', pr.first_name, pr.last_name)), ''), u.email::text,
    greatest(c.updated_at, (select max(e.created_at) from public.chantier_events e where e.chantier_id = c.id)),
    -- Devis signé, sinon dernier devis envoyé au client.
    (select q.total_ttc_cents from public.quotes q
      where q.chantier_id = c.id and q.status in ('signe', 'envoye', 'revision_demandee')
      order by (q.status = 'signe') desc, q.version desc limit 1),
    coalesce((select sum(pa.amount_cents) from public.payments pa
      where pa.chantier_id = c.id and pa.status = 'paye'), 0)::bigint
  from public.chantiers c
  join public.artisans a on a.id = c.artisan_id
  left join public.profiles pr on pr.user_id = c.particulier_id
  left join auth.users u on u.id = c.particulier_id
$$;
revoke execute on function app.admin_chantier_rows() from public, anon, authenticated;

create function public.admin_chantiers(
  p_statuses public.chantier_status[] default null,
  p_query text default null,
  p_limit integer default 50,
  p_offset integer default 0
)
returns table (
  chantier_id uuid, created_at timestamptz, status public.chantier_status, title text, ville text,
  artisan_id uuid, artisan text, client text, derniere_activite timestamptz,
  devis_ttc_cents bigint, paye_cents bigint, total bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_like text := app.admin_like(p_query);
begin
  if not app.is_admin() then
    raise exception 'Réservé à l''équipe MENAO' using errcode = '42501';
  end if;
  return query
  select r.chantier_id, r.created_at, r.status, r.title, r.ville, r.artisan_id, r.artisan,
    r.client, r.derniere_activite, r.devis_ttc_cents, r.paye_cents, count(*) over ()
  from app.admin_chantier_rows() r
  where (p_statuses is null or cardinality(p_statuses) = 0 or r.status = any (p_statuses))
    and (
      v_like is null
      or r.title ilike v_like or r.ville ilike v_like or r.artisan ilike v_like
      or r.client ilike v_like or r.email ilike v_like
    )
  order by r.derniere_activite desc nulls last
  limit least(greatest(coalesce(p_limit, 50), 1), 100)
  offset greatest(coalesce(p_offset, 0), 0);
end;
$$;

-- Nombre de chantiers par statut (même recherche) ; les étapes sont regroupées par packages/core.
create function public.admin_chantier_counts(p_query text default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_like text := app.admin_like(p_query);
begin
  if not app.is_admin() then
    raise exception 'Réservé à l''équipe MENAO' using errcode = '42501';
  end if;
  return (
    select coalesce(jsonb_object_agg(s.status, s.n), '{}'::jsonb)
    from (
      select r.status, count(*) as n
      from app.admin_chantier_rows() r
      where v_like is null
        or r.title ilike v_like or r.ville ilike v_like or r.artisan ilike v_like
        or r.client ilike v_like or r.email ilike v_like
      group by r.status
    ) s
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Adresses e-mail des comptes affichés dans une fiche (client d'une demande ou d'un chantier).
-- ---------------------------------------------------------------------------
create function public.admin_user_emails(p_user_ids uuid[])
returns table (user_id uuid, email text)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
begin
  if not app.is_admin() then
    raise exception 'Réservé à l''équipe MENAO' using errcode = '42501';
  end if;
  return query
  select u.id, u.email::text from auth.users u
  where u.id = any (p_user_ids) and not coalesce(u.is_anonymous, false);
end;
$$;

-- ---------------------------------------------------------------------------
-- Fil d'activité (ADR 0045) : identifiants de la demande et du chantier, pour ouvrir leur fiche.
-- ---------------------------------------------------------------------------
create or replace function public.admin_activity(p_limit integer default 40)
returns table (occurred_at timestamptz, kind text, details jsonb)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_limit integer := least(greatest(coalesce(p_limit, 40), 1), 100);
begin
  if not app.is_admin() then
    raise exception 'Réservé à l''équipe MENAO' using errcode = '42501';
  end if;

  return query
  select f.happened, f.what, f.data
  from (
    (select p.created_at as happened, 'recherche'::text as what,
        jsonb_build_object('project_id', p.id, 'metier', tr.label, 'ville', p.ville_nom) as data
      from public.projects p
      left join public.trades tr on tr.code = p.trade_code
      order by p.created_at desc limit v_limit)
    union all
    (select r.created_at, 'demande_envoyee', jsonb_build_object(
        'project_id', r.project_id, 'artisan_id', r.artisan_id,
        'artisan', coalesce(a.nom_commercial, a.raison_sociale), 'metier', tr.label, 'ville', p.ville_nom)
      from public.requests r
      join public.artisans a on a.id = r.artisan_id
      join public.projects p on p.id = r.project_id
      left join public.trades tr on tr.code = p.trade_code
      order by r.created_at desc limit v_limit)
    union all
    (select r.responded_at,
        case when r.status = 'acceptee' then 'demande_acceptee' else 'demande_refusee' end,
        jsonb_build_object(
          'project_id', r.project_id, 'artisan_id', r.artisan_id,
          'artisan', coalesce(a.nom_commercial, a.raison_sociale), 'ville', p.ville_nom,
          'motif', r.refusal_reason)
      from public.requests r
      join public.artisans a on a.id = r.artisan_id
      join public.projects p on p.id = r.project_id
      where r.responded_at is not null and r.status in ('acceptee', 'refusee')
      order by r.responded_at desc limit v_limit)
    union all
    (select r.expires_at, 'demande_expiree', jsonb_build_object(
        'project_id', r.project_id, 'artisan_id', r.artisan_id,
        'artisan', coalesce(a.nom_commercial, a.raison_sociale), 'ville', p.ville_nom)
      from public.requests r
      join public.artisans a on a.id = r.artisan_id
      join public.projects p on p.id = r.project_id
      where r.status = 'expiree'
      order by r.expires_at desc limit v_limit)
    union all
    (select r.cancelled_at, 'demande_annulee', jsonb_build_object(
        'project_id', r.project_id, 'artisan_id', r.artisan_id,
        'artisan', coalesce(a.nom_commercial, a.raison_sociale), 'ville', p.ville_nom)
      from public.requests r
      join public.artisans a on a.id = r.artisan_id
      join public.projects p on p.id = r.project_id
      where r.cancelled_at is not null
      order by r.cancelled_at desc limit v_limit)
    union all
    (select e.created_at, 'chantier', jsonb_build_object(
        'chantier_id', e.chantier_id, 'evenement', e.event, 'titre', c.title,
        'artisan_id', c.artisan_id, 'artisan', coalesce(a.nom_commercial, a.raison_sociale),
        'ville', c.ville_nom)
      from public.chantier_events e
      join public.chantiers c on c.id = e.chantier_id
      join public.artisans a on a.id = c.artisan_id
      order by e.created_at desc limit v_limit)
    union all
    (select a.submitted_at, 'dossier_envoye', jsonb_build_object(
        'artisan_id', a.id, 'entreprise', coalesce(a.nom_commercial, a.raison_sociale))
      from public.artisans a
      where a.submitted_at is not null
      order by a.submitted_at desc limit v_limit)
    union all
    (select ar.created_at, 'dossier_decision', jsonb_build_object(
        'artisan_id', a.id, 'entreprise', coalesce(a.nom_commercial, a.raison_sociale),
        'decision', ar.decision)
      from public.artisan_reviews ar
      join public.artisans a on a.id = ar.artisan_id
      order by ar.created_at desc limit v_limit)
    union all
    -- Les litiges apparaissent par l'événement du chantier (litige_ouvert).
    (select tk.created_at, 'ticket', jsonb_build_object('ticket_id', tk.id, 'type', tk.type)
      from public.tickets tk
      where tk.type <> 'litige'
      order by tk.created_at desc limit v_limit)
    union all
    (select rv.created_at, 'avis', jsonb_build_object(
        'artisan_id', rv.artisan_id, 'artisan', coalesce(a.nom_commercial, a.raison_sociale),
        'note', rv.score)
      from public.reviews rv
      join public.artisans a on a.id = rv.artisan_id
      order by rv.created_at desc limit v_limit)
    union all
    (select s.created_at, 'abonnement', jsonb_build_object(
        'artisan_id', s.artisan_id, 'entreprise', coalesce(a.nom_commercial, a.raison_sociale),
        'formule', s.plan_code)
      from public.subscriptions s
      join public.artisans a on a.id = s.artisan_id
      order by s.created_at desc limit v_limit)
  ) f
  order by f.happened desc
  limit v_limit;
end;
$$;

revoke execute on function public.admin_projects(text, text, integer, integer) from public, anon;
revoke execute on function public.admin_project_counts(text) from public, anon;
revoke execute on function public.admin_chantiers(public.chantier_status[], text, integer, integer) from public, anon;
revoke execute on function public.admin_chantier_counts(text) from public, anon;
revoke execute on function public.admin_user_emails(uuid[]) from public, anon;
grant execute on function public.admin_projects(text, text, integer, integer) to authenticated;
grant execute on function public.admin_project_counts(text) to authenticated;
grant execute on function public.admin_chantiers(public.chantier_status[], text, integer, integer) to authenticated;
grant execute on function public.admin_chantier_counts(text) to authenticated;
grant execute on function public.admin_user_emails(uuid[]) to authenticated;
