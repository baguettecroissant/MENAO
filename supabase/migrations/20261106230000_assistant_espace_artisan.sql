-- Assistant de l'espace artisan (F-86, ADR 0236) : assistant écrit inclus dans toutes les
-- formules, dans « Aide et support » (site) et « Aide et contact » (application). Il répond aux
-- questions sur l'utilisation de MENAO en tenant compte de l'état du compte de l'artisan.
--
-- my_assistant_context : résumé du compte de l'artisan connecté, lu par l'Edge Function
-- artisan-assistant avec la session de l'artisan (jamais d'autre compte). Ni nom de client, ni
-- coordonnées, ni montant d'un chantier : des états et des nombres seulement.
create function public.my_assistant_context()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
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
$$;
revoke execute on function public.my_assistant_context() from public, anon;
grant execute on function public.my_assistant_context() to authenticated;

-- Journal ai_runs : métriques des réponses de l'assistant (jamais les questions ni les réponses).
alter table public.ai_runs drop constraint ai_runs_function_name_check;
alter table public.ai_runs add constraint ai_runs_function_name_check
  check (function_name in (
    'analyze-need', 'transcribe', 'quote-from-voice', 'read-document', 'suggest-need',
    'describe-photo', 'read-expense', 'pro-assistant', 'client-assistant', 'commercial-copilot',
    'voice-assistant', 'artisan-assistant'
  ));
