# ADR 0308 — Bibliothèque MENAO, PR 3 : application

- Statut : accepté (13/11/2026)
- Fonctionnalité : F-147 (maquette lot 41, écran 4) ; suite des ADR 0306 et 0307

## Contexte

Le site a son premier passage et ses fourchettes (ADR 0307). Dans l'application, la bibliothèque
est en lecture seule (ADR 0295) et affichait les ouvrages MENAO comme de simples ouvrages composés.

## Décision

- **Premier passage** dans l'onglet Argent › Bibliothèque, comme sur le site : bibliothèque MENAO
  (métiers de la fiche cochés d'avance), import du catalogue « Bientôt » (« plus simple depuis un
  ordinateur »), devis ; prix de l'heure et coefficient ; bouton « Créer ma bibliothèque » fixé en
  bas d'écran. Mêmes appels que le site (`artisan_pricing_settings`, puis
  `artisan_adopt_menao_library` ou `artisan_dismiss_menao_library`). Pas de premier passage en mode
  exemples : rien ne s'y écrit en base.
- **Liste** : filtre par métier (pastilles), pastille MENAO avec métier et unité, fourchette « bas »
  puis « à haut » quand le prix en découle, source et date des prix publics en pied de liste.
- Le prix retenu (`price_pick`) s'applique aussi aux lignes proposées dans les devis de
  l'application (`workQuoteLines`).
- La fiche d'un ouvrage reste sur ordinateur (temps de pose, prix d'achat, prix retenu).
