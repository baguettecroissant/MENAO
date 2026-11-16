-- Lien de démo de l'espace commercial (F-65, maquette du lot 57, ADR 0344).
-- Un seul lien, à clé secrète : l'admin le copie, le change (l'ancien tombe aussitôt) ou le
-- désactive. La démo n'affiche que des données fictives et n'écrit rien en base ; seule la clé est
-- vérifiée ici, sans compte.

create table public.commercial_demo (
  id boolean primary key default true check (id),
  key text not null check (key ~ '^[a-f0-9]{32}$'),
  enabled boolean not null default false,
  rotated_at timestamptz not null default now()
);
alter table public.commercial_demo enable row level security;
-- Aucune politique : la table n'est lue et écrite que par les fonctions ci-dessous.
revoke all on public.commercial_demo from anon, authenticated;

insert into public.commercial_demo (key) values (replace(gen_random_uuid()::text, '-', ''));

-- La clé ouvre-t-elle la démo ? Appelée sans compte, à l'ouverture du lien et à chaque page.
create function public.commercial_demo_open(p_key text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.commercial_demo d
    where d.enabled and p_key is not null and d.key = p_key
  )
$$;
revoke execute on function public.commercial_demo_open(text) from public;
grant execute on function public.commercial_demo_open(text) to anon, authenticated;

-- Lien actuel, pour le back-office.
create function public.admin_commercial_demo()
returns table (key text, enabled boolean, rotated_at timestamptz)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform app.require_admin();
  return query select d.key, d.enabled, d.rotated_at from public.commercial_demo d;
end;
$$;
revoke execute on function public.admin_commercial_demo() from public, anon;
grant execute on function public.admin_commercial_demo() to authenticated;

-- Nouveau lien : nouvelle clé, démo activée ; l'ancienne clé ne marche plus.
create function public.admin_rotate_commercial_demo()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_key text := replace(gen_random_uuid()::text, '-', '');
begin
  perform app.require_admin();
  update public.commercial_demo set key = v_key, enabled = true, rotated_at = now();
  perform app.audit('demo_commerciale.lien_change', 'demo_commerciale', null);
  return v_key;
end;
$$;
revoke execute on function public.admin_rotate_commercial_demo() from public, anon;
grant execute on function public.admin_rotate_commercial_demo() to authenticated;

-- Activer ou désactiver le lien actuel.
create function public.admin_set_commercial_demo(p_enabled boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform app.require_admin();
  if p_enabled is null then
    raise exception 'Choix invalide.' using errcode = '22023';
  end if;
  update public.commercial_demo set enabled = p_enabled;
  perform app.audit(
    case when p_enabled then 'demo_commerciale.activee' else 'demo_commerciale.desactivee' end,
    'demo_commerciale', null);
end;
$$;
revoke execute on function public.admin_set_commercial_demo(boolean) from public, anon;
grant execute on function public.admin_set_commercial_demo(boolean) to authenticated;
