# ADR 0082 — Application : accueil du client connecté en tableau de bord

- Statut : accepté
- Date : 14 octobre 2026

## Contexte
- L'accueil de l'application (ADR 0055) était le même pour tous :
  - recherche, raccourcis par métier, « Comment ça marche », garanties ;
  - un client connecté voyait encore la présentation de MENAO, sans rien de ses chantiers.
- Ce qui attend le client (devis à signer, acompte, réception, solde, avis) n'apparaissait que dans « Mes chantiers », chantier par chantier.
- L'artisan a déjà un tableau de bord (F-16).

## Décision
- **Accueil personnalisé pour le client connecté**, remis à zéro au changement de compte. L'en-tête bleu garde la marque, la cloche et la recherche.
  - **Message** : « Bonjour {prénom} ! », puis un résumé selon le cas :
    - « N actions vous attendent. » ;
    - sinon « Rien à faire de votre côté : vos chantiers suivent leur cours. » ;
    - sinon « Vos N demandes attendent la réponse des artisans. » ;
    - sinon le message habituel.
  - **Compteurs** cliquables : chantiers en cours, demandes en attente, messages non lus. Ils ouvrent l'onglet « Mes chantiers » ou « Messages ».
  - **À faire**, une entrée au plus par chantier, dans l'ordre du parcours :
    - signer le devis (total TTC) ;
    - payer l'acompte (montant) ;
    - réceptionner les travaux ;
    - confirmer la levée des réserves signalée par l'artisan ;
    - payer le solde (montant) ;
    - noter l'artisan, en dernier : l'avis ne conditionne rien (F-27).
  - Chaque action ouvre le même écran que depuis « Mes chantiers ». La réception et la levée des réserves s'ouvrent dans la vue du chantier, qui propose de valider ou d'ajouter des réserves.
  - **Prochains rendez-vous** : visites et démarrages à venir, 3 au plus, avec la même règle que le tableau de bord de l'artisan (`upcomingAgenda`).
  - **Mes chantiers en cours** : 3 au plus, en vignettes (photo, état, artisan), puis le lien « Tous mes chantiers ».
  - **Recherche non envoyée** : la dernière, avec « Reprendre ».
  - **Raccourcis par métier** sous le titre « Un nouveau projet ? ».
  - Les sections de présentation (garanties, invitation à créer un compte, « 100 % gratuit ») disparaissent. Un client sans chantier ni demande garde « Comment ça marche ».
  - L'accueil se tire vers le bas pour se mettre à jour, et se relit à chaque retour sur l'onglet.
- **Règles dans `@menao/core`** (`client-home.ts`, testé) :
  - `clientTodos` réutilise `clientChantierAction` (« Mes chantiers ») et `reviewInvited` (vue du chantier) ;
  - `clientHomeSummary` choisit le message.
- **Données** : les mêmes que « Mes chantiers » (`loadMyChantiers`), plus trois lectures avec les droits du compte (RLS) :
  - le prénom (`profiles`) ;
  - les avis déjà laissés (`reviews` de l'auteur) ;
  - les levées de réserves signalées et pas encore confirmées (`receptions`).
  - Aucune migration, aucune fonction serveur.
- L'accueil sans compte ne change pas.

## Conséquences
- Le client connecté voit dès l'ouverture ce qu'il a à faire, sans parcourir ses chantiers.
- Le site n'a pas d'équivalent : son espace client s'ouvre sur « Mes chantiers ». Les règles communes permettront d'y ajouter le même résumé.
