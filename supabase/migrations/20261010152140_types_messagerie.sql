-- F-40 (phase 5e) — messagerie : nouveaux libellés d'énumération, ajoutés à part (utilisables
-- seulement après la validation de la transaction qui les ajoute). ADR 0031.
alter type public.notification_type add value 'nouveaux_messages';
alter type public.ticket_type add value if not exists 'message';
