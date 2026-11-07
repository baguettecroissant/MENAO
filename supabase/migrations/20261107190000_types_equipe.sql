-- Comptes d'équipe, PR 3 (F-89, ADR 0243) : un membre est prévenu quand on lui attribue un chantier.
-- Valeur d'enum seule : utilisable une fois cette migration validée.
alter type public.notification_type add value 'chantier_attribue';
