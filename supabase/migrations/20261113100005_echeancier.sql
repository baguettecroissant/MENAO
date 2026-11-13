-- Échéancier de paiement réglable (F-146, ADR 0301, maquette lot 40).
--
-- L'artisan règle son échéancier par défaut (« Mes paiements », dans Argent) et peut le changer
-- pour un devis : acompte à la signature (0 % possible : sans acompte), paiement facultatif au
-- démarrage des travaux, et solde à la réception, toujours calculé (règle 5). Les montants vont
-- directement sur le compte Stripe de l'artisan, sans commission (règle 12).
--
-- - Sans acompte : à la signature, le chantier passe aussitôt à « acompte payé » (transition
--   existante, journalisée avec sans_acompte) ; l'artisan fixe la date comme d'habitude.
-- - Paiement au démarrage : dû quand le chantier passe « en cours » (événement « demarrage ») ;
--   le client est prévenu, le paiement est relançable depuis « À encaisser » et fait l'objet
--   d'une facture d'acompte. Il ne bloque pas le chantier ; s'il n'est pas payé avant la
--   réception, le solde (total − déjà payé) le comprend.
--
-- TODO(legal) : faire confirmer par l'avocat qu'aucun paiement ne peut être exigé pendant le
-- délai de rétractation d'un contrat hors établissement (C. conso. L221-10) et le traitement du
-- paiement au démarrage quand les travaux commencent avant la fin de ce délai (L221-25).

-- ---------------------------------------------------------------------------
-- Échéancier par défaut de l'artisan
-- ---------------------------------------------------------------------------
alter table public.artisans drop constraint artisans_default_deposit_percent_check;
alter table public.artisans
  add constraint artisans_default_deposit_percent_check check (default_deposit_percent between 0 and 99),
  add column default_start_percent smallint not null default 0
    constraint artisans_default_start_percent_check check (default_start_percent between 0 and 99),
  add constraint artisans_default_schedule_check check (default_deposit_percent + default_start_percent <= 99);

comment on column public.artisans.default_start_percent is
  'Part du total payée au démarrage des travaux dans l''échéancier par défaut (0 : aucune).';

-- Règle commune : chaque part entre 0 et 99 %, au moins 1 % pour le solde (réception).
create function app.check_payment_schedule(p_deposit integer, p_start integer)
returns void
language plpgsql
immutable
set search_path = ''
as $$
begin
  if p_deposit is null or p_deposit not between 0 and 99 then
    raise exception 'L''acompte doit être compris entre 0 et 99 %%' using errcode = '22023';
  end if;
  if p_start is null or p_start not between 0 and 99 then
    raise exception 'Le paiement au démarrage doit être compris entre 0 et 99 %%' using errcode = '22023';
  end if;
  if p_deposit + p_start > 99 then
    raise exception 'Il doit rester au moins 1 %% à payer à la réception' using errcode = '22023';
  end if;
end;
$$;
revoke execute on function app.check_payment_schedule(integer, integer) from public, anon, authenticated;

-- Tranches d'un total : chaque part arrondie à l'inférieur, le solde calcule le reste.
create function app.build_payment_schedule(p_total_cents bigint, p_deposit integer, p_start integer)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select coalesce(jsonb_agg(t.part order by t.n), '[]'::jsonb)
  from (
    select 1 as n, jsonb_build_object('percent', p_deposit, 'trigger', 'signature',
      'amount_cents', p_total_cents * p_deposit / 100) as part
    where p_deposit > 0
    union all
    select 2, jsonb_build_object('percent', p_start, 'trigger', 'demarrage',
      'amount_cents', p_total_cents * p_start / 100)
    where p_start > 0
    union all
    select 3, jsonb_build_object('percent', 100 - p_deposit - p_start, 'trigger', 'reception',
      'amount_cents', p_total_cents - p_total_cents * p_deposit / 100 - p_total_cents * p_start / 100)
  ) t
$$;
revoke execute on function app.build_payment_schedule(bigint, integer, integer) from public, anon, authenticated;

-- « Mes paiements » : le patron ou le chef d'équipe enregistre l'échéancier par défaut.
create function public.set_payment_defaults(p_deposit_percent integer, p_start_percent integer)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_artisan uuid := app.my_manager_artisan_id();
begin
  if v_artisan is null then
    raise exception 'Réservé à l''entreprise' using errcode = '42501';
  end if;
  perform app.check_payment_schedule(p_deposit_percent, p_start_percent);
  update public.artisans
  set default_deposit_percent = p_deposit_percent, default_start_percent = p_start_percent
  where id = v_artisan;
