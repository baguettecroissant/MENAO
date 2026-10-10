-- F-13 : notification « devis signé » à l'artisan. Migration à part : une valeur ajoutée à une
-- énumération n'est utilisable qu'une fois sa transaction validée. ADR 0022.
alter type public.notification_type add value 'devis_signe';
