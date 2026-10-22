# ADR 0153 — Essai de 2 mois et délai de réponse de 72 h

- Statut : accepté
- Date : 22 octobre 2026
- Décisions des associés, à la lecture des documents de Mickaël du 18 octobre 2026 (« Plan anti-problèmes V2 », « Mettre en avant les nouveaux artisans », « Programme de parrainage »). Modifie l'ADR 0010 (essai) et l'ADR 0014 (délai de réponse).

## Contexte
- **Essai** : 3 mois offerts depuis le début (business plan), soit 90 jours d'essai Stripe. Les documents de Mickaël reposent sur 2 mois offerts. Ils prévoient aussi, plus tard, un mois offert si l'artisan ne décroche aucun chantier pendant ses 2 premiers mois payants.
- **Délai** : un artisan avait 48 h pour accepter ou refuser une demande. Le plan anti-problèmes parle de 72 h, comme la décision des fondateurs du 9 octobre (« 3 devis en 72 h »).

## Décision
- **Essai de 2 mois** : `TRIAL_DAYS = 60` (`packages/core/src/billing.ts`), utilisé par la fonction `billing-checkout` pour l'essai Stripe.
  - Les abonnements déjà en essai gardent leur date de fin.
  - Textes du site : « 2 mois offerts » partout, à la place de « 3 mois offerts ». L'application ne parle pas de l'abonnement (règle 10).
- **Délai de réponse de 72 h** :
  - `REQUEST_RESPONSE_HOURS = 72` (`packages/core/src/requests.ts`), qui pilote les comptes à rebours ;
  - valeur par défaut de `requests.expires_at` à 72 h (migration). Les demandes déjà envoyées gardent leur échéance ;
  - textes du site et de l'application : « 72 h » et « 72 heures » à la place de « 48 h » ;
  - les tranches du temps de réponse affichées sur les fiches (« Répond en moins de 3 h », « sous 48 h ») décrivent la rapidité de l'artisan : elles ne changent pas.
- **Spécification** : délai et tâche d'expiration mis à jour. La vidéo de la page Pro est refaite avec « 2 mois offerts ».

## Conséquences
- **Mise en service** : déployer `billing-checkout` sur la base en ligne après la fusion (la fonction embarque la constante), et pousser la migration.
- **Hors du dépôt, à refaire** : les pubs du lot 1, la vidéo de recrutement de 15 s, les vidéos courtes artisans et le film artisans, qui citent « 3 mois offerts ».
- **Lot 1 du plan V1.1** (relance à 24 h, autres artisans proposés, alerte SAV à 72 h) : à recaler sur ce délai.
