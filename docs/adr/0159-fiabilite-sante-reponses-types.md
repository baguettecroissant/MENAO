# ADR 0159 — Fiabilité : santé du service, réponses types du SAV, guide d'exploitation

- Statut : accepté
- Date : 22 octobre 2026
- Lot 4 du plan V1.1, d'après le « Plan anti-problèmes V2 » (C2 : panne ou bug le jour de l'ouverture ; C3 : SAV débordé).

## Contexte
- **Sauvegardes, surveillance externe et page d'état** demandent une offre payante ou un compte chez un tiers. C'est une décision de l'utilisateur ; Claude ne crée pas de compte.
- **Les tests de charge** sont prévus en février avec Mickaël.
- **Le SAV** a déjà sa boîte de réception (ADR 0049) ; il lui manque des réponses types.

## Décision
- **Santé du service** : route `/sante`.
  - Elle répond 200 si le site lit le référentiel public des métiers dans la base, 503 sinon (erreur ou plus de 4 secondes).
  - Elle ne renvoie aucune donnée personnelle et n'est jamais mise en cache.
  - Elle reste ouverte pendant la page d'attente, pour l'outil de surveillance externe.
- **Réponses types du SAV** : dans un ticket, un menu « Réponse type » préremplit la réponse. Les modèles dépendent du type de ticket :
  - demande sans réponse ;
  - litige ;
  - faux particulier ;
  - suppression de compte ;
  - récompense ;
  - dossier de recherche ;
  - deux modèles communs.
  La réponse reste modifiable et relue avant l'envoi. Les textes sont dans `fr.admin.tickets.templates`.
- **Guide d'exploitation** `docs/EXPLOITATION.md` :
  - **sauvegardes** : offre de Supabase, et pas de sauvegarde dans le dépôt public ;
  - **test de restauration** pas à pas, avec un tableau de suivi ;
  - **surveillance** de `/sante` et page d'état ;
  - **tests de charge** : scénarios et règles ;
  - **SAV**.
  `MISE_EN_PRODUCTION.md` y renvoie.

## Conséquences
- **À décider ou à souscrire par l'utilisateur** :
  - offre Pro de Supabase et option PITR ;
  - service de surveillance et page d'état ;
  - date du test de restauration.
- **Tri par l'IA** des tickets : reporté. Seulement après avoir retiré les données personnelles (règle 11).
- **Pas de migration, pas de nouvelle dépendance.**
