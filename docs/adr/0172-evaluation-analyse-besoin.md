# ADR 0172 — Évaluation de l'analyse du besoin sur des descriptions types

- Statut : accepté
- Date : 23 octobre 2026
- Demandée le 23 octobre 2026, à la fin du plan des chantiers à plusieurs métiers (ADR 0167 à 0170) : vérifier l'IA sur de vraies descriptions, avec des appels payants validés par l'utilisateur.

## Décision
- **Jeu de 40 descriptions fictives** (`supabase/functions/analyze-need/eval/cases.json`).
  - Contenu : réparations simples, pièges, rénovations à plusieurs métiers, dictées avec fautes, une demande vague et une tentative de détournement de la consigne.
  - Pour chaque cas : les métiers principaux acceptés, les métiers attendus dans le chantier et ceux tolérés en plus.
- **Script d'évaluation** (`eval/run.ts`, Deno).
  - Même chemin que l'Edge Function, dont la consigne, l'appel au modèle et le choix du modèle de secours passent dans `analysis.ts` sans changement de comportement.
  - Il mesure le métier principal, la couverture des métiers attendus (IA seule, puis avec les chantiers composés), les métiers proposés en trop, la stabilité entre passes et le coût réel lu sur la clé OpenRouter.
  - Il ne fait aucun appel avec `--estimation`, s'arrête seul à un plafond de dépense et n'enregistre rien en base.
- **Toute exécution payante se fait avec l'accord de l'utilisateur.**

## Résultats du 23 octobre 2026
Modèle de production (Haiku 5.5, Sonnet 5.5 en secours), 2 passes de 40 cas, coût réel 0,044 $.
- **Métier principal juste** : 39/40 puis 38/40.
- **Couverture des métiers attendus** (12 chantiers à plusieurs métiers) : 94 % par l'IA seule, 98 % avec les chantiers composés.
- **Aucun métier proposé en trop**, sur les 80 analyses ; aucun pour les réparations simples ni pour les pièges.
- **Modèle de secours** appelé dans 3 puis 5 cas.
- **Variations entre passes** : seulement des métiers facultatifs, ou deux métiers principaux défendables (plombier ou carreleur pour une salle de bains).
- **Défaut relevé** : pour l'aménagement de combles, l'IA prend le maçon comme métier principal. Les autres métiers du chantier restent proposés.

## Tentative de correction, abandonnée (23 octobre 2026)
- **Formulation essayée**, dans la règle du métier principal : « un aménagement intérieur (combles, garage, sous-sol transformés en pièce à vivre) relève du plaquiste, sauf gros œuvre demandé (dalle, mur porteur, ouverture) ».
- **Réévaluation** (2 passes, 0,048 $) :
  - les combles passent bien au plaquiste, et la couverture des métiers attendus monte à 100 % ;
  - mais le parquet n'a plus de métier principal (confiance 0,3 à 0,4), les volets motorisés une fois sur deux non plus, et la véranda « sur une dalle existante » passe au maçon.
- **Bilan** : métier principal juste dans 91 % des cas, contre 96 % sans la formulation. Elle n'est donc pas retenue.
- **Pour une nouvelle tentative** : préférer une précision limitée aux seules combles, puis réévaluer.

## Conséquences
- **Modèle** : on garde Haiku 5.5 en principal. La comparaison avec Sonnet seul n'a pas été lancée.
- **Après la fusion** : redéployer `analyze-need` (code déplacé, comportement identique).
- **Pas de migration ni de nouvelle dépendance.**
