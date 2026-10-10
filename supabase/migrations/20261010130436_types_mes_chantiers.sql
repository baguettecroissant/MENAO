-- F-12 : nouveautés du journal notifiées au client (« Jean a ajouté 6 nouvelles photos »).
-- Migration à part : une valeur ajoutée à une énumération n'est utilisable qu'une fois sa
-- transaction validée. ADR 0026.
alter type public.notification_type add value 'chantier_nouveautes';
