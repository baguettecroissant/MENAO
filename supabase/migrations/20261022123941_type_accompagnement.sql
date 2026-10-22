-- Nouveaux artisans (lot 5 du plan V1.1, ADR 0160) : ticket « Accompagnement » de l'artisan
-- jamais choisi, dans sa propre migration (une valeur d'enum ne s'utilise pas dans la transaction
-- qui l'ajoute).
alter type public.ticket_type add value 'accompagnement';
