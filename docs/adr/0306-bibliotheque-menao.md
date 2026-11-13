# ADR 0306 — Bibliothèque MENAO par défaut, PR 1 : catalogue et copie

- Statut : accepté (13/11/2026)
- Fonctionnalité : F-147 (maquette lot 41 validée) ; complète l'ADR 0293 (bibliothèque d'ouvrages)

## Contexte

Un nouvel artisan arrive sur une bibliothèque vide. L'utilisateur veut une bibliothèque MENAO
proposée par défaut, avec des prix indicatifs. Des prix communs à tous les artisans ressembleraient
à un barème diffusé à des concurrents et contrediraient la décision D10 (catalogue personnel, aucun
prix fournisseur sans source autorisée). Décisions du 13/11/2026 : un catalogue d'ouvrages sans prix
commun, chiffré par les réglages de chaque artisan ; prix publics des fournitures en fourchette, avec
source et date, issus des flux d'affiliation (ManoMano, Cdiscount, candidatures en attente) ; prix
retenu par défaut : le milieu de la fourchette ; mention « liens affiliés » visible.

## Décision (PR 1 : base, règles, contenu)

- **Catalogue** (`menao_supplies`, `menao_works`, `menao_work_components`), lisible par les
  utilisateurs connectés, modifiable par les migrations seulement :
  - ouvrage : métier, ce que voit le client (désignation, description, unité, TVA 10 % par défaut),
    temps de pose par unité ;
  - fournitures et quantités par unité ; fourchette de prix publics HT (vide tant qu'aucune source
    n'est branchée ; source et date obligatoires quand elle est remplie).
- **Premier jeu** : plâtrerie, peinture, plomberie, électricité, carrelage (35 ouvrages, 58
  fournitures). Temps et quantités : repères MENAO, à faire relire par un artisan avant l'ouverture.
- **Copie** : `artisan_adopt_menao_library(métiers)` copie les ouvrages choisis dans la bibliothèque de
  l'entreprise (origine `menao`, lien `menao_work_id`) : le temps de pose en premier élément, puis
  les fournitures, copiées une fois (`menao_supply_id`), **sans prix d'achat** (la colonne devient
  facultative). Pas de doublon : même ouvrage MENAO, ou même désignation et unité.
  `artisan_dismiss_menao_library()` enregistre un autre choix. Les deux remplissent
  `library_onboarded_at` (premier passage fait).
- **Calcul** (`@menao/core`) : un prix d'achat inconnu rend le coût inconnu (rien d'inventé) ;
  `workPriceRange` donne la fourchette bas / haut / milieu avec les réglages de l'artisan, en prenant
  le prix d'achat s'il existe, sinon les prix publics de la fourniture MENAO ; le prix retenu d'un
  ouvrage devient : prix à la main, sinon calculé, sinon le milieu de la fourchette. La marge reste
  inconnue tant qu'un coût manque.

## Suite

- PR 2 : écrans du site (premier passage, liste et fiche avec fourchettes, source, date, liens).
- PR 3 : l'application. Ensuite : import d'un catalogue en tableur, puis branchement des flux de
  prix publics une fois les programmes d'affiliation acceptés.

## Conséquences

- TODO(legal) : prix indicatifs montrés à des artisans concurrents (droit de la concurrence) et
  signalement des liens affiliés (C. conso. L111-7), à faire valider par l'avocat.
- Test pgTAP `145_bibliotheque_menao`.
