-- F-21 : envoi du devis (modalités, numéro par artisan, données figées), réponse du client
-- (refus motivé, demande de modification et nouvelle version), PDF envoyé conservé. ADR 0021.

-- ---------------------------------------------------------------------------
-- « Mon échéancier par défaut » : pourcentage d'acompte proposé à l'envoi.
-- ---------------------------------------------------------------------------
alter table public.artisans
  add column default_deposit_percent smallint not null default 30
    check (default_deposit_percent between 1 and 99);

-- ---------------------------------------------------------------------------
-- Devis envoyé : modalités, données figées, réponse du client
-- ---------------------------------------------------------------------------
create type public.quote_refusal_reason as enum ('trop_cher', 'autre_artisan', 'projet_reporte', 'autre');

alter table public.quotes
  add column sent_at timestamptz,
  add column valid_until date,
  add column start_date date,
  add column duration_days smallint check (duration_days between 1 and 365),
  -- [{ "percent", "trigger": "signature" | "reception", "amount_cents" }] : somme = total TTC.
  add column payment_schedule jsonb
    check (payment_schedule is null or jsonb_typeof(payment_schedule) = 'array'),
  -- Données du devis figées à l'envoi (même forme que quote_document) : PDF et vue du client.
  add column document jsonb check (document is null or jsonb_typeof(document) = 'object'),
  -- Version précédente, quand le client a demandé une modification.
  add column supersedes_id uuid references public.quotes (id) on delete set null,
  add column responded_at timestamptz,
  add column refusal_reason public.quote_refusal_reason,
  add column client_message text check (char_length(client_message) <= 1000),
  add constraint quotes_envoi_complet check (
    status = 'brouillon' or (
      numero is not null and sent_at is not null and valid_until is not null
      and start_date is not null and duration_days is not null
      and payment_schedule is not null and document is not null
    )
  );
create index quotes_supersedes_idx on public.quotes (supersedes_id);

-- Chaque artisan a sa propre séquence : numéro unique par artisan.
alter table public.quotes drop constraint quotes_numero_key;
alter table public.quotes add constraint quotes_artisan_numero_key unique (artisan_id, numero);

-- ---------------------------------------------------------------------------
-- Numérotation DEVIS-AAAA-NNNN, par artisan et par année, sans trou : le compteur est mis à
-- jour dans la transaction d'envoi (un envoi refusé ne consomme aucun numéro).
-- ---------------------------------------------------------------------------
create table public.quote_number_counters (
  artisan_id uuid not null references public.artisans (id) on delete cascade,
  year smallint not null check (year between 2000 and 2999),
  last_number integer not null check (last_number >= 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (artisan_id, year)
);
create trigger quote_number_counters_set_updated_at before update on public.quote_number_counters
  for each row execute function app.set_updated_at();
alter table public.quote_number_counters enable row level security;
-- Écriture par artisan_send_quote uniquement.
revoke all on public.quote_number_counters from anon, authenticated;
grant select on public.quote_number_counters to authenticated;
create policy "quote_number_counters : lecture par l'équipe MENAO"
  on public.quote_number_counters for select to authenticated
  using ((select app.is_staff()));

-- ---------------------------------------------------------------------------
-- PDF du devis envoyé, conservé tel qu'envoyé (F-43) : servi par generate-pdf seulement, après
-- contrôle d'accès par quote_document. Aucune politique pour les utilisateurs.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('quote-pdfs', 'quote-pdfs', false, 5242880, array['application/pdf'])
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Données du devis (F-20) : vivantes pour un brouillon, figées une fois envoyé.
-- ---------------------------------------------------------------------------
create function app.quote_live_document(p_quote_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'quote', jsonb_build_object(
      'id', q.id,
      'artisan_id', q.artisan_id,
      'status', q.status,
      'numero', q.numero,
      'version', q.version,
      -- Brouillon : date du jour, heure de Paris (remplacée par la date d'envoi).
      'issued_on', (now() at time zone 'Europe/Paris')::date,
      'total_ht_cents', q.total_ht_cents,
      'total_tva_cents', q.total_tva_cents,
      'total_ttc_cents', q.total_ttc_cents,
      'vat_breakdown', q.vat_breakdown
    ),
    'lines', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'type', l.type,
        'designation', l.designation,
        'description', l.description,
        'quantity_milli', l.quantity_milli,
        'unit', l.unit,
        'unit_price_ht_cents', l.unit_price_ht_cents,
        'vat_rate_bp', l.vat_rate_bp,
        'total_ht_cents', l.total_ht_cents
      ) order by l.position), '[]'::jsonb)
      from public.quote_lines l
      where l.quote_id = q.id
    ),
    'issuer', jsonb_build_object(
      'raison_sociale', a.raison_sociale,
      'nom_commercial', a.nom_commercial,
      'forme_juridique_code', a.forme_juridique_code,
      'siret', a.siret,
      'tva_intracom', a.tva_intracom,
      'assujetti_tva', a.assujetti_tva,
      'adresse_ligne', a.adresse_ligne,
      'code_postal', a.adresse_code_postal,
      'commune', a.adresse_commune,
      'email', u.email,
      'phone', ap.phone,
      -- Attestation décennale déposée (sauf refusée) ; son échéance est comparée à la date du devis.
      'decennale', (
        select jsonb_build_object(
          'assureur', d.assureur,
          'numero', d.numero,
          'couverture', d.couverture,
          'date_fin', d.date_fin
        )
        from public.artisan_documents d
        where d.artisan_id = a.id and d.type = 'decennale' and d.status <> 'refuse'
      )
    ),
    'client', jsonb_build_object('first_name', cp.first_name, 'last_name', cp.last_name),
    'chantier', jsonb_build_object(
      'title', c.title,
      'adresse', c.adresse,
      'code_postal', c.code_postal,
      'ville_nom', c.ville_nom
    ),
    -- Modalités (validité, début, durée, échéancier) : fixées à l'envoi.
    'terms', null
  )
  from public.quotes q
  join public.chantiers c on c.id = q.chantier_id
  join public.artisans a on a.id = q.artisan_id
  left join public.profiles ap on ap.user_id = a.user_id
  left join auth.users u on u.id = a.user_id
  left join public.profiles cp on cp.user_id = c.particulier_id
  where q.id = p_quote_id
