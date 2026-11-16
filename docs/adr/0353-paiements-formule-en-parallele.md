# ADR 0353 — Paiements et formule ouverts en même temps que les documents (F-163, lot 62)

- Statut : accepté (16/11/2026)
- Fonctionnalité : F-163 ; maquette du lot 62. Remplace la règle d'ouverture de l'ADR 0215.

## Constat

Le compte de paiement ne s'ouvrait qu'à l'envoi du dossier (ADR 0215) et la formule seulement
après la validation. Or l'envoi exige un dossier complet : un artisan qui attend un document
(attestation décennale de son assureur) ne pouvait rien faire d'autre. Avant l'envoi, l'écran
« Recevoir les paiements » n'était qu'une phrase, sans bouton, contredite par son sous-titre.

## Décision

- **Stripe dès le début du dossier** : `connectOnboardingOpen` accepte aussi le statut
  `brouillon` (site, application, fonction `connect-onboarding`). Toujours fermé pour un dossier
  refusé ou radié. L'écran rappelle qu'aucune demande ni aucun paiement n'arrive avant la
  validation : la visibilité exige toujours validation, abonnement et compte actif.
- **Formule choisie sans payer** : avant la validation (`planChoiceOpen` : `brouillon`,
  `en_verification`), l'artisan choisit sa formule ; le choix est gardé dans
  `artisans.plan_choisi` par `artisan_choose_plan` (titulaire seulement, formule ouverte). Aucun
  abonnement n'est créé et rien n'est prélevé. Une fois l'entreprise validée, l'écran habituel
  propose le paiement (au mois ou à l'année) et rappelle « Votre choix » ; il peut encore changer.
  `billing-checkout` refuse toujours un dossier non validé.
- **« Mon dossier »** : le bloc des deux étapes s'appelle « À faire en attendant », marqué
  « Ouvert maintenant » ; la formule choisie y apparaît (« Choisie »).
- **L'envoi reste réservé au dossier complet** : l'équipe vérifie en une fois, et aucun artisan
  n'est validé sans ses documents obligatoires.

## Conséquences

- Des comptes Stripe peuvent être créés pour des inscriptions jamais terminées. Risque accepté :
  un artisan non validé n'est pas visible et ne peut rien encaisser.
- `plan_choisi` est une intention, pas un abonnement : l'accès reste décidé par `subscriptions`.
- À déployer après fusion : la migration et la fonction `connect-onboarding`.
