# ADR 0132 — Espace client aligné sur la refonte (« Mon compte », finitions, « À faire » sur le site)

- Statut : accepté
- Date : 18 octobre 2026
- Suit les ADR 0128 à 0131 (refonte de l'espace artisan). Complète l'ADR 0082 (accueil du client).

## Contexte
- **Audit de l'espace client** après la refonte artisan, à la demande de l'utilisateur.
- **Déjà en place** :
  - la fluidité du lot 1 (ADR 0128), partagée par toute l'application ;
  - l'accueil client de l'application, qui a déjà sa liste « À faire » (`clientTodos`) ;
  - une barre d'onglets client cohérente.
- **Ce qui manquait** :
  1. « Mon compte » dans l'application restait une pile de dix cartes, le même écran que « Identité et connexion » de l'artisan ;
  2. quelques restes : un rond de chargement sur l'accueil connecté, des pastilles sans retour au toucher, des « enregistré » affichés dans la carte ;
  3. le site n'avait pas, sur l'accueil client, la liste « À faire » de l'application.

## Décision
- **« Mon compte » organisé en sections** (application), avec des composants partagés `SettingsSection`, `SettingsRow` et `SettingsSwitch`. « Mon profil » de l'artisan les utilise aussi, sans changement visible.
  - En-tête : photo ou initiales, nom, e-mail, type de compte.
  - Mon compte : informations, e-mail (« Changement en attente » le cas échéant), mot de passe, notifications, et les actualités MENAO en interrupteur.
  - Aide : questions fréquentes et contact, pour les particuliers seulement. Toujours aucun lien vers le site pour les artisans (CLAUDE.md règle 10).
  - Données et sécurité : télécharger mes données, déconnecter tous mes appareils, supprimer mon compte (en rouge, avec la date de la demande en attente).
  - Informations légales, puis « Me déconnecter ».
- **Finitions** :
  - blocs gris sur l'accueil client connecté et retour au toucher sur ses pastilles ;
  - confirmations en bas de l'écran pour les enregistrements ponctuels : informations, mot de passe, préférences d'e-mail, présentation, absences, photo de signalement.
  - Les états durables (« Devis signé le… », « Demande envoyée ») restent affichés dans l'écran.
- **Site, accueil client** : liste « À faire maintenant » en tête de « Mes chantiers », calculée par la même règle que l'application (`clientTodos`, avec les avis déjà laissés et les levées de réserves signalées).
  - Le montant est affiché pour un devis à signer, un acompte ou un solde.
  - Chaque ligne mène à la page concernée : devis, acompte, solde, réception, avis ou chantier.
  - « Tout est à jour » quand des chantiers sont en cours sans rien à faire de son côté.
  - Vérifiée dans le test de bout en bout du parcours complet.

## Conséquences
- Clients et artisans retrouvent la même organisation de leur compte, sur le site comme dans l'application.
- L'accueil client du site et celui de l'application affichent les mêmes actions, dans le même ordre.
