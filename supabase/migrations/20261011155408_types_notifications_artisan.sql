-- F-50, F-51 — notifications de l'artisan sur son dossier et ses documents : nouveaux libellés
-- d'énumération, ajoutés à part (utilisables seulement après la validation de la transaction qui
-- les ajoute). ADR 0037.
alter type public.notification_type add value 'dossier_valide';
alter type public.notification_type add value 'dossier_refuse';
alter type public.notification_type add value 'dossier_complement';
alter type public.notification_type add value 'document_refuse';
alter type public.notification_type add value 'document_a_renouveler';
alter type public.notification_type add value 'document_a_renouveler_equipe';
alter type public.notification_type add value 'compte_suspendu';
alter type public.notification_type add value 'compte_reactive';
