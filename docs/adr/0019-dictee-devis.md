# ADR 0019 — Dictée intelligente du devis

- Statut : accepté
- Date : 10 octobre 2026

## Contexte
F-19 : l'artisan dicte son devis (2 minutes au plus, pause et reprise, suppression), relit la transcription, peut la sauvegarder, puis génère des lignes toujours modifiables (maquettes « Dictez votre devis »). Choix des modèles validés le 9 octobre 2026 : Sonnet 5.5 pour `quote-from-voice`, Voxtral pour la transcription (ADR 0012). Pas de données personnelles dans les prompts ni les journaux (CLAUDE.md règle 11).

## Décisions
- **Enregistrement par étapes** : chaque étape (de « Dicter » à « Mettre en pause ») est un enregistrement autonome, transcrit par la fonction `transcribe` existante et ajouté au texte.
  - 2 minutes au total ; le texte reste modifiable avant la génération.
  - Pas de réécoute de l'audio en V1 (le texte transcrit fait foi).
- **Sauvegarde** : « Sauvegarder cet enregistrement » garde le **texte** de la dictée, une par chantier (`quote_dictations`), lisible par l'artisan seul. L'audio n'est jamais conservé.
- **`quote-from-voice`** (artisan connecté, chantier en attente de devis, 30 appels par heure) :
  - retire e-mails, téléphones et noms connus (client, artisan) avant l'envoi ;
  - appelle Sonnet 5.5 en sortie structurée (schéma de `packages/core`), valide la réponse avec Zod, puis la normalise avec `normalizeVoiceLines` : millièmes et centimes, unité et taux contrôlés, lignes inutilisables écartées, 50 au plus ;
  - n'invente jamais de prix : un prix non dicté devient 0 €, à compléter.
  - Le journal `ai_runs` ne garde que des métriques.
- **Taux de TVA** : celui dicté, sinon celui proposé par l'éditeur ; 0 % en franchise en base.
- **Lignes à vérifier** : les lignes générées s'ajoutent à l'éditeur avec la mention « À vérifier ». Elles disparaissent quand la ligne est relue (modifiée et validée) ou après l'enregistrement. L'artisan enregistre comme pour une saisie manuelle : la base recalcule tout (ADR 0018).
- **CI** : le faux serveur d'IA reconnaît la balise `<dictee>` et renvoie deux lignes fixes ; le micro est simulé par Chromium.

## Conséquences
- En production, des clés directes (Anthropic, Mistral) sont recommandées plutôt qu'OpenRouter ; le modèle se règle par `AI_QUOTE_MODEL`.
- Une réécoute de l'audio (bouton ▶ de la maquette) demanderait de conserver l'audio : à décider si les artisans en ont besoin.
