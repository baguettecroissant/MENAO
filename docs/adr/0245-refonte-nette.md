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
- L'application suit dans un lot à part : même police, mêmes gris, accueil sur le même modèle, en gardant en haut la photo du profil, les messages et les notifications.
