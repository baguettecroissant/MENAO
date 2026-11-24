-- F-188 (ADR 0389) : alerte de l'équipe à chaque nouvelle candidature de commercial.
-- Valeur d'enum ajoutée dans sa propre migration.
alter type public.notification_type add value if not exists 'equipe_nouvelle_candidature';
