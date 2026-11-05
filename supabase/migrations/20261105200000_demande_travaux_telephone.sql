-- Demande de travaux par téléphone (F-77, ADR 0227) : Camille prépare la demande d'un particulier
-- pendant l'appel, rien ne part chez les artisans. Le particulier reçoit un lien par e-mail : il
-- crée son espace (ou se connecte), relit sa demande et l'envoie lui-même.
--
-- Même chemin que le site : le projet appartient à une session anonyme créée par l'Edge Function,
-- puis passe au compte du particulier par un jeton de transfert (project_transfers, claim_project,
-- ADR 0014). Ici, le jeton vaut 7 jours au lieu de 24 h, et les coordonnées dictées (prénom,
-- e-mail, téléphone) servent seulement à pré-remplir la création du compte : elles sont effacées
-- dès que le lien a servi, ou à expiration du lien.

create table public.voice_work_requests (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null unique references public.projects (id) on delete cascade,
  transfer_id uuid not null unique references public.project_transfers (id) on delete cascade,
  first_name text not null check (char_length(first_name) between 1 and 60),
  email text not null check (char_length(email) <= 254 and email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[a-z]{2,}$'),
  phone text not null check (phone ~ '^\+[1-9][0-9]{7,14}$'),
  created_at timestamptz not null default now()
);
create index voice_work_requests_phone_idx on public.voice_work_requests (phone, created_at);
-- Aucune politique : accès par les fonctions ci-dessous et le rôle service uniquement.
alter table public.voice_work_requests enable row level security;

-- Lien utilisé (projet rattaché au compte) : les coordonnées dictées ne servent plus.
create function app.forget_voice_work_request()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.voice_work_requests where transfer_id = new.id;
  return new;
end;
$$;
revoke execute on function app.forget_voice_work_request() from public, anon, authenticated;
create trigger project_transfers_forget_voice_request
  after update of used_at on public.project_transfers
  for each row when (old.used_at is null and new.used_at is not null)
  execute function app.forget_voice_work_request();

-- Demande préparée par Camille (rôle service) : jeton de transfert de 7 jours et coordonnées
-- dictées. Au plus 3 demandes par numéro et par jour.
create function public.voice_prepare_work_request(
  p_project_id uuid,
  p_first_name text,
  p_email text,
  p_phone text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_token text := encode(extensions.gen_random_bytes(32), 'hex');
  v_owner uuid;
  v_transfer uuid;
begin
  -- Coordonnées des liens expirés : effacées au passage.
  delete from public.voice_work_requests v
  using public.project_transfers t
  where t.id = v.transfer_id and t.expires_at <= now();

  select p.user_id into v_owner
  from public.projects p
  join auth.users u on u.id = p.user_id
  where p.id = p_project_id and u.is_anonymous and p.status in ('brouillon', 'criteres_valides');
  if not found then
    raise exception 'Projet introuvable' using errcode = '42501';
  end if;
  if (
    select count(*) from public.voice_work_requests
    where phone = p_phone and created_at > now() - interval '1 day'
  ) >= 3 then
    raise exception 'Trop de demandes pour ce numéro aujourd''hui' using errcode = '22023';
  end if;

  insert into public.project_transfers (project_id, from_user_id, token_hash, expires_at)
  values (
    p_project_id, v_owner, encode(extensions.digest(v_token, 'sha256'), 'hex'), now() + interval '7 days'
  )
  returning id into v_transfer;
  insert into public.voice_work_requests (project_id, transfer_id, first_name, email, phone)
  values (p_project_id, v_transfer, btrim(p_first_name), lower(btrim(p_email)), p_phone);
  return v_token;
end;
$$;
revoke execute on function public.voice_prepare_work_request(uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.voice_prepare_work_request(uuid, text, text, text) to service_role;

-- Page ouverte depuis l'e-mail, avant connexion : la demande préparée et les coordonnées dictées,
-- pour le seul porteur du jeton (lien encore valide et pas encore utilisé).
create function public.voice_work_request_preview(p_token text)
returns table (
  project_id uuid,
  first_name text,
  email text,
  phone text,
  summary text,
  ville_nom text,
  trade_label text
)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, v.first_name, v.email, v.phone, p.summary, p.ville_nom, tr.label
  from public.project_transfers t
  join public.voice_work_requests v on v.transfer_id = t.id
  join public.projects p on p.id = t.project_id
  join auth.users u on u.id = t.from_user_id
  left join public.trades tr on tr.code = p.trade_code
  where t.token_hash = encode(extensions.digest(coalesce(p_token, ''), 'sha256'), 'hex')
    and t.used_at is null
    and t.expires_at > now()
    and u.is_anonymous
$$;
revoke execute on function public.voice_work_request_preview(text) from public;
grant execute on function public.voice_work_request_preview(text) to anon, authenticated;
