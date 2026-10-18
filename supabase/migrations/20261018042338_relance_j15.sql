-- Relance à J-15 (ADR 0122), demandée par le cahier des charges « Inscription et vérification des
-- artisans » : « Rappels à l'artisan : J-30, J-15 et J-7 avant l'expiration de chaque document ».
-- Même fonction qu'avant (ADR 0037, 0115), avec le seuil de 15 jours entre ceux de 30 et 7 jours
-- (miroir de EXPIRY_REMINDER_DAYS) : une relance par seuil, l'équipe en copie pour les documents
-- dont l'expiration suspend l'artisan. Le SMS à J-7 n'est pas mis en place (coût).

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
    v_threshold := case when r.jours <= 7 then 7 when r.jours <= 15 then 15 else 30 end;
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
