# ADR 0336 — Symboles comptés sur les plans (F-159, lot 7, PR A1)

- Statut : accepté (15/11/2026)
- Fonctionnalité : F-159, lot 7 ; maquette du lot 55 validée le 15/11/2026

## Constat

Le DPGF de l'électricien reposait sur les minimums de la norme NF C 15-100 (un point lumineux par
pièce, un nombre de prises selon la pièce), alors que le plan d'électricité dessine chaque point
lumineux, spot, prise et interrupteur. La recherche du 15/11/2026 (« DPGF depuis les plans
outils ») montre que les modèles d'IA lisent bien le texte mais comptent mal les symboles, et
qu'aucun outil français ne compte les symboles d'un plan pour un artisan.

Essai sur le plan d'électricité réel (Opus 5.5, 0,30 $) : en une lecture du plan entier, 7 points
lumineux sur 7, 20 spots sur 20, 28 prises sur 28 (une de trop), mais 10 interrupteurs sur 15 (les
groupes serrés et les poussoirs échappent). Quatre zones agrandies × 2 séparent les interrupteurs
(13 sur 15) mais confondent spots et points lumineux. Fusionnées : 7, 21, 28 à 30, 14 sur 15.

## Décision

1. **Lecture** (`tender-sheet/symbols.ts`, consigne de l'essai) : une lecture du plan entier par
   image (photo, page de PDF rendue), lancée en même temps que les autres lectures. Le modèle
   liste chaque occurrence avec son type et son centre en pixels ; il ne compte pas.
2. **`packages/core/src/plan-symbols.ts`** remet en forme, fusionne les lectures (familles de
   symboles, grappes à 1 % du plus grand côté, nombre le plus fin, type de la lecture entière,
   groupe « à vérifier » quand deux lectures ne s'accordent pas), rattache chaque symbole à la
   pièce dont le contour tracé le contient (sinon à la pièce lue) et compte par type et par pièce.
3. **Plans retenus** : ceux dont le type dit « électricité », sinon ceux qui portent au moins
   5 symboles électriques (les autres plans répètent portes et fenêtres, pas l'électricité).
4. **Base** : `tenders.plan_symbols` (3 000 au plus) et `plan_symbol_legend` (convention de
   dessin reconnue), remplacés à chaque lecture ; origines du DPGF « compte » et « compte_verif ».
5. **DPGF** : le lot de l'électricien prend les nombres comptés (points lumineux, spots,
   appliques, prises, prises spécialisées, interrupteurs, commandes de volets, RJ45/TV,
   détecteurs, tableau), avec le détail par pièce. Sans symbole compté, les minimums de la norme
   restent. Des symboles électriques comptés gardent le lot de l'électricien coché (ADR 0333).

## Conséquences

- Coût : une lecture de plus par image, environ 0,06 $ par plan.
- PR A2 : zones agrandies fabriquées dans le navigateur au dépôt, deuxième lecture et groupes
  « à vérifier » ; PR B : l'écran de vérification de la maquette (symboles sur le plan, ajout et
  retrait, tableau par pièce).
- Portes, fenêtres et appareils sanitaires ne sont pas encore repris : leur comptage doit d'abord
  être mesuré, et ils se répètent d'un plan à l'autre.
