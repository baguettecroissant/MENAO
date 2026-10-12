-- F-56 (lot 4b, ADR 0050) : alertes de l'équipe MENAO (nouveau ticket, dossier artisan à
-- vérifier, ticket en retard). Valeurs d'enum ajoutées dans leur propre migration.
alter type public.notification_type add value 'equipe_nouveau_ticket';
alter type public.notification_type add value 'equipe_dossier_a_verifier';
alter type public.notification_type add value 'equipe_ticket_en_retard';
