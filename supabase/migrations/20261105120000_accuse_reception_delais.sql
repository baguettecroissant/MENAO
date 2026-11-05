-- Accusé de réception personnalisé (F-72, ADR 0221) : à l'envoi d'une demande, le particulier
-- apprend le délai de réponse habituel de chaque artisan contacté, en tranche (« moins de 2 h »,
-- « moins de 6 h », « dans la journée »), seulement avec au moins 3 réponses sur 180 jours et une
-- moyenne sous 24 h. Même règle que responseBand (packages/core/src/requests.ts). Une
-- information, pas une garantie.

create function app.response_band(p_artisan_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when s.minutes is null or s.responses < 3 then null
    when s.minutes < 120 then 'deux_heures'
    when s.minutes < 360 then 'six_heures'
    when s.minutes < 1440 then 'journee'
  end
  from app.artisan_response_stats(p_artisan_id) s
$$;
revoke execute on function app.response_band(uuid) from public, anon, authenticated;

-- Notification « demande envoyée » (ADR 0183) : délais habituels des artisans de cet envoi
-- (champ absent quand aucun artisan n'a de délai à communiquer).
create or replace function app.requests_notify_sent()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_root uuid;
  v_title text;
  v_count integer;
  v_delays jsonb;
begin
  if new.status <> 'envoyee' then
    return null;
  end if;
  select coalesce(p.parent_project_id, p.id) into v_root
  from public.projects p where p.id = new.project_id;
  if v_root is null or exists (
    select 1 from public.notifications n
    where n.user_id = new.particulier_id and n.type = 'demande_envoyee'
      and n.data ->> 'project_id' = v_root::text and n.created_at >= now()
  ) then
    return null;
  end if;
  select count(*),
         coalesce(jsonb_agg(jsonb_build_object(
           'nom', coalesce(a.nom_commercial, a.raison_sociale),
           'tranche', app.response_band(a.id)
         )) filter (where app.response_band(a.id) is not null), '[]'::jsonb)
  into v_count, v_delays
  from public.requests r
  join public.projects p on p.id = r.project_id
  join public.artisans a on a.id = r.artisan_id
  where coalesce(p.parent_project_id, p.id) = v_root
    and r.particulier_id = new.particulier_id
    and r.status = 'envoyee' and r.created_at = now();
  select coalesce(nullif(btrim(p.summary), ''), left(p.description, 80)) into v_title
  from public.projects p where p.id = v_root;
  perform app.notify(new.particulier_id, 'demande_envoyee', jsonb_build_object(
    'project_id', v_root,
    'titre', v_title,
    'nb', v_count
  ) || case when jsonb_array_length(v_delays) > 0
         then jsonb_build_object('delais', v_delays) else '{}'::jsonb end);
  return null;
end;
$$;
revoke execute on function app.requests_notify_sent() from public, anon, authenticated;

-- Page de confirmation et suivi des demandes : tranche de chaque demande du particulier connecté.
create function public.particulier_response_bands(p_request_ids uuid[])
returns table (request_id uuid, tranche text)
language sql
stable
security definer
set search_path = ''
as $$
  select r.id, app.response_band(r.artisan_id)
  from public.requests r
  where r.id = any (p_request_ids)
    and r.particulier_id = auth.uid()
    and app.response_band(r.artisan_id) is not null
$$;
revoke execute on function public.particulier_response_bands(uuid[]) from public, anon;
grant execute on function public.particulier_response_bands(uuid[]) to authenticated;
