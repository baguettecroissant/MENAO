-- F-35 : factures des chantiers, au nom de l'artisan (l'artisan est l'émetteur, MENAO est l'outil).
-- Facture d'acompte émise à l'encaissement de l'acompte ; la facture de solde suivra le paiement du
-- solde (phase 5). Numéro FAC-AAAA-NNNN par artisan et par année, sans trou ni doublon. Données
-- figées (format structuré, base de la future facture électronique). ADR 0024.
-- TODO(legal) : mentions obligatoires (dont celles de la réforme de la facturation électronique),
-- répartition de la TVA et arrondis à faire valider par l'expert-comptable.

-- ---------------------------------------------------------------------------
-- Numérotation : compteur par artisan et par année, mis à jour dans la transaction d'émission.
-- ---------------------------------------------------------------------------
create table public.invoice_number_counters (
  artisan_id uuid not null references public.artisans (id) on delete cascade,
  year smallint not null check (year between 2000 and 2999),
  last_number integer not null check (last_number >= 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (artisan_id, year)
);
create trigger invoice_number_counters_set_updated_at before update on public.invoice_number_counters
  for each row execute function app.set_updated_at();
alter table public.invoice_number_counters enable row level security;
revoke all on public.invoice_number_counters from anon, authenticated;
grant select on public.invoice_number_counters to authenticated;
create policy "invoice_number_counters : lecture par l'équipe MENAO"
  on public.invoice_number_counters for select to authenticated
  using ((select app.is_staff()));

-- ---------------------------------------------------------------------------
-- Factures
-- ---------------------------------------------------------------------------
create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null unique references public.payments (id) on delete cascade,
  quote_id uuid not null references public.quotes (id) on delete cascade,
  chantier_id uuid not null references public.chantiers (id) on delete cascade,
  artisan_id uuid not null references public.artisans (id) on delete cascade,
  kind public.payment_kind not null,
  numero text not null check (numero ~ '^FAC-[0-9]{4}-[0-9]{4,}$'),
  issued_on date not null,
  total_ht_cents bigint not null check (total_ht_cents >= 0),
  total_tva_cents bigint not null check (total_tva_cents >= 0),
  total_ttc_cents bigint not null check (total_ttc_cents = total_ht_cents + total_tva_cents),
  -- [{ "rateBp", "baseHtCents", "tvaCents" }], du plus petit taux au plus grand.
  vat_breakdown jsonb not null check (jsonb_typeof(vat_breakdown) = 'array'),
  -- Données figées de la facture (émetteur, client, chantier, devis, paiement, montants).
  document jsonb not null check (jsonb_typeof(document) = 'object'),
  pdf_path text check (char_length(pdf_path) <= 300),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (artisan_id, numero)
);
create index invoices_quote_idx on public.invoices (quote_id);
create index invoices_chantier_idx on public.invoices (chantier_id);
create index invoices_artisan_date_idx on public.invoices (artisan_id, issued_on desc);
create trigger invoices_set_updated_at before update on public.invoices
  for each row execute function app.set_updated_at();
alter table public.invoices enable row level security;
-- Émission par la base uniquement ; PDF conservé par generate-pdf (service_role).
revoke all on public.invoices from anon, authenticated;
grant select on public.invoices to authenticated;

create policy "invoices : lecture par les parties du chantier ou l'équipe"
  on public.invoices for select to authenticated
  using (
    artisan_id = (select app.my_artisan_id())
    or (select app.is_staff())
    or exists (
      select 1 from public.chantiers c
      where c.id = chantier_id and c.particulier_id = (select auth.uid())
    )
  );

