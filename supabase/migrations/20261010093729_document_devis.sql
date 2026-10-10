-- F-20 : données du PDF du devis, rassemblées par la base pour l'Edge Function generate-pdf et
-- pour l'aperçu web, avec les mêmes contrôles d'accès. Étape 3e : brouillon de l'artisan, rendu
-- en aperçu (numéro, validité, dates et échéancier fixés à l'envoi). L'envoi (F-21) ajoutera le
-- devis envoyé, lu depuis des données figées. ADR 0020.
create function public.quote_document(p_quote_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'quote', jsonb_build_object(
      'id', q.id,
      'status', q.status,
      'numero', q.numero,
      -- Brouillon : date du jour, heure de Paris.
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
    )
  )
  from public.quotes q
  join public.chantiers c on c.id = q.chantier_id
  join public.artisans a on a.id = q.artisan_id
  left join public.profiles ap on ap.user_id = a.user_id
  left join auth.users u on u.id = a.user_id
  left join public.profiles cp on cp.user_id = c.particulier_id
  where q.id = p_quote_id
    and q.status = 'brouillon'
    and q.artisan_id = app.my_artisan_id()
$$;
revoke execute on function public.quote_document(uuid) from public, anon;
grant execute on function public.quote_document(uuid) to authenticated;
