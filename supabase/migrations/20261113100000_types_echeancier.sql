-- Échéancier de paiement réglable (F-146, ADR 0301) : troisième tranche facultative, payée au
-- démarrage des travaux, et ses deux notifications. Les valeurs d'énumération sont ajoutées dans
-- une migration à part : elles ne peuvent servir que dans une transaction suivante.
alter type public.payment_kind add value 'demarrage';

-- Client : les travaux ont commencé, le paiement prévu au démarrage est à régler.
alter type public.notification_type add value 'demarrage_du';
-- Artisan et client : le paiement au démarrage est reçu.
alter type public.notification_type add value 'demarrage_paye';
