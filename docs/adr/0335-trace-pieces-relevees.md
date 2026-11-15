# ADR 0335 — Le tracé reçoit les pièces relevées sur chaque plan (F-159, lot 6)

- Statut : accepté (15/11/2026)
- Fonctionnalité : F-159 ; « retenter le tracé d'une pièce oubliée », après l'essai réel

## Constat

Essai réel : le dégagement (« Dgt ») restait sans surface, ce qui bloquait carrelage, ragréage et
plinthes et laissait quatre totaux partiels. Le tracé à l'échelle (ADR 0326) ne connaissait pas
les pièces relevées par la lecture : il traçait ce qu'il voyait, et une pièce de circulation
étroite, sans cotes, passait à travers. Sur le plan chargé (cloisons), des pièces manquaient ou
étaient fusionnées (« salle à manger / salon »).

## Décision

- L'appel de tracé reçoit, pour chaque image, la liste des pièces que la lecture y a relevées
  (40 noms au plus) ; la consigne demande de les tracer avec leur nom exact, puis les autres
  pièces visibles, et rappelle qu'une pièce de circulation se trace aussi.
- Aucun appel en plus : une ligne de texte de plus dans l'appel existant.

## Mesure (2 vrais plans × 2 passes, Opus 5.5, 0,13 $)

| | Sans la liste (essai précédent) | Avec la liste |
|---|---|---|
| Pièces tracées, plan des sols | 9 puis 7 sur 9 | 9 et 9 sur 9 |
| Pièces tracées, plan des cloisons | 7 (dont une fusion) puis 3 sur 9 | 9 et 9 sur 9 |
| Dgt tracé | 1 fois sur 4 | 4 fois sur 4 (1,56 à 2,25 m²) |
| Écart moyen, plan des sols (5 pièces cotées) | ~1,5 % | ~1,4 % |

Le plan des cloisons reste moins précis (salle à manger +13 %, salon −9 %, WC −34 %) avec ou
sans la liste : c'est la densité du plan, pas la liste. Le contrôle de l'estimation (ADR 0326)
continue d'afficher l'écart, et le tracé utilisé pour une pièce est d'abord celui de son plan.

## Conséquences

- Moins de pièces sans surface, donc moins de totaux partiels. Une surface ainsi obtenue reste
  « Estimé », à vérifier.
