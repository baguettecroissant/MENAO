# ADR 0055 — Application : accueil et mode visiteur (lot 6b, partie 1)

- Statut : accepté
- Date : 13 octobre 2026

## Contexte
- Au lot 6a, l'application s'ouvrait sur l'écran de connexion.
- Le porteur de projet veut qu'on puisse découvrir l'application et lancer une recherche sans compte, avec des invitations à créer son espace.
- La spécification va dans ce sens : le compte n'est demandé qu'à l'envoi de la demande (F-08, `REQUIRE_ACCOUNT_BEFORE_RESULTS = false`, ADR 0012).

## Décision
- **Plus d'écran de connexion au lancement.**
  - Visiteurs et particuliers partagent l'espace client : `appSpaceForRole` renvoie `client` pour l'un comme pour l'autre.
  - Les artisans et l'équipe gardent leur espace. S'ils se connectent depuis l'espace client, ils y sont renvoyés.
- **Onglets** : Accueil, Mes chantiers, Messages, Compte. Les notifications s'ouvrent depuis la cloche de l'accueil.
- **Accueil** :
  - champ de recherche ;
  - raccourcis par métier, lus dans le référentiel `trades` (lecture publique) ;
  - fonctionnement en 4 étapes et garanties, avec les textes du site, sans aucun chiffre ajouté.
- **Pour un visiteur** :
  - Mes chantiers, Messages et Notifications présentent ce qu'il y trouvera, avec « Créer mon compte » et « Me connecter » ;
  - l'onglet Compte présente l'espace MENAO, l'aide (questions fréquentes et contact, sur le site) et les documents légaux.
- **Artisans** : une carte « Vous êtes artisan ? » renvoie à la création de l'espace pro sur le site, mais sans lien (règle 10). Comme la mention de l'écran d'inscription (ADR 0054), elle reste à confirmer au regard des règles des stores **[À VALIDER]**.
- **Connexion et inscription** s'ouvrent par-dessus l'écran courant.
  - Une fois connecté, on revient à cet écran (`router.dismissAll`).
  - L'espace affiché suit alors le rôle du compte.
- **Session anonyme** de recherche (ADR 0012) : l'application la traite comme un visiteur (`is_anonymous`), comme le site.
- **Recherche, étape provisoire** : la saisie du projet ouvre la recherche du site dans l'application.
  - Elle utilise les mêmes paramètres que l'accueil du site : `/recherche?q=…&metier=…`.
  - La partie 2 la remplacera par la recherche native : analyse animée (`analyze-need`), critères, artisans, puis envoi de la demande avec création du compte (conversion de la session anonyme).
- **Barre d'onglets** : 58 points de haut, plus la marge du bas du téléphone. Dans la hauteur standard (49), les libellés en Google Sans étaient rognés.

## Conséquences
- Suite du lot 6b :
  - partie 2 : saisie et analyse native du projet, critères ;
  - partie 3 : artisans proposés, fiche artisan, envoi de la demande et création du compte.
- Tant que l'étape provisoire existe, la description du projet passe dans l'adresse de la page du site, comme depuis l'accueil du site. Cela disparaîtra avec la recherche native.
