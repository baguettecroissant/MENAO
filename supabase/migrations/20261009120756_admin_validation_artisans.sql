-- F-50 — back-office de validation des artisans, double authentification des admins, audit.

-- ---------------------------------------------------------------------------
-- Double authentification obligatoire pour les admins (spec §13), imposée par la base :
-- les droits admin ne s'appliquent qu'à une session de niveau aal2 (TOTP vérifié).
-- Un admin sans second facteur n'a que les droits d'un utilisateur ordinaire.
-- ---------------------------------------------------------------------------
create or replace function app.is_admin()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce(app.jwt_role() = 'admin' and (auth.jwt() ->> 'aal') = 'aal2', false)
$$;

create or replace function app.is_staff()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select app.is_admin() or coalesce(app.jwt_role() = 'support', false)
$$;

-- ---------------------------------------------------------------------------
-- Journal d'audit de toutes les actions admin (spec §13) : lecture seule pour les admins,
-- écriture uniquement par les fonctions ci-dessous.
-- ---------------------------------------------------------------------------
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users (id) on delete set null,
  action text not null check (char_length(action) between 1 and 100),
  target_type text not null check (char_length(target_type) between 1 and 50),
  target_id uuid,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index audit_logs_actor_id_idx on public.audit_logs (actor_id);
create index audit_logs_target_idx on public.audit_logs (target_type, target_id);
create index audit_logs_created_at_idx on public.audit_logs (created_at desc);

alter table public.audit_logs enable row level security;
revoke all on public.audit_logs from anon, authenticated;
grant select on public.audit_logs to authenticated;
create policy "audit_logs : lecture par les admins"
  on public.audit_logs for select to authenticated using ((select app.is_admin()));

create function app.audit(p_action text, p_target_type text, p_target_id uuid, p_data jsonb default '{}')
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.audit_logs (actor_id, action, target_type, target_id, data)
  values ((select auth.uid()), p_action, p_target_type, p_target_id, coalesce(p_data, '{}'::jsonb))
$$;
revoke execute on function app.audit(text, text, uuid, jsonb) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Historique des décisions sur les dossiers (F-50)
-- ---------------------------------------------------------------------------
create type public.review_decision as enum ('valide', 'refuse', 'complement');

