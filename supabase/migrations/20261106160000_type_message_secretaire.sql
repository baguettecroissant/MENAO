-- Secrétaire dédiée de l'artisan (F-83, ADR 0232) : notification d'un message ou d'un rendez-vous
-- pris par la secrétaire, dans sa propre migration (valeur d'enum).
alter type public.notification_type add value 'secretaire_message';
