# ADR 0200 — Comparatif des formules et paiement à l'année

- Statut : accepté (lot 1 : page Espace Pro ; lot 2 : paiement à l'année dans Stripe, à venir)
- Date : 27 octobre 2026
- Demande de l'utilisateur du 27 octobre 2026, sur le modèle de la page tarifs de TrustUp Pro :
  - une comparaison détaillée des fonctionnalités, pour les 3 formules ;
  - au mois sans engagement (150 €, 500 € ou 1 500 € HT) ;
  - à l'année payée d'avance, avec 2 mois offerts ;
  - une garantie qui rend l'engagement honnête ;
  - un engagement qui commence au premier paiement, après les 2 mois d'essai, et qui est affiché clairement au moment de payer.
- Contenu des formules : proposition du 27 octobre (Base pour l'artisan seul, Premium pour l'entreprise qui grandit, Entreprise pour plusieurs équipes), validée par l'utilisateur (« je te fais confiance »). Il reste à revoir avec son associé : il est paramétré en base pour être modifié sans déploiement.

## Décision
- **Section Formules de `/pro`** :
  - bouton « Au mois / À l'année (2 mois offerts) » ;
  - trois cartes : accroche, prix, essai gratuit de 2 mois pour la formule ouverte, points forts ;
  - un encart en trois points : au mois sans engagement, à l'année, garantie de l'engagement ;
  - le tableau « Comparez les fonctionnalités » par catégorie (demandes, devis et signature, paiements, chantiers et planning, gestion, visibilité, équipe et accompagnement).
- **À l'année** : 12 mois payés d'avance au prix de 10, soit 1 500 €, 5 000 € et 15 000 € HT. L'équivalent mensuel est affiché.
- **Garantie** : moins de 4 demandes 2 mois complets de suite, ou activité cessée, et l'artisan part sans frais. Les demandes qu'il apporte lui-même ne comptent pas (ADR 0198).
- **Contenu paramétré en base** (spec F-15 : « jamais en dur ») :
  - `plans.accroche` ;
  - `plans.avantages`, mis à jour ;
  - `plans.limites` : `comptes` 1 / 3 / 10, `metiers` 2 / illimité / illimité, `demandes_mois` 10 / 25 / illimité ;
  - une nouvelle table `plan_features` (catégorie, libellé, détail, valeur par code de formule : inclus, non inclus ou court texte, ordre). Elle est lisible par tous et ne s'écrit qu'avec la clé serveur.
- **Ce qui est livré, ce qui ne l'est pas** :
  - toutes les lignes cochées pour Base existent déjà ;
  - les lignes propres à Premium et Entreprise restent à construire : brouillon de devis, échéancier en plusieurs tranches, marge par chantier, comptes d'équipe, avis Google, devis pré-générés, interlocuteur dédié. Ces formules restent « Bientôt disponible » (`ouverte` à faux) ;
  - les limites (`demandes_mois`, `metiers`, `comptes`) ne sont pas encore appliquées par le classement ni l'inscription.
- **Volontairement absents du comparatif** :
  - la « priorisation algorithmique » du BP V6 : tant qu'elle n'est pas tranchée, la note sous les formules garde « toute mise en avant est signalée » ;
  - le repère de prix entre concurrents (`TODO(legal)`, droit de la concurrence).
- **Signature** : « avec un code de vérification ». Le code part par SMS ou par e-mail selon l'offre DocuSeal (ADR 0022).

## Technique
- `packages/core/src/plans.ts`, avec ses tests : `ENGAGEMENT_MONTHS`, `ANNUAL_FREE_MONTHS`, `annualPriceCents`, `monthlyEquivalentCents`, `ENGAGEMENT_GUARANTEE`, `engagementExitAllowed` (pour le lot 2 et l'équipe), `planFeatureCell`, `planComparison`.
- Site : `PricingPlans` (composant client, choix mois ou année) et `PlanComparisonTable` (tableau à largeurs fixes, sans défilement de côté sur téléphone, en-tête des formules collé sous l'en-tête du site).
- Migration `comparatif_formules` et test pgTAP `100_comparatif_formules` (RLS, lecture publique, aucune écriture depuis un compte).
- Pas de nouvelle dépendance. Textes dans `fr.ts`. La FAQ de `/pro` est mise à jour (prix, arrêt de l'abonnement).

## Lot 2 (à faire, accord demandé avant de toucher à Stripe)
- Prix annuels dans Stripe (`pnpm stripe:setup`, clés `menao_*_annuel`).
- Choix mois ou année dans « Ma formule », engagement et date de fin affichés au moment de payer.
- Pas de résiliation avant la fin de l'engagement dans le portail, sauf garantie ou cessation, traitées par l'équipe.
- CGV artisans : engagement, garantie, pas de reconduction automatique pour un an, 14 jours de rétractation pour les inscriptions hors établissement (`TODO(legal)`, article L221-3 du code de la consommation).