-- PDF des factures, conservés tels qu'émis (F-43) : servis par generate-pdf seulement.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('invoices', 'invoices', false, 5242880, array['application/pdf'])
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Facture d'acompte (mêmes règles que packages/core/src/invoice.ts) : montant payé réparti entre
-- les taux du devis au prorata du TTC (le reste d'arrondi au dernier taux) ; HT = TTC ÷ (1 + taux)
-- au plus proche, TVA = TTC − HT.
-- ---------------------------------------------------------------------------
create function app.deposit_invoice_vat(p_vat jsonb, p_total_ttc bigint, p_paid bigint)
returns jsonb
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_count integer := jsonb_array_length(coalesce(p_vat, '[]'::jsonb));
  v_allocated bigint := 0;
  v_result jsonb := '[]'::jsonb;
  v_part jsonb;
  v_rate integer;
  v_ttc bigint;
  v_ht bigint;
  i integer := 0;
begin
  if p_total_ttc <= 0 or p_paid <= 0 or v_count = 0 then
    return '[]'::jsonb;
  end if;
  for v_part in select value from jsonb_array_elements(p_vat) loop
    i := i + 1;
    v_rate := (v_part ->> 'rateBp')::integer;
    if i = v_count then
      v_ttc := p_paid - v_allocated;
    else
      v_ttc := floor(p_paid::numeric
        * ((v_part ->> 'baseHtCents')::bigint + (v_part ->> 'tvaCents')::bigint) / p_total_ttc)::bigint;
    end if;
    v_allocated := v_allocated + v_ttc;
    v_ht := round(v_ttc::numeric * 10000 / (10000 + v_rate))::bigint;
    v_result := v_result || jsonb_build_array(jsonb_build_object(
      'rateBp', v_rate, 'baseHtCents', v_ht, 'tvaCents', v_ttc - v_ht));
  end loop;
  return v_result;
end;
$$;

-- Émission à l'encaissement (appelée par record_payment). Idempotente : une facture par paiement.
create function app.create_payment_invoice(p_payment_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  p public.payments;
  q public.quotes;
  v_id uuid;
  v_today date := (now() at time zone 'Europe/Paris')::date;
  v_year smallint := extract(year from (now() at time zone 'Europe/Paris'))::smallint;
  v_number integer;
  v_numero text;
  v_vat jsonb;
  v_ht bigint;
  v_tva bigint;
begin
  select * into p from public.payments where id = p_payment_id;
  if not found or p.status <> 'paye' then
    return null;
  end if;
  select id into v_id from public.invoices where payment_id = p.id;
  if found then
    return v_id;
  end if;
  -- Facture de solde : avec le paiement du solde (phase 5).
  if p.kind <> 'acompte' then
    return null;
  end if;
  select * into q from public.quotes where id = p.quote_id;

  insert into public.invoice_number_counters as k (artisan_id, year, last_number)
  values (p.artisan_id, v_year, 1)
  on conflict (artisan_id, year) do update set last_number = k.last_number + 1
  returning k.last_number into v_number;
  v_numero := format('FAC-%s-%s', v_year, lpad(v_number::text, 4, '0'));

  v_vat := app.deposit_invoice_vat(q.vat_breakdown, q.total_ttc_cents, p.amount_cents);
  select coalesce(sum((v ->> 'baseHtCents')::bigint), 0), coalesce(sum((v ->> 'tvaCents')::bigint), 0)
  into v_ht, v_tva
  from jsonb_array_elements(v_vat) v;

  v_id := gen_random_uuid();
  insert into public.invoices (id, payment_id, quote_id, chantier_id, artisan_id, kind, numero, issued_on,
    total_ht_cents, total_tva_cents, total_ttc_cents, vat_breakdown, document)
  values (v_id, p.id, q.id, p.chantier_id, p.artisan_id, 'acompte', v_numero, v_today, v_ht, v_tva, v_ht + v_tva,
    v_vat, jsonb_build_object(
      'invoice', jsonb_build_object(
        'id', v_id,
        'artisan_id', p.artisan_id,
        'numero', v_numero,
        'kind', 'acompte',
        'issued_on', v_today,
        'paid_on', (p.paid_at at time zone 'Europe/Paris')::date,
        'total_ht_cents', v_ht,
        'total_tva_cents', v_tva,
        'total_ttc_cents', v_ht + v_tva,
        'vat_breakdown', v_vat
      ),
      'quote', jsonb_build_object(
        'numero', q.numero,
        'total_ttc_cents', q.total_ttc_cents,
        'deposit_percent', (
          select (t ->> 'percent')::integer from jsonb_array_elements(q.payment_schedule) t
          where t ->> 'trigger' = 'signature' limit 1
        )
      ),
      -- Émetteur, client et chantier figés à l'envoi du devis signé.
      'issuer', q.document -> 'issuer',
      'client', q.document -> 'client',
      'chantier', q.document -> 'chantier'
    ));
  return v_id;
end;
$$;
revoke execute on function app.create_payment_invoice(uuid) from public, anon, authenticated;

-- Données de la facture (PDF) : parties du chantier et équipe.
create function public.invoice_document(p_invoice_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select i.document || jsonb_build_object('pdf_path', i.pdf_path)
  from public.invoices i
  join public.chantiers c on c.id = i.chantier_id
  where i.id = p_invoice_id
    and (i.artisan_id = app.my_artisan_id() or c.particulier_id = auth.uid() or app.is_staff())
$$;
revoke execute on function public.invoice_document(uuid) from public, anon;
grant execute on function public.invoice_document(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Encaissement : la facture d'acompte est émise dans la même transaction que le paiement.
-- ---------------------------------------------------------------------------
create or replace function public.record_payment(
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
    perform app.create_payment_invoice(p.id);
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
