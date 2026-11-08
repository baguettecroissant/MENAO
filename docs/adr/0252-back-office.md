# ADR 0252 — Back-office repensé (refonte « Nette », lot 7)

- Statut : accepté
- Date : 8 novembre 2026
- Suite des ADR 0245 à 0251. Back-office maquetté (ordinateur, téléphone) et validé le 8 novembre. Site seulement : l'application n'a pas de back-office.

## Décision
- **Vue d'ensemble** : grand titre et « En direct » ; bandeau de chiffres (artisans visibles, demandes sur 7 jours, devis signés sur 30 jours, abonnés payants ; « urgent » sur téléphone) ; « À traiter maintenant » en **une seule liste** triée par urgence, chaque élément avec ses pastilles d'urgence et de pôle, son échéance et un bouton ; filtres par pôle en pastilles bleu nuit ; à droite l'activité en direct puis les chiffres détaillés.
- **Dossiers artisans** : grand titre, chiffres par statut (à vérifier, validés, refusés, suspendus), filtres soulignés, tableau en carte avec l'artisan (initiale, métiers, SIRET), **l'état de chaque document** (Kbis, décennale, RC Pro, identité, URSSAF : vérifié, à vérifier, refusé, manquant), la date d'envoi et les points d'attention.
- **Dossier à vérifier** : en-tête collé avec initiale, grand titre et état ; « À vérifier » en carte bleu clair ; le dossier à gauche et la **décision collée à droite** en grand écran (en bas sur téléphone, le bouton « Décider » y mène).
- **Dossiers et messages** : grand titre, chiffres (à traiter et litiges, en retard, mes tickets), recherche et filtres gardés, une ligne par ticket avec le type en pastille, le demandeur, l'échéance et l'état.

## Conséquences
- Mêmes briques que l'espace pro (`MoneyFigures`, `SheetChip`, `sheetCard`).
- Écarts assumés : l'état des documents dans la liste est celui de la vérification de l'équipe (la lecture de l'IA reste dans la fiche du dossier) ; pas de nouveau résumé de l'IA en tête de la fiche (« À vérifier » liste déjà les points à contrôler) ; les chiffres détaillés restent sous l'activité.
