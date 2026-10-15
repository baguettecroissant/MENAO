-- Rappel hebdomadaire du planning (ADR 0107). La charte qualité promet « un rappel chaque semaine
-- pour mettre ton planning à jour », et le planning tenu à jour compte pour 10 % du score MENAO
-- (ADR 0105). Chaque lundi matin, les artisans visibles des clients et hors pause dont le planning
-- n'a ni changé ni été confirmé depuis 7 jours reçoivent une notification (e-mail et push) vers
-- « Mes disponibilités ». Un planning à jour ne déclenche rien.

-- Rappel facultatif (préférence « rappels »), comme les autres relances (ADR 0033).
create or replace function app.notification_category(p_type public.notification_type)
returns text
language sql
immutable
set search_path = ''
as $$
  select case p_type
    when 'chantier_nouveautes' then 'activite'
    when 'nouveaux_messages' then 'activite'
    when 'rdv_rappel' then 'rappels'
    when 'avis_relance' then 'rappels'
    when 'levee_relance' then 'rappels'
    when 'acompte_relance' then 'rappels'
    when 'planning_relance' then 'rappels'
    else 'transactionnel'
  end
$$;
revoke execute on function app.notification_category(public.notification_type) from public, anon, authenticated;

-- p_now : instant de référence (tests). Tâche pg_cron hebdomadaire. Au plus une relance par
-- artisan sur 6 jours, même si la tâche est relancée.
create function app.remind_planning(p_now timestamptz default now())
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  r record;
  v_count integer := 0;
begin
  for r in
    select a.id, a.user_id, a.planning_updated_at
    from public.artisans a
    where not a.paused
      and app.artisan_is_visible(a.id)
      and (a.planning_updated_at is null or a.planning_updated_at <= p_now - interval '7 days')
      and not exists (
        select 1 from public.notifications n
        where n.user_id = a.user_id and n.type = 'planning_relance'
          and n.created_at > p_now - interval '6 days'
      )
    for update of a skip locked
  loop
    perform app.notify(r.user_id, 'planning_relance', jsonb_build_object(
      'jours', case when r.planning_updated_at is null then null
        else floor(extract(epoch from p_now - r.planning_updated_at) / 86400)::integer end
    ));
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;
revoke execute on function app.remind_planning(timestamptz) from public, anon, authenticated;
-- Lundi 7 h UTC : 9 h à Paris l'été, 8 h l'hiver.
select cron.schedule('menao-relance-planning', '0 7 * * 1', 'select app.remind_planning()');
