-- F-41 (phase 5g) — préférences de notification : statut des e-mails non envoyés à la demande du
-- destinataire, ajouté à part (utilisable seulement après la validation de la transaction).
-- ADR 0033.
alter type public.notification_status add value 'ignoree';
