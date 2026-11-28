-- F-197 (lot 86, ADR 0397) : gains, relevé du 25 et facture des conseillers.
--
-- Contrat d'agent commercial, article 11 : le 25 au plus tard, relevé des primes acquises depuis
-- le précédent (R134-3) ; l'agent émet sa facture sur la base du relevé, TVA selon son régime ;
-- virement le dernier jour du mois si la facture est reçue avant le 28, sinon sous sept jours.
-- MENAO prépare la facture au nom de l'agent, qui la vérifie et l'émet lui-même ; il peut aussi
-- déposer la sienne. TODO(legal) : facture préparée par MENAO au nom de l'agent.

-- ---------------------------------------------------------------------------------------------
-- Informations de facturation
-- ---------------------------------------------------------------------------------------------
-- IBAN : format et clé modulo 97 (même règle que normalizeIban, @menao/core).
create function app.is_valid_iban(p_iban text)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare
  v text := upper(regexp_replace(coalesce(p_iban, ''), '[\s-]+', '', 'g'));
  v_moved text;
  v_rest int := 0;
  v_ch text;
  v_digits text;
  i int;
  j int;
begin
  if v !~ '^[A-Z]{2}[0-9]{2}[A-Z0-9]{11,30}$' then
    return false;
  end if;
  v_moved := substr(v, 5) || substr(v, 1, 4);
  for i in 1 .. char_length(v_moved) loop
    v_ch := substr(v_moved, i, 1);
    v_digits := case when v_ch ~ '[A-Z]' then (ascii(v_ch) - 55)::text else v_ch end;
    for j in 1 .. char_length(v_digits) loop
      v_rest := (v_rest * 10 + substr(v_digits, j, 1)::int) % 97;
    end loop;
  end loop;
  return v_rest = 1;
end;
$$;
revoke execute on function app.is_valid_iban(text) from public, anon, authenticated;

create table public.commercial_billing (
  commercial_id uuid primary key references public.commercials (id) on delete cascade,
  legal_name text not null check (char_length(legal_name) between 2 and 120),
  siret text not null check (app.is_valid_siret(siret)),
  address text not null check (char_length(address) between 5 and 250),
  vat_mode text not null check (vat_mode in ('franchise', 'assujetti')),
  vat_number text check (vat_number ~ '^[A-Z]{2}[0-9A-Z]{8,12}$'),
  iban text not null check (app.is_valid_iban(iban)),
  invoice_prefix text not null check (invoice_prefix ~ '^[A-Z0-9-]{1,20}$'),
  next_number int not null default 1 check (next_number between 1 and 999999),
  updated_at timestamptz not null default now(),
  check (vat_mode = 'franchise' or vat_number is not null)
);
create trigger commercial_billing_set_updated_at before update on public.commercial_billing
  for each row execute function app.set_updated_at();
alter table public.commercial_billing enable row level security;
revoke all on public.commercial_billing from anon, authenticated;
grant select on public.commercial_billing to authenticated;
create policy "commercial_billing : lecture par le conseiller ou un admin"
  on public.commercial_billing for select to authenticated
  using (commercial_id = (select app.my_commercial_id()) or (select app.is_admin()));

