-- F-10, F-16 — temps de réponse moyen de l'artisan : demandes reçues sur les 180 derniers jours
-- auxquelles il a répondu (rendez-vous fixé ou refus), du jour de la demande à sa réponse.
-- Publié sur la fiche artisan à partir de 3 réponses (jamais un chiffre peu représentatif, F-01) ;
-- l'artisan voit sa valeur exacte sur son tableau de bord. Mêmes règles dans
-- packages/core/src/requests.ts (RESPONSE_TIME_MIN_RESPONSES, RESPONSE_TIME_WINDOW_DAYS).

create function app.artisan_response_stats(p_artisan_id uuid)
returns table (minutes integer, responses integer)
language sql
stable
security definer
set search_path = ''
as $$
  select round(avg(extract(epoch from (r.responded_at - r.created_at)) / 60))::integer, count(*)::integer
  from public.requests r
  where r.artisan_id = p_artisan_id
    and r.responded_at is not null
    and r.created_at >= now() - interval '180 days'
$$;
revoke execute on function app.artisan_response_stats(uuid) from public, anon, authenticated;

-- Tableau de bord : temps de réponse de l'artisan connecté (minutes nulles sans réponse).
create function public.my_response_stats()
returns table (minutes integer, responses integer)
language sql
stable
security definer
set search_path = ''
as $$
  select s.minutes, s.responses from app.artisan_response_stats(app.my_artisan_id()) s
$$;
revoke execute on function public.my_response_stats() from public, anon;
grant execute on function public.my_response_stats() to authenticated;

-- Fiche artisan (F-10) : temps de réponse moyen ajouté.
create or replace function public.artisan_public_profile(p_artisan_id uuid)
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
    'decennale', (
      select jsonb_build_object('valid_until', d.date_fin, 'insurer', d.assureur)
      from public.artisan_documents d
      where d.artisan_id = a.id and d.type = 'decennale' and d.status = 'valide'
      order by d.date_fin desc nulls last limit 1
    ),
    'certifications', (
      select coalesce(jsonb_agg(jsonb_build_object('type', c.type, 'numero', c.numero, 'valid_until', c.date_fin) order by c.type), '[]')
      from public.certifications c
      where c.artisan_id = a.id and c.verified_at is not null
        and c.date_fin >= (now() at time zone 'Europe/Paris')::date
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
  where a.id = p_artisan_id and app.artisan_is_visible(a.id)
$$;
