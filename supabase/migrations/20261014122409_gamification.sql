-- F-24 (phase 7) — gamification artisan (maquettes « Mon grade Menao », « Nouveau badge débloqué »,
-- « Réclamez votre récompense ») et critère « propreté » dans l'avis du client (F-28). ADR 0091.
--
-- Points (XP) gagnés en atteignant des objectifs, niveaux 1 à 5, badges et récompense physique au
-- niveau 5 (demande traitée à la main par l'équipe : ticket « recompense »). Les règles sont
-- paramétrées en base (valeurs par défaut des maquettes) et calculées à partir des données
-- existantes : chantiers clôturés, PV sans réserves, photos du suivi, avis des clients. Les
-- objectifs liés à la notation des clients par l'artisan (F-23) attendent l'avis juridique :
-- présents mais inactifs.

-- ---------------------------------------------------------------------------
-- Avis du client : propreté du chantier (0 à 100 %). Absente des avis plus anciens ; elle sert
-- aux badges et n'entre pas dans le score MENAO en V1.
-- ---------------------------------------------------------------------------
alter table public.reviews add column cleanliness smallint check (cleanliness between 0 and 100);

drop function public.particulier_submit_review(uuid, integer, integer, integer, public.value_for_money, text);
create function public.particulier_submit_review(
  p_chantier_id uuid,
  p_quality integer,
  p_delays integer,
  p_communication integer,
  p_cleanliness integer,
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
     or coalesce(p_communication not between 0 and 100, true)
     or coalesce(p_cleanliness not between 0 and 100, true) then
    raise exception 'Notez chaque critère' using errcode = '22023';
  end if;
  if coalesce(char_length(v_comment) not between 50 and 2000, true) then
    raise exception 'Votre avis doit compter entre 50 et 2 000 caractères' using errcode = '22023';
  end if;

  v_score := app.review_score(p_quality, p_delays, p_communication, p_value);
  insert into public.reviews (chantier_id, artisan_id, particulier_id, author_name, quality, delays,
    communication, cleanliness, value_for_money, score, comment, experience_on)
  select c.id, c.artisan_id, c.particulier_id,
    coalesce(
      nullif(btrim(concat_ws(' ', pr.first_name, upper(left(pr.last_name, 1)) || '.')), ''),
      'Client MENAO'
    ),
    p_quality, p_delays, p_communication, p_cleanliness, p_value, v_score, v_comment,
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
revoke execute on function public.particulier_submit_review(uuid, integer, integer, integer, integer, public.value_for_money, text) from public, anon;
grant execute on function public.particulier_submit_review(uuid, integer, integer, integer, integer, public.value_for_money, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Règles (paramètres) : niveaux, objectifs, badges. Lecture par les comptes connectés ; écriture
-- par migration (paramétrage depuis le back-office plus tard, F-57).
-- ---------------------------------------------------------------------------
create table public.gamification_levels (
  level smallint primary key check (level between 1 and 20),
  xp_min integer not null unique check (xp_min >= 0),
  reward text check (char_length(reward) between 1 and 120),
  reward_detail text check (char_length(reward_detail) between 1 and 200)
);

-- Mesures calculées par app.gamification_metric.
create table public.gamification_objectives (
  code text primary key check (code ~ '^[a-z_]{2,40}$'),
  title text not null check (char_length(title) between 1 and 60),
  description text not null check (char_length(description) between 1 and 160),
  metric text not null check (metric in ('chantiers_clotures', 'sans_reserve', 'photos_total',
    'photos_chantier_max', 'avis_excellents', 'avis_finitions', 'avis_ponctualite',
    'avis_communication', 'avis_proprete', 'reponses_avis', 'avis_clients')),
  target integer not null check (target > 0),
  xp integer not null check (xp between 0 and 10000),
  position smallint not null default 0,
  active boolean not null default true
);

create table public.badges (
  code text primary key check (code ~ '^[a-z_]{2,40}$'),
  label text not null check (char_length(label) between 1 and 60),
  description text not null check (char_length(description) between 1 and 160),
  metric text not null check (metric in ('chantiers_clotures', 'sans_reserve', 'photos_total',
    'photos_chantier_max', 'avis_excellents', 'avis_finitions', 'avis_ponctualite',
    'avis_communication', 'avis_proprete', 'reponses_avis', 'avis_clients')),
  target integer not null check (target > 0),
  position smallint not null default 0,
  active boolean not null default true
);

alter table public.gamification_levels enable row level security;
alter table public.gamification_objectives enable row level security;
alter table public.badges enable row level security;
revoke all on public.gamification_levels, public.gamification_objectives, public.badges from anon, authenticated;
grant select on public.gamification_levels, public.gamification_objectives, public.badges to authenticated;
create policy "gamification_levels : lecture" on public.gamification_levels for select to authenticated using (true);
create policy "gamification_objectives : lecture" on public.gamification_objectives for select to authenticated using (true);
create policy "badges : lecture" on public.badges for select to authenticated using (true);

-- Valeurs par défaut des maquettes (niveau 5 à 1 000 XP, objectifs à +100 ou +150 XP), modifiables.
insert into public.gamification_levels (level, xp_min, reward, reward_detail) values
  (1, 0, null, null),
  (2, 150, null, null),
  (3, 350, null, null),
  (4, 600, null, null),
  (5, 1000, 'Ensemble de chantier MENAO', 'Veste et pantalon professionnels avec logo brodé');

insert into public.gamification_objectives (code, title, description, metric, target, xp, position, active) values
  ('premier_chantier', 'Premier chantier terminé', 'Terminer un premier chantier avec MENAO', 'chantiers_clotures', 1, 100, 1, true),
  ('artisan_regulier', 'Artisan régulier', 'Terminer 5 chantiers avec MENAO', 'chantiers_clotures', 5, 150, 2, true),
  ('artisan_confirme', 'Artisan confirmé', 'Terminer 15 chantiers avec MENAO', 'chantiers_clotures', 15, 200, 3, true),
  ('ponctualite_exemplaire', 'Ponctualité exemplaire', '3 chantiers notés « À l''heure » par vos clients', 'avis_ponctualite', 3, 100, 4, true),
  ('artisan_de_confiance', 'Artisan de confiance', 'Prendre 40 photos sur un chantier', 'photos_chantier_max', 40, 150, 5, true),
  ('travail_impeccable', 'Travail impeccable', '3 chantiers réceptionnés sans réserves', 'sans_reserve', 3, 150, 6, true),
  ('avis_excellent', 'Client conquis', 'Recevoir un avis à 90 % ou plus', 'avis_excellents', 1, 100, 7, true),
  ('excellence_reconnue', 'Excellence reconnue', 'Recevoir 5 avis à 90 % ou plus', 'avis_excellents', 5, 150, 8, true),
  -- Notation des clients par l'artisan (F-23) : en attente de l'avis juridique.
  ('premier_avis', 'Premier avis', 'Laisser un avis sur un client', 'avis_clients', 1, 200, 9, false),
  ('amateur_des_avis', 'Amateur des avis', 'Laisser 3 avis sur des clients', 'avis_clients', 3, 100, 10, false),
  ('expert_des_avis', 'Expert des avis', 'Laisser 5 avis sur des clients', 'avis_clients', 5, 100, 11, false);

insert into public.badges (code, label, description, metric, target, position) values
  ('artisan_exceptionnel', 'Artisan exceptionnel', 'Terminer 10 chantiers avec des finitions parfaites (qualité à 90 % ou plus)', 'avis_finitions', 10, 1),
  ('toujours_a_l_heure', 'Toujours à l''heure', 'Être noté « À l''heure » sur 10 chantiers', 'avis_ponctualite', 10, 2),
  ('maitre_des_finitions', 'Maître des finitions', 'Faire réceptionner 10 chantiers sans réserves', 'sans_reserve', 10, 3),
  ('expert_de_la_photo', 'Expert de la photo', 'Publier 200 photos dans le suivi de vos chantiers', 'photos_total', 200, 4),
  ('pro_du_nettoyage', 'Pro du nettoyage', 'Être noté « Impeccable » en propreté sur 10 chantiers', 'avis_proprete', 10, 5),
  ('artisan_applique', 'Artisan appliqué', 'Répondre à 10 avis de vos clients', 'reponses_avis', 10, 6),
  ('artisan_attentionne', 'Artisan attentionné', 'Être noté « Irréprochable » en communication sur 10 chantiers', 'avis_communication', 10, 7),
  ('main_d_argent', 'Main d''argent', 'Terminer 10 chantiers avec MENAO', 'chantiers_clotures', 10, 8),
  ('main_d_or', 'Main d''or', 'Terminer 25 chantiers avec MENAO', 'chantiers_clotures', 25, 9);

-- ---------------------------------------------------------------------------
-- Progression de chaque artisan : points gagnés (un objectif atteint, une fois), badges obtenus
-- (`seen_at` : écran « Nouveau badge débloqué » déjà montré), récompenses demandées.
-- Écriture par les fonctions de la base seulement.
-- ---------------------------------------------------------------------------
create table public.xp_events (
  id uuid primary key default gen_random_uuid(),
  artisan_id uuid not null references public.artisans (id) on delete cascade,
  objective_code text not null references public.gamification_objectives (code) on update cascade,
  xp integer not null check (xp >= 0),
  created_at timestamptz not null default now(),
  unique (artisan_id, objective_code)
);

create table public.artisan_badges (
  artisan_id uuid not null references public.artisans (id) on delete cascade,
  badge_code text not null references public.badges (code) on update cascade,
  unlocked_at timestamptz not null default now(),
  seen_at timestamptz,
  primary key (artisan_id, badge_code)
);

create table public.reward_claims (
  id uuid primary key default gen_random_uuid(),
  artisan_id uuid not null references public.artisans (id) on delete cascade,
  level smallint not null references public.gamification_levels (level),
  jacket_size text not null check (jacket_size in ('S', 'M', 'L', 'XL', 'XXL')),
  pants_size text not null check (pants_size in ('S', 'M', 'L', 'XL', 'XXL')),
  address text not null check (char_length(address) between 5 and 200),
  city text not null check (char_length(city) between 1 and 100),
  country text not null check (char_length(country) between 2 and 60),
  phone text not null check (phone ~ '^\+?[0-9][0-9 .-]{7,19}$'),
  ticket_id uuid references public.tickets (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (artisan_id, level)
);

alter table public.xp_events enable row level security;
alter table public.artisan_badges enable row level security;
alter table public.reward_claims enable row level security;
revoke all on public.xp_events, public.artisan_badges, public.reward_claims from anon, authenticated;
grant select on public.xp_events, public.artisan_badges, public.reward_claims to authenticated;
create policy "xp_events : lecture par l'artisan ou l'équipe" on public.xp_events for select to authenticated
  using (artisan_id = (select app.my_artisan_id()) or (select app.is_staff()));
create policy "artisan_badges : lecture par l'artisan ou l'équipe" on public.artisan_badges for select to authenticated
  using (artisan_id = (select app.my_artisan_id()) or (select app.is_staff()));
create policy "reward_claims : lecture par l'artisan ou l'équipe" on public.reward_claims for select to authenticated
  using (artisan_id = (select app.my_artisan_id()) or (select app.is_staff()));

-- ---------------------------------------------------------------------------
-- Calcul : mesures, niveau, mise à jour de la progression (points, badges, notifications push).
-- ---------------------------------------------------------------------------
create function app.gamification_metric(p_artisan uuid, p_metric text)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select (case p_metric
    when 'chantiers_clotures' then
      (select count(*) from public.chantiers c where c.artisan_id = p_artisan and c.status = 'cloture')
    when 'sans_reserve' then
      (select count(*) from public.receptions r join public.chantiers c on c.id = r.chantier_id
       where c.artisan_id = p_artisan and r.status = 'signe' and not r.with_reserves)
    when 'photos_total' then
      (select count(*) from public.chantier_updates u join public.chantiers c on c.id = u.chantier_id
       where c.artisan_id = p_artisan and u.kind = 'photo')
    when 'photos_chantier_max' then
      (select coalesce(max(n), 0) from (
         select count(*) n from public.chantier_updates u join public.chantiers c on c.id = u.chantier_id
         where c.artisan_id = p_artisan and u.kind = 'photo' group by u.chantier_id) x)
    -- Avis publiés : tranche du haut des curseurs (90 % ou plus, « Irréprochable », « À l'heure »…).
    when 'avis_excellents' then
      (select count(*) from public.reviews v where v.artisan_id = p_artisan and v.status = 'publie' and v.score >= 90)
    when 'avis_finitions' then
      (select count(*) from public.reviews v where v.artisan_id = p_artisan and v.status = 'publie' and v.quality >= 90)
    when 'avis_ponctualite' then
      (select count(*) from public.reviews v where v.artisan_id = p_artisan and v.status = 'publie' and v.delays >= 90)
    when 'avis_communication' then
      (select count(*) from public.reviews v where v.artisan_id = p_artisan and v.status = 'publie' and v.communication >= 90)
    when 'avis_proprete' then
      (select count(*) from public.reviews v where v.artisan_id = p_artisan and v.status = 'publie' and v.cleanliness >= 90)
    when 'reponses_avis' then
      (select count(*) from public.reviews v where v.artisan_id = p_artisan and v.reply is not null)
    -- avis_clients : notation des clients par l'artisan (F-23), pas encore ouverte.
    else 0
  end)::integer
$$;

create function app.gamification_level(p_xp integer)
returns smallint
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(max(level), 1)::smallint from public.gamification_levels where xp_min <= p_xp
$$;

-- `p_notify` faux : reprise de l'existant, sans notification ni écran « Nouveau badge débloqué ».
create function app.refresh_gamification(p_artisan uuid, p_notify boolean default true)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid;
  v_before integer;
  v_after integer;
  v_level smallint;
  o record;
  b record;
begin
  select user_id into v_user from public.artisans where id = p_artisan;
  if v_user is null then
    return;
  end if;
  select coalesce(sum(xp), 0) into v_before from public.xp_events where artisan_id = p_artisan;
  for o in
    select * from public.gamification_objectives g
    where g.active
      and not exists (select 1 from public.xp_events e where e.artisan_id = p_artisan and e.objective_code = g.code)
  loop
    if app.gamification_metric(p_artisan, o.metric) >= o.target then
      insert into public.xp_events (artisan_id, objective_code, xp) values (p_artisan, o.code, o.xp)
      on conflict (artisan_id, objective_code) do nothing;
    end if;
  end loop;
  select coalesce(sum(xp), 0) into v_after from public.xp_events where artisan_id = p_artisan;
  v_level := app.gamification_level(v_after);
  if p_notify and v_level > app.gamification_level(v_before) then
    perform app.notify(v_user, 'niveau_atteint', jsonb_build_object(
      'niveau', v_level,
      'recompense', (select reward from public.gamification_levels where level = v_level)
    ));
  end if;
  for b in
    select * from public.badges g
    where g.active
      and not exists (select 1 from public.artisan_badges a where a.artisan_id = p_artisan and a.badge_code = g.code)
  loop
    if app.gamification_metric(p_artisan, b.metric) >= b.target then
      insert into public.artisan_badges (artisan_id, badge_code, seen_at)
      values (p_artisan, b.code, case when p_notify then null else now() end)
      on conflict (artisan_id, badge_code) do nothing;
      if p_notify then
        perform app.notify(v_user, 'badge_debloque', jsonb_build_object('badge', b.label, 'badge_code', b.code));
      end if;
    end if;
  end loop;
end;
$$;
revoke execute on function app.gamification_metric(uuid, text) from public, anon, authenticated;
revoke execute on function app.gamification_level(integer) from public, anon, authenticated;
revoke execute on function app.refresh_gamification(uuid, boolean) from public, anon, authenticated;

-- Événements qui font progresser : chantier clôturé, PV signé, photo du suivi, avis publié,
-- modéré ou auquel l'artisan répond.
create function app.gamification_on_artisan_row()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform app.refresh_gamification(new.artisan_id);
  return null;
end;
$$;
create function app.gamification_on_chantier_row()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform app.refresh_gamification(c.artisan_id) from public.chantiers c where c.id = new.chantier_id;
  return null;
end;
$$;
revoke execute on function app.gamification_on_artisan_row() from public, anon, authenticated;
revoke execute on function app.gamification_on_chantier_row() from public, anon, authenticated;

create trigger chantiers_gamification after update of status on public.chantiers
  for each row when (new.status = 'cloture' and old.status is distinct from new.status)
  execute function app.gamification_on_artisan_row();
create trigger reviews_gamification after insert or update of status, reply on public.reviews
  for each row execute function app.gamification_on_artisan_row();
create trigger chantier_updates_gamification after insert on public.chantier_updates
  for each row when (new.kind = 'photo')
  execute function app.gamification_on_chantier_row();
create trigger receptions_gamification after update of status on public.receptions
  for each row when (new.status = 'signe' and old.status is distinct from new.status)
  execute function app.gamification_on_chantier_row();

-- ---------------------------------------------------------------------------
-- Écrans « Mon grade MENAO » : progression de l'artisan connecté.
-- ---------------------------------------------------------------------------
create function public.artisan_grade()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_artisan uuid := app.my_artisan_id();
  v_xp integer;
begin
  if v_artisan is null then
    raise exception 'Réservé aux artisans' using errcode = '42501';
  end if;
  select coalesce(sum(xp), 0) into v_xp from public.xp_events where artisan_id = v_artisan;
  return jsonb_build_object(
    'xp', v_xp,
    'level', app.gamification_level(v_xp),
    'levels', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'level', l.level, 'xp_min', l.xp_min, 'reward', l.reward, 'reward_detail', l.reward_detail
      ) order by l.level), '[]'::jsonb)
      from public.gamification_levels l
    ),
    'objectives', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'code', g.code, 'title', g.title, 'description', g.description, 'xp', g.xp,
        'target', g.target,
        'progress', least(app.gamification_metric(v_artisan, g.metric), g.target),
        'achieved_at', e.created_at
      ) order by (e.created_at is not null), g.position), '[]'::jsonb)
      from public.gamification_objectives g
      left join public.xp_events e on e.objective_code = g.code and e.artisan_id = v_artisan
      where g.active or e.id is not null
    ),
    'badges', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'code', g.code, 'label', g.label, 'description', g.description, 'target', g.target,
        'progress', least(app.gamification_metric(v_artisan, g.metric), g.target),
        'unlocked_at', a.unlocked_at, 'seen', a.seen_at is not null
      ) order by g.position), '[]'::jsonb)
      from public.badges g
      left join public.artisan_badges a on a.badge_code = g.code and a.artisan_id = v_artisan
      where g.active or a.artisan_id is not null
    ),
    'claims', (
      select coalesce(jsonb_agg(jsonb_build_object('level', r.level, 'created_at', r.created_at)), '[]'::jsonb)
      from public.reward_claims r where r.artisan_id = v_artisan
    )
  );
