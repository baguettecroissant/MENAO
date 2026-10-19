-- Réponse de l'équipe à un déclarant sans compte (ADR 0140) : nouvelle valeur d'enum, dans sa
-- propre migration (une valeur d'enum ne s'utilise pas dans la transaction qui l'ajoute).
alter type public.notification_type add value 'reponse_contact';
