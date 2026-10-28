# ADR 0202 — Cadrage de la photo de profil avant l'envoi

- Statut : accepté
- Date : 28 octobre 2026
- Complète les ADR 0124 (photos dans l'application) et 0125 (logo des documents).

## Contexte
- **Constat de l'utilisateur** (28 octobre 2026) : le logo de LAMARE TERRASSEMENT, mis en photo de profil, est coupé sur sa fiche et, pire, dans les bulles rondes (messages, site, application).
- **Cause** : l'image enregistrée était allongée (512 × 288). Toutes les bulles l'affichaient en « remplir » et coupaient les côtés. Dans l'application, le recadrage carré du système ne permet pas de garder un logo entier.
- **Choix de l'utilisateur** : cadrage à l'envoi, comme WhatsApp ou LinkedIn, plutôt qu'un champ logo séparé ou un affichage « entier » partout.

## Décision
- **Calcul partagé** (`packages/core/src/avatar-framing.ts`) :
  - zoom entre « image entière » (la diagonale de l'image tient dans le rond) et 4 × « remplir » ;
  - glissement borné ;
  - cadrage de départ : image entière pour une image allongée (rapport > 1,4), sinon rond rempli ;
  - couleur du bord pour le fond.
- **Site** (`AvatarFramer`, dans `UploadForm` quand `square`) :
  - fenêtre de cadrage : glisser, molette, curseur de zoom, « Image entière », « Remplir le rond » ;
  - le carré de 512 px est dessiné dans le navigateur, sur un fond de la couleur du bord de l'image ;
  - aperçu rond avant l'envoi, avec « Recadrer ».
- **Application** (`frameAvatar`, hôte unique à la racine) :
  - photo choisie sans le recadrage du système, puis écran de cadrage : un doigt glisse, deux doigts zooment, boutons − et +, « Image entière », « Remplir le rond », fond blanc ou noir ;
  - l'image enregistrée est une capture du carré (`react-native-view-shot`, 512 px, JPEG).
- **LAMARE TERRASSEMENT** : son image actuelle a été refaite en carré, logo entier, sur son fond noir.

## Conséquences
- **Nouvelle dépendance** `react-native-view-shot` : bibliothèque Expo maintenue, présente dans Expo Go. C'est le seul moyen simple d'ajouter un fond autour d'une image dans l'application : `expo-image-manipulator` ne sait le faire que sur le web.
- Le cadrage n'existe dans TestFlight qu'après un nouveau build (module natif).
- **Tests** : `packages/core` (cadrage).
