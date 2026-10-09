# ADR 0009 — Suivi des documents des artisans validés (F-51)

- Statut : accepté (plan validé le 9 octobre 2026)
- Date : 9 octobre 2026

## Décisions
1. **Échéances** : la décennale, la RC Pro et la pièce d'identité sont surveillées après validation (le Kbis n'a d'exigence de fraîcheur qu'à l'inscription). Alertes à J-30 et J-7 (spec F-41), règles dans `packages/core/src/expiry.ts`. Les certifications arrivant à échéance apparaissent aussi dans « À surveiller ».
2. **Renouvellement sans nouvelle vérification du dossier** : un artisan validé ou suspendu dépose le document à jour ; il coexiste avec le document validé en cours (index uniques partiels : un validé et un en cours d'examen par type). Quand l'admin valide le renouvellement, l'ancien passe au statut `remplace` (conservé pour l'historique).
3. **Suspension automatique** par une tâche `pg_cron` quotidienne (`menao-conformite-quotidienne`, 3 h 15 UTC, `app.daily_compliance()`) : décennale ou RC Pro expirée sans renouvellement validé → statut `suspendu`, motif `documents_expires`. **Réactivation automatique** dès qu'un renouvellement validé rétablit les deux assurances (à la validation ou au passage suivant de la tâche). Une suspension décidée par un admin (`decision_admin`) n'est jamais levée automatiquement. Tout est tracé dans `audit_logs` (acteur nul pour la tâche).
4. La pièce d'identité expirée déclenche une alerte, pas une suspension.

## Conséquences
- Relances par e-mail (J-30, J-7) à brancher avec Resend ; en attendant, bandeaux dans l'espace artisan et page « À surveiller ».
- La purge des fichiers bruts abandonnés dans `uploads` reste à faire (suppression via l'API Storage, donc Edge Function planifiée).
