-- F-196 (ADR 0396) : notifications des moments forts des conseillers (prime, relance, fin d'essai,
-- lien préparé pas ouvert). Valeurs d'enum ajoutées dans leur propre migration.
alter type public.notification_type add value if not exists 'conseiller_prime';
alter type public.notification_type add value if not exists 'conseiller_relance';
alter type public.notification_type add value if not exists 'conseiller_fin_essai';
alter type public.notification_type add value if not exists 'conseiller_lien';
