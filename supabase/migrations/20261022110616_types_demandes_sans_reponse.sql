-- Aucune demande sans réponse (lot 1 du plan V1.1, ADR 0156) : nouveaux types de notification et
-- de ticket, dans leur propre migration (une valeur d'enum ne s'utilise pas dans la transaction
-- qui l'ajoute).
alter type public.notification_type add value 'demande_relance';
alter type public.notification_type add value 'demande_sans_reponse';
alter type public.ticket_type add value 'demande_sans_reponse';
