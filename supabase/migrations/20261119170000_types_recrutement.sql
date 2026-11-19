-- Recrutement des conseillers MENAO (F-183, ADR 0380) : e-mails envoyés aux candidats, dans leur
-- propre migration (une valeur d'enum ne sert pas dans la transaction qui la crée).
alter type public.notification_type add value 'recrutement_reunion';
alter type public.notification_type add value 'recrutement_rappel';
alter type public.notification_type add value 'recrutement_annulation';
alter type public.notification_type add value 'recrutement_reponse';
alter type public.notification_type add value 'recrutement_demo';
