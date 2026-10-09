# ADR 0010 — Abonnement des artisans avec Stripe Billing (F-15)

- Statut : accepté (choix A à E validés le 9 octobre 2026)
- Date : 9 octobre 2026

## Décisions
- **Formules du business plan V6** : Base 150 €, Premium 500 €, Entreprise 1 500 € HT par mois, **3 mois offerts** (essai Stripe de 90 jours). Paramétrées dans la table `plans` (prix, avantages, limites, `ouverte`). La spec (F-15) indiquait 195 € pour la formule de base : les fondateurs ont retenu 150 €.
- **A.** Seule la formule Base est ouverte au lancement (« année 1 : offre unique ») ; Premium et Entreprise s'ouvrent en passant `ouverte` à vrai, puis `pnpm stripe:setup` (portail).
- **B.** Souscription possible une fois le dossier validé.
- **C.** Prix HT, TVA 20 % ajoutée par un taux Stripe (`STRIPE_TAX_RATE_ID`) sur les factures émises par Stripe. TODO(legal) : validation par l'expert-comptable.
- **D.** Accès au service si l'abonnement est en essai, actif ou impayé en cours de relance (`past_due`, délai de grâce des relances automatiques Stripe) ; pas d'accès s'il est impayé définitivement, résilié ou incomplet. Règle dans `packages/core/src/billing.ts` et `app.artisan_subscription_active`.
- **E.** Offre « membre fondateur » : code promo Stripe (Checkout accepte les codes promo), à créer dans Stripe quand la réduction sera décidée.

## Architecture
- Aucune clé Stripe côté navigateur ni côté Vercel : `billing-checkout` et `billing-portal` (Edge Functions, session de l'artisan) créent les sessions ; seul `stripe-webhook` écrit les abonnements (signature vérifiée, idempotence par `webhook_events`).
- Moyens de paiement : carte et prélèvement SEPA (`allowed_payment_method_types`, API `2026-09-30.endive`, SDK `stripe` 23).
- Retour depuis Stripe limité aux origines de `SITE_URLS` (pas de redirection ouverte).
- `pnpm stripe:setup` (idempotent) crée produits, prix (lookup keys), TVA, portail et webhook à partir des formules en base ; les identifiants vont dans le fichier d'environnement, le secret du webhook n'est jamais affiché.
- CI : stripe-mock (image officielle) et webhooks signés par le test ; aucun appel au vrai Stripe.

## Conséquences
- App mobile : aucun bouton ni lien d'achat (CLAUDE.md règle 10) ; l'abonnement se gère sur le web.
- Visibilité de l'artisan (validé + abonnement actif + Stripe Connect) : PR 4.
