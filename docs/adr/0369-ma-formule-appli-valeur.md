# ADR 0369 — « Ma formule » de l'application repensée : la valeur d'abord

- Statut : accepté (maquette lot 71 validée le 17/11/2026)
- Fonctionnalité : F-176

## Contexte

Le comparatif du site a été repensé pour convertir vers Premium (ADR 0368). L'application ne peut
pas en faire autant : ni prix, ni bouton ni lien d'achat d'abonnement (CLAUDE.md règle 10, règles
d'Apple). Son écran « Ma formule » (ADR 0363) listait ce qui est compris, sans rien mettre en avant.

## Décision

L'écran garde l'abonné en lui montrant ce que sa formule fait pour lui, avec le langage du site :

- en-tête : la formule, son état et « Tout Base, plus N fonctions » (ou « N fonctions comprises ») ;
- une bande de cartes à faire glisser, « Ce que <formule> fait pour vous », dont les compteurs du
  mois (minutes de Manon, demandes reçues, comptes) font partie ; le choix des cartes vient du cœur
  (`planHighlights`) et ne parle que de ce que la formule comprend ;
- le détail dans les cinq rubriques du site, avec leurs icônes, repliables ; le repère « En plus »
  marque ce que Base n'a pas ou a en moindre quantité (`planContents` : `plus`, `added`) ;
- « Non compris dans votre formule » replié, sans nom de formule ni prix.

La conversion vers une formule plus haute reste sur le web.

## Conséquences

- Tout vient de la base (`plan_features`, `my_ai_agents`, `my_plan_usage`) : changer une ligne du
  comparatif change l'écran sans nouvelle version de l'application.
- Une nouvelle rubrique sans icône prend l'icône générique.
