-- F-26 : levée des réserves (signalée par l'artisan, confirmée par le client, relance du client à
-- J+7, escalade au support à J+30). Migration à part : une valeur ajoutée à une énumération n'est
-- utilisable qu'une fois sa transaction validée. ADR 0028.
alter type public.notification_type add value 'levee_signalee';
alter type public.notification_type add value 'levee_confirmee';
alter type public.notification_type add value 'levee_relance';
alter type public.ticket_type add value if not exists 'reserves';
