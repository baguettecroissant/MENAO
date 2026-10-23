# ADR 0179 — Compréhension en direct pendant la saisie

- Statut : accepté
- Date : 23 octobre 2026
- Deuxième des pistes choisies par l'utilisateur le 23 octobre 2026, après les propositions instantanées (ADR 0178) : montrer au particulier ce que MENAO a compris, et lui poser la question qui manque, avec des réponses en un toucher.

## Décision
- **« Compris : »** sous le champ, en pastilles : le métier (nom du référentiel), la pièce, la ville, la surface ou la quantité, le délai.
  - Seulement ce que le texte dit : une ville et une surface sont affichées si elles sont réellement écrites ; un métier, s'il fait partie des métiers actifs.
  - Les pastilles se mettent à jour à chaque suggestion, après une pause de frappe.
- **La question qui manque**, avec 2 à 4 réponses (« Quelle surface environ ? [Moins de 5 m²] [5 à 10 m²] [Plus de 10 m²] », « Pour quand ? [Dès que possible] [Dans le mois] [Sans urgence] ») :
  - un toucher ajoute la réponse à la fin de la description, puis la question suivante arrive ;
  - priorité : surface ou quantité, puis délai, puis type de logement ou état ;
  - jamais sur la ville (elle se tape : c'est une idée « Ville ») ni sur une information déjà donnée ;
  - pas de question tant que les travaux ne sont pas décrits.
- Les réponses complètent le texte, que l'analyse lit ensuite comme avant (ADR 0012). Aucune nouvelle donnée n'est enregistrée.
- Les idées en pastilles (ADR 0177) ne reprennent pas le sujet de la question.

## Technique
- **Un seul appel**, celui des suggestions (`suggest-need`) : la sortie structurée gagne `compris` et `question`.
- **Liste des métiers dans la consigne** : elle est relue par la fonction au plus toutes les 10 minutes (cache de l'instance), en parallèle des limites de fréquence. Elle change rarement, donc la consigne reste en cache chez le fournisseur.
- **`normalizeNeedSuggestion`** :
  - métier accepté par son code ou son nom (« Électricien »), sans accents ni majuscules ;
  - ville et surface gardées seulement si elles figurent dans le texte ;
  - question écartée si elle porte sur la ville ou sur une information comprise, si une réponse contient « … », ou s'il reste moins de 2 réponses.
- **Évaluation** (30 cas fictifs, nouvelles mesures : métier compris, question posée, question redondante) :
  - métier compris juste : 90 % ;
  - informations essentielles proposées (en idée ou en question) : 100 % ;
  - question sur une information déjà donnée : 0 ;
  - temps de réponse médian : 2,5 s via OpenRouter (contre 1,9 s sans la compréhension, la réponse étant plus longue) ;
  - coût : 0,005 $ la passe de 30 cas, soit environ 0,0002 $ par suggestion.

## Conséquences
- Faux serveur d'IA : métier, pièce et question dans sa réponse. Le test de bout en bout vérifie « Compris : Plombier · Salle de bain », la réponse à la question et l'idée « Ville ».
- Pas de migration ni de nouvelle dépendance. Après la fusion : `functions deploy suggest-need` sur staging.
