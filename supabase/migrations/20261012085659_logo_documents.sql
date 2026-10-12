-- F-20, F-35, F-25 — logo de l'entreprise sur les devis, factures et procès-verbaux (ADR 0038).
-- Le fichier, vérifié et nettoyé par process-upload, est rangé dans le bucket privé
-- « artisan-logos » (dossier = identifiant de l'artisan) ; son chemin est repris dans l'émetteur
-- des documents et figé à l'envoi du devis (factures et PV reprennent cet émetteur). Un document
-- envoyé garde donc son logo, même si l'artisan le remplace ou le retire ensuite.

-- Écrit par le serveur uniquement (aucun droit de modification de la colonne pour l'artisan).
alter table public.artisans
  add column logo_path text check (char_length(logo_path) <= 200);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('artisan-logos', 'artisan-logos', false, 5242880, array['image/png', 'image/jpeg'])
on conflict (id) do nothing;

-- Logo figurant sur un devis envoyé (ou un document qui en découle) d'un chantier du particulier.
create function app.artisan_logo_shared_with_me(p_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.quotes q
    join public.chantiers c on c.id = q.chantier_id
    where q.status <> 'brouillon'
      and c.particulier_id = auth.uid()
      and q.document -> 'issuer' ->> 'logo_path' = p_name
  )
$$;

-- Logo encore utilisé : logo actuel d'un artisan ou repris dans un devis envoyé.
create function app.artisan_logo_in_use(p_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.artisans where logo_path = p_name)
    or exists (
      select 1 from public.quotes
      where status <> 'brouillon' and document -> 'issuer' ->> 'logo_path' = p_name
    )
$$;

-- Lecture (URL signées) : l'artisan, les particuliers dont un document porte ce logo, l'équipe.
create policy "artisan-logos : lecture par l'artisan, ses clients et l'équipe"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'artisan-logos'
    and (
      (storage.foldername(name))[1] = (select app.my_artisan_id())::text
      or (select app.is_staff())
      or app.artisan_logo_shared_with_me(name)
    )
  );

-- Suppression : ses anciens logos seulement, jamais un logo repris dans un document envoyé.
create policy "artisan-logos : suppression de ses logos inutilisés"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'artisan-logos'
    and (storage.foldername(name))[1] = (select app.my_artisan_id())::text
    and not app.artisan_logo_in_use(name)
  );

-- « Retirer le logo » : renvoie l'ancien chemin, que l'application efface du stockage s'il n'est
-- repris dans aucun document envoyé (politique ci-dessus).
create function public.artisan_remove_logo()
returns text
language sql
volatile
security definer
set search_path = ''
as $$
  with previous as (
    select id, logo_path from public.artisans where id = app.my_artisan_id() for update
  )
  update public.artisans a set logo_path = null
  from previous
  where a.id = previous.id
  returning previous.logo_path
$$;
revoke execute on function public.artisan_remove_logo() from public, anon;
grant execute on function public.artisan_remove_logo() to authenticated;

-- ---------------------------------------------------------------------------
-- Émetteur des documents : chemin du logo ajouté (brouillon : logo actuel ; à l'envoi, figé).
-- Correction au passage : avec une attestation décennale validée et son renouvellement en attente
-- (deux lignes), la sous-requête échouait et bloquait l'aperçu comme l'envoi du devis.
-- ---------------------------------------------------------------------------
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
revoke execute on function app.quote_live_document(uuid) from public, anon, authenticated;

