-- Agents IA des formules, lot 1 (F-82, ADR 0231) : alertes de minutes de voix de l'artisan, dans
-- leur propre migration (une valeur d'enum ne sert pas dans la transaction qui la crée).
alter type public.notification_type add value 'agents_minutes_80';
alter type public.notification_type add value 'agents_minutes_epuisees';
