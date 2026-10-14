-- F-24 (phase 7) — gamification artisan : nouveaux libellés d'énumération, ajoutés à part
-- (utilisables seulement après la validation de la transaction qui les ajoute). ADR 0091.
alter type public.notification_type add value 'badge_debloque';
alter type public.notification_type add value 'niveau_atteint';
alter type public.ticket_type add value 'recompense';
