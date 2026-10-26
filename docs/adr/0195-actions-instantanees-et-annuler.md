# ADR 0195 — Actions instantanées et « Annuler »

- Statut : accepté
- Date : 26 octobre 2026
- Lot 3 sur 5 des idées validées par l'utilisateur le 26 octobre 2026 (« toutes dans cet ordre »), après l'ouverture instantanée des fiches (ADR 0193) et l'attente racontée (ADR 0194).

## Décision
- **L'écran change tout de suite**, sans attendre le serveur. En cas d'échec, il revient comme avant, avec un message.
- **Supprimer une dépense** : plus de confirmation.
  - La dépense disparaît aussitôt et un message « Dépense supprimée — Annuler » reste 5 secondes.
  - La suppression n'est envoyée qu'au bout de ces 5 secondes, sauf « Annuler ».
  - Si l'application est fermée avant, rien n'est supprimé : la dépense réapparaît.
- **Marquer une dépense payée ou à payer** : l'état change aussitôt, puis il est enregistré. Message « Dépense marquée payée — Annuler ».
- **Envoyer un message** :
  - le champ se vide et le message s'affiche aussitôt dans la conversation, estompé, avec « Envoi… » à la place de l'heure ;
  - il est remplacé par le vrai message une fois enregistré ;
  - en cas d'échec, le texte revient dans le champ avec l'erreur.
- Une petite vibration accompagne l'envoi, l'erreur et « Annuler ».

## Technique
- `ui/toast.tsx` : `toast.undo(texte, « Annuler », action)`, affiché 5 secondes (`UNDO_DELAY_MS`), avec son bouton.
- `lib/undo.ts` : `runUndoable` (appliquer, annuler, envoyer après le délai, revenir en arrière si l'envoi échoue).
- `lib/screen-cache.ts` : `invalidateScreen` et `onScreenInvalidated`. L'écran affiché se recharge quand une action est faite ou annulée ailleurs (`use-focus-data`). Test ajouté.
- `lib/pro-expenses.ts` : les dépenses en cours de suppression sont absentes des listes (`hideExpense`, `unhideExpense`).
- `composer.tsx` : `onPending` ; `app/conversation/[id].tsx` affiche les messages en cours d'envoi.
- Pas de nouvelle dépendance, pas de changement de base.
