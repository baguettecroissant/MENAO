# ADR 0313 — Garder ses prix à jour dans l'application

- Statut : accepté (14/11/2026)
- Fonctionnalité : F-149, lot 44 (maquette validée), PR 2 ; suite des ADR 0311 et 0312

## Contexte

C'est sur le téléphone que l'artisan photographie ses factures dans Dépenses. Décisions du
14/11/2026 : la carte « prix changés » sur la fiche d'une dépense, dans l'application et sur le
site (site : PR #414) ; les deux écrans dans l'application.

## Décision

- **Données** (`src/lib/library-prices.ts`) : mêmes lectures que le site (RLS : patron et chef
  d'équipe), mêmes calculs par @menao/core (`invoicePriceProposals`, `invoiceChangesFor`,
  `raisePlan`), mêmes fonctions de la base (`artisan_apply_invoice_prices`,
  `artisan_raise_prices`, `artisan_undo_price_raise`). Après chaque écriture, le prix enregistré
  des ouvrages est recalculé (`refreshWorkPrices`, comme sur le site, ADR 0294).
- **Écrans** :
  - `pro-prix-factures` : une carte par fourniture (ancien › nouveau prix, écart), décochée
    au-delà de 30 % ; articles inconnus ; bas d'écran fixe avec le bilan et « Mettre à jour N
    prix » ;
  - `pro-hausse` : hausse et raccourcis, « Sur quoi ? », arrondi, aperçu de 3 lignes, bas d'écran
    fixe « Appliquer la hausse » ;
  - bibliothèque (onglet Argent) : bandeaux « Hausse … appliquée, Annuler » (24 h) et « N prix
    d'achat ont changé, Vérifier », bouton « Augmenter » à côté de la recherche ;
  - fiche d'une dépense : carte « N prix d'achat ont changé » et « Vérifier mes prix ».
- Réservé à la place « money » (ADR 0241) ; rien en mode exemples (ADR 0184), où rien ne s'écrit.

## Conséquences

- F-149 est complet sur le site et dans l'application. À essayer sur iPhone (Expo Go).
