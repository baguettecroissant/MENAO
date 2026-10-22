-- Réseau du parrain (lot 6 du plan V1.1, ADR 0161) : proposition de parrainer un confrère, dans
-- sa propre migration (une valeur d'enum ne s'utilise pas dans la transaction qui l'ajoute).
alter type public.notification_type add value 'parrainage_suggestion';
