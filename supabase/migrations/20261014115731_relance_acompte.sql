-- Relance « Paiement en attente » (maquette « Notification paiement en attente », ADR 0090) :
-- rappel unique au client dont le devis est signé mais dont l'acompte n'est toujours pas réglé
-- 2 jours après la signature (signatures des 30 derniers jours). Un virement ou un prélèvement
-- en cours de confirmation ne déclenche pas de relance. Les fonds vont toujours directement à
-- l'artisan (Stripe Connect, règle 12) : la relance ne fait que renvoyer vers le paiement.

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
    else 'transactionnel'
  end
$$;
revoke execute on function app.notification_category(public.notification_type) from public, anon, authenticated;

-- p_now : instant de référence (tests). Tâche pg_cron quotidienne. Une seule relance par chantier
-- (une notification « acompte_relance » existe déjà pour ce chantier).
create function app.remind_deposits(p_now timestamptz default now())
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
    select c.id, c.title, c.particulier_id, c.artisan_id
    from public.chantiers c
    join lateral (
      select q.id, q.payment_schedule from public.quotes q
      where q.chantier_id = c.id and q.status = 'signe'
      order by q.version desc
      limit 1
    ) q on true
    where c.status = 'devis_signe'
      -- Acompte prévu à la signature, ni payé ni en cours de confirmation.
      and exists (
        select 1 from jsonb_array_elements(q.payment_schedule) s
        where s ->> 'trigger' = 'signature' and (s ->> 'amount_cents')::bigint > 0
      )
      and not exists (
        select 1 from public.payments pay
        where pay.quote_id = q.id and pay.kind = 'acompte' and pay.status in ('en_cours', 'paye')
      )
      and exists (
        select 1 from public.chantier_events e
        where e.chantier_id = c.id and e.to_status = 'devis_signe'
          and e.created_at <= p_now - interval '2 days'
          and e.created_at > p_now - interval '30 days'
      )
      and not exists (
        select 1 from public.notifications n
        where n.type = 'acompte_relance' and n.data ->> 'chantier_id' = c.id::text
      )
    for update of c skip locked
  loop
    perform app.notify(r.particulier_id, 'acompte_relance', jsonb_build_object(
      'chantier_id', r.id,
      'titre', r.title,
      'artisan', app.artisan_display_name(r.artisan_id)
    ));
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;
revoke execute on function app.remind_deposits(timestamptz) from public, anon, authenticated;
select cron.schedule('menao-relance-acompte', '0 9 * * *', 'select app.remind_deposits()');
