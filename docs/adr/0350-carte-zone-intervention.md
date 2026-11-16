# ADR 0350 — Carte de France de la zone d'intervention (F-162, lot 61, partie 1)

- Statut : accepté (16/11/2026)
- Fonctionnalité : F-162 (refonte de l'onboarding) ; maquette du lot 61 validée le 16/11/2026

## Contexte

La zone d'intervention se choisit à l'inscription et dans le dossier. Seul le rayon avait une
carte ; départements, régions et « Toute la France » n'avaient qu'une liste.

## Décision

- **Contours officiels de l'IGN** (ADMIN EXPRESS COG-CARTO, Licence Ouverte 2.0), téléchargés hors
  du dépôt puis simplifiés par `scripts/contours-france.py` : 96 départements (77 Ko) et 13 régions
  (29 Ko) de métropole, en tracés SVG déjà projetés (`apps/web/src/data/`). Aucune dépendance de
  cartographie ; les fichiers ne sont chargés que lorsque la carte s'affiche.
- **`FranceMap`** : zones choisies en couleur, à toucher (ou au clavier) pour les ajouter ou les
  retirer ; toute la métropole pour « Toute la France » ; le point de départ de l'artisan est
  placé avec la même projection (`franceMapPoint`, packages/core, testé).
- **`TerritoryField`** affiche la carte à côté de la recherche : les deux écrans de zone
  (inscription et dossier) en profitent ensemble. L'outre-mer n'est pas dessiné : il se choisit
  par la recherche.

## Conséquences

- Suite du lot 61 : même présentation des choix de zone sur les deux écrans, puis documents,
  fiche publique et « Mon dossier ».
- Mise à jour des contours : relancer le script sur un nouveau téléchargement.
