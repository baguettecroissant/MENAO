-- F-51 — un document validé remplacé par un renouvellement validé passe au statut « remplace » (historique).
-- Migration séparée : une nouvelle valeur d'enum n'est utilisable qu'après validation de la transaction.
alter type public.document_status add value if not exists 'remplace';
