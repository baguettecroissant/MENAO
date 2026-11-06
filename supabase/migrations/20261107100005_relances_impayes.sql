-- Agent comptable avancé, PR B : relance des impayés (F-87, ADR 0238). Premium et Entreprise.
--
-- Depuis « À encaisser », l'artisan relance d'un toucher le client d'un acompte ou d'un solde dû
-- (au plus une relance tous les 3 jours par paiement). S'il active « Relances automatiques »
-- (désactivées par défaut), MENAO envoie lui-même un rappel à J+7, J+15 et J+30 après
-- l'échéance. Le rappel part par e-mail (et notification) au client, au nom de l'entreprise de
-- l'artisan, avec le lien pour payer ; ton neutre, sans pénalité. Les fonds vont toujours
-- directement à l'artisan (Stripe Connect, règle 12). La relance J+2 de l'acompte (ADR 0090,
-- toutes formules) ne change pas.
-- TODO(legal) : contenu et fréquence des relances envoyées à un particulier, au nom de
-- l'artisan, à faire valider par l'avocat (aucune pénalité ni mise en demeure ici).

-- ---------------------------------------------------------------------------
-- Réglage « Relances automatiques »
-- ---------------------------------------------------------------------------
create table public.payment_reminder_settings (
  artisan_id uuid primary key references public.artisans (id) on delete cascade,
  auto boolean not null default false,
  updated_at timestamptz not null default now()
);
alter table public.payment_reminder_settings enable row level security;
revoke all on public.payment_reminder_settings from anon, authenticated;
grant select on public.payment_reminder_settings to authenticated;
create policy "payment_reminder_settings : lecture par l'artisan"
  on public.payment_reminder_settings for select to authenticated
  using (artisan_id = (select app.my_artisan_id()));

-- ---------------------------------------------------------------------------
-- Journal des relances (une ligne par rappel envoyé)
-- ---------------------------------------------------------------------------
create table public.payment_reminders (
  id uuid primary key default gen_random_uuid(),
  artisan_id uuid not null references public.artisans (id) on delete cascade,
  chantier_id uuid not null references public.chantiers (id) on delete cascade,
  kind public.payment_kind not null,
  mode text not null check (mode in ('manuel', 'auto')),
  -- Palier des relances automatiques (jours après l'échéance) ; null pour une relance manuelle.
  step smallint check (step in (7, 15, 30)),
  sent_at timestamptz not null default now(),
  check ((mode = 'auto') = (step is not null))
);
create index payment_reminders_tranche_idx on public.payment_reminders (chantier_id, kind, sent_at desc);
create index payment_reminders_artisan_idx on public.payment_reminders (artisan_id);
alter table public.payment_reminders enable row level security;
revoke all on public.payment_reminders from anon, authenticated;
grant select on public.payment_reminders to authenticated;
create policy "payment_reminders : lecture par l'artisan"
  on public.payment_reminders for select to authenticated
  using (artisan_id = (select app.my_artisan_id()));

-- ---------------------------------------------------------------------------
-- À encaisser (ADR 0237) : avec la dernière relance et le nombre de relances de chaque paiement.
-- ---------------------------------------------------------------------------
create or replace function app.money_open_items(p_artisan_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(
    x.item || jsonb_build_object(
      'derniere_relance', (
        select max(r.sent_at) from public.payment_reminders r
        where r.chantier_id = (x.item ->> 'chantier_id')::uuid and r.kind = (x.item ->> 'tranche')::public.payment_kind
      ),
      'relances', (
        select count(*) from public.payment_reminders r
        where r.chantier_id = (x.item ->> 'chantier_id')::uuid and r.kind = (x.item ->> 'tranche')::public.payment_kind
      )
    )
    order by x.item ->> 'depuis'
  ), '[]'::jsonb)
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

-- Suivi (ADR 0237) : avec le réglage des relances automatiques.
create or replace function public.my_money_overview(p_now timestamptz default now())
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
    'relances_auto', coalesce((select s.auto from public.payment_reminder_settings s where s.artisan_id = a.id), false),
    'mois', app.money_month(a.id, m.cur),
    'mois_precedent', app.money_month(a.id, (m.cur - interval '1 month')::date),
    'a_encaisser', app.money_open_items(a.id),
    'sans_facture', app.money_paid_without_invoice(a.id, p_now)
  )
  from a, m
  where a.id is not null
$$;

