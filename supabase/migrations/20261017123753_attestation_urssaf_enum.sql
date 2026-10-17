-- Attestation de vigilance URSSAF (ADR 0115) : nouveau type de document, dans sa propre migration
-- (une valeur d'enum ne s'utilise pas dans la transaction qui l'ajoute).
alter type public.document_type add value 'urssaf';
