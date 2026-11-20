-- Rythme des conseillers (F-184, ADR 0381) : e-mail du lundi aux conseillers, dans sa propre
-- migration (une valeur d'enum ne sert pas dans la transaction qui la crée).
alter type public.notification_type add value 'conseiller_semaine';