-- ---------------------------------------------------------------------------
-- Envoi d'une relance : le paiement doit encore être dû ; rappel au client, inscrit au journal.
-- ---------------------------------------------------------------------------
create function app.remind_payment(
  p_artisan_id uuid,
  p_chantier_id uuid,
  p_kind public.payment_kind,
  p_mode text,
  p_step smallint,
  p_now timestamptz
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_item jsonb;
  v_client uuid;
  v_title text;
begin
  select x into v_item
  from jsonb_array_elements(app.money_open_items(p_artisan_id)) x
  where x ->> 'chantier_id' = p_chantier_id::text and x ->> 'tranche' = p_kind::text;
  if v_item is null then
    return false;
  end if;
  select c.particulier_id, c.title into v_client, v_title from public.chantiers c where c.id = p_chantier_id;
  perform app.notify(v_client, 'paiement_relance', jsonb_build_object(
    'chantier_id', p_chantier_id,
    'titre', v_title,
    'artisan', app.artisan_display_name(p_artisan_id),
    'tranche', p_kind,
    'montant', (v_item ->> 'montant_cents')::bigint
  ));
  insert into public.payment_reminders (artisan_id, chantier_id, kind, mode, step, sent_at)
  values (p_artisan_id, p_chantier_id, p_kind, p_mode, p_step, p_now);
  return true;
end;
$$;
revoke execute on function app.remind_payment(uuid, uuid, public.payment_kind, text, smallint, timestamptz)
  from public, anon, authenticated;

-- « Relancer » (artisan) : formule Premium ou Entreprise, au plus une relance tous les 3 jours.
create function public.artisan_send_payment_reminder(p_chantier_id uuid, p_kind public.payment_kind)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_artisan uuid := app.my_artisan_id();
begin
  if v_artisan is null then
    raise exception 'Réservé aux artisans' using errcode = '42501';
  end if;
  if not coalesce((app.artisan_agents(v_artisan) -> 'agents' ->> 'comptable_avance')::boolean, false) then
    raise exception 'La relance des impayés est incluse dans les formules Premium et Entreprise.'
      using errcode = '42501';
  end if;
  if exists (
    select 1 from public.payment_reminders r
    where r.artisan_id = v_artisan and r.chantier_id = p_chantier_id and r.kind = p_kind
      and r.sent_at > now() - interval '3 days'
  ) then
    raise exception 'Ce client a déjà été relancé il y a moins de 3 jours.' using errcode = '22023';
  end if;
  if not app.remind_payment(v_artisan, p_chantier_id, p_kind, 'manuel', null, now()) then
    raise exception 'Ce paiement n''est plus à encaisser.' using errcode = '22023';
  end if;
  return now();
end;
$$;
revoke execute on function public.artisan_send_payment_reminder(uuid, public.payment_kind) from public, anon;
grant execute on function public.artisan_send_payment_reminder(uuid, public.payment_kind) to authenticated;

-- « Relances automatiques » (artisan) : seulement si la formule comprend l'agent avancé.
create function public.set_payment_reminders_auto(p_enabled boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_artisan uuid := app.my_artisan_id();
begin
  if v_artisan is null then
    raise exception 'Réservé aux artisans' using errcode = '42501';
  end if;
  if coalesce(p_enabled, false)
     and not coalesce((app.artisan_agents(v_artisan) -> 'agents' ->> 'comptable_avance')::boolean, false) then
    raise exception 'Les relances automatiques sont incluses dans les formules Premium et Entreprise.'
      using errcode = '42501';
  end if;
  insert into public.payment_reminder_settings (artisan_id, auto)
  values (v_artisan, coalesce(p_enabled, false))
  on conflict (artisan_id) do update set auto = excluded.auto, updated_at = now();
end;
$$;
revoke execute on function public.set_payment_reminders_auto(boolean) from public, anon;
grant execute on function public.set_payment_reminders_auto(boolean) to authenticated;

-- ---------------------------------------------------------------------------
-- Relances automatiques, chaque jour : le palier atteint (J+7, J+15, J+30) s'il n'a pas déjà été
-- envoyé, et jamais moins de 3 jours après une autre relance du même paiement.
-- ---------------------------------------------------------------------------
create function app.send_auto_payment_reminders(p_now timestamptz default now())
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  r record;
  v_item jsonb;
  v_days integer;
  v_step smallint;
  v_count integer := 0;
begin
  for r in
    select a.id from public.artisans a
    join public.payment_reminder_settings s on s.artisan_id = a.id and s.auto
    where a.status = 'valide'
      and coalesce((app.artisan_agents(a.id, p_now) -> 'agents' ->> 'comptable_avance')::boolean, false)
  loop
    for v_item in select x from jsonb_array_elements(app.money_open_items(r.id)) x loop
      continue when v_item ->> 'depuis' is null;
      v_days := floor(extract(epoch from p_now - (v_item ->> 'depuis')::timestamptz) / 86400);
      v_step := case when v_days >= 30 then 30 when v_days >= 15 then 15 when v_days >= 7 then 7 end;
      continue when v_step is null;
      continue when exists (
        select 1 from public.payment_reminders pr
        where pr.chantier_id = (v_item ->> 'chantier_id')::uuid
          and pr.kind = (v_item ->> 'tranche')::public.payment_kind
          and (pr.step >= v_step or pr.sent_at > p_now - interval '3 days')
      );
      if app.remind_payment(r.id, (v_item ->> 'chantier_id')::uuid, (v_item ->> 'tranche')::public.payment_kind,
          'auto', v_step, p_now) then
        v_count := v_count + 1;
      end if;
    end loop;
  end loop;
  return v_count;
end;
$$;
revoke execute on function app.send_auto_payment_reminders(timestamptz) from public, anon, authenticated;
select cron.schedule('menao-relances-impayes', '30 8 * * *', 'select app.send_auto_payment_reminders()');
