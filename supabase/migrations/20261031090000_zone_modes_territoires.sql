-- Nouveaux modes de zone (F-68, ADR 0213), à part : une valeur d'enum ajoutée ne peut servir qu'une
-- fois sa migration validée.
alter type public.zone_mode add value 'departements';
alter type public.zone_mode add value 'regions';
alter type public.zone_mode add value 'france';
