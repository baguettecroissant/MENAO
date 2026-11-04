-- Assistant des pages Pro (F-69, ADR 0218) : demande de rappel d'un artisan, sans compte.
-- Valeur d'enum seule : elle n'est utilisable qu'une fois cette migration validée.
alter type public.ticket_type add value 'rappel_pro';
