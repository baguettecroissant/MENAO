-- F-31 : notification « acompte payé » (artisan et client). Migration à part : une valeur
-- ajoutée à une énumération n'est utilisable qu'une fois sa transaction validée. ADR 0023.
alter type public.notification_type add value 'acompte_paye';
