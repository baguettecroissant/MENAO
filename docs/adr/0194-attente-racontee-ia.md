# ADR 0194 — Attente racontée pendant que l'IA travaille

- Statut : accepté
- Date : 26 octobre 2026
- Lot 2 sur 5 des idées validées par l'utilisateur le 26 octobre 2026 (« toutes dans cet ordre »), après l'ouverture instantanée des fiches (ADR 0193).

## Décision
- Quand l'IA travaille (de 3 à 8 secondes), l'application **raconte ce qu'elle fait** au lieu d'afficher un message fixe ou une roue :
  - le logo MENAO respire ;
  - les étapes apparaissent l'une après l'autre ; les précédentes passent en gris avec une coche ;
  - la dernière reste affichée jusqu'au résultat.
- **Quatre attentes concernées** :
  - lecture d'une facture ou d'un ticket de dépense (« Je lis la pièce… », « Je relève les montants et la TVA… ») ;
  - lecture d'un document du dossier, Kbis ou assurance (« Je vérifie les dates de validité… ») ;
  - devis à partir de la dictée (« Je découpe le travail en lignes… ») ;
  - description d'une photo par le particulier (« Je repère ce qu'il faut faire… »).
- L'analyse d'une demande garde son animation propre.
- **Honnêteté** : les étapes sont génériques et rythmées dans l'application (une toutes les 1,4 s), pas un suivi réel du serveur. Elles disent ce que fait l'IA sans promettre de résultat. Le message de réussite ou d'échec reste celui d'avant.
- Annoncée aux lecteurs d'écran (`role="status"`) ; sans mouvement si « Réduire les animations » est activé.

## Technique
- `components/ai-progress.tsx` (`AiProgress`), textes `fr.aiProgress`.
- Branché dans `expense-form.tsx`, `app/pro-document.tsx`, `quote-dictation.tsx` et `app/recherche.tsx`. Les anciens textes d'attente devenus inutiles sont retirés.
- Pas de nouvelle dépendance.
