-- F-31 : paiement de l'acompte par le client, directement sur le compte Stripe de l'artisan
-- (ADR 0011 : charges directes, aucune commission ni application_fee, CLAUDE.md règle 12).
-- Montant pris dans l'échéancier figé à l'envoi du devis. ADR 0023.
-- TODO(legal) : droit de rétractation et délai avant tout paiement d'un contrat conclu hors
-- établissement (art. L221-10 du Code de la consommation), à trancher avant la mise en production.

create type public.payment_kind as enum ('acompte', 'solde');
create type public.payment_status as enum ('en_attente', 'en_cours', 'paye', 'echoue', 'annule');

-- ---------------------------------------------------------------------------
-- Paiements : reflet des paiements Stripe du compte de l'artisan (qui fait foi).
-- ---------------------------------------------------------------------------
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.quotes (id) on delete cascade,
  chantier_id uuid not null references public.chantiers (id) on delete cascade,
  artisan_id uuid not null references public.artisans (id) on delete cascade,
  kind public.payment_kind not null,
  amount_cents bigint not null check (amount_cents > 0),
  currency text not null default 'eur' check (currency = 'eur'),
  status public.payment_status not null default 'en_attente',
  stripe_account_id text not null check (stripe_account_id ~ '^acct_' and char_length(stripe_account_id) <= 255),
  stripe_checkout_session_id text check (char_length(stripe_checkout_session_id) <= 255),
  stripe_payment_intent_id text check (char_length(stripe_payment_intent_id) <= 255),
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint payments_paye_date check (status <> 'paye' or paid_at is not null)
);
create index payments_quote_idx on public.payments (quote_id);
create index payments_chantier_idx on public.payments (chantier_id);
create index payments_artisan_idx on public.payments (artisan_id);
-- Un seul paiement actif (en attente, en cours ou payé) par devis et par tranche.
create unique index payments_un_actif on public.payments (quote_id, kind)
  where status in ('en_attente', 'en_cours', 'paye');
create trigger payments_set_updated_at before update on public.payments
  for each row execute function app.set_updated_at();
alter table public.payments enable row level security;
-- Écriture par les fonctions ci-dessous et par les Edge Functions (service_role) uniquement.
revoke all on public.payments from anon, authenticated;
grant select on public.payments to authenticated;

create policy "payments : lecture par les parties du chantier ou l'équipe"
  on public.payments for select to authenticated
  using (
    artisan_id = (select app.my_artisan_id())
    or (select app.is_staff())
    or exists (
      select 1 from public.chantiers c
      where c.id = chantier_id and c.particulier_id = (select auth.uid())
    )
  );

