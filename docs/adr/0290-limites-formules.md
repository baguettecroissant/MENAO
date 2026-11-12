# ADR 0290 — Limites des formules (F-139)

- Statut : accepté
- Date : 12 novembre 2026
- Complète les ADR 0200 (comparatif des formules), 0231 (agents IA), 0240 (comptes d'équipe) et 0282 (objectifs de demandes).

## Contexte
Le comparatif promet des différences entre Base, Premium et Entreprise. Comptes, agents IA et appels d'offres étaient déjà appliqués ; les demandes par mois et les métiers ne l'étaient pas.

L'utilisateur a décidé le 12 novembre 2026 :
- **demandes par mois** : prévenir sans bloquer avant le lancement ;
- **métiers** : 2 au plus en Base ;
- **comparatif** : une ligne « Appels d'offres », Entreprise seulement.

## Décision
- **Limites lues dans `plans.limites`** (`demandes_mois`, `metiers`), jamais écrites en dur. On prend la formule en cours (`app.artisan_agents`), et celle de Base à défaut (inscription, essai terminé) : `app.plan_limits`.
- **Demandes** :
  - `app.artisan_month_requests` compte comme les objectifs (ADR 0282) : mois de Paris, hors demandes retenues ou annulées avant transmission, hors demandes directes (ADR 0198).
  - Rien n'est bloqué. Le patron voit un bandeau à 80 % de la limite, à la limite et au-delà, avec « Voir les formules », sur l'accueil et dans Demandes. Il apparaît sur le site seulement, jamais dans l'application (règle 10).
  - L'équipe voit un badge « Formule Base : 12 / 10 demandes » dans la page Objectifs, pour le mois en cours (`admin_plan_usage`).
- **Métiers** :
  - `app.check_trades_limit` refuse un choix au-delà de la limite (`set_artisan_trades`, indice `metiers_limite`), sauf s'il ne fait que retirer : un artisan inscrit avant garde ses métiers.
  - À l'inscription (`app.apply_artisan_signup`), les premiers métiers choisis sont gardés au lieu de faire échouer l'inscription (anciennes versions de l'application).
  - Écrans :
    - inscription et étape Métiers : cases grisées au-delà, avec la mention de la limite ;
    - application : le message de la base, sans lien d'achat.
- **Comparatif** : une ligne « Appels d'offres : DPGF chiffré avec vos prix », Entreprise seulement, dans `plan_features` (ADR 0287).
- **Code** :
  - `packages/core/src/plan-limits.ts` : `parsePlanUsage`, `requestLimitLevel`, `nextPlan`, `canChangeTrades`, avec tests ;
  - `my_plan_usage()` pour l'entreprise connectée ;
  - test pgTAP 138.

## Plus tard
- Bloquer les demandes au-delà de la limite après le lancement : à décider, avec le texte « Critères de classement » (L111-7) et la garantie des 4 demandes.
