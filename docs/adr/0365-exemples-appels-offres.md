# ADR 0365 — Exemples de l'espace artisan : appels d'offres (F-173)

- Date : 17/11/2026
- Fonctionnalité : F-173, suite de l'ADR 0364. S'appuie sur l'ADR 0287 (appels d'offres).

## Contexte

Les appels d'offres étaient absents de l'espace d'exemples : l'onglet de « Demandes » n'y
apparaissait pas.

## Décision

- `exampleTenders` (`packages/core`, testé) : trois dossiers (en cours, envoyé, retenu) et le DPGF
  du premier, reçu en Excel : deux lots, des prix repris de la bibliothèque et d'anciens devis,
  deux postes à chiffrer, un poste où l'artisan compte plus que l'architecte.
- Mêmes composants que l'espace réel : `RequestsTabs` reçoit `base`, la liste devient
  `TenderList` (partagée), `TenderEditor` reçoit `example` : les prix se saisissent et les totaux
  suivent, « Enregistrer » et les exports sont inactifs.
- Seul le dossier en cours a une fiche. Le dépôt d'un DPGF et la lecture de plans ne sont pas
  proposés en exemple : rien n'est envoyé ni lu par l'IA.

## Conséquences

- Le DPGF créé depuis des plans (parcours guidé) n'a pas d'exemple : sa fiche dépend de fichiers
  et de relevés réels.
