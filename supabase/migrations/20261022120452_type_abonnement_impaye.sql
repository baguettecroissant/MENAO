-- Abonnements impayés (lot 3 du plan V1.1, ADR 0158) : nouveau type de notification, dans sa
-- propre migration (une valeur d'enum ne s'utilise pas dans la transaction qui l'ajoute).
alter type public.notification_type add value 'abonnement_impaye';
