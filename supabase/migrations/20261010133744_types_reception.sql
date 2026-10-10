-- F-25, F-26 : notifications de la réception à l'artisan (PV signé sans réserves, réserves
-- émises). Migration à part : une valeur ajoutée à une énumération n'est utilisable qu'une fois sa
-- transaction validée. ADR 0027.
alter type public.notification_type add value 'pv_signe';
alter type public.notification_type add value 'reserves_emises';
