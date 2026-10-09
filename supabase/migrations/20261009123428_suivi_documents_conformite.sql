-- F-51 — suivi des documents : renouvellement, suspension et réactivation automatiques, tâche quotidienne.

-- ---------------------------------------------------------------------------
-- Renouvellement : un document validé (en cours) et un renouvellement en attente peuvent
-- coexister ; un seul document validé et un seul document en cours d'examen par type.
-- ---------------------------------------------------------------------------
alter table public.artisan_documents drop constraint artisan_documents_artisan_id_type_key;
create unique index artisan_documents_un_valide_par_type
  on public.artisan_documents (artisan_id, type) where status = 'valide';
create unique index artisan_documents_un_en_cours_par_type
  on public.artisan_documents (artisan_id, type) where status in ('en_attente', 'refuse');

-- Motif de suspension : seules les suspensions pour documents expirés sont levées automatiquement.
alter table public.artisans
  add column suspension_reason text check (suspension_reason in ('documents_expires', 'decision_admin'));

-- Assurances obligatoires en cours de validité (décennale et RC Pro validées, non expirées).
create function app.artisan_insurances_valid(p_artisan_id uuid)
returns boolean
language sql
stable
set search_path = ''
as $$
  select count(distinct d.type) = 2
  from public.artisan_documents d
  where d.artisan_id = p_artisan_id and d.status = 'valide'
    and d.type in ('decennale', 'rc_pro') and d.date_fin >= current_date
$$;

-- Lève une suspension pour documents expirés dès que les assurances sont de nouveau valides.
create function app.reactivate_if_compliant(p_artisan_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.artisans set status = 'valide', suspension_reason = null
  where id = p_artisan_id and status = 'suspendu' and suspension_reason = 'documents_expires'
    and app.artisan_insurances_valid(p_artisan_id);
  if found then
    insert into public.audit_logs (actor_id, action, target_type, target_id, data)
    values ((select auth.uid()), 'artisan.reactive_auto', 'artisan', p_artisan_id, '{"motif":"assurances à jour"}');
  end if;
end;
$$;
revoke execute on function app.reactivate_if_compliant(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Vérification d'un document (remplace la version F-50) : un renouvellement validé archive
-- le document précédent (« remplace ») et peut lever une suspension.
-- ---------------------------------------------------------------------------
create or replace function public.admin_review_document(p_document_id uuid, p_status public.document_status, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  d public.artisan_documents;
begin
  perform app.require_admin();
  if p_status not in ('valide', 'refuse') then
    raise exception 'Décision attendue : valide ou refuse.' using errcode = '22023';
  end if;
  if p_status = 'refuse' and nullif(btrim(coalesce(p_reason, '')), '') is null then
    raise exception 'Motif de refus obligatoire.' using errcode = '22023';
  end if;

  select * into d from public.artisan_documents where id = p_document_id for update;
  if not found or d.status = 'remplace' then
    raise exception 'Document introuvable.' using errcode = '22023';
  end if;

  if p_status = 'valide' then
    update public.artisan_documents set status = 'remplace'
    where artisan_id = d.artisan_id and type = d.type and status = 'valide' and id <> d.id;
  end if;

  update public.artisan_documents set
    status = p_status,
    refusal_reason = case when p_status = 'refuse' then left(btrim(p_reason), 500) end,
    verified_at = now(),
    verified_by = (select auth.uid())
  where id = d.id;

  perform app.audit('document.' || p_status::text, 'artisan_document', d.id,
    jsonb_build_object('artisan_id', d.artisan_id, 'type', d.type, 'motif', p_reason));

  if p_status = 'valide' then
    perform app.reactivate_if_compliant(d.artisan_id);
  end if;
end;
$$;

-- L'envoi en vérification ne compte que les documents en attente ou validés (pas les archives).
create or replace function public.submit_artisan_onboarding()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  a public.artisans;
  v_missing text[] := '{}';
begin
  select * into a from public.artisans where user_id = (select auth.uid());
  if not found then
    raise exception 'Aucune fiche artisan pour cet utilisateur.' using errcode = '42501';
  end if;
  if a.status not in ('brouillon', 'refuse') then
    raise exception 'Le dossier a déjà été envoyé.' using errcode = '22023';
  end if;

  if not (a.sirene_checked_at is not null and a.sirene_active and a.raison_sociale is not null
          and a.assujetti_tva is not null) then
    v_missing := array_append(v_missing, 'entreprise');
  end if;
  if not exists (select 1 from public.artisan_trades t where t.artisan_id = a.id) then
    v_missing := array_append(v_missing, 'metiers');
  end if;
  if not ((a.zone_mode = 'rayon' and a.base_location is not null and a.radius_km is not null)
          or (a.zone_mode = 'communes' and exists (select 1 from public.artisan_zones z where z.artisan_id = a.id))) then
    v_missing := array_append(v_missing, 'zone');
  end if;
  if (
    select count(*) from public.artisan_documents d
    where d.artisan_id = a.id and d.status in ('en_attente', 'valide') and (
      (d.type = 'kbis' and d.date_emission >= (current_date - interval '3 months')::date)
      or (d.type in ('decennale', 'rc_pro') and d.date_fin >= current_date)
      or (d.type = 'identite' and (d.date_fin is null or d.date_fin >= current_date))
    )
  ) < 4 then
    v_missing := array_append(v_missing, 'documents');
  end if;
  if not (char_length(coalesce(a.presentation, '')) >= 100
          and exists (select 1 from public.profiles p where p.user_id = a.user_id and p.avatar_path is not null)) then
    v_missing := array_append(v_missing, 'profil');
  end if;

  if cardinality(v_missing) > 0 then
    raise exception 'Étapes incomplètes : %', array_to_string(v_missing, ', ') using errcode = '22023';
  end if;

  update public.artisans
  set status = 'en_verification', submitted_at = now(), refusal_reason = null
  where id = a.id;
end;
$$;


-- ---------------------------------------------------------------------------
-- Tâche quotidienne (pg_cron) : suspension des artisans dont la décennale ou la RC Pro a
-- expiré sans renouvellement validé, réactivation, purge des limites de débit expirées.
-- TODO : purge des fichiers bruts abandonnés dans « uploads » (API Storage, Edge Function).
-- ---------------------------------------------------------------------------
create function app.daily_compliance()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  r record;
begin
  for r in
    select a.id from public.artisans a
    where a.status = 'valide' and not app.artisan_insurances_valid(a.id)
  loop
    update public.artisans set status = 'suspendu', suspension_reason = 'documents_expires' where id = r.id;
    insert into public.audit_logs (actor_id, action, target_type, target_id, data)
    values (null, 'artisan.suspendu_auto', 'artisan', r.id, '{"motif":"assurance expirée"}');
  end loop;

  for r in
    select a.id from public.artisans a where a.status = 'suspendu' and a.suspension_reason = 'documents_expires'
  loop
    perform app.reactivate_if_compliant(r.id);
  end loop;

  delete from public.rate_limits where window_start < now() - interval '1 day';
end;
$$;
revoke execute on function app.daily_compliance() from public, anon, authenticated;

create extension if not exists pg_cron with schema pg_catalog;
select cron.schedule('menao-conformite-quotidienne', '15 3 * * *', 'select app.daily_compliance()');
