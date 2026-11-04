-- Relances de l'inscription (F-70, ADR 0219) : artisan validé mais pas encore visible, compte
-- Google ou Apple jamais finalisé. Valeurs d'enum seules : utilisables une fois validées.
alter type public.notification_type add value 'activation_relance';
alter type public.notification_type add value 'finalisation_relance';
