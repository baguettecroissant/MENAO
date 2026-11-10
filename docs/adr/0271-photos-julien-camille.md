# ADR 0271 — Photos de Julien et de Camille dans le site (lot 25)

- Statut : accepté
- Date : 10 novembre 2026
- Suite des ADR 0147 (mockups), 0149 (images générées des guides) et 0270 (mockups en grand). Lot 3 du plan « mockups, images, vidéo », maquetté et validé le 10 novembre.

## Contexte
Le site montrait le produit, mais presque aucun humain. L'audit du site vitrine demandait de l'incarner, sans faux témoignage.

## Décision
- **Deux personnages fictifs récurrents**, générés par IA : Julien, artisan plombier (le visage déjà utilisé comme photo de profil dans les écrans de démonstration), et Camille, cliente. Neuf scènes racontent le même chantier que les écrans : une salle de bain ancienne devient une douche à l'italienne.
- **Vrais écrans** : les téléphones étaient générés avec un écran noir ; les captures réelles de l'application y sont incrustées. Aucune interface n'est générée.
- **Emplacements**, sans titre ni texte nouveau :
  - `/pro` : section « Assistants IA » (Julien dans sa camionnette, les deux cartes d'exemple par-dessus), section « Votre réputation… » (réception du chantier, avec la fiche d'exemple), appel final (portrait, option `portrait` de `ProFinalCta`, sur `/pro` seulement).
  - `/comment-ca-marche` : une photo par étape du parcours du particulier, à la place du téléphone seul.
  - Accueil : bande de l'application (`AppBand`) et appel final (option `photo` de `CtaBand`, sur l'accueil seulement).
- **Composant `ScenePhoto`** : WebP précompressés en 1 600, 960 et 640 px dans `public/images/scenes`, `srcset` et `sizes`, sans optimisation Vercel. Textes alternatifs dans `fr.site.scenes`.
- **Provenance documentée** dans `docs/images/photos-generees.md` : outil, modèle, date et prompt exact de chaque image.

## Conséquences
- Ces personnes ne sont jamais présentées comme un artisan inscrit, une cliente ou un témoignage. Les vrais visages (fondateurs, artisans pilotes) restent à photographier.
- Sur mobile, la photo passe au-dessus du texte dans les bandes et les appels finaux.
- TODO(legal) : vérifier si le règlement européen sur l'IA impose de signaler à l'écran les images générées représentant des personnes fictives ; aucune mention n'est affichée aujourd'hui, comme pour les photos d'octobre.
