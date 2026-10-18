# ADR 0123 — Documents et fiche de l'artisan dans l'application

- Statut : accepté
- Date : 18 octobre 2026
- Complète les ADR 0113 (« Faire vérifier mon entreprise » dans l'application) et 0115 à 0122 (documents, relances).

## Contexte
- **Comparaison du site et de l'application** (18 octobre 2026) : l'inscription jusqu'à l'envoi du dossier se faisait déjà entièrement dans l'application. Plusieurs manques mettaient pourtant l'artisan en difficulté :
  - un artisan validé ne pouvait renouveler que l'attestation URSSAF. La relance d'échéance, touchée dans l'application, ne menait nulle part, avec un risque de suspension ;
  - les documents ne s'envoyaient qu'en photo, alors que la plupart des attestations arrivent en PDF par e-mail ;
  - la photo et la présentation n'étaient modifiables que pendant l'inscription.
- **Décision de l'utilisateur** (18 octobre 2026) : corriger ces trois points avant la prochaine build TestFlight.

## Décision
- **« Mes documents »** (`/pro-documents`), comme la page des documents du site :
  - l'état de chaque document obligatoire : vérifié avec sa date de fin, à renouveler, urgent, expiré, nouveau document envoyé, refusé avec son motif, non soumis ;
  - l'accès au dépôt avec les mêmes règles que le site : tout se dépose pendant l'inscription ; un artisan validé ou suspendu renouvelle les documents surveillés, mais pas le Kbis (`documentRows`, testé).
- **Documents en PDF** : sur l'écran d'un document, « Choisir un fichier (PDF) » ouvre les fichiers du téléphone (iCloud Drive, Fichiers, pièces jointes enregistrées). Le PDF est envoyé tel quel et vérifié d'après son contenu par `process-upload`, comme sur le site. Une photo choisie de cette façon est réduite comme les autres.
  - **Nouvelle dépendance** : `expo-document-picker`. C'est un module officiel d'Expo, inclus dans Expo Go et léger. Pas d'autre moyen de choisir un fichier sur iOS.
- **Tableau de bord de l'artisan** :
  - alerte « Pensez à renouveler : … » avec un bouton « Renouveler », d'après la même règle que le site (`documentsToRenew`, déplacée dans `packages/core` et testée) ;
  - raccourcis « Mes documents » et « Ma photo et ma présentation ».
- **Liens** : les adresses du site `/pro/onboarding/documents` (relances) et `/pro/onboarding/profil` (conseils de la fiche) ouvrent désormais ces écrans dans l'application. Les notifications et les push mènent donc au bon endroit.

## Conséquences
- **Tests** :
  - `packages/core` (`documentsToRenew`) ;
  - application : `documentRows`, correspondance des liens.
- **Déploiement** : rien côté serveur, mais une nouvelle build de l'application est nécessaire (nouveau module natif). Expo Go l'inclut déjà.
- **Restent sur le site seulement** :
  - les paiements (Stripe) et l'état de visibilité ;
  - les photos de réalisations ;
  - la modification des métiers, de la zone et de l'entreprise ;
  - les certifications et le RGE ;
  - le logo ;
  - l'abonnement, volontairement (règles d'Apple).
