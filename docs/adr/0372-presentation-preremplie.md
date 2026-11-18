# ADR 0372 — Présentation de la fiche préremplie

- Statut : accepté (retour d'un essai réel du 18/11/2026, go de l'utilisateur)
- Fonctionnalité : F-14

## Contexte

Un ancien maçon a trouvé l'inscription trop longue. À l'étape « Votre fiche », le champ de
présentation (100 caractères au moins) arrivait vide ; le brouillon construit par MENAO
(`presentationDraft`, à partir de l'entreprise, des métiers, de la zone et de l'ancienneté) n'était
proposé que par un petit lien « Proposer un texte », facile à manquer.

## Décision

Sans présentation enregistrée, le champ arrive rempli avec ce brouillon, sur le site comme dans
l'application, avec une phrase : « Nous avons écrit ce texte avec les informations de votre
entreprise. Relisez-le, modifiez-le si besoin, puis enregistrez. » L'artisan doit toujours
enregistrer lui-même : rien n'est publié sans son geste. « Proposer un texte » reste pour remettre
le brouillon s'il a tout effacé. Pas d'IA : le brouillon est un modèle, sans coût.
