# ADR 0231 — Agents IA des formules, lot 1 : droits, minutes de voix et suivi

- Statut : accepté
- Date : 6 novembre 2026
- F-82, demandé le 6 novembre 2026 (« go pour le lot 1 puis le lot 3, comme tu recommandes »). Mise en œuvre du rapport « Agents IA de MENAO : coûts et formules », validé le même jour :
  - l'écrit est inclus dans toutes les formules ;
  - la voix est vendue en minutes incluses à partir de Premium : 300 minutes en Premium, 1 000 en Entreprise ;
  - recharges réservées à Premium et Entreprise (lot 2).

## Décision
- **Droits par formule, en base** (`plans.limites.agents`), modifiables sans déploiement :
  - `voix_minutes` : 0, 300 ou 1 000 ;
  - `secretaire`, `devis_conversation`, `comptable_avance` : agents inclus ;
  - `rappels` : `non`, `sms` ou `appel` ;
  - `lignes` : 0, 1 ou 3 ;
  - `recharges` : la formule peut acheter des minutes.
  - La formule retenue est celle de l'abonnement en cours, essai compris, impayé de moins de 15 jours compris (`app.artisan_subscription_active`). Sans abonnement : aucun agent vocal.
- **Minutes par mois civil, heure de Paris** : remise à zéro le 1er, plus simple à comprendre que la période de facturation (et identique pour un abonnement annuel).
- **Chaque appel compté une seule fois** (`voice_usage`, identifiant d'appel unique), par l'Edge Function avec le rôle service (`voice_record_usage`).
  - Les minutes incluses servent d'abord ; au-delà, le dépassement est débité du registre des minutes rechargées (`voice_credits` : recharge, geste de l'équipe, consommation).
  - Un appel en cours n'est jamais coupé : il peut faire passer le registre en négatif, et ce négatif se reprend sur la recharge suivante.
- **Alertes à l'artisan**, une fois par mois chacune (`voice_alerts`) : à 80 % des minutes incluses (`agents_minutes_80`), puis à épuisement (`agents_minutes_epuisees`).
  - À épuisement, la secrétaire dédiée (lot 3) passera en prise de message courte : nom et numéro du client, sans rendez-vous. Le client de l'artisan n'est jamais laissé sans réponse.
- **« Vos agents IA »** dans « Ma formule » (`/pro/onboarding/formule#agents`) : agents compris dans la formule (« bientôt disponible » pour ceux pas encore construits), jauge des minutes du mois, minutes rechargées, date de remise à zéro, derniers appels. Consultation seulement : les recharges s'achèteront sur le site (règle 10).
- **Back-office** :
  - « Suivi de l'IA » montre les minutes de voix par artisan sur le mois et le coût estimé à 0,09 € la minute (`VOICE_COST_CENTS_PER_MINUTE`) ;
  - un admin peut offrir des minutes (`admin_grant_voice_minutes`, motif obligatoire, journalisé), par exemple pour les essais.
- **Écrit** : les agents écrits gardent les limites horaires par compte et par adresse IP déjà en place dans chaque Edge Function. Aucune limite visible n'est ajoutée.

## Conséquences
- Test pgTAP `121_agents_ia_fondations`.
- `@menao/core` : `parseAiAgents`, `voiceGauge`, `VOICE_ALERT_RATIO`, `VOICE_COST_CENTS_PER_MINUTE`.
- Pas de nouvelle ligne dans le comparatif public des formules : à ajouter seulement sur demande, car le texte du site est validé par les associés.
- Lot 2 : recharges par Stripe (paiement unique, crédit idempotent). Lot 3 : secrétaire dédiée, qui compte ses appels avec `voice_record_usage`.
