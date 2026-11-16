# ADR 0348 — Évaluation du chat « Demander à MENAO » et choix du modèle (F-160, lot E)

- Statut : accepté (16/11/2026)
- Fonctionnalité : F-160 ; moteur : ADR 0346 ; écrans : ADR 0347

## Évaluation

`supabase/functions/plan-chat/eval/run.ts` pose des questions au vrai modèle avec un relevé de
plans et une bibliothèque fictive, puis compare la réponse aux nombres attendus (ou à une question
de précision attendue). Les relevés et les cas tirés de vrais plans restent hors du dépôt.

Premier passage, 16/11/2026 : relevé réel d'un essai de l'utilisateur (maison, 4 plans, 9 pièces,
73 ouvrages lus, symboles et éléments comptés), 28 questions dont 5 où l'information manque
(surfaces, hauteur, volume, faux plafonds, cloison, doublage, peinture, plinthes, carrelage,
comptages, chiffrage libre et avec la bibliothèque).

| | Opus 5.5 | Sonnet 5.5 |
|---|---|---|
| Réponses justes | 27/28 | 28/28 |
| Précisions attendues | 5/5 | 5/5 |
| Temps moyen | 8,9 s | 6,7 s |
| Coût par question | ≈ 0,022 $ | ≈ 0,011 $ |

Aucun chiffre inventé : chaque réponse passe par les calculs de MENAO et cite ses étapes. Le seul
écart : une cloison de 10 cm, qu'Opus a fait préciser et que Sonnet a comptée en 72/48 en le disant.
Dépense réelle de toute l'évaluation (OpenRouter) : 1,04 $.

## Décision

- **Le chat passe sur Sonnet 5.5** (`planChatModel`, variable `AI_PLAN_CHAT_MODEL` pour revenir à
  Opus sans code). La lecture des plans reste sur Opus (ADR 0324).
- **L'outil « cloison » vérifie l'épaisseur écrite sur le plan** (`epaisseur_cm`, `montants_mm`) :
  montants + 12,5 mm par plaque et par face ; plus de 6 mm d'écart, il refuse et propose les types
  possibles (10 cm : 98/48 en deux plaques par face, 95/70 en une), et le modèle demande le type à
  l'artisan. Pas de contrôle pour un doublage, dont l'épaisseur comprend l'isolant. Repassé après
  le changement : la cloison de 10 cm est précisée, les doublages sont comptés sans question.

## Conséquences

- Relancer l'évaluation à chaque changement des consignes, des outils ou du modèle.
- Seuls les ratios de la cloison 72/48 sont sourcés : les autres types comptent les plaques et
  l'ossature, et laissent les vis d'un double parement vides (ADR 0345).
