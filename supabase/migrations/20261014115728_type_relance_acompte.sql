-- Relance « Paiement en attente » (maquette « Notification paiement en attente ») : nouveau libellé
-- d'énumération, ajouté à part (utilisable seulement après la validation de la transaction qui
-- l'ajoute). ADR 0090.
alter type public.notification_type add value 'acompte_relance';
