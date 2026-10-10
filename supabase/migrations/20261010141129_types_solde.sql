-- F-32 : notification « solde payé », à l'artisan et au client. Migration à part : une valeur
-- ajoutée à une énumération n'est utilisable qu'une fois sa transaction validée. ADR 0029.
alter type public.notification_type add value 'solde_paye';
