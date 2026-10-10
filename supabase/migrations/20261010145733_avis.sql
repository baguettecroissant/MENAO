-- F-28 (phase 5d) — avis des clients sur les artisans : un avis par chantier, dès le PV de
-- réception signé (« Avis vérifié ») ; invitation au chantier clôturé, après le solde (F-27), et
-- relance unique 3 jours plus tard. Score MENAO recalculé à chaque avis publié, masqué ou
-- republié, en tête du classement des recherches (F-09). Réponse publique de l'artisan (une
-- fois), signalement à l'équipe (ticket), masquage motivé par l'équipe, jamais pour la seule
-- raison qu'un avis est négatif. Mêmes règles que packages/core (review.ts). ADR 0030.
-- TODO(legal) : informations sur le contrôle des avis (art. L111-7-2 et D111-16 et suivants du
-- Code de la consommation), notification des contenus illicites et motivation des masquages
-- (DSA, art. 16 et 17), à faire valider par l'avocat.

create type public.value_for_money as enum ('excellent', 'convenable', 'trop_cher');
create type public.review_status as enum ('publie', 'masque');

-- ---------------------------------------------------------------------------
-- Avis : écriture par les fonctions ci-dessous seulement.
-- ---------------------------------------------------------------------------
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  chantier_id uuid not null unique references public.chantiers (id) on delete cascade,
  artisan_id uuid not null references public.artisans (id) on delete cascade,
  particulier_id uuid not null references auth.users (id) on delete cascade,
  -- Nom affiché (prénom et initiale du nom), figé à la publication.
  author_name text not null check (char_length(author_name) between 1 and 120),
  quality smallint not null check (quality between 0 and 100),
  delays smallint not null check (delays between 0 and 100),
  communication smallint not null check (communication between 0 and 100),
  value_for_money public.value_for_money not null,
  score smallint not null check (score between 0 and 100),
  comment text not null check (char_length(comment) between 50 and 2000),
  -- Date de l'expérience : signature du PV de réception (heure de Paris).
  experience_on date not null,
  status public.review_status not null default 'publie',
  moderation_reason text check (char_length(moderation_reason) between 10 and 500),
  moderated_at timestamptz,
  moderated_by uuid references auth.users (id) on delete set null,
  reply text check (char_length(reply) between 1 and 2000),
  replied_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((reply is null) = (replied_at is null)),
  check (status = 'publie' or moderation_reason is not null)
);
create index reviews_artisan_idx on public.reviews (artisan_id, created_at desc);
create index reviews_particulier_idx on public.reviews (particulier_id);
create trigger reviews_set_updated_at before update on public.reviews
  for each row execute function app.set_updated_at();
alter table public.reviews enable row level security;
revoke all on public.reviews from anon, authenticated;
grant select on public.reviews to authenticated;

create policy "reviews : lecture par l'auteur, l'artisan noté ou l'équipe"
  on public.reviews for select to authenticated
  using (
    particulier_id = (select auth.uid())
    or artisan_id = (select app.my_artisan_id())
    or (select app.is_staff())
  );

-- Score MENAO de chaque artisan (avis publiés) : moyennes par critère et score global.
create table public.artisan_scores (
  artisan_id uuid primary key references public.artisans (id) on delete cascade,
  review_count integer not null check (review_count > 0),
  quality smallint not null check (quality between 0 and 100),
  delays smallint not null check (delays between 0 and 100),
  communication smallint not null check (communication between 0 and 100),
  value_for_money smallint not null check (value_for_money between 0 and 100),
  global_score smallint not null check (global_score between 0 and 100),
  updated_at timestamptz not null default now()
);
alter table public.artisan_scores enable row level security;
revoke all on public.artisan_scores from anon, authenticated;
grant select on public.artisan_scores to authenticated;

-- Le public lit le score par artisan_public_profile (artisans visibles seulement).
create policy "artisan_scores : lecture par l'artisan ou l'équipe"
  on public.artisan_scores for select to authenticated
  using (artisan_id = (select app.my_artisan_id()) or (select app.is_staff()));

-- ---------------------------------------------------------------------------
-- Calcul du score (packages/core : reviewScore, VALUE_FOR_MONEY_SCORE)
-- ---------------------------------------------------------------------------
create function app.value_for_money_score(p_value public.value_for_money)
returns smallint
language sql
immutable
set search_path = ''
as $$
  select (case p_value when 'excellent' then 100 when 'convenable' then 60 else 20 end)::smallint
$$;

