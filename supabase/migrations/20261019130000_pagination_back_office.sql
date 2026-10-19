-- Pagination du back-office (ADR 0146) : l'activité se parcourt page par page et se filtre par
-- catégorie (page « Activité ») ; la liste des parrainages n'est plus coupée à 200 lignes (elle est
-- paginée par l'interface).

-- Activité (ADR 0045, 0046) : mêmes sources qu'avant, avec un décalage et un filtre par type.
drop function public.admin_activity(integer);
create function public.admin_activity(
  p_limit integer default 40,
  p_offset integer default 0,
  p_kinds text[] default null
)
returns table (occurred_at timestamptz, kind text, details jsonb)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_limit integer := least(greatest(coalesce(p_limit, 40), 1), 100);
  -- 5 000 événements au plus en remontant (cent pages de 50) : le coût reste borné.
  v_offset integer := least(greatest(coalesce(p_offset, 0), 0), 5000 - v_limit);
  -- Chaque source fournit au plus ce qu'il faut pour atteindre la page demandée.
  v_window integer := v_offset + v_limit;
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
      order by p.created_at desc limit v_window)
    union all
    (select r.created_at, 'demande_envoyee', jsonb_build_object(
        'project_id', r.project_id, 'artisan_id', r.artisan_id,
        'artisan', coalesce(a.nom_commercial, a.raison_sociale), 'metier', tr.label, 'ville', p.ville_nom)
      from public.requests r
      join public.artisans a on a.id = r.artisan_id
      join public.projects p on p.id = r.project_id
      left join public.trades tr on tr.code = p.trade_code
      order by r.created_at desc limit v_window)
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
      order by r.responded_at desc limit v_window)
    union all
    (select r.expires_at, 'demande_expiree', jsonb_build_object(
        'project_id', r.project_id, 'artisan_id', r.artisan_id,
        'artisan', coalesce(a.nom_commercial, a.raison_sociale), 'ville', p.ville_nom)
      from public.requests r
      join public.artisans a on a.id = r.artisan_id
      join public.projects p on p.id = r.project_id
      where r.status = 'expiree'
      order by r.expires_at desc limit v_window)
    union all
    (select r.cancelled_at, 'demande_annulee', jsonb_build_object(
        'project_id', r.project_id, 'artisan_id', r.artisan_id,
        'artisan', coalesce(a.nom_commercial, a.raison_sociale), 'ville', p.ville_nom)
      from public.requests r
      join public.artisans a on a.id = r.artisan_id
      join public.projects p on p.id = r.project_id
      where r.cancelled_at is not null
      order by r.cancelled_at desc limit v_window)
    union all
    (select e.created_at, 'chantier', jsonb_build_object(
        'chantier_id', e.chantier_id, 'evenement', e.event, 'titre', c.title,
        'artisan_id', c.artisan_id, 'artisan', coalesce(a.nom_commercial, a.raison_sociale),
        'ville', c.ville_nom)
      from public.chantier_events e
      join public.chantiers c on c.id = e.chantier_id
      join public.artisans a on a.id = c.artisan_id
      order by e.created_at desc limit v_window)
    union all
    (select a.submitted_at, 'dossier_envoye', jsonb_build_object(
        'artisan_id', a.id, 'entreprise', coalesce(a.nom_commercial, a.raison_sociale))
      from public.artisans a
      where a.submitted_at is not null
      order by a.submitted_at desc limit v_window)
    union all
    (select ar.created_at, 'dossier_decision', jsonb_build_object(
        'artisan_id', a.id, 'entreprise', coalesce(a.nom_commercial, a.raison_sociale),
        'decision', ar.decision)
      from public.artisan_reviews ar
      join public.artisans a on a.id = ar.artisan_id
      order by ar.created_at desc limit v_window)
    union all
    -- Les litiges apparaissent par l'événement du chantier (litige_ouvert).
    (select tk.created_at, 'ticket', jsonb_build_object('ticket_id', tk.id, 'type', tk.type)
      from public.tickets tk
      where tk.type <> 'litige'
      order by tk.created_at desc limit v_window)
    union all
    (select rv.created_at, 'avis', jsonb_build_object(
        'artisan_id', rv.artisan_id, 'artisan', coalesce(a.nom_commercial, a.raison_sociale),
        'note', rv.score)
      from public.reviews rv
      join public.artisans a on a.id = rv.artisan_id
      order by rv.created_at desc limit v_window)
    union all
    (select s.created_at, 'abonnement', jsonb_build_object(
        'artisan_id', s.artisan_id, 'entreprise', coalesce(a.nom_commercial, a.raison_sociale),
        'formule', s.plan_code)
      from public.subscriptions s
      join public.artisans a on a.id = s.artisan_id
      order by s.created_at desc limit v_window)
  ) f
  where p_kinds is null or f.what = any (p_kinds)
  -- Ordre stable d'une page à l'autre, même pour deux événements à la même heure.
  order by f.happened desc, f.what, f.data::text
  offset v_offset
  limit v_limit;
end;
$$;

revoke execute on function public.admin_activity(integer, integer, text[]) from public, anon;
grant execute on function public.admin_activity(integer, integer, text[]) to authenticated;

-- Parrainages (ADR 0143) : toute la liste, paginée par l'interface.
create or replace function public.admin_referrals(p_filter text default 'tous')
returns table (
  id uuid,
  created_at timestamptz,
  status public.referral_status,
  rewarded_at timestamptz,
  cancel_reason text,
  referrer_id uuid,
  referrer text,
  referred_id uuid,
  referred text,
  referrer_month public.free_month_status,
  referred_month public.free_month_status
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform app.require_admin();
  return query
  select r.id, r.created_at, r.status, r.rewarded_at, r.cancel_reason,
    r.referrer_artisan_id, app.artisan_label(r.referrer_artisan_id),
    r.referred_artisan_id, app.artisan_label(r.referred_artisan_id),
    (select g.status from public.artisan_free_months g
     where g.referral_id = r.id and g.artisan_id = r.referrer_artisan_id limit 1),
    (select g.status from public.artisan_free_months g
     where g.referral_id = r.id and g.artisan_id = r.referred_artisan_id limit 1)
  from public.artisan_referrals r
  where coalesce(p_filter, 'tous') = 'tous' or r.status::text = p_filter
  -- Ordre stable pour la pagination de l'interface (plus de limite à 200).
  order by r.created_at desc, r.id;
end;
$$;