create table public.artisan_reviews (
  id uuid primary key default gen_random_uuid(),
  artisan_id uuid not null references public.artisans (id) on delete cascade,
  admin_id uuid references auth.users (id) on delete set null,
  decision public.review_decision not null,
  message text check (char_length(message) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index artisan_reviews_artisan_id_idx on public.artisan_reviews (artisan_id, created_at desc);
create index artisan_reviews_admin_id_idx on public.artisan_reviews (admin_id);

alter table public.artisan_reviews enable row level security;
revoke all on public.artisan_reviews from anon, authenticated;
grant select on public.artisan_reviews to authenticated;
create policy "artisan_reviews : lecture par l'artisan concerné ou un admin"
  on public.artisan_reviews for select to authenticated
  using (artisan_id = (select app.my_artisan_id()) or (select app.is_admin()));

-- ---------------------------------------------------------------------------
-- Décisions des admins (SECURITY DEFINER, contrôle explicite du rôle et de aal2)
-- ---------------------------------------------------------------------------
create function app.require_admin()
returns void
language plpgsql
stable
set search_path = ''
as $$
begin
  if not app.is_admin() then
    raise exception 'Réservé aux administrateurs (double authentification requise).' using errcode = '42501';
  end if;
end;
$$;

-- Vérification d'un document : validé, ou refusé avec motif.
create function public.admin_review_document(p_document_id uuid, p_status public.document_status, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_artisan uuid;
begin
  perform app.require_admin();
  if p_status = 'en_attente' then
    raise exception 'Décision attendue : valide ou refuse.' using errcode = '22023';
  end if;
  if p_status = 'refuse' and nullif(btrim(coalesce(p_reason, '')), '') is null then
    raise exception 'Motif de refus obligatoire.' using errcode = '22023';
  end if;

  update public.artisan_documents set
    status = p_status,
    refusal_reason = case when p_status = 'refuse' then left(btrim(p_reason), 500) end,
    verified_at = now(),
    verified_by = (select auth.uid())
  where id = p_document_id
  returning artisan_id into v_artisan;
  if v_artisan is null then
    raise exception 'Document introuvable.' using errcode = '22023';
  end if;

  perform app.audit('document.' || p_status::text, 'artisan_document', p_document_id,
    jsonb_build_object('artisan_id', v_artisan, 'motif', p_reason));
end;
$$;

-- Vérification d'une certification (RGE, Qualifelec…).
create function public.admin_verify_certification(p_certification_id uuid, p_verified boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform app.require_admin();
  update public.certifications
  set verified_at = case when p_verified then now() end
  where id = p_certification_id;
  if not found then
    raise exception 'Certification introuvable.' using errcode = '22023';
  end if;
  perform app.audit(case when p_verified then 'certification.verifiee' else 'certification.annulee' end,
    'certification', p_certification_id);
end;
$$;

-- Décision sur un dossier envoyé : valider, refuser (motif), demander un complément (message).
create function public.admin_decide_artisan(p_artisan_id uuid, p_decision public.review_decision, p_message text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  a public.artisans;
  v_message text := nullif(btrim(coalesce(p_message, '')), '');
begin
  perform app.require_admin();

  select * into a from public.artisans where id = p_artisan_id for update;
  if not found then
    raise exception 'Dossier introuvable.' using errcode = '22023';
  end if;
  if a.status <> 'en_verification' then
    raise exception 'Seul un dossier en vérification peut faire l''objet d''une décision.' using errcode = '22023';
  end if;
  if p_decision <> 'valide' and v_message is null then
    raise exception 'Un message est obligatoire pour un refus ou une demande de complément.' using errcode = '22023';
  end if;

  if p_decision = 'valide' then
    if (
      select count(*) from public.artisan_documents d
      where d.artisan_id = a.id and d.status = 'valide' and (
        (d.type = 'kbis' and d.date_emission >= (current_date - interval '3 months')::date)
        or (d.type in ('decennale', 'rc_pro') and d.date_fin >= current_date)
        or (d.type = 'identite' and (d.date_fin is null or d.date_fin >= current_date))
      )
    ) < 4 then
      raise exception 'Les 4 documents doivent être validés et en cours de validité.' using errcode = '22023';
    end if;
    if not coalesce(a.sirene_active, false) then
      raise exception 'Entreprise inactive selon l''INSEE.' using errcode = '22023';
    end if;

    update public.artisans set status = 'valide', refusal_reason = null where id = a.id;
    -- Rôle « artisan » (app_metadata, synchronisé dans profiles par trigger).
    update auth.users
    set raw_app_meta_data = raw_app_meta_data || jsonb_build_object('role', 'artisan')
    where id = a.user_id;
  elsif p_decision = 'refuse' then
    update public.artisans set status = 'refuse', refusal_reason = left(v_message, 500) where id = a.id;
  else
    -- Complément : retour en brouillon, le message est affiché à l'artisan.
    update public.artisans set status = 'brouillon', refusal_reason = left(v_message, 500) where id = a.id;
  end if;

  insert into public.artisan_reviews (artisan_id, admin_id, decision, message)
  values (a.id, (select auth.uid()), p_decision, v_message);
  perform app.audit('artisan.' || p_decision::text, 'artisan', a.id, jsonb_build_object('message', v_message));
end;
$$;

revoke execute on function public.admin_review_document(uuid, public.document_status, text) from public, anon;
revoke execute on function public.admin_verify_certification(uuid, boolean) from public, anon;
revoke execute on function public.admin_decide_artisan(uuid, public.review_decision, text) from public, anon;
grant execute on function public.admin_review_document(uuid, public.document_status, text) to authenticated;
grant execute on function public.admin_verify_certification(uuid, boolean) to authenticated;
grant execute on function public.admin_decide_artisan(uuid, public.review_decision, text) to authenticated;
