# ADR 0044 — Description modifiable à l'étape des critères

- Statut : accepté
- Date : 12 octobre 2026
- Complète F-06 (analyse IA), F-07 (vérification des critères) et l'ADR 0042 (recherche dans l'espace client).

## Contexte
- À l'étape « Vérifiez vos critères de recherche », la description du particulier s'affichait dans un bloc repliable, en lecture seule. Pour la corriger, il fallait tout recommencer : nouvelle saisie, nouveau projet, photos à rajouter.
- C'est pourtant ce texte que l'artisan lit avec la demande. Une dictée mal transcrite, ou une description trop vague, donne aussi une analyse pauvre : pas de métier, critères vides.
- Dans l'espace client, « Retour » menait à la page publique `/recherche`, hors de l'espace.

## Décision
- **Carte « Votre description »**, en tête des critères, avec « Modifier » / Annuler / Enregistrer, comme les cinq cartes de F-07. Un texte long est replié sur quatre lignes (« Lire la suite »).
- **Enregistrer** appelle `analyze-need` avec `projectId`, sans créer de nouveau projet :
  - seul le propriétaire peut modifier un projet, et seulement avant l'envoi de la demande (statuts `brouillon` et `criteres_valides`). Sinon l'interface affiche un message ;
  - même nettoyage des données personnelles avant l'IA, même limite de 20 analyses par heure ;
  - le métier déjà retenu sert d'indice à l'analyse.
- **Les critères encore vides sont complétés ; un choix déjà fait n'est jamais remplacé** (`completeCriteria`, `packages/core`) :
  - les travaux ne sont repris que s'ils relèvent du métier retenu ;
  - une date « inconnue » peut devenir « dès que possible » ou une date précise ;
  - une ville n'est reprise que si aucune n'est choisie. Une adresse n'est reprise que si aucune n'est choisie et qu'elle se trouve dans la ville retenue ; les deux doivent être trouvées par le géocodage. Sans ville dans le nouveau texte, l'adresse est cherchée dans la ville déjà choisie.
- **Le résumé lu par l'artisan et l'indice d'urgence** viennent de la nouvelle analyse. Si l'analyse échoue, seule la description change.
- **Critères complétés** : le projet repasse en `brouillon`, comme après `save_project_criteria`. Le message de confirmation nomme les cartes complétées.
- **« Retour »** mène à « Démarrer un chantier » (`/mon-espace/nouvelle-demande`) pour un compte particulier connecté, et à `/recherche` sinon.

## Conséquences
- À déployer : la fonction `analyze-need`.
- Après l'envoi de la demande, la description ne change plus : l'artisan garde le texte qu'il a reçu.
