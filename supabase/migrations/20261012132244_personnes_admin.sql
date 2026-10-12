-- F-52 (lot 3a, ADR 0047) : personnes et recherche globale du back-office, activité et suspension
-- manuelle d'un artisan. Réservé aux admins en session aal2 (app.is_admin). Les sessions anonymes
-- (recherches sans compte) ne sont jamais listées.

-- ---------------------------------------------------------------------------
-- Personnes : comptes avec leur profil, rôle et fiche artisan éventuelle.
-- ---------------------------------------------------------------------------
create function app.admin_people_rows()
returns table (
  user_id uuid, created_at timestamptz, last_sign_in_at timestamptz, name text, email text,
  phone text, role text, artisan_id uuid
)
language sql
stable
security definer
set search_path = ''
as $$
  select u.id, u.created_at, u.last_sign_in_at,
    nullif(btrim(concat_ws(' ', pr.first_name, pr.last_name)), ''), u.email::text, pr.phone,
    pr.role::text, a.id
  from auth.users u
  join public.profiles pr on pr.user_id = u.id
  left join public.artisans a on a.user_id = u.id
  where not coalesce(u.is_anonymous, false)
$$;
revoke execute on function app.admin_people_rows() from public, anon, authenticated;

-- Filtre par rôle : tous, particuliers, artisans (validés ou en cours d'inscription), équipe.
create function app.admin_role_matches(p_filter text, p_role text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select case coalesce(p_filter, 'tous')
    when 'particuliers' then p_role = 'particulier'
    when 'artisans' then p_role in ('artisan', 'artisan_en_attente')
    when 'equipe' then p_role in ('admin', 'support')
    else true
  end
$$;

create function public.admin_people(
  p_role text default 'tous',
  p_query text default null,
  p_limit integer default 50,
  p_offset integer default 0
)
returns table (
  user_id uuid, created_at timestamptz, last_sign_in_at timestamptz, name text, email text,
  phone text, role text, artisan_id uuid, total bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_like text := app.admin_like(p_query);
begin
  if not app.is_admin() then
    raise exception 'Réservé à l''équipe MENAO' using errcode = '42501';
  end if;
  return query
  select r.user_id, r.created_at, r.last_sign_in_at, r.name, r.email, r.phone, r.role,
    r.artisan_id, count(*) over ()
  from app.admin_people_rows() r
  where app.admin_role_matches(p_role, r.role)
    and (v_like is null or r.name ilike v_like or r.email ilike v_like or r.phone ilike v_like)
  order by r.created_at desc
  limit least(greatest(coalesce(p_limit, 50), 1), 100)
  offset greatest(coalesce(p_offset, 0), 0);
end;
$$;

create function public.admin_people_counts(p_query text default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_like text := app.admin_like(p_query);
begin
  if not app.is_admin() then
    raise exception 'Réservé à l''équipe MENAO' using errcode = '42501';
  end if;
  return (
    select jsonb_build_object(
      'tous', count(*),
      'particuliers', count(*) filter (where app.admin_role_matches('particuliers', r.role)),
      'artisans', count(*) filter (where app.admin_role_matches('artisans', r.role)),
      'equipe', count(*) filter (where app.admin_role_matches('equipe', r.role))
    )
    from app.admin_people_rows() r
    where v_like is null or r.name ilike v_like or r.email ilike v_like or r.phone ilike v_like
  );
end;
$$;

-- Compte d'une personne : informations de connexion (auth.users), pour sa fiche.
create function public.admin_user_account(p_user_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not app.is_admin() then
    raise exception 'Réservé à l''équipe MENAO' using errcode = '42501';
  end if;
  return (
    select jsonb_build_object(
      'email', u.email,
      'created_at', u.created_at,
      'last_sign_in_at', u.last_sign_in_at,
      'email_confirmed_at', u.email_confirmed_at,
      'banned_until', u.banned_until
    )
    from auth.users u
    where u.id = p_user_id and not coalesce(u.is_anonymous, false)
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Recherche globale (barre du haut) : personnes, artisans, chantiers, devis et factures.
-- ---------------------------------------------------------------------------
create function public.admin_search(p_query text, p_limit integer default 6)
returns table (kind text, id uuid, label text, detail text, tag text)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_like text := app.admin_like(p_query);
  -- SIRET saisi avec des espaces.
  v_digits text := nullif(regexp_replace(coalesce(p_query, ''), '\s', '', 'g'), '');
  v_limit integer := least(greatest(coalesce(p_limit, 6), 1), 20);
begin
  if not app.is_admin() then
    raise exception 'Réservé à l''équipe MENAO' using errcode = '42501';
  end if;
  if v_like is null then
    return;
  end if;
  return query
  (select 'personne'::text, r.user_id, coalesce(r.name, r.email), r.email, r.role
    from app.admin_people_rows() r
    where r.name ilike v_like or r.email ilike v_like or r.phone ilike v_like
    order by r.created_at desc limit v_limit)
  union all
  (select 'artisan', a.id, coalesce(a.nom_commercial, a.raison_sociale, a.siret), a.siret, a.status::text
    from public.artisans a
    where a.nom_commercial ilike v_like or a.raison_sociale ilike v_like
      or (v_digits ~ '^[0-9]{3,14}$' and left(a.siret, length(v_digits)) = v_digits)
    order by a.created_at desc limit v_limit)
  union all
  (select 'chantier', c.id, c.title, c.ville_nom, c.status::text
    from public.chantiers c
    where c.title ilike v_like
    order by c.created_at desc limit v_limit)
  union all
  (select 'devis', q.chantier_id, q.numero, c.title, q.status::text
    from public.quotes q
    join public.chantiers c on c.id = q.chantier_id
    where q.numero ilike v_like
    order by q.created_at desc limit v_limit)
  union all
  (select 'facture', i.chantier_id, i.numero, c.title, i.kind::text
    from public.invoices i
    join public.chantiers c on c.id = i.chantier_id
    where i.numero ilike v_like
    order by i.created_at desc limit v_limit);
end;
$$;

-- ---------------------------------------------------------------------------
-- Activité d'un artisan : demandes reçues, chantiers par statut, avis publiés.
-- ---------------------------------------------------------------------------
create function public.admin_artisan_activity(p_artisan_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not app.is_admin() then
    raise exception 'Réservé à l''équipe MENAO' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'demandes', (
      select jsonb_build_object(
        'total', count(*),
        'en_attente', count(*) filter (where r.status = 'envoyee' and r.expires_at > now()),
        'acceptees', count(*) filter (where r.status = 'acceptee'),
        'refusees', count(*) filter (where r.status = 'refusee'),
        'expirees', count(*) filter (where r.status = 'expiree'),
        'annulees', count(*) filter (where r.status = 'annulee')
      )
      from public.requests r where r.artisan_id = p_artisan_id
    ),
    'chantiers', (
      select coalesce(jsonb_object_agg(s.status, s.n), '{}'::jsonb)
      from (
        select c.status, count(*) as n from public.chantiers c
        where c.artisan_id = p_artisan_id group by c.status
      ) s
    ),
    'avis', (
      select jsonb_build_object(
        'publies', count(*) filter (where rv.status = 'publie'),
        'note_moyenne', round(avg(rv.score) filter (where rv.status = 'publie'))
      )
      from public.reviews rv where rv.artisan_id = p_artisan_id
    )
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Suspension manuelle d'un artisan validé (motif obligatoire, transmis à l'artisan), et levée.
-- TODO(legal) : règlement P2B (UE 2019/1150) — motivation transmise ; faire valider les délais,
-- le traitement des réclamations et la mention dans les CGV artisans.
-- ---------------------------------------------------------------------------
create function public.admin_suspend_artisan(p_artisan_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
  v_user uuid;
begin
  if not app.is_admin() then
    raise exception 'Réservé à l''équipe MENAO' using errcode = '42501';
  end if;
  if v_reason is null or char_length(v_reason) > 1000 then
    raise exception 'Indiquez le motif de la suspension (1 000 caractères au plus).' using errcode = '22023';
  end if;
  update public.artisans set status = 'suspendu', suspension_reason = 'decision_admin'
  where id = p_artisan_id and status = 'valide'
  returning user_id into v_user;
  if not found then
    raise exception 'Seul un artisan validé peut être suspendu.' using errcode = '22023';
  end if;
  perform app.audit('artisan.suspendu', 'artisan', p_artisan_id, jsonb_build_object('motif', v_reason));
  perform app.notify(v_user, 'compte_suspendu', jsonb_build_object('par', 'equipe', 'motif', v_reason));
end;
$$;

-- Levée d'une suspension décidée par l'équipe ; jamais sans assurances à jour.
create function public.admin_reactivate_artisan(p_artisan_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid;
begin
  if not app.is_admin() then
    raise exception 'Réservé à l''équipe MENAO' using errcode = '42501';
  end if;
  update public.artisans set status = 'valide', suspension_reason = null
  where id = p_artisan_id and status = 'suspendu' and suspension_reason = 'decision_admin'
    and app.artisan_insurances_valid(id)
  returning user_id into v_user;
  if not found then
    raise exception 'Réactivation impossible : la suspension n''a pas été décidée par l''équipe, ou les assurances ne sont pas à jour.'
      using errcode = '22023';
  end if;
  perform app.audit('artisan.reactive', 'artisan', p_artisan_id, '{}');
  perform app.notify(v_user, 'compte_reactive', jsonb_build_object(
    'par', 'equipe', 'visible', app.artisan_is_visible(p_artisan_id)
  ));
end;
$$;

revoke execute on function public.admin_people(text, text, integer, integer) from public, anon;
revoke execute on function public.admin_people_counts(text) from public, anon;
revoke execute on function public.admin_user_account(uuid) from public, anon;
revoke execute on function public.admin_search(text, integer) from public, anon;
revoke execute on function public.admin_artisan_activity(uuid) from public, anon;
revoke execute on function public.admin_suspend_artisan(uuid, text) from public, anon;
revoke execute on function public.admin_reactivate_artisan(uuid) from public, anon;
grant execute on function public.admin_people(text, text, integer, integer) to authenticated;
grant execute on function public.admin_people_counts(text) to authenticated;
grant execute on function public.admin_user_account(uuid) to authenticated;
grant execute on function public.admin_search(text, integer) to authenticated;
grant execute on function public.admin_artisan_activity(uuid) to authenticated;
grant execute on function public.admin_suspend_artisan(uuid, text) to authenticated;
grant execute on function public.admin_reactivate_artisan(uuid) to authenticated;
