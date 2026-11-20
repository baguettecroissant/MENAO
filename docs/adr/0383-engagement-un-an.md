# ADR 0383 — Abonnement artisan : engagement d'un an pour tous, arrêt dans MENAO

- Statut : accepté (décisions des associés du 20/11/2026 ; maquette du lot 74 validée le 20/11/2026,
  « je valide, garde le paiement d'avance »)
- Fonctionnalité : F-184. Remplace la partie « au mois sans engagement » et la garantie de l'ADR 0200.

## Contexte

L'abonnement se payait au mois sans engagement, ou à l'année payée d'avance avec un engagement de
12 mois et une garantie (moins de 4 demandes 2 mois de suite : sortie sans frais). L'essai de
60 jours démarrait au paiement, souvent pendant la vérification du dossier, et la résiliation se
faisait dans le portail Stripe. Les associés ont tranché les 12 décisions du document « Politique
de prix et d'engagement » : engagement d'un an pour tous, reconduction tacite, préavis de 3 mois,
résiliation en ligne ou par recommandé, aucune sortie anticipée, aucune contrepartie, essai de
2 mois à partir de la mise en ligne, carte (prélèvement à étudier), hausse de prix à la
reconduction, Entreprise comme les autres, commercial par lien (inscription en ligne par l'artisan).

## Décision

- **Engagement** : 12 mois fermes à compter du premier paiement (fin de l'essai), reconduits
  tacitement par périodes de 12 mois ; payés chaque mois ou d'avance (2 mois offerts, gardé).
  Calculs en jours civils à Paris dans `packages/core/src/subscription-term.ts` (échéance comptée
  depuis le premier paiement, date limite = veille des 3 mois avant l'échéance, rappel 30 jours
  avant), reproduits en base par `app.subscription_term_dates`.
- **Case d'engagement** distincte des conditions de vente, toutes deux exigées avant Stripe
  (`PlanCheckout`, action `startCheckout`, `billing-checkout`). Preuve conservée dans
  `subscription_term_acceptances` (date, heure, texte exact, version, formule, périodicité ; lecture
  par l'artisan et l'administration, écriture par le serveur seul) ; CGV ajoutées à
  `legal_acceptances` (version « projet »). Version de la case en métadonnée Stripe, recopiée par le
  webhook dans `subscriptions.engagement_version` : un abonnement souscrit avant reste sans
  engagement (`engagement_version` nulle) et garde l'arrêt en fin de période.
- **Essai à la mise en ligne** : Checkout pose une fin d'essai provisoire (365 jours) ; quand la
  fiche devient visible (`app.artisan_is_visible`), `app.dispatch_trial_starts` (pg_cron, 5 minutes)
  appelle `billing-go-live` (secret partagé de notify), qui ramène la fin d'essai à 60 jours après la
  mise en ligne chez Stripe (sans prorata) et note `essai_demarre_le`.
- **Arrêt dans MENAO** (`/pro/onboarding/formule/arreter`, `billing-cancel`) : fiche pas encore en
  ligne, arrêt immédiat ; pendant l'essai, fin de l'essai sans prélèvement ; engagé, arrêt à
  l'échéance (`cancel_at` à minuit, Paris, sans prorata ; fin de période pour l'année), ou à
  l'échéance suivante si la date limite est passée ; motif facultatif. Le portail Stripe ne permet
  plus de résilier (`scripts/stripe-setup.mjs`) : il garde moyen de paiement, factures et
  changement de formule.
- **« Ma formule »** : statut, premier prélèvement, engagement, date pour renoncer sans frais, puis
  renouvellement et date limite d'arrêt, ou fin d'abonnement demandée (`subscriptionTermSummary`).
- **E-mails** (jamais en push ni dans l'application, règle 10) : fin d'essai 7 jours puis la veille
  (`essai_fin_proche`), reconduction 30 jours avant la date limite (`abonnement_reconduction`),
  confirmation d'arrêt par déclencheur (`abonnement_arret`) ; tâche `menao-rappels-engagement`.
- **Garantie retirée** partout (page Pro, formules, comparatif, campagne, assistants, guide des
  commerciaux) ; textes « sans engagement » adressés aux artisans réécrits ; le copilote signale
  « sans engagement » comme une erreur.

## Conséquences

- Les CGV restent hors ligne jusqu'à la relecture de l'avocat (TODO(legal) : cumul des clauses,
  rétractation, majoration d'impayé, plafond de hausse). La case renvoie à la page provisoire.
- Le portail Stripe doit être reconfiguré sur chaque environnement (`pnpm stripe:setup`).
- Application iPhone : elle affiche l'état de la formule sans achat ; l'arrêt se fait sur le site
  (lot suivant pour les dates d'engagement dans l'application).
- Hors de ce lot : prélèvement SEPA à part entière, mention de rétractation pour les inscriptions
  faites avec un commercial (à rédiger avec l'avocat).
