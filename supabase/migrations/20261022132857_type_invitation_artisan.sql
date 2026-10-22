-- « Invitez votre artisan de confiance » (lot 6 du plan V1.1, ADR 0162) : ticket de l'invitation,
-- dans sa propre migration (une valeur d'enum ne s'utilise pas dans la transaction qui l'ajoute).
alter type public.ticket_type add value 'invitation_artisan';
