# ADR 0378 — Pièce d'identité selon son type, transmise à Stripe

- Statut : accepté (essai de l'utilisateur du 19/11/2026, maquette du lot 75 validée)
- Fonctionnalité : F-181

## Contexte

Pendant un essai complet de l'inscription sur téléphone, deux frottements sont apparus :

- l'étape « Pièce d'identité » n'acceptait qu'un fichier, alors qu'une carte d'identité a deux
  côtés (la date de validité est souvent au verso) ;
- Stripe redemandait ensuite la même pièce pour ouvrir le compte de paiement.

## Décision

- L'artisan choisit sa pièce : carte d'identité, passeport ou titre de séjour. Une carte ou un
  titre de séjour se dépose recto et verso, un passeport en une page (`identitySides`). Le bouton
  d'envoi ne s'allume que lorsque tout est déposé.
- Chaque côté est lu dès son dépôt, comme avant (ADR 0176) ; les lectures sont réunies
  (`mergeIdentityReadings`). La date de naissance lue reste sur l'appareil (ADR 0375).
- `artisan_documents` reçoit quatre colonnes : `piece`, `verso_path`, `verso_mime_type`,
  `partage_stripe`. Pas de nouvelle table ni de nouvelle politique : les droits de la table
  s'appliquent (lecture par le propriétaire, un administrateur ou la vérification ; écriture par
  le serveur).
- `process-upload` reçoit un second fichier brut (`versoPath`), contrôlé et nettoyé comme le
  premier. Une application d'avant F-181 n'envoie ni type ni verso : son dépôt en un fichier reste
  accepté.
- À l'étape « Paiements », le navigateur de l'artisan envoie la pièce à Stripe avec la clé
  publique (fichiers `identity_document`), puis joint leurs identifiants au jeton du dirigeant ou
  de l'entrepreneur individuel (ADR 0204, ADR 0215). La pièce va de l'espace privé de MENAO à
  Stripe par des liens signés de deux minutes, sans autre intermédiaire.
- Seules les images partent : Stripe refuse le PDF pour une pièce d'identité. Un PDF reste valable
  pour MENAO ; Stripe demandera alors la pièce lui-même.
- L'artisan est informé au dépôt (« MENAO transmettra cette pièce à Stripe ») et peut refuser
  (`partage_stripe`).
- Avant le formulaire de MENAO, deux encarts : ce qui est transmis pour l'artisan, et ce que
  Stripe va lui demander, dont la protection du compte par SMS.

## Ce qui a été vérifié, et ce qui ne l'est pas

- Essai en mode test du 19/11/2026 : Stripe accepte un fichier déposé avec la clé publique et le
  garde dans le jeton d'un compte du même type que les nôtres (tableau de bord complet, Stripe
  collecte les informations).
- Non vérifié : que le formulaire Stripe ne redemande plus la pièce. À constater sur un parcours
  réel.

## Options écartées

- Retirer la connexion protégée de Stripe : possible seulement si MENAO porte les soldes négatifs
  des artisans (ADR 0011). On la garde, et on prévient l'artisan avant.
- Faire transiter la pièce par un serveur de MENAO vers Stripe : la clé secrète n'est pas
  nécessaire, et le navigateur suffit, comme pour les jetons.

## Suites

- `TODO(legal)` : phrase d'information et possibilité de refus à faire valider par l'avocat ; la
  politique de confidentialité mentionne la transmission.
- Application iPhone : même écran, dans une PR à part.
- Nom du titulaire : il n'est pas lu sur la pièce ; l'encadré montre la date de naissance et la
  fin de validité.
