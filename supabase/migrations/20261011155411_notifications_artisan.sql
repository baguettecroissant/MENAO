-- F-50, F-51 — l'artisan est prévenu par e-mail (et dans son centre de notifications) :
-- - de la décision sur son dossier : validé (avec les étapes restantes pour être visible),
--   refusé ou complément demandé, avec le message de l'équipe ;
-- - de l'échéance de ses documents surveillés, à J-30 puis J-7 (spec F-41 : « Document expirant
--   (assurance) J-30, J-7 », artisan + équipe) ;
-- - de la suspension automatique (assurance expirée), de sa levée, et du refus d'un document
--   déposé pour un renouvellement.
-- Notifications transactionnelles : jamais désactivables (app.notification_category). ADR 0037.

-- ---------------------------------------------------------------------------
-- Décision sur le dossier : à chaque décision enregistrée dans l'historique.
-- ---------------------------------------------------------------------------
create function app.notify_artisan_decision()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform app.notify(a.user_id,
    (case new.decision
      when 'valide' then 'dossier_valide'
      when 'refuse' then 'dossier_refuse'
      else 'dossier_complement'
    end)::public.notification_type,
    jsonb_build_object(
      'motif', new.message,
      -- Dossier validé : conditions encore nécessaires pour apparaître dans les recherches.
      'abonnement', case when new.decision = 'valide' then app.artisan_subscription_active(a.id) end,
      'paiements', case when new.decision = 'valide' then a.connect_charges_enabled end
    ))
  from public.artisans a
  where a.id = new.artisan_id;
  return new;
end;
$$;
revoke execute on function app.notify_artisan_decision() from public, anon, authenticated;
create trigger artisan_reviews_notify after insert on public.artisan_reviews
  for each row execute function app.notify_artisan_decision();

-- ---------------------------------------------------------------------------
-- Document refusé pendant un renouvellement (artisan validé ou suspendu). Pendant la
-- vérification du dossier, la décision sur le dossier suffit : un seul e-mail.
-- ---------------------------------------------------------------------------
create function app.notify_document_refused()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform app.notify(a.user_id, 'document_refuse', jsonb_build_object(
    'document', new.type,
    'motif', new.refusal_reason
  ))
  from public.artisans a
  where a.id = new.artisan_id and a.status in ('valide', 'suspendu');
  return new;
end;
$$;
revoke execute on function app.notify_document_refused() from public, anon, authenticated;
create trigger artisan_documents_notify_refus after update of status on public.artisan_documents
  for each row when (new.status = 'refuse' and old.status is distinct from 'refuse')
  execute function app.notify_document_refused();

-- ---------------------------------------------------------------------------
-- Relances avant expiration : documents surveillés validés (décennale, RC Pro, pièce
-- d'identité, comme packages/core/src/expiry.ts) d'un artisan validé ou suspendu, sans
-- renouvellement déposé. Une relance par seuil : 30 jours, puis 7 jours. L'équipe n'est
-- relancée que pour les assurances (leur expiration suspend l'artisan).
-- p_today : date de référence (tests). Tâche pg_cron quotidienne, le matin.
-- ---------------------------------------------------------------------------
alter table public.artisan_documents
  add column renewal_reminder_days smallint check (renewal_reminder_days in (30, 7));

create function app.remind_expiring_documents(p_today date default (now() at time zone 'Europe/Paris')::date)
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
      and d.type in ('decennale', 'rc_pro', 'identite')
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
    if r.type in ('decennale', 'rc_pro') then
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
revoke execute on function app.remind_expiring_documents(date) from public, anon, authenticated;
select cron.schedule('menao-relances-documents', '0 7 * * *', 'select app.remind_expiring_documents()');

-- ---------------------------------------------------------------------------
-- Levée d'une suspension pour documents expirés (remplace la version F-51) : l'artisan est
-- prévenu ; « visible » indique s'il réapparaît aussitôt dans les recherches.
-- ---------------------------------------------------------------------------
create or replace function app.reactivate_if_compliant(p_artisan_id uuid)
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
    perform app.notify(a.user_id, 'compte_reactive', jsonb_build_object(
      'visible', app.artisan_is_visible(a.id)
    ))
    from public.artisans a
    where a.id = p_artisan_id;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Tâche quotidienne (remplace la version F-51) : la suspension automatique prévient
-- l'artisan et nomme les assurances manquantes ou expirées.
-- ---------------------------------------------------------------------------
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
    values (null, 'artisan.suspendu_auto', 'artisan', r.id, '{"motif":"assurance expirée"}');
    perform app.notify(r.user_id, 'compte_suspendu', jsonb_build_object('documents', (
      select coalesce(jsonb_agg(m.doc order by m.doc), '[]'::jsonb)
      from unnest(array['decennale', 'rc_pro']) as m (doc)
      where not exists (
        select 1 from public.artisan_documents d
        where d.artisan_id = r.id and d.type::text = m.doc and d.status = 'valide'
          and d.date_fin >= current_date
      )
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
