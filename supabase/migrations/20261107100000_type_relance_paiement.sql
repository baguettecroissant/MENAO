-- Agent comptable avancé, PR B (F-87, ADR 0238) : relance d'un paiement dû envoyée au client au nom
-- de l'artisan, dans sa propre migration (une valeur d'enum ne sert pas dans la transaction qui
-- la crée).
alter type public.notification_type add value 'paiement_relance';
