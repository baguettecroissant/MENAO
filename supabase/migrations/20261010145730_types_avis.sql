-- F-28 (phase 5d) — avis des clients : nouveaux libellés d'énumération, ajoutés à part (utilisables
-- seulement après la validation de la transaction qui les ajoute). ADR 0030.
alter type public.notification_type add value 'avis_recu';
alter type public.notification_type add value 'avis_relance';
alter type public.ticket_type add value if not exists 'avis';
