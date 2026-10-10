-- F-21 : nouvelles notifications du devis. Migration à part : une valeur ajoutée à une
-- énumération n'est utilisable qu'une fois sa transaction validée. ADR 0021.
alter type public.notification_type add value 'devis_recu';
alter type public.notification_type add value 'devis_refuse';
alter type public.notification_type add value 'devis_modification';