-- Moyenne des trois critères et du rapport qualité/prix converti, arrondie au plus proche.
create function app.review_score(
  p_quality integer,
  p_delays integer,
  p_communication integer,
  p_value public.value_for_money
)
returns smallint
language sql
immutable
set search_path = ''
as $$
  select round((p_quality + p_delays + p_communication + app.value_for_money_score(p_value))::numeric / 4)::smallint
$$;

-- Score MENAO : moyenne des avis publiés, critère par critère ; score global calculé sur les
-- moyennes non arrondies (cohérent avec les barres affichées). Sans avis publié : pas de score.
create function app.refresh_artisan_score(p_artisan_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from public.reviews where artisan_id = p_artisan_id and status = 'publie') then
    delete from public.artisan_scores where artisan_id = p_artisan_id;
    return;
  end if;
  insert into public.artisan_scores as s
    (artisan_id, review_count, quality, delays, communication, value_for_money, global_score, updated_at)
  select p_artisan_id, count(*), round(avg(quality)), round(avg(delays)), round(avg(communication)),
    round(avg(app.value_for_money_score(value_for_money))),
    round((avg(quality) + avg(delays) + avg(communication) + avg(app.value_for_money_score(value_for_money))) / 4),
    now()
  from public.reviews
  where artisan_id = p_artisan_id and status = 'publie'
  on conflict (artisan_id) do update set
    review_count = excluded.review_count,
    quality = excluded.quality,
    delays = excluded.delays,
    communication = excluded.communication,
    value_for_money = excluded.value_for_money,
    global_score = excluded.global_score,
    updated_at = excluded.updated_at;
