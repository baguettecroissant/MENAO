# ADR 0371 — Session renouvelée après la validation, double clic sans saut d'étape

- Statut : accepté (essai réel du 18/11/2026)
- Fonctionnalité : F-14

## Contexte

Essai de bout en bout sur menao.fr avec un vrai compte :

1. Dossier validé, abonnement et paiements actifs, tout au vert : « Mon tableau de bord » renvoyait
   vers l'inscription. La validation passe le rôle à « artisan » dans `app_metadata`, mais le jeton
   de session déjà émis garde « artisan_en_attente » jusqu'à son renouvellement (une heure au plus),
   et `requireProSpace` lit le rôle dans ce jeton.
2. À l'inscription, l'étape « Zone » était parfois sautée. La zone part du siège choisi à l'étape
   « Entreprise », elle est donc déjà remplie, et le bouton « Continuer » est au même endroit sur
   les deux écrans : un double clic (ou double toucher) validait les deux.

## Décision

1. `sessionRoleOutdated(role, statut)` (cœur) : jeton « en attente » alors que le dossier est
   validé, suspendu ou radié. `requireProSpace` lit alors le statut en base et envoie vers
   `/auth/rafraichir`, un gestionnaire de route qui renouvelle la session (il peut écrire les
   cookies) puis ouvre le tableau de bord. Si le rôle n'a pas changé, retour au dossier : pas de
   boucle.
2. Après un changement d'écran, le parcours d'inscription ignore les clics pendant 600 ms
   (`pointer-events: none` sur l'écran) : le second clic d'un double clic tombe dans le vide. Un
   simple délai sur « Continuer » bloquait aussi les clics rapprochés des tests automatisés, qui,
   eux, attendent que l'élément accepte les clics.

## Conséquences

- Plus besoin de se déconnecter ou d'attendre une heure après la validation.
- Un clic volontaire dans les 600 ms qui suivent un changement d'écran est ignoré : il suffit de
  recliquer.
