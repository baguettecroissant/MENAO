# ADR 0298 — Évaluation de la lecture des plans (DPGF depuis un plan, PR C)

- Statut : accepté (13/11/2026)
- Fonctionnalité : F-140 (suite des ADR 0291 et 0292)

## Contexte

La lecture des plans par l'IA (ADR 0291) n'avait été testée qu'avec une réponse simulée : une
erreur de schéma l'a rendue inutilisable en ligne jusqu'au correctif du 12/11. Il fallait mesurer
la lecture réelle avant d'aller plus loin.

## Décision

- **Plans fictifs versionnés** (`supabase/functions/tender-sheet/eval/plans`), fabriqués avec leur
  vérité terrain par `fabriquer-plans.mjs` → `cas.json` : T3, maison R+1 sur deux pages, studio aux
  seules cotes, séjour en L avec terrasse, photo de travers, photo illisible, DPGF (pas un plan),
  consigne malveillante écrite sur le plan, surface illisible.
- **`eval/run.ts`** reprend la consigne, le message et la normalisation de l'Edge Function
  (`PLAN_SYSTEM`, `planRawSchema`, `planUserContent`). `--estimation` ne fait aucun appel ;
  `--vrais` lit de vrais plans gardés hors du dépôt. Les comptes laissés vides (« à compléter » à
  l'écran) sont séparés des comptes faux.
- **Comptes** : la règle prudente est gardée (« n'ajoute pas un élément que tu ne peux pas compter
  avec certitude »). Une consigne plus détaillée remplissait tous les comptes mais en faussait 5
  (portes surtout), contre 1 : un chiffre faux est pire qu'une case à compléter.
- **Pièces humides** : la consigne précise qu'un cellier, un dressing, un placard ou une pièce de
  vie ouverte sur la cuisine ne sont pas humides (usages justes 94,6 % → 100 %).

## Résultats (13/11/2026, Sonnet 5.5 par OpenRouter)

| | Plans fictifs (9 cas, 3 passes) | Vrais plans (4, 2 passes) |
|---|---|---|
| Bon diagnostic (lisible, illisible, pas un plan) | 100 % | 100 % |
| Pièces trouvées | 100 % (0 en trop) | 100 % (48 pièces, 0 en trop) |
| Surfaces exactes | 100 % | 100 % (dont surfaces écrites en calcul) |
| Surfaces inventées | 0 | 0 |
| Consigne malveillante suivie | jamais | — |
| Hauteurs sous plafond | 100 % | non écrites sur ces plans |
| Comptes donnés justes | 93,8 % (15 laissés vides) | non notés |

Vrais plans : deux T3 et un T5 de promoteurs (plans de vente publics) et un plan de maison fait par
un particulier (5 pages dont 2 d'électricité). Ils ne sont pas versionnés.

Coût réel des essais : 0,52 $ pour 4 lancements (35 lectures), environ 0,01 $ par lecture.

## Conséquences

- Les portes et fenêtres restent souvent « à compléter » : l'artisan les saisit avant la case
  « J'ai vérifié les quantités ».
- Atelier et cellier d'une dépendance sont lus « habitables » : la consigne ne les cite pas, à
  revoir si un métier en dépend.
- Lecture de plans DWG/DXF toujours reportée.
