# ADR 0333 — Lots que les plans ne mentionnent pas, hauteur reprise du plan (F-159, lot 6)

- Statut : accepté (15/11/2026)
- Fonctionnalité : F-159, lot 6 ; deux choix proposés après l'essai réel et validés (« go »)

## Constat

Essai réel : la climatisation (43 m², 3 unités, 1 groupe extérieur) apparaissait « Complet » dans
le DPGF alors que rien n'est écrit pour elle sur les plans — des conventions de MENAO, chiffrées
parce que le lot avait été coché à la création. Quatre pièces sans hauteur laissaient la peinture
des murs en total partiel, alors que le même plan écrit 2,70 m pour les autres pièces.

## Décision

1. **Lots non mentionnés décochés par défaut** (`idleLots`, packages/core) : seulement quand les
   plans portent des ouvrages écrits. Restent cochés : les lots chiffrés avec le relevé et les
   revêtements (carreleur, peintre, plaquiste, menuisier, maçon), un lot qui a un ouvrage écrit,
   un lot dont un plan est consacré au métier (type de plan « électricité »…). Au moins un lot
   reste coché. Les lots décochés restent proposés (`tenders.plan_lots_idle`) dans « Lots
   proposés d'après vos plans », avec « rien d'écrit sur vos plans », et l'artisan les recoche.
2. **Hauteur reprise du plan** (`withPlanHeight`) : une pièce sans hauteur prend la hauteur la
   plus fréquente des autres pièces du relevé, pour le calcul seulement (le relevé garde sa case
   vide). Le poste qui l'utilise passe en « Estimé » et le dit dans son détail (« hauteur 2,70 m
   reprise des autres pièces pour cuisine »). Une pièce dont le plafond est écrit « rampant »
   reste à compléter.

## Conséquences

- Moins de postes de convention présentés comme « Complet » ; l'artisan voit et recoche un lot.
- Le relevé reste fidèle au plan : la hauteur reprise n'apparaît que dans le calcul du DPGF.
- Le signalement « Convention MENAO » des postes de convention qui restent (lot coché sans
  ouvrage écrit) est laissé pour plus tard.
