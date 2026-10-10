-- F-42 (phase 5f) — signalement d'un problème et litige : nouveaux libellés d'énumération,
-- ajoutés à part (utilisables seulement après la validation de la transaction). ADR 0032.
alter type public.ticket_type add value if not exists 'litige';
alter type public.notification_type add value 'litige_ouvert';
alter type public.notification_type add value 'litige_clos';
alter type public.notification_type add value 'reponse_support';
