-- Engagement d'un an de l'abonnement artisan (F-184, ADR 0383) : rappels de fin d'essai et de
-- reconduction, confirmation d'arrêt. Valeurs d'enum dans leur propre migration (elles ne servent
-- pas dans la transaction qui les crée).
alter type public.notification_type add value if not exists 'essai_fin_proche';
alter type public.notification_type add value if not exists 'abonnement_reconduction';
alter type public.notification_type add value if not exists 'abonnement_arret';