-- Le premier numéro ne se change plus après la première facture émise.
create function public.commercial_save_billing(
  p_legal_name text,
  p_siret text,
  p_address text,
  p_vat_mode text,
  p_vat_number text,
  p_iban text,
  p_invoice_prefix text,
  p_next_number int
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := app.my_commercial_id();
  v_siret text := regexp_replace(coalesce(p_siret, ''), '\s+', '', 'g');
  v_iban text := upper(regexp_replace(coalesce(p_iban, ''), '[\s-]+', '', 'g'));
  v_vat text := nullif(upper(regexp_replace(coalesce(p_vat_number, ''), '\s+', '', 'g')), '');
  v_prefix text := upper(btrim(coalesce(p_invoice_prefix, '')));
  v_issued boolean;
begin
  if v_me is null then
    raise exception 'Réservé aux commerciaux' using errcode = '42501';
  end if;
  if char_length(btrim(coalesce(p_legal_name, ''))) not between 2 and 120 then
    raise exception 'Nom ou raison sociale : entre 2 et 120 caractères.' using errcode = '22023';
  end if;
  if not coalesce(app.is_valid_siret(v_siret), false) then
    raise exception 'SIRET invalide.' using errcode = '22023';
  end if;
  if char_length(btrim(coalesce(p_address, ''))) not between 5 and 250 then
    raise exception 'Adresse invalide.' using errcode = '22023';
  end if;
  if p_vat_mode is null or p_vat_mode not in ('franchise', 'assujetti') then
    raise exception 'Régime de TVA inconnu.' using errcode = '22023';
  end if;
  if p_vat_mode = 'assujetti' and (v_vat is null or v_vat !~ '^[A-Z]{2}[0-9A-Z]{8,12}$') then
    raise exception 'Numéro de TVA invalide.' using errcode = '22023';
  end if;
  if not app.is_valid_iban(v_iban) then
    raise exception 'IBAN invalide.' using errcode = '22023';
  end if;
  if v_prefix !~ '^[A-Z0-9-]{1,20}$' then
    raise exception 'Préfixe de facture : lettres, chiffres et tirets, 20 au plus.' using errcode = '22023';
  end if;
  if p_next_number is null or p_next_number not between 1 and 999999 then
    raise exception 'Numéro de facture invalide.' using errcode = '22023';
  end if;
  v_issued := exists (
    select 1 from public.commercial_invoices i where i.commercial_id = v_me and i.mode = 'preparee'
  );
  insert into public.commercial_billing
    (commercial_id, legal_name, siret, address, vat_mode, vat_number, iban, invoice_prefix, next_number)
  values (v_me, btrim(p_legal_name), v_siret, btrim(p_address), p_vat_mode,
    case when p_vat_mode = 'assujetti' then v_vat end, v_iban, v_prefix, p_next_number)
  on conflict (commercial_id) do update set
    legal_name = excluded.legal_name, siret = excluded.siret, address = excluded.address,
    vat_mode = excluded.vat_mode, vat_number = excluded.vat_number, iban = excluded.iban,
    invoice_prefix = case when v_issued then public.commercial_billing.invoice_prefix else excluded.invoice_prefix end,
    next_number = case when v_issued then public.commercial_billing.next_number else excluded.next_number end;
end;
$$;

-- ---------------------------------------------------------------------------------------------
-- Relevés et factures
-- ---------------------------------------------------------------------------------------------
create table public.commercial_statements (
  id uuid primary key default gen_random_uuid(),
  commercial_id uuid not null references public.commercials (id) on delete cascade,
  period_start date not null,
  period_end date not null,
  issued_at timestamptz not null default now(),
  total_cents int not null check (total_cents >= 0),
  unique (commercial_id, period_end),
  check (period_start <= period_end)
);
create index commercial_statements_commercial_idx on public.commercial_statements (commercial_id, period_end desc);

alter table public.commercial_bonuses add column statement_id uuid references public.commercial_statements (id) on delete set null;
create index commercial_bonuses_statement_idx on public.commercial_bonuses (statement_id);

create table public.commercial_invoices (
  id uuid primary key default gen_random_uuid(),
  commercial_id uuid not null references public.commercials (id) on delete cascade,
  statement_id uuid not null unique references public.commercial_statements (id) on delete restrict,
  -- Préparée par MENAO et émise par l'agent, ou déposée par lui (PDF).
  mode text not null check (mode in ('preparee', 'deposee')),
  number text check (char_length(number) <= 40),
  issued_at timestamptz not null default now(),
  total_ht_cents int not null check (total_ht_cents >= 0),
  vat_cents int check (vat_cents >= 0),
  total_ttc_cents int check (total_ttc_cents >= 0),
  vat_mode text check (vat_mode in ('franchise', 'assujetti')),
  -- Identité de l'agent figée au jour de la facture.
  seller jsonb check (seller is null or jsonb_typeof(seller) = 'object'),
  file_path text check (char_length(file_path) <= 300),
  paid_at timestamptz,
  payout_reference text check (char_length(payout_reference) <= 100),
  unique (commercial_id, number),
  check (mode = 'deposee' or (number is not null and total_ttc_cents is not null and seller is not null)),
  check (mode = 'preparee' or file_path is not null)
);
create index commercial_invoices_commercial_idx on public.commercial_invoices (commercial_id, issued_at desc);

alter table public.commercial_statements enable row level security;
alter table public.commercial_invoices enable row level security;
revoke all on public.commercial_statements, public.commercial_invoices from anon, authenticated;
grant select on public.commercial_statements, public.commercial_invoices to authenticated;
create policy "commercial_statements : lecture par le conseiller ou un admin"
  on public.commercial_statements for select to authenticated
  using (commercial_id = (select app.my_commercial_id()) or (select app.is_admin()));
create policy "commercial_invoices : lecture par le conseiller ou un admin"
  on public.commercial_invoices for select to authenticated
  using (commercial_id = (select app.my_commercial_id()) or (select app.is_admin()));

revoke execute on function public.commercial_save_billing(text, text, text, text, text, text, text, int) from public, anon;
grant execute on function public.commercial_save_billing(text, text, text, text, text, text, text, int) to authenticated;

-- Chaque matin à partir du 25 : un relevé par conseiller et par mois, avec les primes validées
-- depuis le précédent. p_now : pour les tests.
create function app.issue_commercial_statements(p_now timestamptz default now())
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_today date := (p_now at time zone 'Europe/Paris')::date;
  v_month date := date_trunc('month', v_today)::date;
  v_count integer := 0;
  v_row record;
  v_id uuid;
begin
  if extract(day from v_today) < 25 then
    return 0;
  end if;
  for v_row in
    select c.id, c.user_id,
      coalesce((select max(s.period_end) + 1 from public.commercial_statements s where s.commercial_id = c.id),
        (select min((b.validated_at at time zone 'Europe/Paris')::date) from public.commercial_bonuses b
         where b.commercial_id = c.id and b.status = 'validee' and b.statement_id is null)) as debut
    from public.commercials c
    where exists (
        select 1 from public.commercial_bonuses b
        where b.commercial_id = c.id and b.status = 'validee' and b.statement_id is null
          and b.validated_at <= p_now
      )
      and not exists (
        select 1 from public.commercial_statements s
        where s.commercial_id = c.id and s.period_end >= v_month
      )
  loop
    insert into public.commercial_statements (commercial_id, period_start, period_end, total_cents)
    values (v_row.id, least(coalesce(v_row.debut, v_today), v_today), v_today, 0)
    returning id into v_id;
    update public.commercial_bonuses b set statement_id = v_id
    where b.commercial_id = v_row.id and b.status = 'validee' and b.statement_id is null
      and b.validated_at <= p_now;
    update public.commercial_statements s set total_cents = (
      select coalesce(sum(b.amount_cents), 0) from public.commercial_bonuses b where b.statement_id = v_id
    ) where s.id = v_id;
    if v_row.user_id is not null then
      perform app.notify(v_row.user_id, 'conseiller_releve', jsonb_build_object(
        'statement_id', v_id,
        'mois', to_char(v_today, 'YYYY-MM'),
        'total_centimes', (select s.total_cents from public.commercial_statements s where s.id = v_id),
        'primes', (select count(*) from public.commercial_bonuses b where b.statement_id = v_id)
      ));
    end if;
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;
revoke execute on function app.issue_commercial_statements(timestamptz) from public, anon, authenticated;

select cron.schedule('menao-releves-conseillers', '30 6 * * *', 'select app.issue_commercial_statements()');

-- Un relevé, ses lignes, la facture s'il y en a une et l'identité de facturation actuelle.
create function app.commercial_statement_json(p_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', s.id,
    'commercial_id', s.commercial_id,
    'agent', c.nom,
    'rsac', o.rsac_numero,
    'rsac_greffe', o.rsac_greffe,
    'period_start', s.period_start,
    'period_end', s.period_end,
    'issued_at', s.issued_at,
    'total_cents', s.total_cents,
    'lines', coalesce((
      select jsonb_agg(jsonb_build_object(
        'artisan', coalesce(a.nom_commercial, a.raison_sociale, '—'),
        'kind', b.kind,
        'plan', (select sub.plan_code from public.subscriptions sub where sub.artisan_id = b.artisan_id),
        'validated_at', b.validated_at,
        'amount_cents', b.amount_cents
      ) order by b.validated_at, b.id)
      from public.commercial_bonuses b
      left join public.artisans a on a.id = b.artisan_id
      where b.statement_id = s.id
    ), '[]'::jsonb),
    'invoice', (
      select jsonb_build_object(
        'id', i.id, 'mode', i.mode, 'number', i.number, 'issued_at', i.issued_at,
        'total_ht_cents', i.total_ht_cents, 'vat_cents', i.vat_cents, 'total_ttc_cents', i.total_ttc_cents,
        'vat_mode', i.vat_mode, 'seller', i.seller, 'has_file', i.file_path is not null,
        'paid_at', i.paid_at, 'payout_reference', i.payout_reference)
      from public.commercial_invoices i where i.statement_id = s.id
    ),
    'billing', (
      select jsonb_build_object(
        'legal_name', bi.legal_name, 'siret', bi.siret, 'address', bi.address, 'vat_mode', bi.vat_mode,
        'vat_number', bi.vat_number, 'iban_end', right(bi.iban, 4), 'invoice_prefix', bi.invoice_prefix,
        'next_number', bi.next_number)
      from public.commercial_billing bi where bi.commercial_id = s.commercial_id
    )
  )
  from public.commercial_statements s
  join public.commercials c on c.id = s.commercial_id
  left join public.commercial_onboarding o on o.commercial_id = s.commercial_id
  where s.id = p_id
$$;
revoke execute on function app.commercial_statement_json(uuid) from public, anon, authenticated;

create function public.commercial_statement(p_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_me uuid := app.my_commercial_id();
begin
  if v_me is null then
    raise exception 'Réservé aux commerciaux' using errcode = '42501';
  end if;
  if not exists (select 1 from public.commercial_statements s where s.id = p_id and s.commercial_id = v_me) then
    return null;
  end if;
  return app.commercial_statement_json(p_id);
end;
$$;
revoke execute on function public.commercial_statement(uuid) from public, anon;
grant execute on function public.commercial_statement(uuid) to authenticated;

create function public.admin_commercial_statement(p_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform app.require_admin();
  return app.commercial_statement_json(p_id);
end;
$$;
revoke execute on function public.admin_commercial_statement(uuid) from public, anon;
grant execute on function public.admin_commercial_statement(uuid) to authenticated;

-- Émettre la facture préparée : numéro suivant, TVA du régime, identité figée.
create function public.commercial_issue_invoice(p_statement uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := app.my_commercial_id();
  v_statement public.commercial_statements;
  v_billing public.commercial_billing;
  v_rsac text;
  v_vat int;
  v_id uuid;
begin
  if v_me is null then
    raise exception 'Réservé aux commerciaux' using errcode = '42501';
  end if;
  select * into v_statement from public.commercial_statements s
  where s.id = p_statement and s.commercial_id = v_me for update;
  if v_statement.id is null then
    raise exception 'Relevé introuvable.' using errcode = 'P0002';
  end if;
  if exists (select 1 from public.commercial_invoices i where i.statement_id = p_statement) then
    raise exception 'La facture de ce relevé est déjà émise.' using errcode = '22023';
  end if;
  select * into v_billing from public.commercial_billing b where b.commercial_id = v_me for update;
  if v_billing.commercial_id is null then
    raise exception 'Renseignez d''abord vos informations de facturation.' using errcode = '22023';
  end if;
  select o.rsac_numero into v_rsac from public.commercial_onboarding o where o.commercial_id = v_me;
  v_vat := case when v_billing.vat_mode = 'assujetti' then round(v_statement.total_cents * 0.2)::int else 0 end;
  insert into public.commercial_invoices
    (commercial_id, statement_id, mode, number, total_ht_cents, vat_cents, total_ttc_cents, vat_mode, seller)
  values (v_me, p_statement, 'preparee',
    v_billing.invoice_prefix || lpad(v_billing.next_number::text, 3, '0'),
    v_statement.total_cents, v_vat, v_statement.total_cents + v_vat, v_billing.vat_mode,
    jsonb_build_object('legal_name', v_billing.legal_name, 'siret', v_billing.siret,
      'address', v_billing.address, 'vat_number', v_billing.vat_number, 'rsac', v_rsac,
      'iban_end', right(v_billing.iban, 4)))
  returning id into v_id;
  update public.commercial_billing set next_number = next_number + 1 where commercial_id = v_me;
  return v_id;
end;
$$;
revoke execute on function public.commercial_issue_invoice(uuid) from public, anon;
grant execute on function public.commercial_issue_invoice(uuid) to authenticated;

-- Relevés du conseiller, du plus récent au plus ancien, avec leur facture et leur virement.
create function public.commercial_statements_list()
returns table (
  id uuid,
  period_start date,
  period_end date,
  issued_at timestamptz,
  total_cents int,
  invoice_mode text,
  invoice_number text,
  invoice_issued_at timestamptz,
  total_ttc_cents int,
  paid_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_me uuid := app.my_commercial_id();
begin
  if v_me is null then
    raise exception 'Réservé aux commerciaux' using errcode = '42501';
  end if;
  return query
  select s.id, s.period_start, s.period_end, s.issued_at, s.total_cents, i.mode, i.number, i.issued_at,
    i.total_ttc_cents, i.paid_at
  from public.commercial_statements s
  left join public.commercial_invoices i on i.statement_id = s.id
  where s.commercial_id = v_me
  order by s.period_end desc
  limit 36;
end;
$$;
revoke execute on function public.commercial_statements_list() from public, anon;
grant execute on function public.commercial_statements_list() to authenticated;

-- Gains du conseiller : gagné ce mois (montant attendu des primes créées), payé cette année, six
-- derniers mois, et les primes possibles à venir (rien n'est promis).
create function public.commercial_gains()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_me uuid := app.my_commercial_id();
  v_now timestamp := now() at time zone 'Europe/Paris';
  v_month timestamptz := date_trunc('month', v_now) at time zone 'Europe/Paris';
  v_year timestamptz := date_trunc('year', v_now) at time zone 'Europe/Paris';
  v_validation int := (select s.prime_validation_centimes from public.commercial_bonus_settings s);
begin
  if v_me is null then
    raise exception 'Réservé aux commerciaux' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'mois_centimes', (
      select coalesce(sum(app.commercial_bonus_expected_cents(b)), 0) from public.commercial_bonuses b
      where b.commercial_id = v_me and b.status <> 'annulee' and b.created_at >= v_month),
    'validations_mois', (
      select count(*) from public.commercial_bonuses b
      where b.commercial_id = v_me and b.status <> 'annulee' and b.kind = 'validation' and b.created_at >= v_month),
    'abonnements_mois', (
      select count(*) from public.commercial_bonuses b
      where b.commercial_id = v_me and b.status <> 'annulee' and b.kind = 'abonnement' and b.created_at >= v_month),
    'payes_annee_centimes', (
      select coalesce(sum(b.amount_cents), 0) from public.commercial_bonuses b
      where b.commercial_id = v_me and b.status = 'payee' and b.paid_at >= v_year),
    'mois', coalesce((
      select jsonb_agg(jsonb_build_object('mois', to_char(m, 'YYYY-MM'), 'centimes', (
        select coalesce(sum(app.commercial_bonus_expected_cents(b)), 0) from public.commercial_bonuses b
        where b.commercial_id = v_me and b.status <> 'annulee'
          and b.created_at >= m at time zone 'Europe/Paris'
          and b.created_at < (m + interval '1 month') at time zone 'Europe/Paris')) order by m)
      from generate_series(date_trunc('month', v_now) - interval '5 months', date_trunc('month', v_now), interval '1 month') m
    ), '[]'::jsonb),
    'a_venir', coalesce((
      select jsonb_agg(x order by x ->> 'ordre', x ->> 'artisan')
      from (
        select jsonb_build_object('ordre', '1', 'artisan', coalesce(a.nom_commercial, a.raison_sociale, '—'),
          'etape', 'verification', 'date', null, 'plan', null, 'centimes', v_validation) as x
        from public.commercial_attributions ca join public.artisans a on a.id = ca.artisan_id
        where ca.commercial_id = v_me and a.status = 'en_verification'
          and not exists (select 1 from public.commercial_bonuses b where b.artisan_id = a.id and b.kind = 'validation')
        union all
        select jsonb_build_object('ordre', '2', 'artisan', coalesce(a.nom_commercial, a.raison_sociale, '—'),
          'etape', 'essai', 'date', sub.trial_end, 'plan', sub.plan_code,
          'centimes', app.commercial_subscription_bonus_cents(sub.plan_code))
        from public.commercial_attributions ca join public.artisans a on a.id = ca.artisan_id
        join public.subscriptions sub on sub.artisan_id = a.id
        where ca.commercial_id = v_me and sub.status = 'trialing'
          and not exists (select 1 from public.commercial_bonuses b where b.artisan_id = a.id and b.kind = 'abonnement')
        union all
        select jsonb_build_object('ordre', '3', 'artisan', coalesce(a.nom_commercial, a.raison_sociale, '—'),
          'etape', 'dossier', 'date', null, 'plan', null, 'centimes', v_validation)
        from public.commercial_attributions ca join public.artisans a on a.id = ca.artisan_id
        where ca.commercial_id = v_me and a.status = 'brouillon'
          and not exists (select 1 from public.commercial_bonuses b where b.artisan_id = a.id and b.kind = 'validation')
      ) t
    ), '[]'::jsonb)
  );
end;
$$;
revoke execute on function public.commercial_gains() from public, anon;
grant execute on function public.commercial_gains() to authenticated;

-- ---------------------------------------------------------------------------------------------
-- Back-office : relevés du mois, virements
-- ---------------------------------------------------------------------------------------------
create function public.admin_commercial_statements(p_month date default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_month date := date_trunc('month', coalesce(p_month, (now() at time zone 'Europe/Paris')::date))::date;
begin
  perform app.require_admin();
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', s.id, 'commercial_id', c.id, 'commercial', c.nom, 'period_end', s.period_end,
      'total_cents', s.total_cents,
      'invoice_id', i.id, 'invoice_mode', i.mode, 'invoice_number', i.number, 'invoice_issued_at', i.issued_at,
      'total_ttc_cents', i.total_ttc_cents, 'paid_at', i.paid_at, 'payout_reference', i.payout_reference,
      'billing_name', bi.legal_name, 'iban', bi.iban
    ) order by c.nom, s.id)
    from public.commercial_statements s
    join public.commercials c on c.id = s.commercial_id
    left join public.commercial_invoices i on i.statement_id = s.id
    left join public.commercial_billing bi on bi.commercial_id = s.commercial_id
    where s.period_end >= v_month and s.period_end < (v_month + interval '1 month')::date
  ), '[]'::jsonb);
end;
$$;
revoke execute on function public.admin_commercial_statements(date) from public, anon;
grant execute on function public.admin_commercial_statements(date) to authenticated;

-- Virement fait : la facture et les primes de son relevé passent à « payée ».
create function public.admin_mark_commercial_invoice_paid(p_invoice uuid, p_reference text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ref text := nullif(btrim(coalesce(p_reference, '')), '');
  v_statement uuid;
begin
  perform app.require_admin();
  if char_length(v_ref) > 100 then
    raise exception 'Référence : 100 caractères au plus.' using errcode = '22023';
  end if;
  update public.commercial_invoices set paid_at = coalesce(paid_at, now()), payout_reference = v_ref
  where id = p_invoice
  returning statement_id into v_statement;
  if v_statement is null then
    raise exception 'Facture introuvable.' using errcode = 'P0002';
  end if;
  update public.commercial_bonuses b set status = 'payee', paid_at = coalesce(b.paid_at, now()),
    payout_reference = v_ref
  where b.statement_id = v_statement and b.status = 'validee';
  perform app.audit('commercial.facture_payee', 'commercial_invoice', p_invoice,
    jsonb_build_object('reference', v_ref));
end;
$$;
revoke execute on function public.admin_mark_commercial_invoice_paid(uuid, text) from public, anon;
grant execute on function public.admin_mark_commercial_invoice_paid(uuid, text) to authenticated;

-- « Bien démarrer » : étape des informations de facturation.
create or replace function app.commercial_onboarding_json(p_commercial uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'contrat_depose_le', o.contrat_depose_le,
    'contrat_signe_le', o.contrat_signe_le,
    'contrat', o.contrat_path is not null,
    'rsac_numero', o.rsac_numero,
    'rsac_greffe', o.rsac_greffe,
    'urssaf_deposee_le', o.urssaf_deposee_le,
    'rib_depose_le', o.rib_depose_le,
    'ecran_installe_le', o.ecran_installe_le,
    'badge_vu_le', o.badge_vu_le,
    'rappels', coalesce((pr.notification_preferences #>> '{email,rappels}')::boolean, true),
    'push', exists (select 1 from public.web_push_subscriptions w where w.user_id = c.user_id),
    'facturation', exists (select 1 from public.commercial_billing bi where bi.commercial_id = c.id),
    'modules', coalesce((
      select jsonb_object_agg(r.module, r.score)
      from public.commercial_formation_results r where r.commercial_id = c.id
    ), '{}'::jsonb),
    'meilleur_entrainement', (
      select max(t.score) from public.commercial_trainings t where t.commercial_id = c.id
    ),
    'premier_prospect', exists (
      select 1 from public.prospect_briefs b
      join public.prospect_follows f on f.prospect_id = b.prospect_id
      where f.commercial_id = c.id
    )
  )
  from public.commercials c
  left join public.commercial_onboarding o on o.commercial_id = c.id
  left join public.profiles pr on pr.user_id = c.user_id
  where c.id = p_commercial
$$;
