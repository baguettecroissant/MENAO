# ADR 0193 — Ouverture instantanée des fiches

- Statut : accepté
- Date : 26 octobre 2026
- Demande de l'utilisateur du 26 octobre 2026 : après les squelettes (ADR 0192), il demande ce qui se fait de mieux dans les applications du moment. Cinq propositions sont validées, « toutes dans cet ordre ». Lot 1 sur 5.

## Décision
- **La fiche se charge avant d'être ouverte** :
  - **au toucher** d'une ligne, dès que le doigt se pose, avant qu'il se relève ;
  - **pour les trois premières lignes** d'une liste, 1,2 seconde après son affichage.
  - Fiches concernées : demande (`opportunite`), chantier (`pro-chantier`), dépense et conversation. Ouvertes depuis Demandes, Chantiers, Devis envoyés, Dépenses et Messages.
- **L'écran ouvert attend le chargement déjà parti** au lieu d'en relancer un, puis ne recharge pas une seconde fois dans les 20 secondes (même règle que le préchargement des onglets).
- **Si la fiche n'est pas encore prête**, son titre (connu de la liste) s'affiche aussitôt, dans le bandeau bleu pour une demande ou un chantier, avec les blocs gris en dessous.
- **Lectures seules** : les fonctions de lecture des fiches (`artisan_request_detail`, `artisan_chantier_detail`, `chantier_messages`, lecture d'une dépense) n'écrivent rien. Charger d'avance ne marque rien comme vu ni comme lu ; la conversation est marquée lue à l'affichage seulement, comme avant.

## Technique
- `lib/screen-cache.ts` :
  - `prefetchScreen` : un chargement à la fois par écran, rien d'écrit en cas d'erreur ;
  - `inflightScreen` et `setScreenPreview` / `readScreenPreview` ;
  - un compteur de « génération » empêche un chargement parti avant un changement de compte ou d'exemples d'écrire ses données ;
  - tests ajoutés.
- `lib/use-focus-data.ts` : attend le chargement en cours plutôt que d'en relancer un.
- `lib/prefetch.ts` : `prefetchOpportunity`, `prefetchChantier`, `prefetchExpense`, `prefetchConversation`. `lib/preload.ts` passe par `prefetchScreen`.
- Clés stables des fiches : `chantierScreenKey`, `opportunityScreenKey`, `expenseScreenKey`, `conversationScreenKey`. Avant, la dépense et la conversation n'étaient pas gardées en mémoire. Le chargement d'une fiche de chantier (`loadArtisanChantierScreen`) est partagé entre l'écran et le chargement d'avance.
- `components/skeletons.tsx` : `DetailSkeleton` (titre connu, bandeau bleu en option). `ListRow` accepte `onPressIn`.
- Pas de nouvelle dépendance, pas de changement de base.
