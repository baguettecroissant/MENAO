# ADR 0122 — Relance à J-15 avant l'expiration d'un document

- Statut : accepté
- Date : 18 octobre 2026
- Complète les ADR 0037 (relances et suspension) et 0115 (attestation URSSAF).

## Contexte
- **Cahier des charges du CEO** : « Rappels à l'artisan : J-30, J-15 et J-7 avant l'expiration de chaque document (e-mail + notification + SMS à J-7). »
- **Jusqu'ici** : relances à J-30 et J-7, par e-mail, notification dans l'espace et push.
- **Décision de l'utilisateur** (18 octobre 2026) : ajouter J-15. Le SMS à J-7 reste écarté pour son coût.

## Décision
- **Trois seuils** : 30, 15 et 7 jours (`EXPIRY_REMINDER_DAYS`, `reminderThreshold` dans `packages/core` ; miroir dans `app.remind_expiring_documents`).
- **Une seule relance par seuil**, comme avant (`renewal_reminder_days`). Un document découvert tard reçoit seulement la relance du seuil le plus proche.
- **Documents concernés, inchangés** : décennale, RC Pro, pièce d'identité, attestation URSSAF.
- **Copie à l'équipe**, à chaque seuil, pour les documents dont l'expiration suspend l'artisan. L'e-mail s'intitule désormais « Document à renouveler », plus « Assurance à renouveler », puisqu'il couvre aussi l'attestation URSSAF.
- **Ton de l'e-mail** : J-15 envoie le même e-mail que J-30. Le ton « urgent » reste réservé aux 7 derniers jours.

## Conséquences
- **Tests** :
  - `packages/core` : seuils ;
  - pgTAP 66 : J-30, J-15, J-7, une relance par seuil, copies à l'équipe ;
  - e-mails.
- **Déploiement** : appliquer la migration et redéployer `notify` (titre de l'e-mail à l'équipe).
- **Pas fait** : le SMS à J-7, qui demanderait l'envoi de SMS par Brevo, payant.
