# ADR 0288 — Appels d'offres : DPGF en PDF lu par l'IA (F-137)

- Statut : accepté
- Date : 12 novembre 2026
- Suit l'ADR 0287 (appels d'offres, PR A). Même modèle que la lecture des dépenses (ADR 0186).

## Contexte
Beaucoup d'architectes envoient leur DPGF en PDF, sans l'Excel. L'utilisateur a demandé que le lot 1 accepte les deux formats.

## Décision
- **Dépôt** : `.xlsx` ou `.pdf`, dans le même bucket `tender-files`, qui acceptait déjà le PDF.
- **Lecture** (Edge Function `tender-sheet`, `pdf.ts`) :
  - Le PDF part au modèle en base64 (bloc `document`), via le fournisseur sous contrat (CLAUDE.md, règle 11). Rien n'est conservé, sauf les métriques (`ai_runs`, `read-dpgf`).
  - La réponse suit un schéma JSON (`dpgfReadingJsonSchema`). Pour chaque ligne, dans l'ordre : `titre` ou `poste`, numéro, désignation, unité et quantité telles qu'imprimées. Les totaux, la TVA et les en-têtes répétés sont exclus.
  - Le document est signalé quand il est illisible ou quand ce n'est pas un DPGF.
- **Modèle** : `AI_DPGF_MODEL`, sinon celui des devis (Sonnet), car un tableau dense sur plusieurs pages demande plus de soin qu'une facture. La réponse est limitée à 16 000 jetons, soit environ 450 lignes ; au-delà, l'artisan est invité à déposer l'Excel.
- **Mise en forme** : `normalizeDpgfReading` (`packages/core/src/dpgf.ts`) rend les mêmes lignes qu'une feuille Excel (lots, unités ramenées à celles des devis, quantités en millièmes), avec `sheetRow` à null. La suite est inchangée : prix des anciens devis, chiffrage, PDF.
- **Garde-fous** :
  - le fichier doit commencer par `%PDF-` ;
  - 20 lectures de PDF par heure et par utilisateur, en plus de la limite générale ;
  - un bandeau rappelle de vérifier chaque poste, son unité et sa quantité.
- **Export Excel** d'un DPGF venu d'un PDF : il n'y a pas de fichier de l'architecte à réécrire. On produit un classeur MENAO (`buildTenderWorkbook`) : postes, quantité du DPGF, quantité de l'entreprise, prix unitaire, total par formule, total HT.
- **Tests** :
  - `packages/core` : normalisation et schéma ;
  - faux serveur d'IA (balise `<dpgf>`) et étape PDF dans l'e2e `appels-offres` ;
  - aucun appel payant en CI.

## Coût et évaluation
Aucun appel réel n'a encore été fait. Avant d'ouvrir la fonction aux artisans, il faut :
- mesurer quelques lectures sur de vrais DPGF en PDF (anonymisés) ;
- chiffrer le coût par dossier à partir des jetons mesurés (`ai_runs`) ;
- obtenir l'accord de l'utilisateur avant ces appels payants.
