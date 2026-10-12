-- F-08 — « Mon compte » : demande de suppression du compte (droit à l'effacement, RGPD), ajoutée
-- à part (libellé utilisable seulement après la validation de la transaction qui l'ajoute).
-- ADR 0039.
alter type public.ticket_type add value if not exists 'suppression_compte';
