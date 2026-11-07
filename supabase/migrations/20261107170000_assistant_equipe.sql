-- Assistant de l'espace artisan selon la place dans l'équipe (F-89, ADR 0242) : le contexte dit
-- la place (patron, chef ou ouvrier) ; un ouvrier n'a que ses chantiers et son prochain rendez-vous
-- (ni argent, ni demandes, ni dossier, ni formule).
create or replace function public.my_assistant_context()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when app.my_team_role() = 'ouvrier' then jsonb_build_object(
      'place', 'ouvrier',
      'chantiers', coalesce((
        select jsonb_object_agg(x.status, x.n)
        from (
          select c.status, count(*) as n from public.chantiers c
          where c.artisan_id = app.my_artisan_id() and app.can_see_chantier(c.id, c.artisan_id)
          group by c.status
        ) x
      ), '{}'::jsonb),
      'prochain_rendez_vous', (
        select min(ap.starts_at)
        from public.appointments ap
        join public.chantiers c on c.id = ap.chantier_id
        where c.artisan_id = app.my_artisan_id() and app.can_see_chantier(c.id, c.artisan_id)
          and ap.status = 'planifie' and ap.starts_at > now()
      )
    )
    else (
      select jsonb_build_object(
        'place', app.my_team_role(),
        'dossier', a.status,
        'en_pause', a.paused,
        'paiements_actives', a.connect_charges_enabled,
        'franchise_tva', a.assujetti_tva = false,
        'abonnement', (
          select jsonb_build_object('formule', s.plan_code, 'statut', s.status, 'fin_essai', s.trial_end::date)
          from public.subscriptions s
          where s.artisan_id = a.id
          order by s.created_at desc
          limit 1
        ),
        'agents', app.artisan_agents(a.id),
        'demandes_en_attente', (
          select count(*) from public.requests r where r.artisan_id = a.id and r.status = 'envoyee'
        ),
        'prochaine_expiration_demande', (
          select min(r.expires_at) from public.requests r where r.artisan_id = a.id and r.status = 'envoyee'
        ),
        'chantiers', coalesce((
          select jsonb_object_agg(x.status, x.n)
          from (
            select c.status, count(*) as n from public.chantiers c where c.artisan_id = a.id group by c.status
          ) x
        ), '{}'::jsonb),
        'devis_brouillons', (
          select count(*) from public.quotes q where q.artisan_id = a.id and q.status = 'brouillon'
        ),
        'devis_en_attente_client', (
          select count(*) from public.quotes q where q.artisan_id = a.id and q.status = 'envoye'
        ),
        'documents_refuses', (
          select count(*) from public.artisan_documents d where d.artisan_id = a.id and d.status = 'refuse'
        ),
        'documents_a_renouveler', (
          select count(*) from public.artisan_documents d
          where d.artisan_id = a.id and d.status = 'valide' and d.date_fin <= current_date + 30
        ),
        'prochain_rendez_vous', (
          select min(ap.starts_at)
          from public.appointments ap
          join public.chantiers c on c.id = ap.chantier_id
          where c.artisan_id = a.id and ap.status = 'planifie' and ap.starts_at > now()
        )
      )
      from public.artisans a
      where a.id = app.my_artisan_id()
    )
  end
$$;
