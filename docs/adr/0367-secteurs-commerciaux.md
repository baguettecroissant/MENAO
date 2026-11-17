# ADR 0367 — Secteurs des commerciaux et objectifs par métier (F-174)

- Date : 17/11/2026
- Fonctionnalité : F-174. Complète les ADR 0207 (zone d'un commercial) et 0366 (primes).

## Contexte

Le document « Simulation de gains 2027 » (17/11/2026) attribue à chaque agent un des cinq
secteurs des Alpes-Maritimes et fixe un objectif mensuel par métier (66 artisans par mois au
rythme de 3 par jour). MENAO ne connaissait qu'une zone libre en débuts de codes postaux.

## Décision

- Les cinq secteurs et les objectifs par métier sont dans `packages/core`
  (`commercial-sectors.ts`, testés). Un secteur est une zone toute faite : ses codes postaux.
  Pas de nouvelle colonne : le secteur d'un commercial se reconnaît à sa zone (`sectorOfZone`).
- Back-office, fiche du commercial : boutons « Secteur 1 » à « Secteur 5 » qui remplissent la
  zone, que l'équipe peut ajuster avant d'enregistrer.
- Espace commercial, « Mes résultats » : carte « Mon secteur » (nom, communes, ou codes postaux
  d'une zone libre) et objectif par métier.
- Les communes citées sont complétées par leurs voisines, à vérifier par l'équipe. Un code postal
  peut appartenir à deux secteurs (06140 : Vence et Tourrettes-sur-Loup).

## Conséquences

- Une zone retouchée n'est plus reconnue comme un secteur : la carte montre alors ses codes.
- Les objectifs par métier sont affichés, pas suivis : MENAO ne compte pas encore les artisans
  validés par métier pour chaque commercial.
