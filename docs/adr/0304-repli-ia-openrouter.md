# ADR 0304 — IA : clé Anthropic directe, repli automatique sur OpenRouter

- Statut : accepté (13/11/2026)
- Complète l'ADR 0012

## Contexte

Le 13/11/2026, la clé Anthropic directe (crédits de la Claude Console) a été posée sur staging :
les appels à Claude passent désormais en direct, OpenRouter ne servant plus que si la clé
directe manque. Quand les crédits Anthropic sont épuisés, ou si Anthropic est en panne, les
fonctions d'IA échoueraient alors qu'OpenRouter reste disponible.

## Décision

- Avec les deux clés, `llmConfig()` renvoie le client direct dont `messages.create` rejoue
  **une fois** l'appel via OpenRouter (même requête, nom de modèle d'OpenRouter :
  `claude-haiku-5-5` → `anthropic/claude-haiku-5.5`) quand Anthropic refuse sans que la requête
  soit en cause : crédits épuisés (400 « credit balance »), clé refusée (401, 403), paiement
  requis (402), limite de débit (429), erreur ou surcharge (500 et plus, 529), coupure réseau.
- Pas de repli pour une requête invalide (elle échouerait aussi ailleurs) ni pour un délai
  dépassé (l'attente doublerait).
- Règles pures dans `@menao/core` (`shouldUseBackup`, `openRouterModelName`), testées ; le
  branchement est fait une seule fois dans `supabase/functions/_shared/ai.ts`, sans toucher aux
  fonctions.
- Le repli est signalé dans les journaux de la fonction (statut et modèle seulement, jamais le
  contenu ; règle 11).

## Conséquences

- Garder `OPENROUTER_API_KEY` sur Supabase (repli et transcription de la dictée).
- `ai_runs.model` garde le nom demandé (direct) ; un repli se voit dans les journaux.
- Toutes les fonctions qui importent `_shared/ai.ts` sont à redéployer.
