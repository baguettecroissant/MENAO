# ADR 0211 — Espace commercial sur l'écran d'accueil du téléphone

- Statut : accepté
- Date : 30 octobre 2026
- Complète l'ADR 0205 (espace commercial sur le site).

## Contexte
- Dans l'application native, un commercial ne trouve qu'un bouton qui ouvre son espace sur le site, dans une fenêtre qui ne reprend pas la connexion de l'application.
- Trois options présentées à l'utilisateur le 30 octobre 2026 : icône sur l'écran d'accueil, passage de la session de l'application au site, ou espace commercial natif. Choix de l'utilisateur : **l'icône sur l'écran d'accueil** (« ok lance l'option 1 »). L'espace natif ne sera envisagé qu'après les tournées de janvier, si le terrain le demande.

## Décision
- **Manifeste propre à l'espace** (`/commercial.webmanifest`, statique) : ouverture sur `/commercial`, affichage plein écran (`standalone`), portée `/` pour que la connexion, la page d'attente et la démo restent dans la même fenêtre. Le reste du site garde son manifeste (affichage « navigateur »).
- **iPhone** : métadonnées `apple-mobile-web-app` posées par la mise en page de l'espace ; icône `apple-icon.png` du site.
- **Pré-lancement** : le manifeste est servi sans le cookie des testeurs (le téléphone le lit sans cookie).
- **Guide** : rubrique « Mettre MENAO sur mon téléphone » (iPhone et Android).

## Conséquences
- Aucun passage par l'App Store, aucune vérification d'Apple : une correction du site arrive tout de suite chez les commerciaux.
- L'icône a sa propre connexion et son propre cookie des testeurs (à ressaisir au bout de 30 jours tant que la page d'attente existe).
- Des rappels par notification restent possibles plus tard sans application native (notifications web d'un site ajouté à l'écran d'accueil).
