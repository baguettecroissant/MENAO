-- Agent comptable avancé, PR A : le suivi de l'argent (F-87, ADR 0237). Premium et Entreprise
-- (`plans.limites.agents.comptable_avance`, ADR 0231).
--
-- Les factures MENAO naissent à l'encaissement (ADR 0024, 0029) et les paiements arrivent de
-- Stripe : le rapprochement est automatique. Ce qui compte, c'est ce qui n'est pas encore réglé
-- (acompte après la signature, solde après la réception) et ce qui cloche (paiement échoué,
-- paiement reçu sans facture). Des chiffres seulement, aucun conseil.
-- TODO(legal) : présentation des montants (TTC encaissés, dépenses TTC) à faire relire par
-- l'expert-comptable ; ce suivi ne remplace pas la comptabilité.

-- ---------------------------------------------------------------------------
-- Chiffres d'un mois (heure de Paris) : devis signés, encaissé, dépenses, factures émises.
-- ---------------------------------------------------------------------------
create function app.money_month(p_artisan_id uuid, p_month date)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with b as (
    select date_trunc('month', p_month)::date as d0,
      (date_trunc('month', p_month) + interval '1 month')::date as d1
  ),
  t as (
    select d0, d1, d0::timestamp at time zone 'Europe/Paris' as t0,
      d1::timestamp at time zone 'Europe/Paris' as t1
    from b
  )
  select jsonb_build_object(
    'mois', to_char(t.d0, 'YYYY-MM'),
    'devis_signes', (
      select count(*) from public.quotes q
      where q.artisan_id = p_artisan_id and q.signed_at >= t.t0 and q.signed_at < t.t1
    ),
    'devis_signes_cents', coalesce((
      select sum(q.total_ttc_cents) from public.quotes q
      where q.artisan_id = p_artisan_id and q.signed_at >= t.t0 and q.signed_at < t.t1
    ), 0),
    'encaisse_cents', coalesce((
      select sum(p.amount_cents) from public.payments p
      where p.artisan_id = p_artisan_id and p.status = 'paye' and p.paid_at >= t.t0 and p.paid_at < t.t1
    ), 0),
    'depenses_cents', coalesce((
      select sum(e.total_ttc_cents) from public.expenses e
      where e.artisan_id = p_artisan_id and e.issued_on >= t.d0 and e.issued_on < t.d1
    ), 0),
    'factures', (
      select count(*) from public.invoices i
      where i.artisan_id = p_artisan_id and i.issued_on >= t.d0 and i.issued_on < t.d1
    )
  )
  from t
$$;
revoke execute on function app.money_month(uuid, date) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- À encaisser : acomptes dus depuis la signature, soldes dus depuis la réception, ni payés ni en
-- cours de confirmation. `echec` : le dernier paiement de cette tranche a échoué.
-- ---------------------------------------------------------------------------
create function app.money_open_items(p_artisan_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(x.item order by x.item ->> 'depuis'), '[]'::jsonb)
  from (
    select jsonb_build_object(
      'chantier_id', c.id,
      'chantier', c.title,
      'tranche', 'acompte',
      'montant_cents', (
        select sum((s ->> 'amount_cents')::bigint) from jsonb_array_elements(q.payment_schedule) s
        where s ->> 'trigger' = 'signature'
      ),
      'depuis', q.signed_at,
      'echec', coalesce((
        select p.status = 'echoue' from public.payments p
        where p.quote_id = q.id and p.kind = 'acompte' order by p.created_at desc limit 1
      ), false)
    ) as item
    from public.chantiers c
    join lateral (
      select q2.id, q2.signed_at, q2.payment_schedule from public.quotes q2
      where q2.chantier_id = c.id and q2.status = 'signe'
      order by q2.version desc
      limit 1
    ) q on true
    where c.artisan_id = p_artisan_id
      and c.status = 'devis_signe'
      and q.signed_at is not null
      and exists (
        select 1 from jsonb_array_elements(q.payment_schedule) s
        where s ->> 'trigger' = 'signature' and (s ->> 'amount_cents')::bigint > 0
      )
      and not exists (
        select 1 from public.payments p
        where p.quote_id = q.id and p.kind = 'acompte' and p.status in ('en_cours', 'paye')
      )
    union all
    select jsonb_build_object(
      'chantier_id', c.id,
      'chantier', c.title,
      'tranche', 'solde',
      'montant_cents', app.quote_balance(q.id),
      'depuis', (
        select max(e.created_at) from public.chantier_events e
        where e.chantier_id = c.id and e.to_status = 'receptionne'
      ),
      'echec', coalesce((
        select p.status = 'echoue' from public.payments p
        where p.quote_id = q.id and p.kind = 'solde' order by p.created_at desc limit 1
      ), false)
    )
    from public.chantiers c
    join lateral (
      select q2.id from public.quotes q2
      where q2.chantier_id = c.id and q2.status = 'signe'
      order by q2.version desc
      limit 1
    ) q on true
    where c.artisan_id = p_artisan_id
      and c.status = 'receptionne'
      and app.quote_balance(q.id) > 0
      and not exists (
        select 1 from public.payments p
        where p.quote_id = q.id and p.kind = 'solde' and p.status in ('en_cours', 'paye')
      )
  ) x
