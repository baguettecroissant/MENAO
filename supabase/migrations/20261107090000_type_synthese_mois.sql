-- Agent comptable avancé, lot 5 des agents IA (F-87, ADR 0237) : synthèse du mois envoyée à
-- l'artisan le 1er, dans sa propre migration (une valeur d'enum ne sert pas dans la transaction
-- qui la crée).
alter type public.notification_type add value 'synthese_mois';
