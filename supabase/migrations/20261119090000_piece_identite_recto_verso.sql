-- F-181 (ADR 0378) : pièce d'identité du dirigeant selon son type. Une carte d'identité ou un
-- titre de séjour se dépose recto et verso, un passeport en une page. L'artisan choisit aussi si
-- MENAO transmet cette pièce à Stripe pour ouvrir son compte de paiement.
--
-- Pas de nouvelle table : les colonnes suivent les droits de artisan_documents (lecture par le
-- propriétaire, un administrateur ou le support ; écriture par le serveur seulement).

alter table public.artisan_documents
  add column piece text,
  add column verso_path text,
  add column verso_mime_type text,
  add column partage_stripe boolean not null default true;

comment on column public.artisan_documents.piece is
  'Pièce d''identité : carte_identite, passeport ou titre_sejour. Null pour les autres documents et les dépôts d''avant F-181.';
comment on column public.artisan_documents.verso_path is
  'Pièce d''identité : chemin du verso dans « artisan-documents » (carte d''identité, titre de séjour).';
comment on column public.artisan_documents.verso_mime_type is
  'Type de fichier du verso.';
comment on column public.artisan_documents.partage_stripe is
  'Pièce d''identité : l''artisan accepte que MENAO la transmette à Stripe pour ouvrir son compte de paiement.';

alter table public.artisan_documents
  add constraint artisan_documents_piece_check check (
    piece is null
    or (type = 'identite' and piece in ('carte_identite', 'passeport', 'titre_sejour'))
  ),
  add constraint artisan_documents_verso_check check (
    (verso_path is null) = (verso_mime_type is null)
    and (verso_path is null or type = 'identite')
    and (verso_path is null or piece is distinct from 'passeport')
  );
