-- F-44 (finition) — lien d'abonnement .ics inconnu ou renouvelé : erreur PT404, que PostgREST
-- renvoie en HTTP 404. Avec P0002, il répondait 500, compté comme erreur serveur à chaque lecture
-- d'un ancien lien par une application d'agenda. Corps de la fonction inchangé par ailleurs.
-- ADR 0036.

create or replace function public.artisan_calendar_events(p_token text)
returns table (
  kind text,
  item_id uuid,
  chantier_id uuid,
  starts_at timestamptz,
  ends_at timestamptz,
  starts_on date,
  ends_on date,
  title text,
  place text
)
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_artisan uuid;
  v_since timestamptz := now() - interval '60 days';
begin
  if p_token ~ '^[0-9a-f]{48}$' then
    select f.artisan_id into v_artisan from public.artisan_calendar_feeds f where f.token = p_token;
  end if;
  if v_artisan is null then
    raise exception 'Lien d''abonnement inconnu' using errcode = 'PT404';
  end if;
  update public.artisan_calendar_feeds f set last_read_at = now()
  where f.artisan_id = v_artisan and (f.last_read_at is null or f.last_read_at < now() - interval '15 minutes');

  return query
  select 'visite'::text, ap.id, c.id, ap.starts_at, null::timestamptz, null::date, null::date, c.title,
    nullif(concat_ws(' ', c.code_postal, c.ville_nom), '')
  from public.chantiers c
  join public.appointments ap on ap.chantier_id = c.id and ap.status = 'planifie'
  where c.artisan_id = v_artisan and c.status <> 'annule' and ap.starts_at >= v_since
  union all
  select 'demarrage'::text, c.id, c.id, c.start_at, null::timestamptz, null::date, null::date, c.title,
    nullif(concat_ws(' ', c.code_postal, c.ville_nom), '')
  from public.chantiers c
  where c.artisan_id = v_artisan and c.status <> 'annule' and c.start_at >= v_since
  union all
  select 'creneau'::text, b.id, null::uuid, b.starts_at, b.ends_at, null::date, null::date, b.label, null::text
  from public.artisan_blocked_slots b
  where b.artisan_id = v_artisan and b.ends_at >= v_since
  union all
  select 'absence'::text, a.id, null::uuid, null::timestamptz, null::timestamptz, a.starts_on, a.ends_on, a.label,
    null::text
  from public.artisan_absences a
  where a.artisan_id = v_artisan and a.ends_on >= (v_since at time zone 'Europe/Paris')::date;
end;
$$;
