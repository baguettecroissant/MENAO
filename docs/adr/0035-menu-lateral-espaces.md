# ADR 0035 — Menu latéral des espaces client, pro et admin

- Statut : accepté
- Date : 11 octobre 2026
- Complète l'ADR 0034 (coques séparées).

## Contexte
- Le porteur du projet souhaite, sur ordinateur, une navigation par menu latéral pour les trois espaces connectés, sur le modèle des applications métier du secteur. Il demande aussi une ergonomie plus lisible et plus logique.
- Avant ce changement, chaque espace avait son propre en-tête horizontal :
  - client : champ de recherche, messages, cloche et menu du compte ;
  - pro : liens dans l'en-tête, photo vers « Mon dossier », déconnexion ;
  - admin : simple ligne de liens.
- « Mon dossier » d'un artisan validé quittait l'espace pro : il s'ouvrait dans la coque d'inscription.
- Pendant le test réel du 11 octobre 2026, un artisan validé n'apparaissait pas dans les recherches : son compte de paiement n'était pas finalisé, et l'information passait inaperçue.

## Décision
- **Une coque commune `AppShell`** (`components/app-shell`) pour les trois espaces. Les rubriques de chaque espace sont décrites dans `nav-config.ts`.
- **Ordinateur** :
  - **menu latéral fixe** : logo et nom de l'espace, rubriques groupées avec icônes, aide, puis carte du compte avec la déconnexion ;
  - **menu repliable** en barre d'icônes. Le choix est mémorisé dans le cookie `menao_menu` et lu côté serveur, pour un premier affichage sans saut ;
  - **barre du haut** : bouton pour replier le menu, nom de la rubrique en cours, cloche. Côté client, elle garde le champ « Décrivez votre besoin de travaux » de la maquette.
- **Mobile** :
  - barre du haut : logo, cloche et menu du compte (et accès aux messages côté client) ;
  - menu complet en tiroir pour le pro et l'admin ;
  - onglets du bas conservés pour le client et le pro.
- **Compteurs d'éléments à traiter**, calculés côté serveur avec les règles de `@menao/core` :
  - client : chantiers qui attendent une action (`clientPendingActions` : devis à signer, acompte, solde) et messages non lus ;
  - pro : demandes à traiter (`requestsAwaitingAnswer`), clients en attente de devis (`clientsAwaitingQuote`) et messages non lus ;
  - admin : dossiers en vérification et tickets ouverts.
- **Carte de visibilité de l'artisan** dans le menu : « Profil visible », ou « Profil masqué » avec la liste de ce qui manque et un lien vers chaque étape (`artisanVisibility`).
- **« Mon dossier » d'un artisan validé** s'affiche dans la coque pro. L'inscription d'un artisan non validé garde sa coque dédiée.
- **Accessibilité** :
  - lien « Aller au contenu » ;
  - rubrique en cours signalée par `aria-current` ;
  - compteurs annoncés aux lecteurs d'écran, avec leur texte visuel masqué.
  - La coque n'ajoute pas de `<main>` : chaque page garde le sien.
- **Back-office** : l'activation de la double authentification garde un en-tête simple, en dehors du menu.

## Conséquences
- Les compteurs sont lus au rendu de la coque. Ils se mettent à jour après chaque action serveur qui rafraîchit la page, pas en temps réel.
- Déconnexion : sur ordinateur, depuis la carte du compte du menu latéral ; sur mobile, depuis l'avatar de la barre du haut. Les tests de bout en bout ouvrent d'abord « Mon compte ».
- Passage aux sous-domaines `app.` et `admin.` (ADR 0034) inchangé.
