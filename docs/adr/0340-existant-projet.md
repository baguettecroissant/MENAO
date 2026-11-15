# ADR 0340 — Existant et projet (F-159)

- Statut : accepté (15/11/2026)
- Fonctionnalité : F-159 ; dernier point du plan décidé après l'essai réel du 15/11/2026

## Constat

Un dossier de rénovation comprend souvent un plan de démolition, qui dessine l'état existant : la
baignoire à déposer, l'ancien WC, la cloison du salon avant sa démolition, les anciennes prises.
MENAO lisait ce plan comme un plan de projet. Conséquences possibles : « Baignoires : 1 » (compte
du plan le plus complet, ADR 0339) pour une baignoire déposée, une pièce tracée sur l'existant,
des prises existantes comptées.

## Décision

- Le type de chaque plan vient de la lecture des notes (ADR 0330) ; `planPageRole` le classe en
  « existant » (démolition, existant, état actuel, avant travaux) ou « projet ».
- `projectPages` écarte les plans de l'existant des tracés à l'échelle, des plans d'électricité et
  des comptes de portes et d'appareils, seulement s'il y a au moins un plan de projet. Les déposes
  écrites sur le plan de démolition restent dans le lot « Démolition, dépose ».
- La fonction attend la lecture des notes au plus 10 s de plus avant les tracés ; sans réponse, tous
  les plans sont tracés, comme avant.
- Le résumé dit le type de chaque plan (« Plans lus : démolition (existant), cloisons et
  menuiseries… ») et que le plan de l'existant sert aux déposes (`tenders.plan_page_labels`).

## Conséquences

- Aucun appel en plus.
- Limite : la lecture des pièces et des éléments comptés (plan.ts) lit toujours tous les plans
  ensemble ; si elle prend une pièce sur le plan de démolition, sa surface écrite peut être celle
  de l'existant. À traiter avec une évaluation de la consigne de lecture.
