-- Faux particuliers et collecteurs de devis (lot 2 du plan V1.1, ADR 0157) : statut « à
-- vérifier » d'une demande retenue par le recoupement automatique, et deux types de ticket, dans
-- leur propre migration (une valeur d'enum ne s'utilise pas dans la transaction qui l'ajoute).
alter type public.request_status add value 'a_verifier';
alter type public.ticket_type add value 'particulier_a_verifier';
alter type public.ticket_type add value 'faux_particulier';