$$;
revoke execute on function app.money_open_items(uuid) from public, anon, authenticated;

-- Paiements reçus depuis plus d'une heure sans facture (l'émission a échoué) : à signaler.
create function app.money_paid_without_invoice(p_artisan_id uuid, p_now timestamptz)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'chantier_id', p.chantier_id,
    'chantier', c.title,
    'tranche', p.kind,
    'montant_cents', p.amount_cents,
    'le', p.paid_at
  ) order by p.paid_at desc), '[]'::jsonb)
  from public.payments p
  join public.chantiers c on c.id = p.chantier_id
  where p.artisan_id = p_artisan_id
    and p.status = 'paye'
    and p.paid_at < p_now - interval '1 hour'
    and not exists (select 1 from public.invoices i where i.payment_id = p.id)
$$;
revoke execute on function app.money_paid_without_invoice(uuid, timestamptz) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- « Suivi » de l'artisan connecté (onglet de la rubrique Argent) : mois en cours et précédent,
-- à encaisser, paiements sans facture, et si sa formule comprend l'agent comptable avancé.
-- ---------------------------------------------------------------------------
create function public.my_money_overview(p_now timestamptz default now())
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with a as (select app.my_artisan_id() as id),
  m as (select date_trunc('month', p_now at time zone 'Europe/Paris')::date as cur)
  select jsonb_build_object(
    'inclus', coalesce((app.artisan_agents(a.id, p_now) -> 'agents' ->> 'comptable_avance')::boolean, false),
    'mois', app.money_month(a.id, m.cur),
    'mois_precedent', app.money_month(a.id, (m.cur - interval '1 month')::date),
    'a_encaisser', app.money_open_items(a.id),
    'sans_facture', app.money_paid_without_invoice(a.id, p_now)
  )
  from a, m
  where a.id is not null
$$;
revoke execute on function public.my_money_overview(timestamptz) from public, anon;
grant execute on function public.my_money_overview(timestamptz) to authenticated;

-- ---------------------------------------------------------------------------
-- Synthèse du mois écoulé, le 1er (Premium et Entreprise, dossier vérifié, avec de l'activité),
-- une seule fois par mois. Préférence « activité » de l'artisan.
-- ---------------------------------------------------------------------------
create or replace function app.notification_category(p_type public.notification_type)
returns text
language sql
immutable
set search_path = ''
as $$
  select case p_type
    when 'chantier_nouveautes' then 'activite'
    when 'nouveaux_messages' then 'activite'
    when 'recommandation_partenaire' then 'activite'
    when 'avis_reponse' then 'activite'
    when 'filleul_valide' then 'activite'
    when 'synthese_mois' then 'activite'
    when 'rdv_rappel' then 'rappels'
    when 'avis_relance' then 'rappels'
    when 'levee_relance' then 'rappels'
    when 'acompte_relance' then 'rappels'
    when 'planning_relance' then 'rappels'
    when 'inscription_relance' then 'rappels'
    when 'parrainage_suggestion' then 'rappels'
    when 'devis_relance' then 'rappels'
    when 'demarrage_rappel' then 'rappels'
    when 'activation_relance' then 'rappels'
    when 'finalisation_relance' then 'rappels'
    else 'transactionnel'
  end
$$;
revoke execute on function app.notification_category(public.notification_type) from public, anon, authenticated;

create function app.send_monthly_summaries(p_now timestamptz default now())
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  r record;
  v_month date := (date_trunc('month', p_now at time zone 'Europe/Paris') - interval '1 month')::date;
  v_figures jsonb;
  v_open jsonb;
  v_count integer := 0;
begin
  for r in
    select a.id, a.user_id from public.artisans a
    where a.status = 'valide'
      and coalesce((app.artisan_agents(a.id, p_now) -> 'agents' ->> 'comptable_avance')::boolean, false)
      and not exists (
        select 1 from public.notifications n
        where n.user_id = a.user_id and n.type = 'synthese_mois' and n.data ->> 'mois' = to_char(v_month, 'YYYY-MM')
      )
  loop
    v_figures := app.money_month(r.id, v_month);
    v_open := app.money_open_items(r.id);
    if (v_figures ->> 'devis_signes')::int = 0 and (v_figures ->> 'encaisse_cents')::bigint = 0
       and (v_figures ->> 'depenses_cents')::bigint = 0 and jsonb_array_length(v_open) = 0 then
      continue;
    end if;
    perform app.notify(r.user_id, 'synthese_mois', v_figures || jsonb_build_object(
      'a_encaisser', jsonb_array_length(v_open),
      'a_encaisser_cents', (
        select coalesce(sum((x ->> 'montant_cents')::bigint), 0) from jsonb_array_elements(v_open) x
      )
    ));
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;
revoke execute on function app.send_monthly_summaries(timestamptz) from public, anon, authenticated;
select cron.schedule('menao-synthese-mois', '30 6 1 * *', 'select app.send_monthly_summaries()');
