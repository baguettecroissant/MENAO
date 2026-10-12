-- F-11, F-12 — annulation par le client : notification « demande annulée » pour l'artisan, ajoutée
-- à part (utilisable seulement après la validation de la transaction qui l'ajoute). ADR 0040.
alter type public.notification_type add value 'demande_annulee';
