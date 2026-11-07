# ADR 0244 — Rubrique « Secrétaire » dans le menu

- Statut : accepté
- Date : 7 novembre 2026
- Refonte de l'interface, premier lot : l'utilisateur trouve la secrétaire « cachée » (Mon profil › Ma formule, sous les minutes) ; il choisit une rubrique dans le menu, en revenant sur la règle des 7 rubriques de l'ADR 0188.

## Décision
- **Huit rubriques** : la « Secrétaire » s'insère entre Messages et Argent, avec une pastille pour les appels pas encore traités ; patron et chef d'équipe (droit `secretary`, ADR 0241).
- **Page `/pro/secretaire`**, sur le modèle des logiciels de téléphonie : d'abord « À traiter » (une ligne par appel : qui, pourquoi, quand, rendez-vous pris ou message, « Appeler » et « Traité » d'un geste, lien vers la semaine de l'agenda pour un rendez-vous), puis « Traités », puis « Réglages » (essai, nom annoncé, rendez-vous, consignes). Minutes restantes du mois en tête, avec « Recharger » pour le patron.
- **Hors formule** : présentation de la secrétaire, lien vers les formules pour le patron ; « Votre patron peut l'activer » pour le chef. Rien dans l'application pour l'instant (règle 10 : aucune formule ni achat).
- **Ma formule** garde les minutes et les recharges ; la grande carte est remplacée par un lien vers la rubrique.
- La présentation ne dit plus « Elle dit qu'elle est une intelligence artificielle » : la phrase a été retirée de ses premiers mots le 6 novembre.

## Conséquences
- Mêmes briques que les listes (ADR 0189) : en-tête, filtres, cadre de lignes.
- Suite de la refonte : écran par écran, en s'inspirant des meilleurs logiciels du métier et de l'ergonomie.
