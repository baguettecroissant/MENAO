# ADR 0196 — Glisser une ligne pour agir

- Statut : accepté
- Date : 26 octobre 2026
- Lot 4 sur 5 des idées validées par l'utilisateur le 26 octobre 2026 (« toutes dans cet ordre »).

## Décision
- **Glisser une ligne vers la gauche** fait apparaître ses actions à droite, comme dans Mail sur iPhone. Un toucher agit et referme la ligne ; une petite vibration à l'ouverture et au toucher.
- **Dépenses** :
  - « Payée » (vert), ou « À payer » si elle l'est déjà : instantané, avec « Annuler » (ADR 0195) ;
  - « Supprimer » (rouge) : la même suppression annulable que dans la fiche.
- **Demandes en attente de réponse** : « Répondre » (bleu) ouvre directement la prise de rendez-vous.
- **Inactif pendant les exemples** (ADR 0184). Les mêmes actions restent dans la fiche, pour les lecteurs d'écran et pour qui ne glisse pas.

## Technique
- `react-native-gesture-handler`, déjà installé avec Expo : `ReanimatedSwipeable`, avec `GestureHandlerRootView` à la racine (`app/_layout.tsx`).
- `components/list-kit.tsx` : `Swipe` (actions, couleur, coins arrondis pour les cartes). `ListRow` a un fond plein pour glisser par-dessus ses boutons.
- `expenses-screen.tsx` : état « payée » affiché avant le serveur, suppression annulable. `requests-screen.tsx` : « Répondre ».
- Pas de nouvelle dépendance.
