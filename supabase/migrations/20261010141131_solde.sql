-- F-32, F-35 (phase 5c) — paiement du solde et clôture du chantier : une fois le chantier
-- réceptionné (PV sans réserves, ou réserves levées, ADR 0027 et 0028), le client paie le solde
-- directement sur le compte Stripe de l'artisan (charge directe sans commission, ADR 0011). À
-- l'encaissement, la facture de solde est émise (lignes du devis, acompte déduit) et le chantier
-- est clôturé. ADR 0029.
-- TODO(legal) : mentions de la facture de solde à faire valider par l'expert-comptable.

-- Reste à payer du devis : total TTC − paiements reçus, toujours calculé (CLAUDE.md règle 5).
-- Avant le paiement du solde, c'est le solde (total − acomptes).
create function app.quote_balance(p_quote_id uuid)
returns bigint
language sql
stable
security definer
set search_path = ''
as $$
  select q.total_ttc_cents - coalesce((
    select sum(p.amount_cents) from public.payments p
    where p.quote_id = q.id and p.status = 'paye'
  ), 0)
  from public.quotes q
  where q.id = p_quote_id
$$;
revoke execute on function app.quote_balance(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- « Payer le solde » (F-32) : contrôles, montant calculé, paiement en attente (créé ou repris). La
-- fonction deposit-checkout ouvre ensuite le paiement Stripe sur le compte de l'artisan.
-- ---------------------------------------------------------------------------
create function public.particulier_start_balance(p_chantier_id uuid)
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
revoke execute on function public.particulier_start_balance(uuid) from public, anon;
grant execute on function public.particulier_start_balance(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Facture de solde (mêmes règles que packages/core : balanceInvoiceVat) : ventilation du devis
-- moins celle des factures d'acompte, taux par taux.
-- ---------------------------------------------------------------------------
create function app.balance_invoice_vat(p_quote_vat jsonb, p_deposit_vat jsonb)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'rateBp', (q ->> 'rateBp')::integer,
    'baseHtCents', (q ->> 'baseHtCents')::bigint - coalesce((
      select sum((d ->> 'baseHtCents')::bigint) from jsonb_array_elements(coalesce(p_deposit_vat, '[]')) d
      where (d ->> 'rateBp')::integer = (q ->> 'rateBp')::integer), 0),
    'tvaCents', (q ->> 'tvaCents')::bigint - coalesce((
      select sum((d ->> 'tvaCents')::bigint) from jsonb_array_elements(coalesce(p_deposit_vat, '[]')) d
      where (d ->> 'rateBp')::integer = (q ->> 'rateBp')::integer), 0)
  ) order by ordinality), '[]'::jsonb)
  from jsonb_array_elements(coalesce(p_quote_vat, '[]')) with ordinality as t(q, ordinality)
$$;

-- Émission à l'encaissement (appelée par record_payment), acompte ou solde. Idempotente.
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

  if p.kind = 'acompte' then
    v_vat := app.deposit_invoice_vat(q.vat_breakdown, q.total_ttc_cents, p.amount_cents);
  else
    -- Solde : lignes du devis, acomptes déduits (facture et TVA déjà facturée).
    v_vat := app.balance_invoice_vat(q.vat_breakdown, (
      select coalesce(jsonb_agg(v), '[]'::jsonb)
      from public.invoices i, jsonb_array_elements(i.vat_breakdown) v
      where i.quote_id = q.id and i.kind = 'acompte'
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
          'paid_on', i.document #>> '{invoice,paid_on}',
          'total_ttc_cents', i.total_ttc_cents
        ) order by i.issued_on, i.numero), '[]'::jsonb)
        from public.invoices i
        where i.quote_id = q.id and i.kind = 'acompte'
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
-- Encaissement : facture émise dans la même transaction ; acompte payé → chantier « acompte
-- payé » ; solde payé → chantier clôturé.
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
  v_status public.chantier_status;
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
    select status into v_status from public.chantiers where id = p.chantier_id;
    if p.kind = 'acompte' and v_status = 'devis_signe' then
      perform public.transition_chantier(p.chantier_id, 'acompte_paye', jsonb_build_object(
        'payment_id', p.id, 'montant', p.amount_cents));
    elsif p.kind = 'solde' and v_status = 'receptionne' then
      perform public.transition_chantier(p.chantier_id, 'solde_paye', jsonb_build_object(
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

-- ---------------------------------------------------------------------------
-- « Mes chantiers » : solde à payer et état de son paiement. Le type de retour change :
-- suppression puis recréation.
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
  created_at timestamptz
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
    c.created_at
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
-- Notifications (F-41) : solde payé, à l'artisan et au client.
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
