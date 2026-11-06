-- Récapitulatif du matin de Camille (F-80, ADR 0230) : type de notification de l'équipe, dans sa
-- propre migration (une valeur d'enum ne peut pas servir dans la transaction qui la crée).
alter type public.notification_type add value 'equipe_recap_camille';
