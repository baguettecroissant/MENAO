-- F-22 : notifications du suivi de chantier au client (date de démarrage confirmée ou modifiée,
-- travaux terminés). Migration à part : une valeur ajoutée à une énumération n'est utilisable
-- qu'une fois sa transaction validée. ADR 0025.
alter type public.notification_type add value 'chantier_planifie';
alter type public.notification_type add value 'demarrage_modifie';
alter type public.notification_type add value 'travaux_termines';
