# ADR 0357 — Un logo se reconnaît à son nom de fichier, et n'est plus rogné en rond (F-165)

- Date : 17/11/2026
- Fonctionnalité : F-165. Complète l'ADR 0355 (une seule image, logo ou photo) et l'ADR 0356.

## Contexte

Depuis l'ADR 0355, l'image de la fiche peut être un logo. La fiche publique le montre en entier
grâce à `artisans.image_logo`, mais partout ailleurs (résultats, messages, chantiers, menus), seul
le chemin de l'image arrive à l'écran, par une trentaine de requêtes et de fonctions : le logo y
était rogné en rond. Ajouter `image_logo` à chacune aurait demandé autant de migrations.

## Décision

- Le fichier d'un logo utilisé comme image de la fiche porte le préfixe `logo-`
  (`logoImageName`, `packages/core/src/avatar.ts`), posé par `process-upload` (usage `image_logo`).
- `isLogoImagePath` reconnaît un logo à son chemin ou à son adresse publique. Les composants
  d'image le montrent alors en entier sur fond blanc, avec assez de marge pour tenir dans un rond :
  `ArtisanPhoto` sur le site (le seul composant qui affiche l'image d'un artisan), `Avatar`,
  `ArtisanAvatar` et `AvatarImage` dans l'application.
- `artisans.image_logo` reste la référence pour l'écran « Votre image » et la fiche publique.
- Lignes facultatives du dossier : « Ajouter » à la place de la pastille « Facultatif », déjà dite
  en tête du bloc.

## Conséquences

- Aucune migration. Un logo déposé avant cette version n'a pas le préfixe : il reste rogné dans
  les petits ronds tant qu'il n'est pas redéposé.
- Le préfixe est une convention de nommage : un fichier nommé autrement n'est jamais pris pour un
  logo, et une photo n'est jamais nommée ainsi (`process-upload` choisit les noms).