$$;
revoke execute on function app.quote_live_document(uuid) from public, anon, authenticated;

-- Brouillon : son artisan seulement. Devis envoyé : l'artisan, le particulier du chantier et
-- l'équipe, depuis les données figées (statut courant).
create or replace function public.quote_document(p_quote_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when q.status = 'brouillon' then app.quote_live_document(q.id)
    else jsonb_set(q.document, '{quote,status}', to_jsonb(q.status))
  end
  from public.quotes q
  join public.chantiers c on c.id = q.chantier_id
  where q.id = p_quote_id
    and (
      q.artisan_id = app.my_artisan_id()
      or (q.status <> 'brouillon' and (c.particulier_id = auth.uid() or app.is_staff()))
    )
$$;

-- ---------------------------------------------------------------------------
-- « Envoyer le devis » (F-21) : contrôles F-20, numéro, données figées, échéancier (même calcul
-- que packages/core : acompte au centime inférieur, solde = TTC − acompte), chantier
-- « devis_envoye » ; la notification « devis reçu » part du journal du chantier.
-- ---------------------------------------------------------------------------
create function public.artisan_send_quote(
  p_quote_id uuid,
  p_deposit_percent integer,
  p_start_date date,
  p_duration_days integer,
  p_save_default boolean default false
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
  v_deposit bigint;
  v_schedule jsonb;
begin
  select * into q from public.quotes
  where id = p_quote_id and artisan_id = app.my_artisan_id()
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
  if p_deposit_percent is null or p_deposit_percent not between 1 and 99 then
    raise exception 'L''acompte doit être compris entre 1 et 99 %%' using errcode = '22023';
  end if;
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

  v_deposit := q.total_ttc_cents * p_deposit_percent / 100;
  v_schedule := jsonb_build_array(
    jsonb_build_object('percent', p_deposit_percent, 'trigger', 'signature', 'amount_cents', v_deposit),
    jsonb_build_object('percent', 100 - p_deposit_percent, 'trigger', 'reception',
      'amount_cents', q.total_ttc_cents - v_deposit)
  );

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
    update public.artisans set default_deposit_percent = p_deposit_percent where id = q.artisan_id;
  end if;

  perform public.transition_chantier(q.chantier_id, 'devis_envoye', jsonb_build_object(
    'quote_id', q.id, 'numero', v_numero, 'montant_ttc', q.total_ttc_cents));
  return v_numero;
end;
$$;
revoke execute on function public.artisan_send_quote(uuid, integer, date, integer, boolean) from public, anon;
grant execute on function public.artisan_send_quote(uuid, integer, date, integer, boolean) to authenticated;

-- ---------------------------------------------------------------------------
-- Réponse du client (F-21)
-- ---------------------------------------------------------------------------

-- Refus, avec un motif et un commentaire facultatif pour l'artisan.
create function public.particulier_refuse_quote(
  p_quote_id uuid,
  p_reason public.quote_refusal_reason,
  p_comment text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  q public.quotes;
  v_comment text := nullif(btrim(p_comment), '');
begin
  select q2.* into q from public.quotes q2
  join public.chantiers c on c.id = q2.chantier_id
  where q2.id = p_quote_id and c.particulier_id = auth.uid()
  for update of q2;
  if not found then
    raise exception 'Devis introuvable' using errcode = '42501';
  end if;
  if q.status <> 'envoye'
     or (select status from public.chantiers where id = q.chantier_id) <> 'devis_envoye' then
    raise exception 'Ce devis n''attend plus de réponse' using errcode = '22023';
  end if;
  if p_reason is null then
    raise exception 'Choisissez un motif de refus' using errcode = '22023';
  end if;
  if char_length(v_comment) > 500 then
    raise exception 'Commentaire trop long (500 caractères au plus)' using errcode = '22023';
  end if;

  update public.quotes set status = 'refuse', responded_at = now(), refusal_reason = p_reason,
    client_message = v_comment
  where id = q.id;
  perform public.transition_chantier(q.chantier_id, 'devis_refuse', jsonb_build_object(
    'quote_id', q.id, 'numero', q.numero, 'motif', p_reason, 'message', v_comment));
end;
$$;
revoke execute on function public.particulier_refuse_quote(uuid, public.quote_refusal_reason, text) from public, anon;
grant execute on function public.particulier_refuse_quote(uuid, public.quote_refusal_reason, text) to authenticated;

-- Demande de modification : nouvelle version en brouillon, reprenant les lignes, que l'artisan
-- modifie puis envoie (elle remplace alors la précédente).
create function public.particulier_request_quote_revision(p_quote_id uuid, p_message text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  q public.quotes;
  v_message text := btrim(coalesce(p_message, ''));
  v_draft uuid;
begin
  select q2.* into q from public.quotes q2
  join public.chantiers c on c.id = q2.chantier_id
  where q2.id = p_quote_id and c.particulier_id = auth.uid()
  for update of q2;
  if not found then
    raise exception 'Devis introuvable' using errcode = '42501';
  end if;
  if q.status <> 'envoye'
     or (select status from public.chantiers where id = q.chantier_id) <> 'devis_envoye' then
    raise exception 'Ce devis n''attend plus de réponse' using errcode = '22023';
  end if;
  if char_length(v_message) not between 10 and 1000 then
    raise exception 'Décrivez la modification souhaitée (10 à 1 000 caractères)' using errcode = '22023';
  end if;
  if q.version >= 99 then
    raise exception 'Nombre maximal de versions atteint' using errcode = '22023';
  end if;

  update public.quotes set status = 'revision_demandee', responded_at = now(), client_message = v_message
  where id = q.id;
  insert into public.quotes (chantier_id, artisan_id, version, supersedes_id)
  values (q.chantier_id, q.artisan_id, q.version + 1, q.id)
  returning id into v_draft;
  insert into public.quote_lines (quote_id, position, type, designation, description, quantity_milli,
    unit, unit_price_ht_cents, vat_rate_bp, total_ht_cents)
  select v_draft, l.position, l.type, l.designation, l.description, l.quantity_milli, l.unit,
    l.unit_price_ht_cents, l.vat_rate_bp, l.total_ht_cents
  from public.quote_lines l
  where l.quote_id = q.id;
  perform app.refresh_quote_totals(v_draft);

  perform public.transition_chantier(q.chantier_id, 'revision_demandee', jsonb_build_object(
    'quote_id', q.id, 'numero', q.numero, 'message', v_message));
  return v_draft;
end;
$$;
revoke execute on function public.particulier_request_quote_revision(uuid, text) from public, anon;
grant execute on function public.particulier_request_quote_revision(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Notifications (F-41) : devis reçu (client), refusé ou à modifier (artisan).
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
  elsif new.event in ('devis_refuse', 'revision_demandee') then
    select * into c from public.chantiers where id = new.chantier_id;
    perform app.notify(a.user_id,
      case new.event
        when 'devis_refuse' then 'devis_refuse'::public.notification_type
        else 'devis_modification'::public.notification_type
      end,
      jsonb_build_object(
        'chantier_id', c.id,
        'titre', c.title,
        'client', cp.first_name,
        'numero', new.details ->> 'numero',
        'motif', new.details ->> 'motif',
        'message', new.details ->> 'message'
      ))
    from public.artisans a
    left join public.profiles cp on cp.user_id = c.particulier_id
    where a.id = c.artisan_id;
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Liste « Devis » de l'artisan : date d'envoi (le type de retour change).
-- ---------------------------------------------------------------------------
drop function public.artisan_quotes();
create function public.artisan_quotes()
returns table (
  quote_id uuid,
  chantier_id uuid,
  status public.quote_status,
  version smallint,
  numero text,
  total_ttc_cents bigint,
  line_count integer,
  updated_at timestamptz,
  sent_at timestamptz,
  title text,
  client_name text,
  appointment_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select q.id, q.chantier_id, q.status, q.version, q.numero, q.total_ttc_cents,
    (select count(*)::int from public.quote_lines l where l.quote_id = q.id),
    q.updated_at, q.sent_at, c.title, nullif(concat_ws(' ', cp.first_name, cp.last_name), ''),
    (select a.starts_at from public.appointments a where a.chantier_id = c.id
     order by a.created_at desc limit 1)
  from public.quotes q
  join public.chantiers c on c.id = q.chantier_id
  left join public.profiles cp on cp.user_id = c.particulier_id
  where q.artisan_id = app.my_artisan_id()
  order by coalesce(q.sent_at, q.updated_at) desc
$$;
revoke execute on function public.artisan_quotes() from public, anon;
grant execute on function public.artisan_quotes() to authenticated;
