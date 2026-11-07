# ADR 0245 — Refonte « Nette » : typographie et accueil artisan

- Statut : accepté
- Date : 7 novembre 2026
- Refonte de l'interface, deuxième lot : l'utilisateur trouve l'application « pâlote » (police fine, gris clairs). Deux pistes ont été maquettées (A « Nette », B « Caractère ») ; il retient la piste A, couleurs inchangées.

## Décision
- **Typographie des espaces connectés** (pro, client, admin, exemples) : Inter pour les textes, Inter Tight pour les titres et les grands chiffres (`font-display`), chargées par next/font (`lib/fonts.ts`). Titres h1 en 700, h2 et h3 en 650, légèrement resserrés. Le site public garde Google Sans.
- **Gris plus foncés** : `netteColors` dans `@menao/ui-tokens` (textes secondaires `#4a5263`, libellés `#2b3242`, contraste AA vérifié par les tests) ; sur le site, la classe `.app-nette` redéfinit `muted-foreground` dans les espaces connectés seulement.
- **Menu latéral** : rubrique active pleine en bleu nuit, pastilles bleues en gras, titres de section lisibles.
- **Accueil artisan** : date et « Bonjour Prénom », « Vous avez N choses à faire », actions à droite (« Préparer un devis » en bleu, « Bloquer un créneau », « Partager ma fiche ») ; bandeau de l'argent en trois grands chiffres (encaissé ce mois avec son évolution, à venir, à recevoir) ; puis deux colonnes : « À faire maintenant » (nombre en pastille, action en bouton en grand écran) et chiffre d'affaires de l'année (avec clients en attente, taux de signature, devis signé moyen et temps de réponse dessous) ; à droite chantiers en cours, devis en attente, soldes, à venir, photo et grade. Sur téléphone, tout passe en une colonne, le bouton principal sur toute la largeur.
- « Inviter un artisan » quitte les actions de l'accueil, comme sur la maquette validée : le parrainage reste dans Mon profil.

## Conséquences
- Les autres écrans profitent tout de suite de la police, des titres et des gris ; on les reprend ensuite un par un avec les mêmes briques.
- L'application suit dans un lot à part (voir ci-dessous).

## Application (deuxième PR)
- **Polices** : `@expo-google-fonts/inter` et `@expo-google-fonts/inter-tight` (mêmes polices que le site, fichiers embarqués, aucun appel réseau). `theme.font` passe à Inter (400, 500, 600, 700) et gagne `display` (Inter Tight 700) ; les grands titres et grands montants (18 px et plus) l'utilisent. Google Sans reste installée pour les visuels des boutiques.
- **Couleurs** : `theme.colors` reprend `netteColors` (gris secondaires plus foncés, `label`).
- **En-tête des onglets** : la photo du profil, les messages (artisan) et la cloche restent en haut à droite, dans des ronds blancs bordés ; initiales sur fond bleu nuit. Sur l'accueil, la date et ces boutons occupent la première ligne et « Bonjour Prénom » passe dessous, sur toute la largeur.
- **Accueil** : « Vous avez N choses à faire », bandeau de l'argent (encaissé ce mois en grand, à venir et à recevoir côte à côte), « À faire maintenant » avec sa pastille, raccourcis, chantiers en cours, devis en attente (taux de signature, devis moyen, clients en attente et temps de réponse), chiffre d'affaires, soldes, prochains rendez-vous en liste, grade. Les raccourcis de l'application (dont « Inviter un artisan ») sont gardés.
