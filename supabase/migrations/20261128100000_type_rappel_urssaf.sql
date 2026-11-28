-- F-194 (ADR 0394) : rappel de l'attestation de vigilance Urssaf des conseillers, à renouveler tous
-- les 6 mois (contrat d'agent commercial). Valeur d'enum ajoutée dans sa propre migration.
alter type public.notification_type add value if not exists 'conseiller_urssaf';
