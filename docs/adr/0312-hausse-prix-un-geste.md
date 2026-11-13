# ADR 0312 — Augmenter ses prix en un geste, annulable 24 h

- Statut : accepté (13/11/2026)
- Fonctionnalité : F-149, PR 2 (maquette lot 43 validée) ; suite de l'ADR 0311

## Contexte

Une hausse de tarifs (fournisseurs, inflation) oblige aujourd'hui à reprendre les prix un par un.
Décision du 13/11/2026 : une hausse en un geste, **annulable pendant 24 h**.

## Décision

- **Cœur** (`packages/core/src/library-raise.ts`) : hausse de 0,1 à 30 % ; arrondi au centime, aux
  10 centimes ou à l'euro, au plus proche (moitié vers le haut), jamais sous le prix de départ ;
  aperçu des prix qui changent (ouvrages à prix fixé à la main, puis prix d'achat).
- **Base** (tests pgTAP 148) :
  - `app.raise_price` : même calcul que le cœur, en entiers ;
  - `artisan_raise_prices(taux, arrondi, ouvrages, fournitures)` : hausse d'un bloc, prix
    d'achat datés du jour ; chaque hausse est gardée dans `library_price_raises` avec les prix
    d'avant (RLS : lecture par l'entreprise) ;
  - `artisan_undo_price_raise(hausse)` : la dernière hausse seulement, dans les 24 h, une fois ;
    un prix modifié depuis la hausse est laissé tel quel.
- **Site** : page `/pro/bibliotheque/augmenter` comme la maquette (hausse et raccourcis + 2, 3 et
  5 %, « Sur quoi ? », arrondi, aperçu de 5 lignes, bilan) ; bouton « Augmenter mes prix » dans la
  bibliothèque (ouvrages et fournitures) ; bandeau « Hausse de 3 % appliquée… Annuler la hausse »
  pendant 24 h. Prix des ouvrages recalculés après la hausse et après l'annulation.
- Les ouvrages composés ne sont pas touchés : ils suivent le prix de l'heure et le coefficient.
  Les devis déjà envoyés et les brouillons gardent leurs prix.
- Seed : bibliothèque en place du plombier de Nice avec un ouvrage à prix fixé ; test de bout en
  bout (hausse puis annulation).

## Conséquences

- F-149 est complet sur le site ; l'application pourra reprendre ces deux écrans plus tard.
