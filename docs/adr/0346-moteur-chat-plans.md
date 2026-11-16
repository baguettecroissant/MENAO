# ADR 0346 — Moteur du chat « Demander à MENAO » (F-160, lot C)

- Statut : accepté (16/11/2026)
- Fonctionnalité : F-160 ; maquette du lot 59 validée le 16/11/2026 ; calculs : ADR 0345

## Décision

- **Fonction serveur `plan-chat`** (jeton de l'utilisateur) : pour un appel d'offres déjà lu, elle
  envoie au modèle le relevé (pièces avec surface, périmètre, hauteur et origine ; ouvrages écrits ;
  éléments comptés ; symboles par type ; types de plans ; lots), sans nom de client ni de projet,
  et les 8 derniers messages de la conversation.
- **Outils** (`plan-chat-tools.ts`, sans import, testé) : calculer, cloison, plafond, peinture,
  carrelage, plinthes, chercher dans la bibliothèque (fournitures au prix d'achat, ouvrages au prix
  de vente), chiffrer ; puis « repondre » ou « demander_precision », qui terminent le tour. Les
  entrées du modèle sont contrôlées et converties (m → mm, m² → cm²) ; les calculs sont ceux de
  `materials.ts` et `plan-chat-calc.ts` ; les résultats lui reviennent en m, m² et unités, avec
  les étapes et la source des ratios. Les totaux de la réponse sont recalculés par MENAO.
- **Consignes** : aucun chiffre de tête, partir du relevé, signaler ce qui est estimé, demander
  une précision plutôt que deviner, citer la source de chaque mesure et des ratios.
- **Modèle** : celui de la lecture des plans (`planModel`, Opus 5.5 ; `AI_PLAN_MODEL`), raisonnement
  adaptatif, relevé mis en cache ; au plus 8 allers-retours et 2 minutes.
- **Base** : `tender_chat_messages` (RLS : lecture par l'entreprise ou un admin, écriture par
  fonction seulement), `artisan_save_plan_chat` (formule Entreprise via `my_plan_tender`, limite du
  mois), `artisan_plan_chat_quota` ; limite en réglage `plan_chat_questions_mois` (40 par défaut,
  à valider). Plafonds de dépense : 30 questions par heure et par entreprise, 300 en tout.
  pgTAP 165. Journal `ai_runs` : métriques seules (« plan-chat »).

## Conséquences

- Les écrans (panneau à trois colonnes, repérage, Excel, ajout au DPGF) viennent au lot D.
- La relecture en haute définition d'une zone du plan n'est pas encore un outil : le chat répond
  avec le relevé déjà fait.
- Le coût réel par question et la justesse seront mesurés au lot E (estimation et accord avant
  les appels payants).
