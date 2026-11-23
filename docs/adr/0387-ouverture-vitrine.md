# ADR 0387 — Ouverture de la vitrine, demandes et paiements fermés

- Statut : accepté (23 novembre 2026)
- Fonctionnalité : F-188

## Contexte

Les dirigeants veulent ouvrir menao.fr au public dès maintenant, pour le référencement et pour faire
découvrir MENAO au public et aux futurs collaborateurs (artisans, conseillers). Or le site tourne
sur la base de staging, Stripe y est en mode test et le lancement est prévu au printemps 2027. Le
compte Vercel n'est pas accessible depuis le poste de développement.

## Décision

- Un interrupteur dans le cœur (`packages/core/src/launch.ts`) : `SITE_OPEN = true`,
  `REQUESTS_OPEN = false`, `PAYMENTS_OPEN = false`. Chacun s'ouvre en passant sa valeur à `true`.
- **Site ouvert** : la page d'attente ne s'applique plus, même si `PRELAUNCH_ACCESS_CODE` reste dans
  Vercel ; l'indexation s'ouvre sur le déploiement de production de menao.fr (`VERCEL_ENV` +
  adresse du site), sans attendre `ALLOW_INDEXING`.
- **Demandes fermées** : la saisie (`/recherche`), la demande préparée et le widget des partenaires
  affichent « Les demandes de devis ouvrent au printemps 2027. » avec un lien vers l'espace artisans ;
  l'envoi aux artisans est refusé côté serveur ; l'appli affiche le même écran.
- **Paiements fermés** : `billing-checkout`, `billing-topup`, `billing-portal`, `deposit-checkout` et
  `connect-onboarding` (sauf la relecture d'un compte existant) répondent `payments_closed` (503).
  L'inscription artisan retire « formule » et « paiements » du parcours et les marque « Au
  lancement » ; « Ma formule » masque l'espace de facturation et les recharges ; la tâche
  « activer les paiements » disparaît. L'arrêt d'un abonnement existant reste possible.
- **Fiches de test** : colonne `artisans.masque_public`, écrite par l'équipe, prise en compte par
  `app.artisan_is_visible` ; les comptes « … DEMO » sont retirés du site public.
- **Tests de bout en bout** : `MENAO_FULL_ACCESS` (fonctions) et `NEXT_PUBLIC_MENAO_FULL_ACCESS`
  (site) rouvrent tout en CI uniquement.

## Conséquences

- Aucun nouvel artisan ne peut être mis en ligne avant l'ouverture des paiements (abonnement et
  compte de paiement sont des conditions de visibilité) : cohérent avec la phase de recrutement.
- Les anciennes versions de l'appli reçoivent un refus côté serveur, affiché comme une erreur.
- Au lancement : brancher le projet de production, passer Stripe en mode réel, puis ouvrir
  `PAYMENTS_OPEN` et `REQUESTS_OPEN`.
