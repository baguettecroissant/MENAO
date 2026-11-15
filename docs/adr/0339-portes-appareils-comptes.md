# ADR 0339 — Portes et appareils sanitaires comptés sur les plans (F-159, lot 7)

- Statut : accepté (15/11/2026)
- Fonctionnalité : F-159, lot 7 ; suite de l'ADR 0336

## Constat

Dans l'essai réel, le relevé laissait vides les portes intérieures, les WC, les lavabos et les
baignoires ; les postes du menuisier (blocs-portes), du peintre (portes) et du plombier restaient
« à compléter ». La lecture des symboles (ADR 0336) voit ces éléments sur chaque plan.

Essai sur les plans des cloisons et des sols (0,11 $, puis 0,05 $ après correction de la
consigne) : les 8 menuiseries extérieures toutes trouvées (en séparant porte d'entrée et
porte-fenêtre des portes intérieures une fois la consigne précisée), 7 portes intérieures pour
7 blocs-portes écrits (une confusion compensée par un oubli), douche, lavabo et évier trouvés,
un WC compté (deux attendus, à vérifier). Les portes et menuiseries se répètent d'un plan à l'autre.

## Décision

- Consigne : « porte » désigne une porte intérieure ; une porte d'entrée, une porte-fenêtre, une
  baie ou une porte de garage sont des menuiseries extérieures (« fenetre »).
- `fixtureCounts` (packages/core) garde, pour les portes, menuiseries, WC, lavabos, douches,
  baignoires et éviers, le compte du plan le plus complet, jamais la somme des plans ; un compte
  nul n'est pas rendu (un appareil non vu reste à compléter).
- `artisan_import_plan_symbols(…, p_counts)` remplit les cases vides du relevé (« Aussi relevé sur
  les plans ») ; un compte lu ou saisi n'est jamais remplacé. Les postes du DPGF qui en dépendent
  se remplissent comme avant.

## Conséquences

- Aucun appel en plus : ces symboles sont déjà lus avec les symboles électriques.
- Limite : une maison à plusieurs niveaux dessinés sur des plans séparés n'additionne pas ses
  niveaux (on garde le plan le plus complet) ; l'artisan corrige le compte dans le relevé.
