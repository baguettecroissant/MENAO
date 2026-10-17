-- Attestation de vigilance URSSAF (ADR 0115), demandée par le cahier des charges « Inscription et
-- vérification des artisans » : 5ᵉ document obligatoire, valable 6 mois à compter de sa date
-- d'émission, avec son code de sécurité (vérifié par l'équipe sur le site de l'URSSAF). Relances
-- avant l'échéance et suspension à l'expiration, comme les assurances. Un artisan déjà validé
-- qui n'en a jamais déposé n'est pas suspendu : il est invité à l'ajouter.

-- Date de fin calculée : 6 mois après l'émission (code de sécurité dans « numero »).
create function app.urssaf_date_fin()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.type = 'urssaf' then
    new.date_fin := case
      when new.date_emission is null then null
      else (new.date_emission + interval '6 months')::date
    end;
  end if;
  return new;
end;
$$;
revoke execute on function app.urssaf_date_fin() from public, anon, authenticated;
create trigger artisan_documents_urssaf_date_fin
  before insert or update of type, date_emission, date_fin on public.artisan_documents
  for each row execute function app.urssaf_date_fin();

-- Documents obligatoires à jour (remplace la version F-51) : décennale et RC Pro valides, et
-- attestation URSSAF valide dès qu'une a été validée une fois.
create or replace function app.artisan_insurances_valid(p_artisan_id uuid)
returns boolean
language sql
stable
set search_path = ''
as $$
  select (
    select count(distinct d.type) = 2
    from public.artisan_documents d
    where d.artisan_id = p_artisan_id and d.status = 'valide'
      and d.type in ('decennale', 'rc_pro') and d.date_fin >= current_date
  ) and (
    not exists (
      select 1 from public.artisan_documents d
      where d.artisan_id = p_artisan_id and d.type = 'urssaf' and d.status in ('valide', 'remplace')
    )
    or exists (
      select 1 from public.artisan_documents d
      where d.artisan_id = p_artisan_id and d.type = 'urssaf' and d.status = 'valide'
        and d.date_fin >= current_date
    )
  )
$$;

-- Les cinq documents valides : même règle à l'envoi du dossier et à la validation.
create function app.documents_complete(p_artisan_id uuid, p_statuses public.document_status[])
returns boolean
language sql
stable
set search_path = ''
as $$
  select count(distinct d.type) = 5
  from public.artisan_documents d
  where d.artisan_id = p_artisan_id and d.status = any (p_statuses) and (
    (d.type = 'kbis' and d.date_emission >= (current_date - interval '3 months')::date)
    or (d.type in ('decennale', 'rc_pro') and d.date_fin >= current_date)
    or (d.type = 'identite' and (d.date_fin is null or d.date_fin >= current_date))
    or (d.type = 'urssaf' and d.date_emission >= (current_date - interval '6 months')::date)
  )
$$;
revoke execute on function app.documents_complete(uuid, public.document_status[]) from public, anon, authenticated;

-- Étapes manquantes avant l'envoi (même fonction qu'avant, ADR 0112), avec l'attestation URSSAF.
create or replace function app.onboarding_missing_steps(p_artisan_id uuid)
returns text[]
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  a public.artisans;
  v_missing text[] := '{}';
begin
  select * into a from public.artisans where id = p_artisan_id;
  if not found then
    return null;
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
  if not exists (
    select 1 from public.artisan_charter_acceptances c
    where c.artisan_id = a.id and c.version = app.current_charter_version()
  ) then
    v_missing := array_append(v_missing, 'charte');
  end if;
  if not app.documents_complete(a.id, array['en_attente', 'valide']::public.document_status[]) then
    v_missing := array_append(v_missing, 'documents');
  end if;
  if not (char_length(coalesce(a.presentation, '')) >= 100
          and exists (select 1 from public.profiles p where p.user_id = a.user_id and p.avatar_path is not null)) then
    v_missing := array_append(v_missing, 'profil');
  end if;
  return v_missing;
