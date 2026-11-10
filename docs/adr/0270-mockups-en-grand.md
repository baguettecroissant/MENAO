# ADR 0270 — Mockups en grand : vrais écrans à jour et parcours en cartes (lot 24)

- Statut : accepté
- Date : 10 novembre 2026
- Suite de l'ADR 0147 (mockups du site), de l'ADR 0265 (Espace Pro repensé) et du plan « mockups, images, vidéo » du 10 novembre. Lot 24 maquetté et validé le 10 novembre.

## Contexte
Les écrans montrés sur le site dataient d'avant la refonte de l'interface, et le bandeau de l'Espace Pro les affichait trop petits pour être lus (ordinateur et téléphone côte à côte).

## Décision
- **Écrans recapturés** depuis l'application et l'espace pro actuels (mêmes personnes et données fictives), aux mêmes noms et dimensions. Ajout de `pro-demandes.webp`.
- **Bandeau de `/pro`** (`HeroFlow`) : le vrai accueil de l'application dans un grand téléphone, et le parcours en trois cartes d'exemple (nouvelle demande, devis signé en ligne, acompte reçu). Très grand écran : cartes à côté du téléphone ; en dessous : deux cartes sur le téléphone, coupé en bas sur mobile. L'ordinateur quitte le bandeau.
- **Section « Tout-en-un » de `/pro`** : sous le titre existant, le tableau de bord dans une fenêtre de navigateur dessinée en code (`BrowserMockup`) et l'écran « Demandes » dans un téléphone, au-dessus des cartes existantes.
- **Accueil, « Comment ça marche »** (`ScreenSteps`) : sur ordinateur, les quatre téléphones montrent l'écran entier, décalés une colonne sur deux ; l'étape 2 montre la sélection des artisans. Le carrousel mobile ne change pas.
- Aucun titre ni texte de page modifié. Les cartes du parcours reprennent les valeurs des écrans de démonstration et sont masquées aux lecteurs d'écran (le téléphone porte la description).
- `LaptopMockup` et `AppNotification` sont retirés (plus utilisés).

## Conséquences
- La chaîne de capture reste hors Git (`medias/mockups-site`). La page locale qui sert l'écran web doit suivre le vrai tableau de bord : la comparer au site avant toute nouvelle capture.
- La section du parcours de l'accueil grandit d'environ 250 px sur ordinateur.
