-- F-25, F-26, F-27 (phase 5a) — réception des travaux : une fois la fin des travaux déclarée, le
-- client signe le procès-verbal (PV) de réception chez le prestataire de signature, comme le devis
-- (ADR 0022), sans ou avec réserves. PV sans réserves : chantier réceptionné ; avec réserves :
-- réserves à lever. Numéro PV-AAAA-RNN par artisan et par année, données figées. Ordre de fin de
-- chantier (F-27) : PV, puis solde, puis avis. ADR 0027.
-- TODO(legal) : mentions du PV et signature de l'entreprise (réception contradictoire,
-- art. 1792-6 du code civil).

-- ---------------------------------------------------------------------------
-- Numérotation : compteur par artisan et par année.
-- ---------------------------------------------------------------------------
create table public.reception_number_counters (
  artisan_id uuid not null references public.artisans (id) on delete cascade,
  year smallint not null check (year between 2000 and 2999),
  last_number integer not null check (last_number >= 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (artisan_id, year)
);
create trigger reception_number_counters_set_updated_at before update on public.reception_number_counters
  for each row execute function app.set_updated_at();
alter table public.reception_number_counters enable row level security;
revoke all on public.reception_number_counters from anon, authenticated;
grant select on public.reception_number_counters to authenticated;
create policy "reception_number_counters : lecture par l'équipe MENAO"
  on public.reception_number_counters for select to authenticated
  using ((select app.is_staff()));

-- ---------------------------------------------------------------------------
-- PV de réception : un par chantier ; tant qu'il n'est pas signé, le client peut changer d'avis
-- (ajouter ou retirer des réserves) : même numéro, nouveau document.
-- ---------------------------------------------------------------------------
create type public.reception_status as enum ('en_signature', 'signe');

create table public.receptions (
  id uuid primary key default gen_random_uuid(),
  chantier_id uuid not null unique references public.chantiers (id) on delete cascade,
  quote_id uuid not null references public.quotes (id) on delete cascade,
  artisan_id uuid not null references public.artisans (id) on delete cascade,
  numero text not null check (numero ~ '^PV-[0-9]{4}-R[0-9]{2,}$'),
  status public.reception_status not null default 'en_signature',
  issued_on date not null,
  with_reserves boolean not null,
  reserves text check (char_length(reserves) between 10 and 2000),
  -- Données figées du PV (entreprise, client, chantier, devis, acompte versé, réserves).
  document jsonb not null check (jsonb_typeof(document) = 'object'),
  signed_at timestamptz,
  signed_pdf_path text check (char_length(signed_pdf_path) <= 300),
  signature_proof_path text check (char_length(signature_proof_path) <= 300),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (artisan_id, numero),
  check (with_reserves = (reserves is not null)),
  check (status <> 'signe' or (signed_at is not null and signed_pdf_path is not null))
);
create index receptions_quote_idx on public.receptions (quote_id);
create trigger receptions_set_updated_at before update on public.receptions
  for each row execute function app.set_updated_at();
alter table public.receptions enable row level security;
-- Écriture par les fonctions ci-dessous seulement.
revoke all on public.receptions from anon, authenticated;
grant select on public.receptions to authenticated;

create policy "receptions : lecture par les parties du chantier ou l'équipe"
  on public.receptions for select to authenticated
  using (
    artisan_id = (select app.my_artisan_id())
    or (select app.is_staff())
    or exists (
      select 1 from public.chantiers c
      where c.id = chantier_id and c.particulier_id = (select auth.uid())
    )
  );

-- PV signés et fichiers de preuve (F-43) : servis après contrôle d'accès, jamais en direct.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('reception-signatures', 'reception-signatures', false, 10485760, array['application/pdf'])
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Procédures de signature : devis ou PV de réception.
-- ---------------------------------------------------------------------------
alter table public.signature_requests
  alter column quote_id drop not null,
  add column reception_id uuid references public.receptions (id) on delete cascade,
  add constraint signature_requests_un_document check (num_nonnulls(quote_id, reception_id) = 1);
create index signature_requests_reception_idx on public.signature_requests (reception_id);
create unique index signature_requests_reception_en_attente on public.signature_requests (reception_id)
  where status = 'en_attente';

drop policy "signature_requests : lecture par les parties du devis ou l'équipe" on public.signature_requests;
create policy "signature_requests : lecture par les parties du chantier ou l'équipe"
  on public.signature_requests for select to authenticated
  using (
    (select app.is_staff())
    or exists (
      select 1 from public.quotes q
      join public.chantiers c on c.id = q.chantier_id
      where q.id = quote_id
        and (c.particulier_id = (select auth.uid()) or q.artisan_id = (select app.my_artisan_id()))
    )
    or exists (
      select 1 from public.receptions r
      join public.chantiers c on c.id = r.chantier_id
      where r.id = reception_id
        and (c.particulier_id = (select auth.uid()) or r.artisan_id = (select app.my_artisan_id()))
    )
  );

-- ---------------------------------------------------------------------------
-- « Signer le PV de réception » (F-25, F-26) : contrôles, cases cochées, PV figé (créé, ou mis à
-- jour si le client a changé ses réserves), procédure ouverte ou reprise. La fonction
-- signature-create crée ensuite la demande chez le prestataire.
-- ---------------------------------------------------------------------------
create function public.particulier_start_reception(p_chantier_id uuid, p_reserves text, p_consents jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  c public.chantiers;
  q public.quotes;
  rc public.receptions;
  sr public.signature_requests;
  v_reserves text := nullif(btrim(p_reserves), '');
  v_today date := (now() at time zone 'Europe/Paris')::date;
  v_year smallint := extract(year from (now() at time zone 'Europe/Paris'))::smallint;
  v_id uuid;
  v_number integer;
  v_numero text;
  v_paid bigint;
  v_doc jsonb;
  v_consent text;
begin
  select * into c from public.chantiers
  where id = p_chantier_id and particulier_id = auth.uid()
  for update;
  if not found then
    raise exception 'Chantier introuvable' using errcode = '42501';
  end if;
  if c.status <> 'travaux_termines' then
    raise exception 'La réception n''est pas possible à cette étape du chantier' using errcode = '22023';
  end if;
  if v_reserves is not null and char_length(v_reserves) not between 10 and 2000 then
    raise exception 'Décrivez vos réserves en 10 à 2 000 caractères' using errcode = '22023';
  end if;
  foreach v_consent in array array['document', 'cgu_prestataire', 'cgu_menao', 'echeancier'] loop
    if jsonb_typeof(p_consents -> v_consent) is distinct from 'boolean'
       or not (p_consents ->> v_consent)::boolean then
      raise exception 'Cochez toutes les cases pour signer le PV' using errcode = '22023';
    end if;
  end loop;
  select * into q from public.quotes
  where chantier_id = c.id and status = 'signe'
  order by version desc
  limit 1;
  if not found then
    raise exception 'Devis signé introuvable' using errcode = '22023';
  end if;
  select coalesce(sum(amount_cents), 0) into v_paid
  from public.payments where quote_id = q.id and status = 'paye';

  select * into rc from public.receptions where chantier_id = c.id for update;
  if found and rc.status = 'signe' then
    raise exception 'Le PV de réception est déjà signé' using errcode = '22023';
  end if;
  if rc.id is null then
    insert into public.reception_number_counters as k (artisan_id, year, last_number)
    values (c.artisan_id, v_year, 1)
    on conflict (artisan_id, year) do update set last_number = k.last_number + 1
    returning k.last_number into v_number;
    v_numero := format('PV-%s-R%s', v_year, lpad(v_number::text, 2, '0'));
    v_id := gen_random_uuid();
  else
    v_numero := rc.numero;
    v_id := rc.id;
  end if;

  v_doc := jsonb_build_object(
    'reception', jsonb_build_object(
      'id', v_id,
      'artisan_id', c.artisan_id,
      'chantier_id', c.id,
      'numero', v_numero,
      'issued_on', v_today,
      'with_reserves', v_reserves is not null,
      'reserves', v_reserves
    ),
    'quote', jsonb_build_object(
      'numero', q.numero,
      'signed_on', (q.signed_at at time zone 'Europe/Paris')::date,
      'total_ttc_cents', q.total_ttc_cents,
      'deposit_percent', (
        select (s ->> 'percent')::integer from jsonb_array_elements(q.payment_schedule) s
        where s ->> 'trigger' = 'signature' limit 1
      )
    ),
    'paid_cents', v_paid,
    'finished_on', (
      select (e.created_at at time zone 'Europe/Paris')::date from public.chantier_events e
      where e.chantier_id = c.id and e.event = 'fin_declaree'
      order by e.created_at desc limit 1
    ),
    -- Entreprise, client et chantier figés à l'envoi du devis signé (ADR 0021).
    'issuer', q.document -> 'issuer',
    'client', q.document -> 'client',
    'chantier', q.document -> 'chantier'
  );

  if rc.id is null then
    insert into public.receptions (id, chantier_id, quote_id, artisan_id, numero, issued_on,
      with_reserves, reserves, document)
    values (v_id, c.id, q.id, c.artisan_id, v_numero, v_today, v_reserves is not null, v_reserves, v_doc);
  elsif rc.reserves is distinct from v_reserves or rc.issued_on <> v_today or rc.document <> v_doc then
    -- PV modifié (réserves, date, acompte) : nouveau document, l'ancienne procédure est abandonnée.
    update public.receptions set issued_on = v_today, with_reserves = v_reserves is not null,
      reserves = v_reserves, document = v_doc, quote_id = q.id
    where id = v_id;
    update public.signature_requests set status = 'abandonnee'
    where reception_id = v_id and status = 'en_attente';
  end if;

  select * into sr from public.signature_requests where reception_id = v_id and status = 'en_attente';
  if not found then
    insert into public.signature_requests (reception_id, consents)
    values (v_id, jsonb_build_object(
      'acceptees_le', now(),
      'cases', jsonb_build_array('document', 'cgu_prestataire', 'cgu_menao', 'echeancier'),
      'versions', coalesce(p_consents -> 'versions', '{}'::jsonb),
      'avec_reserves', v_reserves is not null
    ))
    returning * into sr;
  end if;

  return jsonb_build_object(
    'reception_id', v_id,
    'request_id', sr.id,
    'signing_url', sr.signing_url,
    'numero', v_numero,
    'signer', (
      select jsonb_build_object(
        'name', nullif(concat_ws(' ', p.first_name, p.last_name), ''),
        'email', u.email,
        'phone', coalesce(rq.contact_phone, p.phone)
      )
      from auth.users u
      left join public.profiles p on p.user_id = u.id
      left join public.requests rq on rq.id = c.request_id
      where u.id = auth.uid()
    )
  );
end;
$$;
revoke execute on function public.particulier_start_reception(uuid, text, jsonb) from public, anon;
grant execute on function public.particulier_start_reception(uuid, text, jsonb) to authenticated;

-- Données du PV (PDF, aperçu) : parties du chantier et équipe ; état de la signature à jour.
create function public.reception_document(p_reception_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select r.document || jsonb_build_object('reception', (r.document -> 'reception') || jsonb_build_object(
    'status', r.status,
    'signed_at', r.signed_at,
    'signed_pdf_path', r.signed_pdf_path
  ))
  from public.receptions r
  join public.chantiers c on c.id = r.chantier_id
  where r.id = p_reception_id
    and (r.artisan_id = app.my_artisan_id() or c.particulier_id = auth.uid() or app.is_staff())
$$;
revoke execute on function public.reception_document(uuid) from public, anon;
grant execute on function public.reception_document(uuid) to authenticated;

-- PV signé chez le prestataire (webhook, service_role) : PV conservé, chantier « réceptionné » ou
-- « réserves à lever » ; la notification à l'artisan part du journal. Idempotente ; une procédure
-- remplacée (réserves modifiées) n'est pas enregistrée.
create function public.record_reception_signature(
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
  rc public.receptions;
begin
  select * into r from public.signature_requests
  where id = p_request_id and reception_id is not null
  for update;
  if not found then
    raise exception 'Procédure de signature introuvable' using errcode = '22023';
  end if;
  if r.status = 'signee' then
    return 'deja_signe';
  end if;
  if r.status = 'abandonnee' then
    return 'remplace';
  end if;
  select * into rc from public.receptions where id = r.reception_id for update;
  if rc.status = 'signe'
     or (select status from public.chantiers where id = rc.chantier_id) <> 'travaux_termines' then
    update public.signature_requests set status = 'abandonnee' where id = r.id;
    return 'non_signable';
  end if;

  update public.signature_requests set status = 'signee', completed_at = p_signed_at where id = r.id;
  update public.receptions set status = 'signe', signed_at = p_signed_at,
    signed_pdf_path = p_signed_pdf_path, signature_proof_path = p_proof_path
  where id = rc.id;
  perform public.transition_chantier(rc.chantier_id,
    case when rc.with_reserves then 'pv_avec_reserves'::public.chantier_event
         else 'pv_sans_reserves'::public.chantier_event end,
    jsonb_strip_nulls(jsonb_build_object('reception_id', rc.id, 'numero', rc.numero, 'reserves', rc.reserves)));
  return 'signe';
end;
$$;
revoke execute on function public.record_reception_signature(uuid, timestamptz, text, text) from public, anon, authenticated;
grant execute on function public.record_reception_signature(uuid, timestamptz, text, text) to service_role;

-- ---------------------------------------------------------------------------
-- Notifications (F-41) : PV signé ou réserves émises, à l'artisan.
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
-- « Mes chantiers » : date de réception (PV sans réserves ou réserves levées). Le type de retour
-- change : suppression puis recréation.
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