end;
$$;

-- Décision de l'équipe (même fonction qu'avant), avec les cinq documents.
create or replace function public.admin_decide_artisan(p_artisan_id uuid, p_decision public.review_decision, p_message text default null)
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
    if not app.documents_complete(a.id, array['valide']::public.document_status[]) then
      raise exception 'Les 5 documents doivent être validés et en cours de validité.' using errcode = '22023';
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

-- Relances avant l'échéance (même fonction qu'avant, ADR 0037) : l'attestation URSSAF aussi ;
-- l'équipe est relancée pour les documents dont l'expiration suspend l'artisan.
create or replace function app.remind_expiring_documents(p_today date default (now() at time zone 'Europe/Paris')::date)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  r record;
  v_threshold smallint;
  v_count integer := 0;
begin
  for r in
    select d.id, d.type, d.date_fin, d.date_fin - p_today as jours, d.renewal_reminder_days,
      a.user_id, coalesce(a.nom_commercial, a.raison_sociale) as entreprise
    from public.artisan_documents d
    join public.artisans a on a.id = d.artisan_id
    where d.status = 'valide'
      and d.type in ('decennale', 'rc_pro', 'identite', 'urssaf')
      and a.status in ('valide', 'suspendu')
      and d.date_fin between p_today and p_today + 30
      and not exists (
        select 1 from public.artisan_documents n
        where n.artisan_id = d.artisan_id and n.type = d.type and n.status = 'en_attente'
      )
    order by d.date_fin
    for update of d
  loop
    v_threshold := case when r.jours <= 7 then 7 else 30 end;
    continue when r.renewal_reminder_days is not null and r.renewal_reminder_days <= v_threshold;
    update public.artisan_documents set renewal_reminder_days = v_threshold where id = r.id;
    perform app.notify(r.user_id, 'document_a_renouveler', jsonb_build_object(
      'document', r.type,
      'date_fin', r.date_fin,
      'jours', r.jours
    ));
    if r.type in ('decennale', 'rc_pro', 'urssaf') then
      perform app.notify(p.user_id, 'document_a_renouveler_equipe', jsonb_build_object(
        'document', r.type,
        'date_fin', r.date_fin,
        'jours', r.jours,
        'entreprise', r.entreprise
      ))
      from public.profiles p
      where p.role = 'admin';
    end if;
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

-- Tâche quotidienne (même fonction qu'avant, ADR 0037) : l'e-mail de suspension nomme aussi
-- l'attestation URSSAF expirée.
create or replace function app.daily_compliance()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  r record;
begin
  for r in
    select a.id, a.user_id from public.artisans a
    where a.status = 'valide' and not app.artisan_insurances_valid(a.id)
  loop
    update public.artisans set status = 'suspendu', suspension_reason = 'documents_expires' where id = r.id;
    insert into public.audit_logs (actor_id, action, target_type, target_id, data)
    values (null, 'artisan.suspendu_auto', 'artisan', r.id, '{"motif":"document obligatoire expiré"}');
    perform app.notify(r.user_id, 'compte_suspendu', jsonb_build_object('documents', (
      select coalesce(jsonb_agg(m.doc order by m.doc), '[]'::jsonb)
      from unnest(array['decennale', 'rc_pro', 'urssaf']) as m (doc)
      where not exists (
        select 1 from public.artisan_documents d
        where d.artisan_id = r.id and d.type::text = m.doc and d.status = 'valide'
          and d.date_fin >= current_date
      )
      and (m.doc <> 'urssaf' or exists (
        select 1 from public.artisan_documents d
        where d.artisan_id = r.id and d.type = 'urssaf' and d.status in ('valide', 'remplace')
      ))
    )));
  end loop;

  for r in
    select a.id from public.artisans a where a.status = 'suspendu' and a.suspension_reason = 'documents_expires'
  loop
    perform app.reactivate_if_compliant(r.id);
  end loop;

  delete from public.rate_limits where window_start < now() - interval '1 day';
end;
$$;