end;
$$;
revoke execute on function app.value_for_money_score(public.value_for_money) from public, anon, authenticated;
revoke execute on function app.review_score(integer, integer, integer, public.value_for_money) from public, anon, authenticated;
revoke execute on function app.refresh_artisan_score(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- « Comment s'est passée votre expérience ? » (client) : un avis par chantier, PV signé.
-- ---------------------------------------------------------------------------
create function public.particulier_submit_review(
  p_chantier_id uuid,
  p_quality integer,
  p_delays integer,
  p_communication integer,
  p_value public.value_for_money,
  p_comment text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  c public.chantiers;
  v_signed timestamptz;
  v_comment text := btrim(p_comment);
  v_score smallint;
  v_id uuid;
begin
  select * into c from public.chantiers
  where id = p_chantier_id and particulier_id = auth.uid()
  for update;
  if not found then
    raise exception 'Chantier introuvable' using errcode = '42501';
  end if;
  select signed_at into v_signed from public.receptions where chantier_id = c.id and status = 'signe';
  if v_signed is null then
    raise exception 'Vous pourrez noter l''artisan une fois le PV de réception signé' using errcode = '22023';
  end if;
  if exists (select 1 from public.reviews where chantier_id = c.id) then
    raise exception 'Vous avez déjà laissé un avis sur ce chantier' using errcode = '22023';
  end if;
  if p_value is null
     or coalesce(p_quality not between 0 and 100, true)
     or coalesce(p_delays not between 0 and 100, true)
     or coalesce(p_communication not between 0 and 100, true) then
    raise exception 'Notez chaque critère' using errcode = '22023';
  end if;
  if coalesce(char_length(v_comment) not between 50 and 2000, true) then
    raise exception 'Votre avis doit compter entre 50 et 2 000 caractères' using errcode = '22023';
  end if;

  v_score := app.review_score(p_quality, p_delays, p_communication, p_value);
  insert into public.reviews (chantier_id, artisan_id, particulier_id, author_name, quality, delays,
    communication, value_for_money, score, comment, experience_on)
  select c.id, c.artisan_id, c.particulier_id,
    coalesce(
      nullif(btrim(concat_ws(' ', pr.first_name, upper(left(pr.last_name, 1)) || '.')), ''),
      'Client MENAO'
    ),
    p_quality, p_delays, p_communication, p_value, v_score, v_comment,
    (v_signed at time zone 'Europe/Paris')::date
  from (select 1) x
  left join public.profiles pr on pr.user_id = c.particulier_id
  returning id into v_id;

  perform app.refresh_artisan_score(c.artisan_id);
  perform app.notify(a.user_id, 'avis_recu', jsonb_build_object(
    'chantier_id', c.id,
    'titre', c.title,
    'client', pr.first_name,
    'score', v_score
  ))
  from public.artisans a
  left join public.profiles pr on pr.user_id = c.particulier_id
  where a.id = c.artisan_id;
  return v_id;
end;
$$;
revoke execute on function public.particulier_submit_review(uuid, integer, integer, integer, public.value_for_money, text) from public, anon;
grant execute on function public.particulier_submit_review(uuid, integer, integer, integer, public.value_for_money, text) to authenticated;

-- Réponse publique de l'artisan, une seule fois, sur un avis publié.
create function public.artisan_reply_review(p_review_id uuid, p_reply text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  r public.reviews;
  v_reply text := btrim(p_reply);
begin
  select * into r from public.reviews
  where id = p_review_id and artisan_id = app.my_artisan_id()
  for update;
  if not found then
    raise exception 'Avis introuvable' using errcode = '42501';
  end if;
  if r.status <> 'publie' then
    raise exception 'Cet avis n''est pas publié' using errcode = '22023';
  end if;
  if r.reply is not null then
    raise exception 'Vous avez déjà répondu à cet avis' using errcode = '22023';
  end if;
  if coalesce(char_length(v_reply) not between 1 and 2000, true) then
    raise exception 'Votre réponse doit compter entre 1 et 2 000 caractères' using errcode = '22023';
  end if;
  update public.reviews set reply = v_reply, replied_at = now() where id = r.id;
end;
$$;
revoke execute on function public.artisan_reply_review(uuid, text) from public, anon;
grant execute on function public.artisan_reply_review(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Signalement d'un avis publié (compte connecté) : ticket pour l'équipe, un seul ouvert par
-- personne et par avis.
-- ---------------------------------------------------------------------------
alter table public.tickets add column review_id uuid references public.reviews (id) on delete cascade;
create index tickets_review_idx on public.tickets (review_id) where review_id is not null;
create unique index tickets_un_signalement_avis_ouvert
  on public.tickets (review_id, user_id) where type = 'avis' and status <> 'resolu';

create function public.report_review(p_review_id uuid, p_reason text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  r public.reviews;
  v_reason text := btrim(p_reason);
  v_email text;
  v_ticket uuid;
begin
  select * into r from public.reviews where id = p_review_id and status = 'publie';
  if not found then
    raise exception 'Avis introuvable' using errcode = '42501';
  end if;
  select email into v_email from auth.users where id = auth.uid();
  if v_email is null then
    raise exception 'Connectez-vous pour signaler un avis' using errcode = '42501';
  end if;
  if coalesce(char_length(v_reason) not between 10 and 1000, true) then
    raise exception 'Décrivez le problème en 10 à 1 000 caractères' using errcode = '22023';
  end if;
  select id into v_ticket from public.tickets
  where type = 'avis' and review_id = r.id and user_id = auth.uid() and status <> 'resolu';
  if found then
    return v_ticket;
  end if;
  insert into public.tickets (type, user_id, contact_email, subject, message, review_id)
  values ('avis', auth.uid(), lower(v_email),
    left('Avis signalé : ' || coalesce(app.artisan_display_name(r.artisan_id), 'artisan'), 150),
    v_reason, r.id)
  returning id into v_ticket;
  return v_ticket;
end;
$$;
revoke execute on function public.report_review(uuid, text) from public, anon;
grant execute on function public.report_review(uuid, text) to authenticated;

-- Masquage motivé ou republication par l'équipe (F-55) : score recalculé, signalements ouverts
-- clos, action journalisée.
create function public.admin_moderate_review(p_review_id uuid, p_status public.review_status, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  r public.reviews;
  v_reason text := nullif(btrim(p_reason), '');
begin
  if not app.is_staff() then
    raise exception 'Réservé à l''équipe MENAO' using errcode = '42501';
  end if;
  select * into r from public.reviews where id = p_review_id for update;
  if not found then
    raise exception 'Avis introuvable' using errcode = '42501';
  end if;
  if p_status = 'masque' and coalesce(char_length(v_reason) not between 10 and 500, true) then
    raise exception 'Indiquez le motif du masquage en 10 à 500 caractères' using errcode = '22023';
  end if;
  update public.reviews set
    status = p_status,
    moderation_reason = case when p_status = 'masque' then v_reason end,
    moderated_at = now(),
    moderated_by = auth.uid()
  where id = r.id;
  perform app.refresh_artisan_score(r.artisan_id);
  update public.tickets set status = 'resolu', resolved_at = now(), handled_by = auth.uid()
  where review_id = r.id and type = 'avis' and status <> 'resolu';
  perform app.audit(case when p_status = 'masque' then 'avis.masque' else 'avis.republie' end,
    'review', r.id, jsonb_strip_nulls(jsonb_build_object('motif', v_reason)));
end;
$$;
revoke execute on function public.admin_moderate_review(uuid, public.review_status, text) from public, anon;
grant execute on function public.admin_moderate_review(uuid, public.review_status, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Lecture publique : derniers avis publiés d'un artisan visible, du plus récent au plus ancien.
-- ---------------------------------------------------------------------------
create function public.artisan_public_reviews(p_artisan_id uuid, p_limit integer default 20)
returns table (
  review_id uuid,
  author_name text,
  score smallint,
  comment text,
  experience_on date,
  created_at timestamptz,
  reply text,
  replied_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select r.id, r.author_name, r.score, r.comment, r.experience_on, r.created_at, r.reply, r.replied_at
  from public.reviews r
  where r.artisan_id = p_artisan_id and r.status = 'publie' and app.artisan_is_visible(r.artisan_id)
  order by r.created_at desc
  limit least(greatest(coalesce(p_limit, 20), 1), 50)
$$;
revoke execute on function public.artisan_public_reviews(uuid, integer) from public;
grant execute on function public.artisan_public_reviews(uuid, integer) to anon, authenticated;

-- Fiche artisan (F-10) : score MENAO ajouté (null tant qu'aucun avis n'est publié).
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
    'paused', a.paused,
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

-- Recherche (F-09) : tri par score MENAO d'abord (artisans sans avis ensuite), puis
-- disponibilité, distance et ordre aléatoire propre au projet. Aucune mise en avant payante.
create or replace function public.match_artisans(p_project_id uuid, p_limit int default 5)
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
  distance_km numeric,
  specialties jsonb
)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v public.projects;
  v_point extensions.geography;
  v_today date := (now() at time zone 'Europe/Paris')::date;
begin
  select * into v from public.projects p
  where p.id = p_project_id and (p.user_id = auth.uid() or app.is_staff());
  if not found then
    raise exception 'Projet introuvable' using errcode = '42501';
  end if;
  if v.trade_code is null or v.ville_code_insee is null then
    return;
  end if;
  v_point := coalesce(v.location, v.ville_location);

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
    case when a.zone_mode = 'rayon' and v_point is not null
      then round((extensions.st_distance(a.base_location, v_point) / 1000)::numeric, 1)
    end,
    (
      select coalesce(jsonb_agg(jsonb_build_object('code', w.code, 'label', w.label) order by w.sort_order), '[]')
      from public.artisan_work_types aw
      join public.work_types w on w.code = aw.work_type_code
      where aw.artisan_id = a.id and w.trade_code = v.trade_code and w.active
    )
  from public.artisans a
  left join public.profiles pr on pr.user_id = a.user_id
  left join public.artisan_scores sc on sc.artisan_id = a.id
  where app.artisan_is_visible(a.id)
    and not a.paused
    and exists (select 1 from public.artisan_trades t where t.artisan_id = a.id and t.trade_code = v.trade_code)
    and (
      (a.zone_mode = 'communes' and exists (
        select 1 from public.artisan_zones z where z.artisan_id = a.id and z.code_insee = v.ville_code_insee
      ))
      or (a.zone_mode = 'rayon' and v_point is not null and a.base_location is not null
        and extensions.st_dwithin(a.base_location, v_point, a.radius_km * 1000))
    )
  order by
    sc.global_score desc nulls last,
    (a.available_from is null or a.available_from <= v_today) desc,
    a.available_from nulls first,
    case when a.zone_mode = 'rayon' and v_point is not null
      then extensions.st_distance(a.base_location, v_point) end nulls last,
    md5(p_project_id::text || a.id::text)
  limit least(greatest(coalesce(p_limit, 5), 1), 20);
end;
$$;

-- ---------------------------------------------------------------------------
-- Relance unique du client 3 jours après la clôture, sans avis (clôtures des 30 derniers jours).
-- p_now : instant de référence (tests). Tâche pg_cron quotidienne.
-- ---------------------------------------------------------------------------
alter table public.chantiers add column review_reminded_at timestamptz;

create function app.remind_reviews(p_now timestamptz default now())
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  r record;
  v_count integer := 0;
begin
  for r in
    select c.id, c.title, c.particulier_id, c.artisan_id
    from public.chantiers c
    where c.status = 'cloture'
      and c.review_reminded_at is null
      and not exists (select 1 from public.reviews rv where rv.chantier_id = c.id)
      and exists (
        select 1 from public.chantier_events e
        where e.chantier_id = c.id and e.to_status = 'cloture'
          and e.created_at <= p_now - interval '3 days'
          and e.created_at > p_now - interval '30 days'
      )
    for update of c skip locked
  loop
    perform app.notify(r.particulier_id, 'avis_relance', jsonb_build_object(
      'chantier_id', r.id,
      'titre', r.title,
      'artisan', app.artisan_display_name(r.artisan_id)
    ));
    update public.chantiers set review_reminded_at = p_now where id = r.id;
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;
revoke execute on function app.remind_reviews(timestamptz) from public, anon, authenticated;
select cron.schedule('menao-relance-avis', '0 9 * * *', 'select app.remind_reviews()');
