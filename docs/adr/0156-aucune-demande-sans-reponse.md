# ADR 0156 — Aucune demande sans réponse : relances, autres artisans proposés, alerte au SAV

- Statut : accepté
- Date : 22 octobre 2026
- Lot 1 du plan V1.1 (« Plan anti-problèmes V2 » de Mickaël, 18 octobre 2026), avec le délai de réponse de 72 h décidé par les associés (ADR 0153).

## Contexte
- **Avant** : une demande sans réponse expirait au bout du délai (`app.expire_requests`, toutes les 15 minutes). Rien ne relançait l'artisan, et le client n'était pas prévenu quand aucun artisan ne lui répondait.
- **Le plan anti-problèmes** demande qu'aucune demande ne reste sans réponse : relancer l'artisan, proposer d'autres artisans au client et alerter le SAV.

## Décision
- **Relances de l'artisan** (`app.remind_pending_requests`, pg_cron toutes les 15 minutes, `menao-relance-demandes`) :
  - 1re relance dès 24 h, 2e dès 48 h et au moins 12 h après la première, jamais plus de deux par demande ;
  - seulement pour une demande qui attend encore sa réponse et dont le délai n'est pas dépassé ;
  - notification `demande_relance` : e-mail, push et centre de notifications. Elle donne l'échéance et mène à la demande. La seconde est un « dernier rappel ».
  - **Notification transactionnelle** : elle ne se désactive pas, comme la demande elle-même. Une réponse sous 72 h est une règle de la charte.
- **Fin d'une série sans réponse** : un déclencheur par instruction sur `requests` (`requests_without_answer`, tables de transition) repère les projets dont une demande vient d'expirer ou d'être refusée, et où plus aucune demande n'attend ni n'est acceptée. Plusieurs demandes qui expirent ensemble ne donnent qu'un avis et qu'un ticket.
  - **Client** : notification `demande_sans_reponse`, avec un texte selon le cas (tous ont refusé, ou pas de réponse dans les 72 h). Le lien mène aux résultats du projet (`/recherche/<projet>/artisans`, écran « Artisans » dans l'application) pour choisir d'autres artisans vérifiés. Les demandes expirées ou refusées ne comptent plus dans la limite de 3 demandes actives.
  - **SAV** : ticket `demande_sans_reponse` (échéance d'un jour), visible du client dans « Mes échanges » avec un fil de réponse. L'équipe est alertée comme pour tout nouveau ticket.
- **Zone élargie** : pas d'élargissement automatique pour l'instant. Le SAV peut le proposer au client depuis le ticket.

## Conséquences
- **Migrations** `types_demandes_sans_reponse` (valeurs d'enum seules) et `demandes_sans_reponse`. Tests pgTAP `80_demandes_sans_reponse`.
- **Après la fusion** : pousser les migrations, puis redéployer `notify`, qui embarque les modèles d'e-mails (`@menao/emails`).
- **Pas de nouvelle dépendance.**