end;
$$;
revoke execute on function public.set_payment_defaults(integer, integer) from public, anon;
grant execute on function public.set_payment_defaults(integer, integer) to authenticated;

-- ---------------------------------------------------------------------------
-- Envoi du devis : acompte 0-99 %, paiement au démarrage facultatif (nouveau dernier paramètre).
-- ---------------------------------------------------------------------------
drop function public.artisan_send_quote(uuid, integer, date, integer, boolean);

create function public.artisan_send_quote(
  p_quote_id uuid,
  p_deposit_percent integer,
  p_start_date date,
  p_duration_days integer,
  p_save_default boolean default false,
  p_start_percent integer default 0
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  q public.quotes;
  v_chantier_status public.chantier_status;
  v_today date := (now() at time zone 'Europe/Paris')::date;
  -- QUOTE_VALIDITY_DAYS (packages/core).
  v_valid_until date := (now() at time zone 'Europe/Paris')::date + 30;
  v_doc jsonb;
  v_year smallint := extract(year from (now() at time zone 'Europe/Paris'))::smallint;
  v_number integer;
  v_numero text;
  v_schedule jsonb;
begin
  select * into q from public.quotes
  where id = p_quote_id and artisan_id = app.my_manager_artisan_id()
  for update;
  if not found then
    raise exception 'Devis introuvable' using errcode = '42501';
  end if;
  if q.status <> 'brouillon' then
    raise exception 'Ce devis a déjà été envoyé' using errcode = '22023';
  end if;
  select status into v_chantier_status from public.chantiers where id = q.chantier_id;
  if v_chantier_status not in ('rdv_planifie', 'devis_en_revision') then
    raise exception 'Ce chantier n''attend pas de devis' using errcode = '22023';
  end if;
  if not exists (select 1 from public.quote_lines where quote_id = q.id) then
    raise exception 'Ajoutez au moins une ligne au devis' using errcode = '22023';
  end if;
  perform app.check_payment_schedule(p_deposit_percent, coalesce(p_start_percent, 0));
  if p_start_date is null or p_start_date <= v_today or p_start_date > v_today + 365 then
    raise exception 'Choisissez une date de début à venir, dans l''année' using errcode = '22023';
  end if;
  if p_duration_days is null or p_duration_days not between 1 and 365 then
    raise exception 'La durée estimée doit être comprise entre 1 et 365 jours' using errcode = '22023';
  end if;

  -- Mentions obligatoires (F-20) : identité de l'entreprise et assurance décennale valable.
  v_doc := app.quote_live_document(q.id);
  if v_doc #>> '{issuer,raison_sociale}' is null or v_doc #>> '{issuer,siret}' is null
     or v_doc #>> '{issuer,adresse_ligne}' is null or v_doc #>> '{issuer,code_postal}' is null then
    raise exception 'Identité de l''entreprise incomplète : contactez l''équipe MENAO' using errcode = '22023';
  end if;
  if v_doc #>> '{issuer,decennale,assureur}' is null or v_doc #>> '{issuer,decennale,numero}' is null
     or v_doc #>> '{issuer,decennale,couverture}' is null
     or (v_doc #>> '{issuer,decennale,date_fin}')::date < v_today then
    raise exception 'Complétez votre assurance décennale (assureur, numéro, couverture, validité) avant d''envoyer un devis'
      using errcode = '22023';
  end if;

  if q.supersedes_id is null then
    insert into public.quote_number_counters as k (artisan_id, year, last_number)
    values (q.artisan_id, v_year, 1)
    on conflict (artisan_id, year) do update set last_number = k.last_number + 1
    returning k.last_number into v_number;
    v_numero := format('DEVIS-%s-%s', v_year, lpad(v_number::text, 4, '0'));
  else
    -- Nouvelle version : numéro de la première, suivi de l'indice (DEVIS-2026-0018-v2).
    select regexp_replace(p.numero, '-v[0-9]+$', '') || '-v' || q.version into v_numero
    from public.quotes p
    where p.id = q.supersedes_id;
  end if;

  v_schedule := app.build_payment_schedule(q.total_ttc_cents, p_deposit_percent, coalesce(p_start_percent, 0));

  update public.quotes set
    status = 'envoye',
    numero = v_numero,
    sent_at = now(),
    valid_until = v_valid_until,
    start_date = p_start_date,
    duration_days = p_duration_days,
    payment_schedule = v_schedule,
    document = v_doc || jsonb_build_object(
      'quote', (v_doc -> 'quote') || jsonb_build_object('status', 'envoye', 'numero', v_numero, 'issued_on', v_today),
      'terms', jsonb_build_object(
        'valid_until', v_valid_until,
        'start_date', p_start_date,
        'duration_days', p_duration_days,
        'schedule', v_schedule
      )
    )
  where id = q.id;

  if q.supersedes_id is not null then
    update public.quotes set status = 'remplace' where id = q.supersedes_id;
  end if;
  if p_save_default then
    update public.artisans
    set default_deposit_percent = p_deposit_percent, default_start_percent = coalesce(p_start_percent, 0)
    where id = q.artisan_id;
  end if;

  perform public.transition_chantier(q.chantier_id, 'devis_envoye', jsonb_build_object(
    'quote_id', q.id, 'numero', v_numero, 'montant_ttc', q.total_ttc_cents));
  return v_numero;
end;
$$;
revoke execute on function public.artisan_send_quote(uuid, integer, date, integer, boolean, integer) from public, anon;
grant execute on function public.artisan_send_quote(uuid, integer, date, integer, boolean, integer) to authenticated;

-- ---------------------------------------------------------------------------
-- Signature : sans acompte, le chantier passe aussitôt à « acompte payé ».
-- ---------------------------------------------------------------------------
create or replace function public.record_quote_signature(
  p_request_id uuid,
  p_signed_at timestamptz,
  p_signed_pdf_path text,
  p_proof_path text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  r public.signature_requests;
  q public.quotes;
  v_sans_acompte boolean;
begin
  select * into r from public.signature_requests where id = p_request_id for update;
  if not found then
    raise exception 'Procédure de signature introuvable' using errcode = '22023';
  end if;
  if r.status = 'signee' then
    return 'deja_signe';
  end if;
  select * into q from public.quotes where id = r.quote_id for update;
  if q.status <> 'envoye'
     or (select status from public.chantiers where id = q.chantier_id) <> 'devis_envoye' then
    update public.signature_requests set status = 'abandonnee' where id = r.id;
    return 'non_signable';
  end if;

  v_sans_acompte := not exists (
    select 1 from jsonb_array_elements(q.payment_schedule) s
    where s ->> 'trigger' = 'signature' and (s ->> 'amount_cents')::bigint > 0
  );
  update public.signature_requests set status = 'signee', completed_at = p_signed_at where id = r.id;
  update public.quotes set status = 'signe', signed_at = p_signed_at,
    signed_pdf_path = p_signed_pdf_path, signature_proof_path = p_proof_path
  where id = q.id;
  perform public.transition_chantier(q.chantier_id, 'devis_signe', jsonb_build_object(
    'quote_id', q.id, 'numero', q.numero, 'montant_ttc', q.total_ttc_cents, 'sans_acompte', v_sans_acompte));
  if v_sans_acompte then
    perform public.transition_chantier(q.chantier_id, 'acompte_paye', jsonb_build_object(
      'quote_id', q.id, 'sans_acompte', true, 'montant', 0));
  end if;
  return 'signe';
end;
$$;

-- ---------------------------------------------------------------------------
-- Paiement au démarrage : le client le règle une fois les travaux commencés, avant la réception.
-- ---------------------------------------------------------------------------
create function public.particulier_start_demarrage(p_chantier_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  c public.chantiers;
  q public.quotes;
  a public.artisans;
  p public.payments;
  v_amount bigint;
begin
  select * into c from public.chantiers
  where id = p_chantier_id and particulier_id = auth.uid()
  for update;
  if not found then
    raise exception 'Chantier introuvable' using errcode = '42501';
  end if;
  if c.status not in ('en_cours', 'travaux_termines', 'reserves_a_lever') then
    raise exception 'Le paiement au démarrage se règle une fois les travaux commencés, avant la réception'
      using errcode = '22023';
  end if;
  select * into q from public.quotes
  where chantier_id = c.id and status = 'signe'
  order by version desc
  limit 1;
  if not found then
    raise exception 'Devis signé introuvable' using errcode = '22023';
  end if;
  select (t ->> 'amount_cents')::bigint into v_amount
  from jsonb_array_elements(q.payment_schedule) t
  where t ->> 'trigger' = 'demarrage'
  limit 1;
  if v_amount is null or v_amount <= 0 then
    raise exception 'Aucun paiement au démarrage n''est prévu par ce devis' using errcode = '22023';
  end if;
  select * into a from public.artisans where id = q.artisan_id;
  if a.stripe_account_id is null or not a.connect_charges_enabled then
    raise exception 'L''artisan ne peut pas encore recevoir de paiement : réessayez plus tard'
      using errcode = '22023';
  end if;

  select * into p from public.payments
  where quote_id = q.id and kind = 'demarrage' and status in ('en_attente', 'en_cours', 'paye');
  if found and p.status = 'paye' then
    raise exception 'Le paiement au démarrage est déjà réglé' using errcode = '22023';
  elsif found and p.status = 'en_cours' then
    raise exception 'Un paiement au démarrage est déjà en cours (virement en attente)' using errcode = '22023';
  elsif not found then
    insert into public.payments (quote_id, chantier_id, artisan_id, kind, amount_cents, stripe_account_id)
    values (q.id, q.chantier_id, q.artisan_id, 'demarrage', v_amount, a.stripe_account_id)
    returning * into p;
  end if;

  return jsonb_build_object(
    'payment_id', p.id,
    'quote_id', q.id,
    'amount_cents', p.amount_cents,
    'stripe_account_id', p.stripe_account_id,
    'previous_session_id', p.stripe_checkout_session_id,
    'numero', q.numero,
    'client_email', (select email from auth.users where id = auth.uid())
  );
end;
$$;
revoke execute on function public.particulier_start_demarrage(uuid) from public, anon;
grant execute on function public.particulier_start_demarrage(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Solde : un paiement au démarrage resté ouvert est remplacé par le solde (total − déjà payé).
-- ---------------------------------------------------------------------------
create or replace function public.particulier_start_balance(p_chantier_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  c public.chantiers;
  q public.quotes;
  a public.artisans;
  p public.payments;
  v_amount bigint;
begin
  select * into c from public.chantiers
  where id = p_chantier_id and particulier_id = auth.uid()
  for update;
  if not found then
    raise exception 'Chantier introuvable' using errcode = '42501';
  end if;
  if c.status <> 'receptionne' then
    raise exception 'Le solde se paie une fois la réception des travaux validée' using errcode = '22023';
  end if;
  select * into q from public.quotes
  where chantier_id = c.id and status = 'signe'
  order by version desc
  limit 1;
  if not found then
    raise exception 'Devis signé introuvable' using errcode = '22023';
  end if;
  select * into a from public.artisans where id = q.artisan_id;
  if a.stripe_account_id is null or not a.connect_charges_enabled then
    raise exception 'L''artisan ne peut pas encore recevoir de paiement : réessayez plus tard'
      using errcode = '22023';
  end if;
  if exists (
    select 1 from public.payments
    where quote_id = q.id and kind = 'demarrage' and status = 'en_cours'
  ) then
    raise exception 'Le paiement au démarrage est en cours (virement en attente) : le solde sera payable ensuite'
      using errcode = '22023';
  end if;
  -- Le paiement au démarrage non réglé est compris dans le solde : sa session ne vaut plus.
  update public.payments set status = 'annule'
  where quote_id = q.id and kind = 'demarrage' and status = 'en_attente';
  v_amount := app.quote_balance(q.id);
  if v_amount is null or v_amount <= 0 then
    raise exception 'Aucun solde n''est à payer pour ce chantier' using errcode = '22023';
  end if;

  select * into p from public.payments
  where quote_id = q.id and kind = 'solde' and status in ('en_attente', 'en_cours', 'paye');
  if found and p.status = 'paye' then
    raise exception 'Le solde est déjà payé' using errcode = '22023';
  elsif found and p.status = 'en_cours' then
    raise exception 'Un paiement du solde est déjà en cours (virement en attente)' using errcode = '22023';
  elsif found and p.amount_cents <> v_amount then
    update public.payments set amount_cents = v_amount where id = p.id returning * into p;
  elsif not found then
    insert into public.payments (quote_id, chantier_id, artisan_id, kind, amount_cents, stripe_account_id)
    values (q.id, q.chantier_id, q.artisan_id, 'solde', v_amount, a.stripe_account_id)
    returning * into p;
  end if;

  return jsonb_build_object(
    'payment_id', p.id,
    'quote_id', q.id,
    'amount_cents', p.amount_cents,
    'stripe_account_id', p.stripe_account_id,
    'previous_session_id', p.stripe_checkout_session_id,
    'numero', q.numero,
    'client_email', (select email from auth.users where id = auth.uid())
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Enregistrement d'un paiement : le paiement au démarrage ne fait pas avancer le chantier ; il est
-- facturé et annoncé à l'artisan et au client.
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
  c public.chantiers;
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
    -- L'argent est reçu dans tous les cas ; le chantier avance s'il attend ce paiement.
    select * into c from public.chantiers where id = p.chantier_id;
    if p.kind = 'acompte' and c.status = 'devis_signe' then
      perform public.transition_chantier(p.chantier_id, 'acompte_paye', jsonb_build_object(
        'payment_id', p.id, 'montant', p.amount_cents));
    elsif p.kind = 'solde' and c.status = 'receptionne' then
      perform public.transition_chantier(p.chantier_id, 'solde_paye', jsonb_build_object(
        'payment_id', p.id, 'montant', p.amount_cents));
    elsif p.kind = 'demarrage' then
      perform app.notify(a.user_id, 'demarrage_paye'::public.notification_type, jsonb_build_object(
        'destinataire', 'artisan',
        'chantier_id', c.id,
        'titre', c.title,
        'client', cp.first_name,
        'montant', p.amount_cents
      ))
      from public.artisans a
      left join public.profiles cp on cp.user_id = c.particulier_id
      where a.id = c.artisan_id;
      perform app.notify(c.particulier_id, 'demarrage_paye'::public.notification_type, jsonb_build_object(
        'destinataire', 'client',
        'chantier_id', c.id,
        'titre', c.title,
        'artisan', app.artisan_display_name(c.artisan_id),
        'montant', p.amount_cents
      ));
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

-- ---------------------------------------------------------------------------
-- Factures : le paiement au démarrage est une facture d'acompte ; le solde déduit tous les acomptes.
-- ---------------------------------------------------------------------------
create or replace function app.create_payment_invoice(p_payment_id uuid)
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
  v_extra jsonb := '{}'::jsonb;
  v_trigger text;
begin
  select * into p from public.payments where id = p_payment_id;
  if not found or p.status <> 'paye' then
    return null;
  end if;
  select id into v_id from public.invoices where payment_id = p.id;
  if found then
    return v_id;
  end if;
  select * into q from public.quotes where id = p.quote_id;
  v_trigger := case p.kind when 'acompte' then 'signature' when 'demarrage' then 'demarrage' else 'reception' end;

  if p.kind in ('acompte', 'demarrage') then
    v_vat := app.deposit_invoice_vat(q.vat_breakdown, q.total_ttc_cents, p.amount_cents);
  else
    -- Solde : lignes du devis, acomptes déduits (facture et TVA déjà facturée).
    v_vat := app.balance_invoice_vat(q.vat_breakdown, (
      select coalesce(jsonb_agg(v), '[]'::jsonb)
      from public.invoices i, jsonb_array_elements(i.vat_breakdown) v
      where i.quote_id = q.id and i.kind in ('acompte', 'demarrage')
    ));
    v_extra := jsonb_build_object(
      'lines', q.document -> 'lines',
      'quote_totals', jsonb_build_object(
        'total_ht_cents', q.total_ht_cents,
        'total_tva_cents', q.total_tva_cents,
        'total_ttc_cents', q.total_ttc_cents,
        'vat_breakdown', q.vat_breakdown
      ),
      'deposits', (
        select coalesce(jsonb_agg(jsonb_build_object(
          'numero', i.numero,
          'kind', i.kind,
          'paid_on', i.document #>> '{invoice,paid_on}',
          'total_ttc_cents', i.total_ttc_cents
        ) order by i.issued_on, i.numero), '[]'::jsonb)
        from public.invoices i
        where i.quote_id = q.id and i.kind in ('acompte', 'demarrage')
      )
    );
  end if;
  select coalesce(sum((v ->> 'baseHtCents')::bigint), 0), coalesce(sum((v ->> 'tvaCents')::bigint), 0)
  into v_ht, v_tva
  from jsonb_array_elements(v_vat) v;
  -- Le montant facturé est celui encaissé ; sinon, pas de facture (le paiement reste enregistré,
  -- l'écart est signalé dans les journaux de la base pour l'équipe).
  if v_ht + v_tva <> p.amount_cents then
    raise warning 'Facture non émise : montant incohérent avec le paiement %', p.id;
    return null;
  end if;

  insert into public.invoice_number_counters as k (artisan_id, year, last_number)
  values (p.artisan_id, v_year, 1)
  on conflict (artisan_id, year) do update set last_number = k.last_number + 1
  returning k.last_number into v_number;
  v_numero := format('FAC-%s-%s', v_year, lpad(v_number::text, 4, '0'));

  v_id := gen_random_uuid();
  insert into public.invoices (id, payment_id, quote_id, chantier_id, artisan_id, kind, numero, issued_on,
    total_ht_cents, total_tva_cents, total_ttc_cents, vat_breakdown, document)
  values (v_id, p.id, q.id, p.chantier_id, p.artisan_id, p.kind, v_numero, v_today, v_ht, v_tva, v_ht + v_tva,
    v_vat, jsonb_build_object(
      'invoice', jsonb_build_object(
        'id', v_id,
        'artisan_id', p.artisan_id,
        'numero', v_numero,
        'kind', p.kind,
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
        ),
        -- Part de l'échéancier réglée par ce paiement (acompte ou démarrage).
        'tranche_percent', (
          select (t ->> 'percent')::integer from jsonb_array_elements(q.payment_schedule) t
          where t ->> 'trigger' = v_trigger limit 1
        )
      ),
      -- Émetteur, client et chantier figés à l'envoi du devis signé.
      'issuer', q.document -> 'issuer',
      'client', q.document -> 'client',
      'chantier', q.document -> 'chantier'
    ) || v_extra);
  return v_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Chantiers du client : avec le paiement au démarrage (montant et état).
-- ---------------------------------------------------------------------------
drop function public.particulier_chantiers(uuid);

create function public.particulier_chantiers(p_chantier_id uuid default null)
returns table (
  chantier_id uuid,
  project_id uuid,
  status public.chantier_status,
  title text,
  description text,
  adresse text,
  ville_nom text,
  code_postal text,
  photo_path text,
  artisan_id uuid,
  artisan_name text,
  artisan_avatar_path text,
  artisan_phone text,
  trade_label text,
  appointment_at timestamptz,
  start_at timestamptz,
  finished_at timestamptz,
  closed_at timestamptz,
  received_at timestamptz,
  quote_id uuid,
  quote_status public.quote_status,
  quote_total_ttc_cents bigint,
  deposit_cents bigint,
  deposit_status public.payment_status,
  balance_cents bigint,
  balance_status public.payment_status,
  created_at timestamptz,
  start_payment_cents bigint,
  start_payment_status public.payment_status
)
language sql
stable
security definer
set search_path = ''
as $$
  select c.id, c.project_id, c.status, c.title, p.description,
    c.adresse, c.ville_nom, c.code_postal,
    (select ph.storage_path from public.project_photos ph
     where ph.project_id = c.project_id order by ph.sort_order, ph.created_at limit 1),
    a.id, coalesce(pr.first_name, a.nom_commercial, a.raison_sociale), pr.avatar_path,
    -- Coordonnées de l'artisan tant que la demande est acceptée (F-17).
    case when r.status = 'acceptee' then pr.phone end,
    t.label,
    (select ap.starts_at from public.appointments ap where ap.chantier_id = c.id and ap.status = 'planifie'),
    c.start_at,
    (select e.created_at from public.chantier_events e
     where e.chantier_id = c.id and e.event = 'fin_declaree' order by e.created_at desc limit 1),
    (select e.created_at from public.chantier_events e
     where e.chantier_id = c.id and e.to_status in ('cloture', 'annule', 'devis_refuse')
     order by e.created_at desc limit 1),
    (select e.created_at from public.chantier_events e
     where e.chantier_id = c.id and e.to_status = 'receptionne'
     order by e.created_at desc limit 1),
    q.id, q.status, q.total_ttc_cents,
    (select (s ->> 'amount_cents')::bigint from jsonb_array_elements(q.payment_schedule) s
     where s ->> 'trigger' = 'signature' limit 1),
    (select pay.status from public.payments pay
     where pay.quote_id = q.id and pay.kind = 'acompte' and pay.status in ('en_attente', 'en_cours', 'paye')
     limit 1),
    case when q.status = 'signe' then app.quote_balance(q.id) end,
    (select pay.status from public.payments pay
     where pay.quote_id = q.id and pay.kind = 'solde' and pay.status in ('en_attente', 'en_cours', 'paye')
     limit 1),
    c.created_at,
    (select (s ->> 'amount_cents')::bigint from jsonb_array_elements(q.payment_schedule) s
     where s ->> 'trigger' = 'demarrage' limit 1),
    (select pay.status from public.payments pay
     where pay.quote_id = q.id and pay.kind = 'demarrage' and pay.status in ('en_attente', 'en_cours', 'paye')
     limit 1)
  from public.chantiers c
  join public.requests r on r.id = c.request_id
  join public.projects p on p.id = c.project_id
  join public.artisans a on a.id = c.artisan_id
  left join public.profiles pr on pr.user_id = a.user_id
  left join public.trades t on t.code = p.trade_code
  left join lateral (
    select q0.id, q0.status, q0.total_ttc_cents, q0.payment_schedule from public.quotes q0
    where q0.chantier_id = c.id and q0.status <> 'brouillon'
    order by q0.version desc
    limit 1
  ) q on true
  where c.particulier_id = auth.uid()
    and (p_chantier_id is null or c.id = p_chantier_id)
  order by c.created_at desc
$$;
revoke execute on function public.particulier_chantiers(uuid) from public, anon;
grant execute on function public.particulier_chantiers(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- À encaisser (ADR 0237) : avec le paiement au démarrage, dû depuis le passage « en cours ».
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
      'tranche', 'demarrage',
      'montant_cents', (
        select sum((s ->> 'amount_cents')::bigint) from jsonb_array_elements(q.payment_schedule) s
        where s ->> 'trigger' = 'demarrage'
      ),
      'depuis', (
        select max(e.created_at) from public.chantier_events e
        where e.chantier_id = c.id and e.to_status = 'en_cours'
      ),
      'echec', coalesce((
        select p.status = 'echoue' from public.payments p
        where p.quote_id = q.id and p.kind = 'demarrage' order by p.created_at desc limit 1
      ), false)
    )
    from public.chantiers c
    join lateral (
      select q2.id, q2.payment_schedule from public.quotes q2
      where q2.chantier_id = c.id and q2.status = 'signe'
      order by q2.version desc
      limit 1
    ) q on true
    where c.artisan_id = p_artisan_id
      and c.status in ('en_cours', 'travaux_termines', 'reserves_a_lever')
      and exists (
        select 1 from jsonb_array_elements(q.payment_schedule) s
        where s ->> 'trigger' = 'demarrage' and (s ->> 'amount_cents')::bigint > 0
      )
      and not exists (
        select 1 from public.payments p
        where p.quote_id = q.id and p.kind = 'demarrage' and p.status in ('en_cours', 'paye')
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

-- ---------------------------------------------------------------------------
-- Notifications du chantier : rien d'annoncé pour un « acompte » sans acompte ; au démarrage, le
-- client est prévenu du paiement prévu.
-- ---------------------------------------------------------------------------
create or replace function app.notify_chantier_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  c public.chantiers;
  v_start bigint;
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
        'montant_ttc', new.details -> 'montant_ttc',
        'sans_acompte', coalesce((new.details ->> 'sans_acompte')::boolean, false)
      ))
    from public.artisans a
    left join public.profiles cp on cp.user_id = c.particulier_id
    where a.id = c.artisan_id;
  elsif new.event = 'acompte_paye' then
    -- Sans acompte, la signature suffit : l'artisan est déjà prévenu par « devis signé ».
    if coalesce((new.details ->> 'sans_acompte')::boolean, false) then
      return new;
    end if;
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
  elsif new.event = 'demarrage' then
    select * into c from public.chantiers where id = new.chantier_id;
    select (s ->> 'amount_cents')::bigint into v_start
    from public.quotes q, jsonb_array_elements(q.payment_schedule) s
    where q.chantier_id = c.id and q.status = 'signe' and s ->> 'trigger' = 'demarrage'
    order by q.version desc
    limit 1;
    if v_start > 0 then
      perform app.notify(c.particulier_id, 'demarrage_du'::public.notification_type, jsonb_build_object(
        'chantier_id', c.id,
        'titre', c.title,
        'artisan', app.artisan_display_name(c.artisan_id),
        'montant', v_start
      ));
    end if;
  elsif new.event in ('pv_sans_reserves', 'pv_avec_reserves') then
    select * into c from public.chantiers where id = new.chantier_id;
    perform app.notify(a.user_id,
      case new.event
        when 'pv_sans_reserves' then 'pv_signe'::public.notification_type
        else 'reserves_emises'::public.notification_type
      end,
      jsonb_build_object(
        'chantier_id', c.id,
        'titre', c.title,
        'client', cp.first_name,
        'numero', new.details ->> 'numero',
        'reserves', new.details ->> 'reserves'
      ))
    from public.artisans a
    left join public.profiles cp on cp.user_id = c.particulier_id
    where a.id = c.artisan_id;
  elsif new.event = 'solde_paye' then
    select * into c from public.chantiers where id = new.chantier_id;
    perform app.notify(a.user_id, 'solde_paye'::public.notification_type, jsonb_build_object(
      'destinataire', 'artisan',
      'chantier_id', c.id,
      'titre', c.title,
      'client', cp.first_name,
      'montant', new.details -> 'montant'
    ))
    from public.artisans a
    left join public.profiles cp on cp.user_id = c.particulier_id
    where a.id = c.artisan_id;
    perform app.notify(c.particulier_id, 'solde_paye'::public.notification_type, jsonb_build_object(
      'destinataire', 'client',
      'chantier_id', c.id,
      'titre', c.title,
      'artisan', app.artisan_display_name(c.artisan_id),
      'montant', new.details -> 'montant'
    ));
  elsif new.event = 'reserves_levees' then
    select * into c from public.chantiers where id = new.chantier_id;
    perform app.notify(a.user_id, 'levee_confirmee'::public.notification_type, jsonb_build_object(
      'chantier_id', c.id,
      'titre', c.title,
      'client', cp.first_name
    ))
    from public.artisans a
    left join public.profiles cp on cp.user_id = c.particulier_id
    where a.id = c.artisan_id;
  elsif new.event in ('date_confirmee', 'fin_declaree') then
    select * into c from public.chantiers where id = new.chantier_id;
    perform app.notify(c.particulier_id,
      case new.event
        when 'date_confirmee' then 'chantier_planifie'::public.notification_type
        else 'travaux_termines'::public.notification_type
      end,
      jsonb_build_object(
        'chantier_id', c.id,
        'titre', c.title,
        'artisan', app.artisan_display_name(c.artisan_id),
        'demarrage', new.details ->> 'demarrage',
        'photos', new.details -> 'photos'
      ));
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Équipe : le chef d'équipe voit aussi le paiement au démarrage reçu.
-- ---------------------------------------------------------------------------
create or replace function app.share_notification_with_team()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_artisan uuid;
  v_chantier uuid;
  m record;
  v_chef constant text[] := array[
    'nouvelle_demande', 'demande_annulee', 'demande_relance', 'demande_sans_reponse',
    'creneau_choisi', 'rdv_fixe', 'rdv_modifie', 'rdv_rappel', 'chantier_annule',
    'devis_refuse', 'devis_modification', 'devis_signe', 'devis_expire', 'acompte_paye',
    'chantier_planifie', 'demarrage_modifie', 'demarrage_rappel', 'planning_relance',
    'travaux_termines', 'pv_signe', 'reserves_emises', 'levee_confirmee', 'solde_paye',
    'litige_ouvert', 'litige_clos', 'secretaire_message', 'demarrage_paye'
  ];
  v_ouvrier constant text[] := array[
    'rdv_fixe', 'rdv_modifie', 'rdv_rappel', 'chantier_annule', 'chantier_planifie',
    'demarrage_modifie', 'demarrage_rappel'
  ];
begin
  if not (new.type::text = any (v_chef)) then
    return null;
  end if;
  select a.id into v_artisan from public.artisans a where a.user_id = new.user_id;
  if v_artisan is null then
    return null;
  end if;
  if new.data ->> 'chantier_id' ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    v_chantier := (new.data ->> 'chantier_id')::uuid;
  end if;
  for m in
    select am.user_id, am.role from public.artisan_members am
    where am.artisan_id = v_artisan and am.suspended_at is null
  loop
    if m.role = 'chef'
       or (new.type::text = any (v_ouvrier) and v_chantier is not null and exists (
         select 1 from public.chantier_assignments ca
         where ca.chantier_id = v_chantier and ca.user_id = m.user_id
       )) then
      insert into public.notifications (user_id, type, channel, data, send_after)
      values (m.user_id, new.type, new.channel, new.data, new.send_after)
      on conflict do nothing;
    end if;
  end loop;
  return null;
end;
$$;
