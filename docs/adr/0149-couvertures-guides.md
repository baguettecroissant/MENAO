# ADR 0149 — Couvertures des guides

- Statut : accepté
- Date : 19 octobre 2026
- Lot 4 de l'audit du site vitrine du 19 octobre 2026, réduit par l'utilisateur aux couvertures des guides et aux montages d'écrans. Les scènes du parcours (B1 à B8) ne sont pas placées sur le site pour l'instant.

## Contexte
- **Constat de l'audit** : la rubrique Guides n'avait aucune image. Les cartes et les articles étaient du texte seul.
- **Photos fournies par l'utilisateur** : une série générée par IA le 19 octobre 2026, avec des personnes fictives. Elle comprend cinq couvertures de guides (D1 à D5) et huit scènes du parcours (B1 à B8). L'écran de l'ordinateur de D5 et ceux des téléphones de B4 et B8 sont noirs à la génération.

## Décision
- **Couvertures** :
  - une photo par guide, dans `apps/web/public/images/guides/<slug>.webp` : 1 536 × 1 024, avec des versions de 960 et 640 px au même cadrage. WebP précompressés, aucune optimisation Vercel (règle 13) ;
  - le type `Guide` reçoit `cover` (texte alternatif et cadrage), et `lib/site/images.ts` centralise les chemins (`guideCover`, `guideShareImage`). Un guide sans couverture garde l'affichage actuel.
- **Emplacements** :
  - **page Guides** : la photo en haut de chaque carte, recadrée en 16:9 selon le cadrage du guide. Chargement différé ; texte alternatif vide, car le titre de la carte suffit ;
  - **article** : la photo entière (3:2), à droite du titre sur grand écran et sous le titre sur mobile. Elle est chargée en priorité, avec un texte alternatif. Les textes de l'en-tête ne changent pas.
- **Image de partage** : chaque guide a la sienne, `public/images/og/guides/<slug>.jpg` (1 200 × 630, recadrage de la couverture), pour Open Graph, X et l'image de l'`Article` en données structurées. Elle remplace l'image générique de MENAO.
- **Montage de D5** : l'écran noir du portable montre le vrai écran Factures de l'espace pro, avec les données fictives des films et des mockups (ADR 0147). Il est incrusté en perspective par `medias/mockups-site/outils/incruster.py`, hors Git :
  - repérage de la dalle noire et de ses quatre bords ;
  - capture de l'aperçu local (`node capture-web.mjs <sortie> factures`) ;
  - les doigts qui passent devant l'écran restent au premier plan.
- **B4 (devis à signer) et B8 (accueil de l'artisan)** : montés avec la même méthode, mais gardés hors du dépôt (`medias/mockups-site/composites/`) jusqu'à ce que l'utilisateur décide de leur emplacement.
- **Provenance** : série documentée dans `docs/images/photos-generees.md` (fichiers, poids, prompts exacts, montage). Les personnes ne sont présentées ni comme l'équipe, ni comme des artisans inscrits, ni comme des clients.

## Conséquences
- **La rubrique Guides devient visuelle** : une photo par guide, et un aperçu illustré quand un guide est partagé.
- **Poids** : environ 1,2 Mo de WebP et 0,6 Mo de JPEG dans le dépôt. Selon sa largeur d'affichage, une carte charge 32 à 84 Ko et un article 32 à 160 Ko.
- **Un nouveau guide** peut avoir une couverture : déposer les trois WebP et l'image de partage, puis renseigner `cover`. Le test e2e des guides vérifie que les fichiers existent.
- **D5 vieillit avec l'écran Factures** : refaire le montage si l'écran change de façon visible.
- **Pas de nouvelle dépendance.**
