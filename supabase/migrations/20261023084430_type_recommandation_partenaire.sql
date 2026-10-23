-- Notification « recommandation d'un partenaire » au particulier (ADR 0174). Valeur d'énumération
-- seule : elle n'est utilisable qu'après la validation de cette migration.
alter type public.notification_type add value 'recommandation_partenaire';
