# ADR 0084 — Application : barres d'onglets des maquettes

- Statut : accepté
- Date : 14 octobre 2026

## Contexte
- Les maquettes et la spécification donnent la barre d'onglets mobile avec un bouton central.
  - **Artisan** : F-16 et maquettes « Dashboard », « Devis » : « Dashboard · Chantiers · (+) action rapide · Devis · Messages ».
  - **Client** : maquette « Mes chantiers - Mobile » : « Dashboard · Chantiers · (Recherche) · Documents · Messages ». Une autre maquette (« Résultat de recherche - in app ») montre « Dashboard · Messages · Recherche · Notifications · Profil ».
- L'application avait :
  - côté artisan, « Tableau de bord · Demandes · Agenda · Messages · Compte » ;
  - côté client, « Accueil · Mes chantiers · Messages · Compte », sans bouton central.
- Décisions des fondateurs (14 octobre 2026) :
  - suivre « Chantiers et Documents » côté client ;
  - le (+) de l'artisan ouvre un menu d'actions.

## Décision
- **Artisan** : Accueil (tableau de bord) · Chantiers · (+) · Devis · Messages.
  - Le (+) ouvre « Actions rapides » :
    - créer un devis : choix parmi les chantiers qui attendent un devis (`isAwaitingQuote`, `@menao/core`), vers la préparation du devis ;
    - bloquer un créneau ;
    - ajouter une photo au suivi : choix parmi les chantiers en cours (`isJournalOpen`), vers le suivi du chantier.
  - Demandes et Agenda deviennent des écrans avec retour (`/pro-demandes`, `/pro-agenda`), ouverts depuis le tableau de bord (« Tout voir », « Voir l'agenda »).
  - « Bloquer un créneau » ramène à l'agenda d'où l'on vient, sinon l'agenda remplace l'écran.
  - Chantiers et Devis passent en onglets (`/pro/chantiers`, `/pro/devis`). Leurs anciennes routes disparaissent ; les liens des notifications suivent.
- **Client** : Accueil (tableau de bord une fois connecté, ADR 0082) · Chantiers · (loupe) · Documents · Messages.
  - La loupe ouvre une nouvelle recherche.
  - Nouvel onglet « Mes documents », comme sur le site : devis, factures et PV de tous les chantiers, par chantier, ouverts en aperçu puis téléchargés en PDF. Pour un visiteur, une invitation à créer son compte.
  - La construction des documents d'un chantier est partagée avec la vue du chantier (`chantierDocuments`).
- **Compte** : il quitte les barres. Il s'ouvre depuis la photo du compte, à droite de la cloche, dans un en-tête commun aux onglets (`TabHeader`, maquettes) :
  - grand titre et sous-titre ;
  - cloche avec sa pastille ;
  - photo du profil, ou son initiale, ou une silhouette pour un visiteur.
  - L'accueil du client garde son en-tête bleu, avec la même photo à côté de la cloche.
  - « Mon compte » devient un écran avec retour (`/compte`), commun aux deux espaces.
- **Libellé de l'onglet du tableau de bord** : « Accueil ». « Tableau de bord » serait tronqué avec cinq onglets ; l'écran garde son titre « Tableau de bord ».
- « Démarrer un chantier » quitte « Mes chantiers », comme sur la maquette : la loupe centrale le remplace.

## Conséquences
- Les deux barres suivent les maquettes. Le bouton central donne accès en un geste à l'action la plus fréquente de chaque espace.
- Les écrans ouverts depuis le tableau de bord ont un retour, au lieu d'onglets cachés.
