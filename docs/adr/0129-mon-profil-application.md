# ADR 0129 — « Mon profil » de l'artisan dans l'application (lot 2 de la refonte)

- Statut : accepté
- Date : 18 octobre 2026
- Suit l'ADR 0128 (lot 1, fluidité). Complète les ADR 0123 à 0125 (écrans de l'artisan dans l'application).

## Contexte
- **La photo de l'en-tête ouvrait un « Mon compte » générique**, le même que pour un particulier : identifiants, données, déconnexion. Rien sur l'entreprise, la fiche, les documents ni les paiements.
- **Tout cela était éparpillé** dans les raccourcis de l'accueil, sous des noms différents d'un endroit à l'autre.
- **Demande de l'utilisateur** : retrouver tout l'essentiel du profil, du compte et de la fiche derrière la photo.

## Décision
- **Pour l'artisan, la photo ouvre « Mon profil »** (`/compte`, `ProfileHubScreen`). Le particulier garde « Mon compte ».
- **En-tête** :
  - photo changée d'un toucher (même envoi que « Photo et présentation ») ;
  - nom, entreprise et ville ;
  - badges « Assuré et vérifié », état du dossier tant qu'il n'est pas validé, Score MENAO et nombre d'avis.
- **Jauge « Fiche complète à X % »** (`profileStrength`, `@menao/core`, testée), avec le conseil le plus utile à suivre ; un toucher mène à l'écran concerné.
  - Poids, dans l'ordre des conseils existants : badge « Assuré et vérifié » 25, photo de profil 20, réalisations 20 (au prorata jusqu'à 3 photos), présentation 15 (au prorata jusqu'à 300 caractères), spécialités 10, certification ou RGE 10.
  - Arrondi à l'inférieur : 100 % seulement pour une fiche complète.
- **Dossier en brouillon ou refusé** : bandeau « Faire vérifier mon entreprise » avec le nombre d'étapes restantes. Dossier en vérification : simple information.
- **« Voir ma fiche »** (`/pro-ma-fiche`) : la fiche exactement comme les particuliers la voient (même vue que leur recherche), avec « Modifier ma fiche ».
- **Rubriques groupées**, chacune avec son état à droite (`hubStatuses`, testé) :
  - Ma fiche : photo et présentation, réalisations, avis clients, grade ;
  - Mon entreprise : entreprise et SIRET, métiers et certifications, zone, disponibilités ;
  - Conformité : documents, charte qualité ;
  - Argent : paiements, factures ;
  - Mon compte : identité et connexion, notifications, aide et contact.
- **Documents d'un artisan validé** : seules les échéances surveillées comptent (relances J-30, J-15, J-7). La règle « Kbis de moins de 3 mois » ne vaut que pour l'envoi du dossier.
- **« Identité et connexion »** (`/compte-reglages`) reprend l'ancien « Mon compte » : informations, e-mail, mot de passe, communications, données, suppression, déconnexions. La carte « Mon grade » y est retirée, puisqu'elle est désormais dans « Mon profil ».
- **« Aide et contact »** (`/aide`) : questions fréquentes dépliables, écrites dans l'application, et contact par e-mail.
  - Aucun lien vers le site, aucune mention d'abonnement (CLAUDE.md règle 10, choix de l'utilisateur).
  - Les réponses reprennent des faits déjà affichés ailleurs (paiement direct par Stripe, relances des échéances).
- **Animations riches** (choix de l'utilisateur) : blocs qui apparaissent en cascade, jauge qui se remplit, retour au toucher. Toutes désactivées avec « Réduire les animations ».

## Conséquences
- Chaque rubrique de l'artisan est à deux touchers au plus de n'importe quel onglet, et son état se lit d'un coup d'œil.
- Les raccourcis « profil » de l'accueil font doublon : ils seront retirés au lot 3 (accueil « À faire maintenant »).
- Le site recevra la même organisation au lot 4.
