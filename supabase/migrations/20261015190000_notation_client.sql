-- Notation du client par l'artisan (F-23, charte qualité R5.2, ADR 0106) : une note par chantier,
-- après sa clôture (accueil et accès, clarté du besoin, délai des paiements, commentaire).
-- Jamais montrée au client ni publiée. La moyenne n'est visible des artisans validés qui reçoivent
-- une demande du client que si l'équipe active « client_ratings_visible » (désactivé par défaut).
-- TODO(legal): base légale, information des clients (politique de confidentialité) et droit
-- d'accès avant d'activer la visibilité (décision D11 de la spec).

-- ---------------------------------------------------------------------------
-- Paramètres de la plateforme (options de configuration des décisions [À VALIDER]).
-- ---------------------------------------------------------------------------
create table public.platform_settings (
  key text primary key check (key ~ '^[a-z_]{2,60}$'),
  value jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null
);

alter table public.platform_settings enable row level security;
revoke all on public.platform_settings from anon, authenticated;
grant select on public.platform_settings to authenticated;

create policy "platform_settings : lecture par l'équipe MENAO"
  on public.platform_settings for select to authenticated
  using ((select app.is_staff()));

insert into public.platform_settings (key, value) values ('client_ratings_visible', 'false');

create function app.setting_enabled(p_key text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select value = 'true'::jsonb from public.platform_settings where key = p_key), false)
$$;
revoke execute on function app.setting_enabled(text) from public, anon, authenticated;

create function public.admin_set_platform_setting(p_key text, p_value jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform app.require_admin();
  update public.platform_settings
  set value = p_value, updated_at = now(), updated_by = (select auth.uid())
  where key = p_key;
  if not found then
    raise exception 'Paramètre inconnu.' using errcode = '22023';
  end if;
  perform app.audit('platform_setting', 'platform_settings', null, jsonb_build_object('key', p_key, 'value', p_value));
end;
$$;
revoke execute on function public.admin_set_platform_setting(text, jsonb) from public, anon;
grant execute on function public.admin_set_platform_setting(text, jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- Notes des clients
-- ---------------------------------------------------------------------------
create table public.client_ratings (
  id uuid primary key default gen_random_uuid(),
  chantier_id uuid not null unique references public.chantiers (id) on delete cascade,
  artisan_id uuid not null references public.artisans (id) on delete cascade,
  particulier_id uuid not null references auth.users (id) on delete cascade,
  welcome smallint not null check (welcome between 0 and 100),
  clarity smallint not null check (clarity between 0 and 100),
  payment smallint not null check (payment between 0 and 100),
  comment text not null check (char_length(comment) between 50 and 1000),
  created_at timestamptz not null default now()
);
create index client_ratings_particulier_idx on public.client_ratings (particulier_id);
create index client_ratings_artisan_idx on public.client_ratings (artisan_id);

alter table public.client_ratings enable row level security;
revoke all on public.client_ratings from anon, authenticated;
grant select on public.client_ratings to authenticated;

-- L'artisan relit ses propres notes ; l'équipe MENAO voit tout. Le client ne voit rien.
create policy "client_ratings : lecture par l'artisan auteur, ou par l'équipe MENAO"
  on public.client_ratings for select to authenticated
  using (artisan_id = (select app.my_artisan_id()) or (select app.is_staff()));

create function public.artisan_rate_client(
  p_chantier_id uuid,
  p_welcome integer,
  p_clarity integer,
  p_payment integer,
  p_comment text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  c public.chantiers;
  v_comment text := btrim(coalesce(p_comment, ''));
  v_id uuid;
begin
  select * into c from public.chantiers
  where id = p_chantier_id and artisan_id = app.my_artisan_id();
  if not found then
    raise exception 'Chantier introuvable' using errcode = '42501';
  end if;
  if c.status <> 'cloture' then
    raise exception 'Le client se note une fois le chantier clôturé.' using errcode = '22023';
  end if;
  if exists (select 1 from public.client_ratings r where r.chantier_id = p_chantier_id) then
    raise exception 'Vous avez déjà noté ce client pour ce chantier.' using errcode = '22023';
  end if;
  if p_welcome not between 0 and 100 or p_clarity not between 0 and 100 or p_payment not between 0 and 100 then
    raise exception 'Note invalide.' using errcode = '22023';
  end if;
  if char_length(v_comment) not between 50 and 1000 then
    raise exception 'Commentaire de 50 à 1 000 caractères.' using errcode = '22023';
  end if;

  insert into public.client_ratings (chantier_id, artisan_id, particulier_id, welcome, clarity, payment, comment)
  values (p_chantier_id, c.artisan_id, c.particulier_id, p_welcome, p_clarity, p_payment, v_comment)
  returning id into v_id;

  perform app.refresh_gamification(c.artisan_id);
  return v_id;
end;
$$;
revoke execute on function public.artisan_rate_client(uuid, integer, integer, integer, text) from public, anon;
grant execute on function public.artisan_rate_client(uuid, integer, integer, integer, text) to authenticated;

-- Visibilité des notes pour le réseau (texte affiché à l'artisan qui note).
create function public.client_ratings_visible()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select app.setting_enabled('client_ratings_visible')
$$;
revoke execute on function public.client_ratings_visible() from public, anon;
grant execute on function public.client_ratings_visible() to authenticated;

-- Moyenne des notes du client d'une demande, pour l'artisan validé qui l'a reçue, si l'équipe a
-- activé la visibilité. Aucune ligne sinon. Les commentaires ne sont jamais renvoyés.
create function public.client_reputation(p_request_id uuid)
returns table (ratings integer, welcome integer, clarity integer, payment integer)
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::integer, round(avg(cr.welcome))::integer, round(avg(cr.clarity))::integer,
    round(avg(cr.payment))::integer
  from public.requests r
  join public.artisans a on a.id = r.artisan_id
  join public.client_ratings cr on cr.particulier_id = r.particulier_id
  where r.id = p_request_id
    and r.artisan_id = app.my_artisan_id()
    and a.status = 'valide'
    and app.setting_enabled('client_ratings_visible')
  having count(*) > 0
$$;
revoke execute on function public.client_reputation(uuid) from public, anon;
grant execute on function public.client_reputation(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Gamification (F-24) : les objectifs « avis sur les clients » s'ouvrent.
-- ---------------------------------------------------------------------------
create or replace function app.gamification_metric(p_artisan uuid, p_metric text)
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
    -- Notes laissées par l'artisan sur ses clients (F-23).
    when 'avis_clients' then
      (select count(*) from public.client_ratings cr where cr.artisan_id = p_artisan)
    else 0
  end)::integer
$$;


update public.gamification_objectives set active = true where metric = 'avis_clients';
