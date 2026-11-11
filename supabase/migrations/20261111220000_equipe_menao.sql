-- Équipe MENAO dans les Réglages du back-office (F-133, ADR 0284).
--
-- Liste des membres de l'équipe (admins et support) avec leur double authentification et leur
-- dernière connexion ; changement d'accès (admin ↔ support) et retrait de l'accès d'un membre qui
-- quitte MENAO. Le rôle reste dans app_metadata (règle 7) : la base le change dans
-- auth.users.raw_app_meta_data, recopié dans profiles par le déclencheur existant. Réservé aux
-- admins en double authentification ; jamais sur son propre compte ; chaque action est journalisée.

-- Membre de l'équipe visé : existant, admin ou support, accès non retiré, jamais soi-même.
create function app.staff_target(p_user_id uuid)
returns public.app_role
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_role text;
begin
  select u.raw_app_meta_data ->> 'role' into v_role
  from auth.users u
  where u.id = p_user_id and (u.banned_until is null or u.banned_until <= now());
  if v_role is null or v_role not in ('admin', 'support') then
    raise exception 'Membre de l''équipe introuvable.' using errcode = '22023';
  end if;
  if p_user_id = (select auth.uid()) then
    raise exception 'Vous ne pouvez pas modifier votre propre accès.' using errcode = '22023';
  end if;
  return v_role::public.app_role;
end;
$$;
revoke execute on function app.staff_target(uuid) from public, anon, authenticated;

-- Membres de l'équipe : nom, e-mail, accès, double authentification activée, dernière connexion,
-- date d'invitation (sans connexion : invitation en attente). Admins d'abord, puis par nom.
create function public.admin_staff_members()
returns table (
  user_id uuid,
  prenom text,
  nom text,
  email text,
  role public.app_role,
  double_auth boolean,
  derniere_connexion timestamptz,
  invite_le timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform app.require_admin();
  return query
  select u.id, p.first_name, p.last_name, u.email::text,
         (u.raw_app_meta_data ->> 'role')::public.app_role,
         exists (select 1 from auth.mfa_factors f where f.user_id = u.id and f.status = 'verified'),
         u.last_sign_in_at,
         coalesce(u.invited_at, u.created_at)
  from auth.users u
  left join public.profiles p on p.user_id = u.id
  where u.raw_app_meta_data ->> 'role' in ('admin', 'support')
    and (u.banned_until is null or u.banned_until <= now())
  order by (u.raw_app_meta_data ->> 'role') = 'support', p.last_name, p.first_name, u.email;
end;
$$;
revoke execute on function public.admin_staff_members() from public, anon;
grant execute on function public.admin_staff_members() to authenticated;

-- Changement d'accès d'un membre : admin ou support. Ses sessions sont fermées pour que le
-- nouveau rôle s'applique à sa prochaine connexion.
create function public.admin_set_staff_role(p_user_id uuid, p_role public.app_role)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_current public.app_role;
begin
  perform app.require_admin();
  if p_role is null or p_role not in ('admin', 'support') then
    raise exception 'Accès invalide : admin ou support.' using errcode = '22023';
  end if;
  v_current := app.staff_target(p_user_id);
  if v_current = p_role then
    raise exception 'Ce membre a déjà cet accès.' using errcode = '22023';
  end if;
  update auth.users
  set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
    || jsonb_build_object('role', p_role::text)
  where id = p_user_id;
  delete from auth.sessions where user_id = p_user_id;
  perform app.audit('equipe.acces', 'compte', p_user_id,
    jsonb_build_object('role', p_role, 'ancien_role', v_current));
end;
$$;
revoke execute on function public.admin_set_staff_role(uuid, public.app_role) from public, anon;
grant execute on function public.admin_set_staff_role(uuid, public.app_role) to authenticated;

-- Retrait de l'accès d'un membre qui quitte MENAO : plus de rôle d'équipe, connexion bloquée,
-- sessions fermées. Son nom reste dans le journal et sur les tickets qu'il a traités.
create function public.admin_remove_staff(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_current public.app_role;
begin
  perform app.require_admin();
  v_current := app.staff_target(p_user_id);
  update auth.users
  set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
      || jsonb_build_object('role', 'particulier'),
    banned_until = now() + interval '100 years'
  where id = p_user_id;
  delete from auth.sessions where user_id = p_user_id;
  perform app.audit('equipe.retrait', 'compte', p_user_id,
    jsonb_build_object('ancien_role', v_current));
end;
$$;
revoke execute on function public.admin_remove_staff(uuid) from public, anon;
grant execute on function public.admin_remove_staff(uuid) to authenticated;
