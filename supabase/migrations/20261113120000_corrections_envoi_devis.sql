-- Corrections de l'envoi des devis relevées par l'audit du 31/10/2026 (ADR 0305) :
-- - un compte suspendu ou radié ne peut plus envoyer de devis ;
-- - le régime de TVA est revérifié à l'envoi (il a pu changer depuis le brouillon) ;
-- - une activité déclarée non soumise à l'assurance décennale obligatoire peut envoyer ses devis,
--   sans attestation ni mention d'assurance (le document le sait par issuer.decennale_non_soumis).
-- TODO(legal) : faire confirmer qu'aucune mention d'assurance n'est due pour ces activités
-- (C. assurances L243-2) et s'il faut en citer une autre (RC Pro).

create or replace function app.quote_live_document(p_quote_id uuid)
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
      -- Logo des documents (ADR 0038), figé avec l'émetteur à l'envoi du devis.
      'logo_path', a.logo_path,
      -- Activité non soumise à l'assurance décennale obligatoire : aucune mention (audit du 31/10).
      'decennale_non_soumis', a.decennale_non_soumis,
      -- Attestation décennale déposée (sauf refusée) ; son échéance est comparée à la date du devis.
      -- Renouvellement en attente (F-51) : l'attestation validée reste celle du devis.
      'decennale', (
        select jsonb_build_object(
          'assureur', d.assureur,
          'numero', d.numero,
          'couverture', d.couverture,
          'date_fin', d.date_fin
        )
        from public.artisan_documents d
        where d.artisan_id = a.id and d.type = 'decennale' and d.status <> 'refuse'
        order by d.status = 'valide' desc
        limit 1
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

create or replace function public.artisan_send_quote(
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
  a public.artisans;
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
  -- Compte suspendu ou radié : plus d'envoi de devis (audit du 31/10/2026).
  select * into a from public.artisans where id = q.artisan_id;
  if a.status <> 'valide' then
    raise exception 'Votre compte n''est pas actif : l''envoi de devis est indisponible' using errcode = '42501';
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
  -- Régime de TVA revérifié à l'envoi : il a pu changer depuis l'enregistrement du brouillon.
  if exists (
    select 1 from public.quote_lines
    where quote_id = q.id and (vat_rate_bp = 0) = coalesce(a.assujetti_tva, true)
  ) then
    raise exception 'Les taux de TVA du devis ne correspondent plus à votre régime de TVA : modifiez le devis'
      using errcode = '22023';
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
  -- Activité non soumise à l'assurance décennale obligatoire (déclarée par l'artisan) : rien à
  -- exiger ni à mentionner.
  if not a.decennale_non_soumis and (
       v_doc #>> '{issuer,decennale,assureur}' is null or v_doc #>> '{issuer,decennale,numero}' is null
       or v_doc #>> '{issuer,decennale,couverture}' is null
       or (v_doc #>> '{issuer,decennale,date_fin}')::date < v_today) then
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
