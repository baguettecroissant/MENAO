# ADR 0358 — Inscription dans l'application : rattrapage du lot 61 (F-167)

- Date : 17/11/2026
- Fonctionnalité : F-167. Reprend dans l'application la recherche d'entreprise patiente (PR #456),
  la carte de la zone (ADR 0350) et les valeurs lues des documents (ADR 0351), faites sur le site.

## Décision

- **Recherche d'entreprise** : mêmes essais que le site (`COMPANY_SEARCH_ATTEMPTS`), message
  « l'annuaire est lent » après `COMPANY_SEARCH_SLOW_MS`, bouton « Réessayer », recherches gardées
  en mémoire. Le délai de chaque essai passe par un drapeau et non par `AbortSignal.timeout`,
  absent de React Native.
- **Carte de France** : les contours IGN quittent `apps/web/src/data` pour `packages/core/data`,
  exposés par `@menao/core/data/*` ; le site et l'application dessinent la même carte. Dans
  l'application, `FranceMap` utilise `react-native-svg` (déjà installée) : départements et régions
  à toucher, métropole entière pour « Toute la France ».
- **Documents** : après la lecture automatique, chaque valeur lue est montrée avec « Lu ».
- Les numéros d'étape du dossier ne sont pas repris : la maquette de l'application (« DossierApp »)
  utilise des icônes.

## Conséquences

- Aucune migration ni fonction. `scripts/contours-france.py` écrit désormais dans
  `packages/core/data`.
- Non essayé sur iPhone au moment de la fusion : le toucher des petits départements (Paris et sa
  couronne) est à vérifier, la recherche reste le recours.
