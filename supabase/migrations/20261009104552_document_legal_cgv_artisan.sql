-- F-14 — CGV artisans acceptées à l'inscription professionnelle.
-- Migration séparée : une nouvelle valeur d'enum n'est utilisable qu'après validation de la transaction.
alter type public.legal_document add value if not exists 'cgv_artisan';
