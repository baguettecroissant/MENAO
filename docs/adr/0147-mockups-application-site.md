# ADR 0147 — Mockups de l'application sur le site vitrine

- Statut : accepté, modifié par l'ADR 0148 (bandeau de l'accueil, mentions retirées)
- Date : 19 octobre 2026
- Lot 1 de l'audit du site vitrine du 19 octobre 2026 (mockups et produit à l'écran).

## Contexte
- **Constat de l'audit** : l'application n'apparaissait nulle part sur le site, sauf sur l'affiche de la vidéo de la page Pro.
  - Les étapes du parcours étaient du texte seul.
  - « Comment ça marche » répétait les mêmes fragments d'interface que l'accueil.
  - La page Pro montrait une carte vide (« Votre prénom »).
  - L'accueil affichait « 11 artisans pro », un petit nombre qui fragilise l'image du réseau.
- **Demande de l'utilisateur** : des mockups de l'app native et web, avec des données fictives qui paraissent réelles. La marque s'écrit **MENAO** en majuscules.

## Décision
- **Vrais écrans, données fictives** :
  - **Écrans de l'application** : version web d'Expo, comptes et données de démonstration servis à la place de Supabase. C'est la méthode des films et des visuels des stores (ADR 0097), avec le même monde fictif : Camille, Julien Ferrand (JF Plomberie, Nice), une salle de bain à 4 854,30 € TTC et un acompte de 1 456,29 €.
  - **Écran web** : une page d'aperçu locale du tableau de bord artisan.
  - **Personnes** : les visages sont des recadrages des photos générées par IA du site, donc des personnes fictives. Les photos de chantier viennent de Pexels, sans personne identifiable.
  - **Mention à côté de chaque mockup** : « Écrans réels de l'application MENAO · personnes et données fictives ». Aucun avis client inventé.
- **Images** :
  - 9 écrans de téléphone en WebP de 780 × 1 526 (deux fois 390 × 763 points) et un écran d'ordinateur en WebP de 1 600 × 1 000, dans `apps/web/public/images/app`, environ 650 Ko au total ;
  - chargement différé, sauf dans le haut des pages ;
  - aucune optimisation Vercel (règle 13).
- **Cadres dessinés en code** (`components/site/device-mockups.tsx`), sans image ni dépendance :
  - `PhoneMockup` : cadre de 3 %, Dynamic Island, barre d'état en SVG (9:41, réseau, batterie) et indicateur d'accueil. L'écran garde exactement le format capturé. La couleur du haut et du bas de chaque écran prolonge la barre d'état et le bas du téléphone (`lib/site/app-screens.ts`) ;
  - `LaptopMockup` : écran et socle ;
  - `AppNotification` : notification de l'application, valeurs d'exemple.
- **Emplacements** :
  - **Accueil, bandeau** : un téléphone (sélection de deux artisans vérifiés, avec leur photo) sort du bas du bandeau, sous les visages de la photo, avec la notification « Demande acceptée ». Il remplace le badge « 11 artisans pro », qui disparaît avec son appel à la base. Grand écran seulement.
  - **Accueil, 4 étapes** : un écran par étape (`ScreenSteps`) : description, fiche artisan, devis, suivi. Carrousel horizontal sur mobile.
  - **« Comment ça marche », 6 étapes** : un écran par étape (description, choix, rendez-vous, devis, acompte, avis). Les trois fragments d'interface devenus inutiles sont supprimés.
  - **Page Pro, bandeau** : ordinateur (tableau de bord web), téléphone (accueil artisan « À faire maintenant ») et notification « Acompte reçu ».
  - **Page Pro, « Votre réputation »** : la fiche d'un artisan telle que la voient les particuliers, marquée « Exemple de fiche », à la place de la carte vide.
  - Le téléphone sort toujours du bas de son encart : seul le haut de l'écran compte, et les encarts restent compacts.
- **Régénérer les écrans** : les outils sont hors Git (`medias/mockups-site/outils/`), comme ceux des films.
  1. Lancer l'application en version web (port 8081), puis `node captures-client.mjs ../captures` et `node captures-pro.mjs ../captures`.
  2. Pour l'écran web : le site sur le port 3000 et l'aperçu local `apercu-mockups`, puis `node capture-web.mjs`.
  3. Recadrer et exporter en WebP, avec les marges indiquées dans `app-screens.ts`.
  - À refaire quand l'interface de l'application change de façon visible.
- **Marque** : « MENAO » en majuscules dans tous les textes du site et de l'application, le logo restant en minuscules. La charte qualité (V5) et l'engagement de l'artisan (B1) sont des documents signés et versionnés : leur texte n'est pas modifié. Il le sera à leur prochaine version.

## Conséquences
- **Le produit se voit dès le haut des pages**, et les étapes se lisent par l'image.
- **Les écrans peuvent vieillir** : à régénérer après les changements visibles de l'application.
- **Lots suivants de l'audit** : page d'attente avec inscription, allègement des textes, humain et local (avec les images à fournir), contenus.
- **Pas de nouvelle dépendance.**
