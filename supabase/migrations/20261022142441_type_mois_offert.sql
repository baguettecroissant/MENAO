-- Mois offert de démarrage (ADR 0160, ADR 0166) : notification à l'artisan, dans sa propre
-- migration (une valeur d'enum ne s'utilise pas dans la transaction qui l'ajoute).
alter type public.notification_type add value 'mois_offert';