end;
$$;
revoke execute on function public.artisan_grade() from public, anon;
grant execute on function public.artisan_grade() to authenticated;

-- Écran « Nouveau badge débloqué » montré : les badges obtenus ne le déclenchent plus.
create function public.artisan_mark_badges_seen()
returns void
language sql
security definer
set search_path = ''
as $$
  update public.artisan_badges set seen_at = now()
  where artisan_id = app.my_artisan_id() and seen_at is null
$$;
revoke execute on function public.artisan_mark_badges_seen() from public, anon;
grant execute on function public.artisan_mark_badges_seen() to authenticated;

-- « Réclamez votre récompense » : une demande par niveau atteint, transmise à l'équipe (ticket
-- « recompense », traitement manuel en V1).
create function public.artisan_claim_reward(
  p_level smallint,
  p_jacket_size text,
  p_pants_size text,
  p_address text,
  p_city text,
  p_country text,
  p_phone text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_artisan uuid := app.my_artisan_id();
  v_reward text;
  v_xp integer;
  v_email text;
  v_ticket uuid;
  v_id uuid;
  v_address text := btrim(p_address);
  v_city text := btrim(p_city);
  v_country text := btrim(p_country);
  v_phone text := btrim(p_phone);
begin
  if v_artisan is null then
    raise exception 'Réservé aux artisans' using errcode = '42501';
  end if;
  select reward into v_reward from public.gamification_levels where level = p_level;
  if v_reward is null then
    raise exception 'Aucune récompense pour ce niveau' using errcode = '22023';
  end if;
  select coalesce(sum(xp), 0) into v_xp from public.xp_events where artisan_id = v_artisan;
  if app.gamification_level(v_xp) < p_level then
    raise exception 'Vous n''avez pas encore atteint ce niveau' using errcode = '22023';
  end if;
  if exists (select 1 from public.reward_claims where artisan_id = v_artisan and level = p_level) then
    raise exception 'Vous avez déjà demandé cette récompense' using errcode = '22023';
  end if;
  if coalesce(p_jacket_size, '') not in ('S', 'M', 'L', 'XL', 'XXL')
     or coalesce(p_pants_size, '') not in ('S', 'M', 'L', 'XL', 'XXL') then
    raise exception 'Choisissez vos tailles' using errcode = '22023';
  end if;
  if coalesce(char_length(v_address) not between 5 and 200, true)
     or coalesce(char_length(v_city) not between 1 and 100, true)
     or coalesce(char_length(v_country) not between 2 and 60, true) then
    raise exception 'Indiquez votre adresse de livraison' using errcode = '22023';
  end if;
  if coalesce(v_phone !~ '^\+?[0-9][0-9 .-]{7,19}$', true) then
    raise exception 'Indiquez un numéro de téléphone valide' using errcode = '22023';
  end if;

  select email into v_email from auth.users where id = auth.uid();
  insert into public.tickets (type, user_id, contact_email, subject, message)
  values ('recompense', auth.uid(), v_email,
    left(format('Récompense du niveau %s : %s', p_level, v_reward), 150),
    left(format('Veste : %s. Pantalon : %s. Livraison : %s, %s, %s. Téléphone : %s.',
      p_jacket_size, p_pants_size, v_address, v_city, v_country, v_phone), 2000))
  returning id into v_ticket;
  insert into public.reward_claims (artisan_id, level, jacket_size, pants_size, address, city, country, phone, ticket_id)
  values (v_artisan, p_level, p_jacket_size, p_pants_size, v_address, v_city, v_country, v_phone, v_ticket)
  returning id into v_id;
  return v_id;
end;
$$;
revoke execute on function public.artisan_claim_reward(smallint, text, text, text, text, text, text) from public, anon;
grant execute on function public.artisan_claim_reward(smallint, text, text, text, text, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Badges et niveaux : notifications push seulement (spec F-41), jamais d'e-mail.
-- ---------------------------------------------------------------------------
create or replace function app.email_wanted(p_user_id uuid, p_type public.notification_type)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_type not in ('badge_debloque', 'niveau_atteint')
    and (app.notification_category(p_type) = 'transactionnel'
      or coalesce((
        select (p.notification_preferences #>> array['email', app.notification_category(p_type)])::boolean
        from public.profiles p where p.user_id = p_user_id
      ), true))
$$;
revoke execute on function app.email_wanted(uuid, public.notification_type) from public, anon, authenticated;

-- Reprise de l'existant : progression calculée sans notification.
select app.refresh_gamification(a.id, false) from public.artisans a;
