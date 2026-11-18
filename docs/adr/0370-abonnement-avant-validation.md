# ADR 0370 — Abonnement payé sans attendre la validation du dossier

- Statut : accepté (demande de l'utilisateur du 18/11/2026)
- Fonctionnalité : F-177
- Remplace en partie : ADR 0353 (formule choisie avant la validation, paiement ensuite)

## Contexte

Depuis l'ADR 0353, l'artisan choisissait sa formule pendant l'inscription mais ne pouvait la payer
qu'une fois son dossier validé. Il devait revenir après la validation pour enregistrer sa carte,
une étape de plus au moment où il veut recevoir ses premières demandes.

## Décision

- L'abonnement se paie dès le début du dossier (`subscriptionCheckoutOpen` : brouillon, en
  vérification, validé) ; `billing-checkout` ne refuse plus un dossier non validé.
- La page « Formule » propose directement le paiement Stripe (au mois ou à l'année) avant la
  validation. Rien n'est prélevé pendant les 2 mois d'essai, qui commencent au paiement.
- La visibilité attend toujours la validation (`artisanVisibility`, `app.artisan_is_visible`).
- Dossier refusé : l'équipe MENAO annule l'abonnement dans Stripe avant tout prélèvement (geste
  manuel, choisi par l'utilisateur). Le texte de la page le promet à l'artisan.
- Le choix sans paiement (`PickPlan`, action `choosePlan`) disparaît de l'interface ; la colonne
  `artisans.plan_choisi` et `artisan_choose_plan` restent pour les choix déjà enregistrés.
- L'application native n'est pas concernée (CLAUDE.md règle 10).

## Conséquences

- L'essai commence au paiement, donc parfois quelques jours avant la validation.
- Un refus oublié laisserait un prélèvement partir à la fin de l'essai : à surveiller depuis le
  back-office tant que l'annulation n'est pas automatique.
