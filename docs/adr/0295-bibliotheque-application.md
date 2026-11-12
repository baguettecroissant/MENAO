# ADR 0295 — Bibliothèque d'ouvrages, lot 1, PR 3 : l'application (F-141)

- Statut : accepté
- Date : 12 novembre 2026
- Suite des ADR 0293 (bibliothèque) et 0294 (devis, marge, appels d'offres). Maquette du lot 36, écran 5.

## Contexte
Le lot 1 doit être le même sur le site et dans l'application : l'artisan chiffre souvent sur son téléphone, chez le client.

## Décision
- **Onglet Argent** : une nouvelle vue « Bibliothèque », après Dépenses.
  - Chaque ouvrage avec son prix et sa marge en taux de marque, ou « Coût à ajouter ». Recherche.
  - Remplie avec les anciens devis à la première ouverture (`artisan_seed_library`), comme sur le site.
- **Modification sur ordinateur seulement** : ouvrages, fournitures et réglages de chiffrage sont des tableaux de saisie, plus à l'aise sur grand écran. L'écran le dit en une phrase.
- **Calculs** : les mêmes fonctions de `packages/core` que le site (`workPricing`, `workQuoteLines`, `quoteMargin`). L'application lit la bibliothèque directement, sous la RLS réservée à l'entreprise (`src/lib/library.ts`).
- **Devis** (écran déjà réservé au droit « money ») :
  - « Rechercher l'article » propose d'abord les ouvrages de la bibliothèque. Un ouvrage détaillé arrive en deux lignes.
  - Chaque ligne porte son coût privé et une pastille de marge.
  - Une carte « Votre marge » s'affiche sous les totaux.
  - Les coûts sont enregistrés après le brouillon (`artisan_save_quote_costs`), comme sur le site.
- **Envoi** : alerte de marge seulement si l'artisan a fixé un seuil. L'envoi reste libre.
- **Exemples** (ADR 0184) : ni bibliothèque ni marge sur le devis d'exemple.
- **Règle 10** : aucun bouton ni lien d'achat ajouté.

## Hors de ce lot
- Modifier un ouvrage ou une fourniture dans l'application : plus tard si les artisans le demandent.
