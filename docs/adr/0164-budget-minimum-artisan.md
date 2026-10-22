# ADR 0164 — Budget minimum de l'artisan

- Statut : accepté
- Date : 22 octobre 2026
- Suite de l'ADR 0163 (budget approximatif des demandes), d'après le « Plan anti-problèmes V2 » de Mickaël : « Filtres réglés par l'artisan : rayon, budget minimum, types de travaux. Il peut refuser une demande sans pénalité. » Le rayon et les types de travaux existaient déjà ; l'ADR 0158 renvoyait le budget minimum à ce budget.

## Décision
- **Réglage** (`artisans.budget_minimum`, `set_artisan_budget_minimum`) :
  - **où** : dans « Métiers et certifications », sur le site comme dans l'application ;
  - **valeurs** : « Tous les budgets » (par défaut), ou à partir de 1 000, 5 000, 15 000 ou 50 000 € (`BUDGET_MINIMUM_OPTIONS`) ;
  - « moins de 1 000 € » n'est pas un minimum (refusé en base).
- **Effet** (`match_artisans`, `budgetMeetsMinimum`) :
  - une demande dont le budget annoncé est inférieur au minimum de l'artisan ne lui est pas proposée, et `send_project_requests` (qui reprend la recherche) refuse de la lui envoyer ;
  - **une demande sans budget reste proposée à tous** : le budget est facultatif pour le particulier ;
  - la comparaison suit l'ordre des tranches (une demande « 5 000 à 15 000 € » convient à un minimum « à partir de 5 000 € ») ;
  - les demandes déjà reçues ne changent pas.
- **Refus sans pénalité** : déjà le cas (motifs de refus, ADR 0156). Le temps de réponse ne compte que les réponses données.

## Conséquences
- **Migration** : `budget_minimum_artisan`. `match_artisans` est redéfinie avec la même signature. Tests pgTAP : `87_budget_minimum_artisan`.
- **Après la fusion** : pousser la migration, après celle de l'ADR 0163.
- **Pas de nouvelle dépendance.**