-- ---------------------------------------------------------------------------
-- « Payer l'acompte » (F-31) : contrôles, montant de l'échéancier, paiement en attente (créé ou
-- repris). La fonction deposit-checkout ouvre ensuite le paiement Stripe sur le compte de l'artisan.
-- ---------------------------------------------------------------------------
create function public.particulier_start_deposit(p_quote_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  q public.quotes;
  c public.chantiers;
  a public.artisans;
  p public.payments;
  v_amount bigint;
begin
  select q2.* into q from public.quotes q2
  join public.chantiers c2 on c2.id = q2.chantier_id
  where q2.id = p_quote_id and c2.particulier_id = auth.uid()
  for update of q2;
  if not found then
    raise exception 'Devis introuvable' using errcode = '42501';
  end if;
  select * into c from public.chantiers where id = q.chantier_id;
  if q.status <> 'signe' or c.status <> 'devis_signe' then
    raise exception 'L''acompte de ce devis ne peut pas être payé' using errcode = '22023';
  end if;
  select * into a from public.artisans where id = q.artisan_id;
  if a.stripe_account_id is null or not a.connect_charges_enabled then
    raise exception 'L''artisan ne peut pas encore recevoir de paiement : réessayez plus tard'
      using errcode = '22023';
  end if;
  select (t ->> 'amount_cents')::bigint into v_amount
  from jsonb_array_elements(q.payment_schedule) t
  where t ->> 'trigger' = 'signature'
  limit 1;
  if v_amount is null or v_amount <= 0 then
    raise exception 'Aucun acompte n''est prévu par ce devis' using errcode = '22023';
  end if;

  select * into p from public.payments
  where quote_id = q.id and kind = 'acompte' and status in ('en_attente', 'en_cours', 'paye');
  if found and p.status = 'paye' then
    raise exception 'L''acompte est déjà payé' using errcode = '22023';
  elsif found and p.status = 'en_cours' then
    raise exception 'Un paiement de l''acompte est déjà en cours (virement en attente)' using errcode = '22023';
  elsif not found then
    insert into public.payments (quote_id, chantier_id, artisan_id, kind, amount_cents, stripe_account_id)
    values (q.id, q.chantier_id, q.artisan_id, 'acompte', v_amount, a.stripe_account_id)
    returning * into p;
  end if;

  return jsonb_build_object(
    'payment_id', p.id,
    'amount_cents', p.amount_cents,
    'stripe_account_id', p.stripe_account_id,
    'previous_session_id', p.stripe_checkout_session_id,
    'numero', q.numero,
    'client_email', (select email from auth.users where id = auth.uid())
  );
end;
$$;
revoke execute on function public.particulier_start_deposit(uuid) from public, anon;
grant execute on function public.particulier_start_deposit(uuid) to authenticated;

-- Événement Stripe du compte de l'artisan (webhook, service_role) : paiement retrouvé par devis et
-- tranche (métadonnées posées par MENAO), compte et montant vérifiés. Idempotente. Acompte payé :
-- chantier « acompte_paye » ; les notifications partent du journal du chantier.
create function public.record_payment(
  p_quote_id uuid,
  p_kind public.payment_kind,
  p_stripe_account_id text,
  p_session_id text,
  p_payment_intent_id text,
  p_amount_cents bigint,
  p_status public.payment_status
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  p public.payments;
begin
  select * into p from public.payments
  where quote_id = p_quote_id and kind = p_kind and status in ('en_attente', 'en_cours', 'paye')
  for update;
  if not found then
    return 'inconnu';
  end if;
  if p.stripe_account_id <> p_stripe_account_id or p.amount_cents <> p_amount_cents then
    return 'incoherent';
  end if;
  if p.status = 'paye' then
    return 'deja_paye';
  end if;

  if p_status = 'paye' then
    update public.payments set status = 'paye', paid_at = now(),
      stripe_checkout_session_id = coalesce(p_session_id, stripe_checkout_session_id),
      stripe_payment_intent_id = coalesce(p_payment_intent_id, stripe_payment_intent_id)
    where id = p.id;
    -- L'argent est reçu dans tous les cas ; le chantier avance s'il attend l'acompte.
    if p.kind = 'acompte'
       and (select status from public.chantiers where id = p.chantier_id) = 'devis_signe' then
      perform public.transition_chantier(p.chantier_id, 'acompte_paye', jsonb_build_object(
        'payment_id', p.id, 'montant', p.amount_cents));
    end if;
    return 'paye';
  elsif p_status = 'en_cours' then
    update public.payments set status = 'en_cours',
      stripe_checkout_session_id = coalesce(p_session_id, stripe_checkout_session_id),
      stripe_payment_intent_id = coalesce(p_payment_intent_id, stripe_payment_intent_id)
    where id = p.id;
    return 'en_cours';
  elsif p_status in ('echoue', 'annule') then
    -- Une ancienne session (remplacée ou expirée) ne remet pas en cause le paiement courant.
    if p.stripe_checkout_session_id is distinct from p_session_id then
      return 'ignore';
    end if;
    update public.payments set status = p_status where id = p.id;
    return p_status::text;
  end if;
  return 'ignore';
end;
$$;
revoke execute on function public.record_payment(uuid, public.payment_kind, text, text, text, bigint, public.payment_status)
  from public, anon, authenticated;
grant execute on function public.record_payment(uuid, public.payment_kind, text, text, text, bigint, public.payment_status)
  to service_role;

-- ---------------------------------------------------------------------------
-- Notifications (F-41) : acompte payé, à l'artisan et au client.
-- ---------------------------------------------------------------------------
create or replace function app.notify_chantier_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  c public.chantiers;
begin
  if new.event in ('rdv_fixe', 'devis_envoye')
     or (new.event = 'annulation' and new.details ->> 'par' = 'artisan') then
    select * into c from public.chantiers where id = new.chantier_id;
    perform app.notify(c.particulier_id,
      case new.event
        when 'rdv_fixe' then 'rdv_fixe'::public.notification_type
        when 'devis_envoye' then 'devis_recu'::public.notification_type
        else 'chantier_annule'::public.notification_type
      end,
      jsonb_build_object(
        'chantier_id', c.id,
        'titre', c.title,
        'artisan', app.artisan_display_name(c.artisan_id),
        'rendez_vous', new.details ->> 'rendez_vous',
        'motif', new.details ->> 'motif',
        'quote_id', new.details ->> 'quote_id',
        'numero', new.details ->> 'numero',
        'montant_ttc', new.details -> 'montant_ttc'
      ));
  elsif new.event in ('devis_refuse', 'revision_demandee', 'devis_signe') then
    select * into c from public.chantiers where id = new.chantier_id;
    perform app.notify(a.user_id,
      case new.event
        when 'devis_refuse' then 'devis_refuse'::public.notification_type
        when 'devis_signe' then 'devis_signe'::public.notification_type
        else 'devis_modification'::public.notification_type
      end,
      jsonb_build_object(
        'chantier_id', c.id,
        'titre', c.title,
        'client', cp.first_name,
        'numero', new.details ->> 'numero',
        'motif', new.details ->> 'motif',
        'message', new.details ->> 'message',
        'montant_ttc', new.details -> 'montant_ttc'
      ))
    from public.artisans a
    left join public.profiles cp on cp.user_id = c.particulier_id
    where a.id = c.artisan_id;
  elsif new.event = 'acompte_paye' then
    select * into c from public.chantiers where id = new.chantier_id;
    perform app.notify(a.user_id, 'acompte_paye'::public.notification_type, jsonb_build_object(
      'destinataire', 'artisan',
      'chantier_id', c.id,
      'titre', c.title,
      'client', cp.first_name,
      'montant', new.details -> 'montant'
    ))
    from public.artisans a
    left join public.profiles cp on cp.user_id = c.particulier_id
    where a.id = c.artisan_id;
    perform app.notify(c.particulier_id, 'acompte_paye'::public.notification_type, jsonb_build_object(
      'destinataire', 'client',
      'chantier_id', c.id,
      'titre', c.title,
      'artisan', app.artisan_display_name(c.artisan_id),
      'montant', new.details -> 'montant'
    ));
  end if;
  return new;
end;
$$;
