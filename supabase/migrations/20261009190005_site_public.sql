-- F-01 à F-03 (phase 2d) — site public : communes pilotes, pages SEO métier × ville, chiffres
-- réels de l'accueil, page Contact. ADR 0015.

-- ---------------------------------------------------------------------------
-- Communes pilotes (Alpes-Maritimes). Codes INSEE et centres issus de la Géoplateforme (BAN).
-- ---------------------------------------------------------------------------
create table public.communes (
  code_insee text primary key check (code_insee ~ '^([0-9]{5}|2[AB][0-9]{3})$'),
  slug text not null unique check (slug ~ '^[a-z0-9-]{1,80}$'),
  nom text not null check (char_length(nom) between 1 and 100),
  departement text not null check (departement ~ '^([0-9]{2,3}|2[AB])$'),
  location extensions.geography(point, 4326) not null,
  pilote boolean not null default false,
  ordre smallint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger communes_set_updated_at before update on public.communes
  for each row execute function app.set_updated_at();
alter table public.communes enable row level security;
create policy "communes : lecture publique" on public.communes for select to anon, authenticated using (true);

insert into public.communes (code_insee, slug, nom, departement, location, pilote, ordre) values
  ('06088', 'nice', 'Nice', '06', 'SRID=4326;POINT(7.255313 43.71273)', true, 10),
  ('06004', 'antibes', 'Antibes', '06', 'SRID=4326;POINT(7.103254 43.582195)', true, 20),
  ('06029', 'cannes', 'Cannes', '06', 'SRID=4326;POINT(7.004585 43.555468)', true, 30),
  ('06027', 'cagnes-sur-mer', 'Cagnes-sur-Mer', '06', 'SRID=4326;POINT(7.150092 43.675636)', true, 40),
  ('06069', 'grasse', 'Grasse', '06', 'SRID=4326;POINT(6.937765 43.654057)', true, 50),
  ('06030', 'le-cannet', 'Le Cannet', '06', 'SRID=4326;POINT(6.999308 43.574427)', true, 60),
  ('06123', 'saint-laurent-du-var', 'Saint-Laurent-du-Var', '06', 'SRID=4326;POINT(7.18367 43.686846)', true, 70),
  ('06083', 'menton', 'Menton', '06', 'SRID=4326;POINT(7.500604 43.791521)', true, 80),
  ('06155', 'vallauris', 'Vallauris', '06', 'SRID=4326;POINT(7.060116 43.574234)', true, 90),
  ('06079', 'mandelieu-la-napoule', 'Mandelieu-la-Napoule', '06', 'SRID=4326;POINT(6.933663 43.544471)', true, 100),
  ('06157', 'vence', 'Vence', '06', 'SRID=4326;POINT(7.109219 43.720988)', true, 110),
  ('06085', 'mougins', 'Mougins', '06', 'SRID=4326;POINT(6.999298 43.595253)', true, 120),
  ('06161', 'villeneuve-loubet', 'Villeneuve-Loubet', '06', 'SRID=4326;POINT(7.106505 43.639175)', true, 130),
  ('06033', 'carros', 'Carros', '06', 'SRID=4326;POINT(7.191567 43.784043)', true, 140),
  ('06012', 'beausoleil', 'Beausoleil', '06', 'SRID=4326;POINT(7.422903 43.744201)', true, 150);

-- ---------------------------------------------------------------------------
-- Artisans visibles d'une commune (F-02) : mêmes règles que match_artisans (visible, hors pause,
-- métier, zone par communes ou rayon autour du centre de la commune), sans coordonnées.
-- ---------------------------------------------------------------------------
create function public.public_artisans_for_commune(p_trade_code text, p_code_insee text, p_limit int default 12)
returns table (
  artisan_id uuid,
  display_name text,
  avatar_path text,
  experience_years smallint,
  zone_mode public.zone_mode,
  zone_radius_km smallint,
  zone_city text,
  zone_communes text[],
  available_now boolean,
  available_from date,
  specialties jsonb
)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_point extensions.geography;
  v_today date := (now() at time zone 'Europe/Paris')::date;
