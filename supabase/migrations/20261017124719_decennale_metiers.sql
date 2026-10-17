-- Décennale et métiers (ADR 0116), demandés par le cahier des charges « Inscription et
-- vérification des artisans » :
-- - l'artisan indique, en déposant sa décennale, les métiers qu'elle couvre ; un métier non
--   couvert est signalé à l'équipe, qui tranche à la vérification du dossier (revue manuelle) ;
-- - « non soumis » : pour les rares métiers sans travaux sur le bâti, l'artisan le déclare et
--   l'équipe le valide ; la décennale n'est alors plus exigée.
-- TODO(legal) : liste des métiers non soumis à l'assurance décennale (art. L241-1 du Code des
-- assurances) à faire valider.

alter table public.artisan_documents
  add column covered_trades text[] check (cardinality(covered_trades) <= 30);
comment on column public.artisan_documents.covered_trades is
  'Décennale : métiers de l''artisan que l''attestation couvre, selon l''artisan (contrôlé par l''équipe).';

alter table public.artisans add column decennale_non_soumis boolean not null default false;
comment on column public.artisans.decennale_non_soumis is
  'L''artisan déclare ses métiers non soumis à la décennale ; validé par l''équipe avec le dossier.';

-- Déclaration « non soumis », possible tant que le dossier n'est pas envoyé.
create function public.set_decennale_non_soumis(p_value boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_artisan uuid := app.my_artisan_id();
begin
  if v_artisan is null then
    raise exception 'Aucune fiche artisan pour cet utilisateur.' using errcode = '42501';
  end if;
  update public.artisans set decennale_non_soumis = coalesce(p_value, false)
  where id = v_artisan and status in ('brouillon', 'refuse');
  if not found then
    raise exception 'Le dossier ne peut plus être modifié.' using errcode = '22023';
  end if;
end;
$$;
revoke execute on function public.set_decennale_non_soumis(boolean) from public, anon;
grant execute on function public.set_decennale_non_soumis(boolean) to authenticated;

-- Documents obligatoires valides (même fonction qu'avant, ADR 0115) : sans la décennale pour un
-- artisan « non soumis ». Toujours vrai ou faux (le compte vaut 0 sans document).
create or replace function app.documents_complete(p_artisan_id uuid, p_statuses public.document_status[])
returns boolean
language sql
stable
set search_path = ''
as $$
  select (
    select count(distinct d.type)
    from public.artisan_documents d
    where d.artisan_id = a.id and d.status = any (p_statuses) and (
      (d.type = 'kbis' and d.date_emission >= (current_date - interval '3 months')::date)
      or (d.type = 'decennale' and not a.decennale_non_soumis and d.date_fin >= current_date)
      or (d.type = 'rc_pro' and d.date_fin >= current_date)
      or (d.type = 'identite' and (d.date_fin is null or d.date_fin >= current_date))
      or (d.type = 'urssaf' and d.date_emission >= (current_date - interval '6 months')::date)
    )
  ) = case when a.decennale_non_soumis then 4 else 5 end
  from public.artisans a
  where a.id = p_artisan_id
$$;

-- Documents obligatoires à jour (même fonction qu'avant, ADR 0115) : décennale exigée sauf pour un
-- artisan « non soumis ».
create or replace function app.artisan_insurances_valid(p_artisan_id uuid)
returns boolean
language sql
stable
set search_path = ''
as $$
  select (
    select count(distinct d.type)
    from public.artisan_documents d
    where d.artisan_id = a.id and d.status = 'valide' and d.date_fin >= current_date
      and (d.type = 'rc_pro' or (d.type = 'decennale' and not a.decennale_non_soumis))
  ) = case when a.decennale_non_soumis then 1 else 2 end
  and (
    not exists (
      select 1 from public.artisan_documents d
      where d.artisan_id = a.id and d.type = 'urssaf' and d.status in ('valide', 'remplace')
    )
    or exists (
      select 1 from public.artisan_documents d
      where d.artisan_id = a.id and d.type = 'urssaf' and d.status = 'valide'
        and d.date_fin >= current_date
    )
  )
  from public.artisans a
  where a.id = p_artisan_id
$$;

-- Tâche quotidienne (même fonction qu'avant, ADR 0115) : l'e-mail de suspension ne cite pas la
-- décennale d'un artisan « non soumis ».
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
    select a.id, a.user_id, a.decennale_non_soumis from public.artisans a
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
      and (m.doc <> 'decennale' or not r.decennale_non_soumis)
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
