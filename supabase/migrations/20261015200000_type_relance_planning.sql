-- Rappel hebdomadaire du planning (charte qualité, ADR 0107) : nouveau type de notification, dans
-- sa propre migration (une valeur d'enum ne s'utilise pas dans la transaction qui l'ajoute).
alter type public.notification_type add value 'planning_relance';
