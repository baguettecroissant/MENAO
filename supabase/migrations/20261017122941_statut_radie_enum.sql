-- Statut « Radié » (ADR 0114) : nouvelles valeurs d'enum, dans leur propre migration (une valeur
-- d'enum ne s'utilise pas dans la transaction qui l'ajoute).
alter type public.artisan_status add value 'radie';
alter type public.notification_type add value 'compte_radie';
