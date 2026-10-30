-- Invitation d'un membre de l'équipe MENAO (F-67, ADR 0210) : un admin invite un autre admin ou un
-- membre du support depuis le back-office. L'Edge Function staff-invite crée le compte et pose le
-- rôle (clé serveur), puis enregistre l'invitation au nom de l'admin : contrôle du rôle de l'appelant
-- (session aal2) et du compte invité, journal d'audit. Aucune nouvelle table.

create function public.admin_record_staff_invite(p_user_id uuid, p_role public.app_role)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform app.require_admin();
  if p_role is null or p_role not in ('admin', 'support') then
    raise exception 'Rôle invalide : admin ou support.' using errcode = '22023';
  end if;
  if not exists (
    select 1 from auth.users u
    where u.id = p_user_id and u.raw_app_meta_data ->> 'role' = p_role::text
  ) then
    raise exception 'Compte invité introuvable.' using errcode = '22023';
  end if;
  perform app.audit('equipe.invitation', 'compte', p_user_id, jsonb_build_object('role', p_role));
end;
$$;
revoke execute on function public.admin_record_staff_invite(uuid, public.app_role) from public, anon;
grant execute on function public.admin_record_staff_invite(uuid, public.app_role) to authenticated;
