# ADR 0374 — Parcours guidé de l'inscription dans l'application

- Statut : accepté (maquette du lot 72 validée le 18/11/2026, « fais pareil pour l'appli »)
- Fonctionnalité : F-178 (suite de l'ADR 0373)

## Contexte

L'ADR 0373 a transformé l'inscription de l'artisan sur le site en parcours guidé. L'application
gardait ses écrans d'avant : retour à « Mon dossier » après chaque étape, charte à 25 cases, écran
« Votre profil est créé » annonçant 5 minutes et sept lignes.

## Décision

Mêmes règles que le site, avec la même logique partagée (`guideSteps`, `nextGuideStep`,
`guideBlocks` de `packages/core`) :

1. **Étape suivante.** `openNextStep` (`apps/mobile/src/lib/dossier-guide.ts`) relit le dossier
   et remplace l'écran en cours par l'étape suivante qui reste à faire ; le retour mène donc à
   « Mon dossier ». Sans suite (fin du parcours, dossier déjà envoyé), l'écran revient en arrière.
2. **Document.** « Étape 2 sur 6 » et le temps restant en haut ; les champs n'apparaissent qu'une
   fois le document choisi ; en bas, « Déposer et continuer », ou « Passer pour l'instant » sans
   fichier (« Continuer » si une pièce est déjà déposée).
3. **Charte.** Neuf écrans, texte inchangé : le bouton du bas fait défiler (« Lire la suite »)
   puis accepte la partie. `Screen` reçoit pour cela un suivi du défilement facultatif (`scroll`).
   Nom, entreprise et SIRET connus sont récapitulés, « Modifier » rouvre les champs.
4. **« Mon dossier ».** Tant qu'il reste une étape, le bouton du bas est « Continuer : … » et
   ouvre la prochaine ; tout fait, l'écran s'intitule « Tout est prêt » et le bouton envoie.
5. **« Dossier envoyé »** (`/pro-dossier-envoye`) : les paiements, expliqués en une phrase, et
   l'espace d'exemples. **Rien sur la formule** : pas d'achat d'abonnement dans l'application
   (règle 10).
6. **« Votre profil est créé »** : environ 10 minutes, trois blocs avec leur durée, « Commencer »
   ouvre « Mon dossier » puis la première étape.

## Conséquences

- Le `TODO(legal)` de l'ADR 0373 (acceptation de la charte par partie) vaut aussi ici.
- Écrans vus dans l'aperçu web de l'application avec des données fictives temporaires ; un essai
  sur iPhone (Expo Go) reste à faire, notamment le défilement de la charte et le tracé.
- Aucune migration, aucune fonction à déployer ; un nouveau build de l'application est nécessaire.
