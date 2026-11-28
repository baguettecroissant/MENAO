-- F-197 (ADR 0397) : relevé mensuel des primes du conseiller, prêt le 25. Valeur d'enum ajoutée
-- dans sa propre migration.
alter type public.notification_type add value if not exists 'conseiller_releve';
