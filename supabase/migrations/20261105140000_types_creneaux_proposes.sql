-- Accepter en un toucher (F-73, ADR 0222) : créneaux proposés au client, créneau choisi.
-- Valeurs d'enum seules : utilisables une fois cette migration validée.
alter type public.notification_type add value 'creneaux_proposes';
alter type public.notification_type add value 'creneau_choisi';