begin
  select c.location into v_point from public.communes c where c.code_insee = p_code_insee;
  return query
  select
    a.id,
    coalesce(pr.first_name, a.nom_commercial, a.raison_sociale),
    pr.avatar_path,
    a.experience_years,
    a.zone_mode,
    a.radius_km,
    app.base_commune(a.base_label),
    (select coalesce(array_agg(z.nom order by z.nom), '{}') from public.artisan_zones z where z.artisan_id = a.id),
    (a.available_from is null or a.available_from <= v_today),
    a.available_from,
    (
      select coalesce(jsonb_agg(jsonb_build_object('code', w.code, 'label', w.label) order by w.sort_order), '[]')
      from public.artisan_work_types aw
      join public.work_types w on w.code = aw.work_type_code
      where aw.artisan_id = a.id and w.trade_code = p_trade_code and w.active
    )
  from public.artisans a
  left join public.profiles pr on pr.user_id = a.user_id
  where app.artisan_is_visible(a.id)
    and not a.paused
    and exists (select 1 from public.artisan_trades t where t.artisan_id = a.id and t.trade_code = p_trade_code)
    and (
      (a.zone_mode = 'communes' and exists (
        select 1 from public.artisan_zones z where z.artisan_id = a.id and z.code_insee = p_code_insee
      ))
      or (a.zone_mode = 'rayon' and v_point is not null and a.base_location is not null
        and extensions.st_dwithin(a.base_location, v_point, a.radius_km * 1000))
    )
  order by
    (a.available_from is null or a.available_from <= v_today) desc,
    a.available_from nulls first,
    md5(p_trade_code || p_code_insee || a.id::text)
  limit least(greatest(coalesce(p_limit, 12), 1), 50);
end;
$$;
revoke execute on function public.public_artisans_for_commune(text, text, int) from public;
grant execute on function public.public_artisans_for_commune(text, text, int) to anon, authenticated;

-- Chiffres réels de l'accueil (F-01 : aucun chiffre inventé).
create function public.public_stats()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'artisans', (select count(*) from public.artisans a where app.artisan_is_visible(a.id)),
    'trades', (
      select count(distinct t.trade_code) from public.artisan_trades t where app.artisan_is_visible(t.artisan_id)
    )
  )
$$;
revoke execute on function public.public_stats() from public;
grant execute on function public.public_stats() to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Page Contact (F-03) : ticket sans compte. 3 messages par adresse e-mail et par 24 h.
-- ---------------------------------------------------------------------------
alter table public.tickets alter column user_id drop not null;
alter table public.tickets add column subject text check (char_length(subject) <= 150);
alter table public.tickets add constraint tickets_auteur_check
  check (type = 'contact' or user_id is not null);

create function public.send_contact_message(p_email text, p_subject text, p_message text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text := lower(btrim(coalesce(p_email, '')));
begin
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or char_length(v_email) > 254 then
    raise exception 'Adresse e-mail invalide' using errcode = '22023';
  end if;
  if nullif(btrim(p_message), '') is null then
    raise exception 'Message obligatoire' using errcode = '22023';
  end if;
  -- Garde-fou global contre les envois automatisés.
  if (select count(*) from public.tickets where type = 'contact' and created_at > now() - interval '1 hour') >= 100 then
    raise exception 'Trop de messages envoyés. Réessayez demain.' using errcode = '22023';
  end if;
  if (select count(*) from public.tickets
      where type = 'contact' and contact_email = v_email and created_at > now() - interval '24 hours') >= 3 then
    raise exception 'Trop de messages envoyés. Réessayez demain.' using errcode = '22023';
  end if;
  insert into public.tickets (type, user_id, contact_email, subject, message)
  values ('contact', auth.uid(), v_email, nullif(btrim(left(p_subject, 150)), ''), btrim(left(p_message, 2000)));
end;
$$;
revoke execute on function public.send_contact_message(text, text, text) from public;
grant execute on function public.send_contact_message(text, text, text) to anon, authenticated;
