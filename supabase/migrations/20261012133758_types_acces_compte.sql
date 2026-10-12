-- F-52 (lot 3b, ADR 0048) : notifications de l'accès au compte suspendu puis rétabli par l'équipe.
-- Valeurs d'enum ajoutées dans leur propre migration (utilisables dans la suivante).
alter type public.notification_type add value 'acces_suspendu';
alter type public.notification_type add value 'acces_retabli';
