# ADR 0204 — Pré-remplissage du compte Stripe de l'artisan

- Statut : accepté
- Date : 29 octobre 2026
- Complète les ADR 0011 (paiements directs sur le compte de l'artisan) et 0124 (paiements dans l'application).

## Contexte
- **Constat** (28 octobre 2026, premier artisan pilote) : l'inscription Stripe est longue. Le compte « complet » de l'ADR 0011 fait de l'artisan un vrai marchand ; Stripe lui demande la société, chaque dirigeant, l'IBAN et ses conditions. MENAO ne transmettait que l'e-mail et la raison sociale, alors qu'il connaît déjà presque tout le reste (Sirene, profil, métiers).
- **Choix de l'utilisateur** (29 octobre 2026) : pré-remplir le formulaire Stripe (point 1 de la proposition), sans changer de type de compte.
- **Non tranché** : demander Stripe au premier devis plutôt qu'avant d'être visible (point 2) change une règle du cahier des charges (F-14) ; à décider par les associés. Rien n'est changé ici.

## Règles de Stripe vérifiées
- Tout peut être pré-rempli **avant le premier lien d'inscription**. Ensuite, l'identité (`business_type`, `company`, `individual`, personnes) n'est plus lisible ni modifiable pour un compte avec tableau de bord Stripe. Essai en mode test : refus `oauth_not_supported` après le lien.
- **Plateforme française** (compte MENAO enregistré en France) : Stripe exige des jetons (*account tokens*, *person tokens*) pour transmettre l'identité. En production, ils ne se créent qu'avec la clé publique, depuis le navigateur ou l'application. Le profil public (description, téléphone d'assistance) et les réglages (libellé des relevés) n'en ont pas besoin.
- Les champs pré-remplis ne sont plus demandés, mais l'artisan les relit et peut les modifier avant d'accepter les conditions de Stripe.
- Un jeton qui crée un compte doit porter l'acceptation des conditions, impossible pour ce type de compte. Le compte est donc créé sans jeton, puis mis à jour avec les jetons, ce que Stripe permet.

## Décision
- **Calcul dans `packages/core/src/connect-prefill.ts`** (`connectPrefill`), à partir de la fiche artisan, du profil et des métiers :
  - **société** (catégorie juridique 5xxx ou 6xxx) : raison sociale, SIREN (`tax_id`), TVA intracommunautaire si elle correspond au SIREN, téléphone, adresse de l'établissement (hors outre-mer) ; dirigeant représentant légal (nom, e-mail, téléphone) **seulement si l'utilisateur a déclaré être le dirigeant** ;
  - **entrepreneur individuel** (1000) : nom, e-mail et téléphone de l'entrepreneur, seulement s'il est le dirigeant. Ni adresse (l'établissement n'est pas forcément le domicile), ni date de naissance ;
  - **profil public** : description de l'activité tirée des métiers, téléphone et e-mail d'assistance, libellé des relevés bancaires (nom commercial ou raison sociale, 5 à 22 caractères sans accents) ;
  - pas d'adresse de site web : la fiche MENAO n'est publique qu'une fois l'artisan capable d'encaisser, donc introuvable pendant l'inscription ; Stripe accepte alors la description de l'activité ;
  - une valeur douteuse (SIREN mal formé, téléphone hors E.164, TVA d'un autre SIREN…) est écartée plutôt qu'envoyée : l'artisan la saisira chez Stripe.
- **Déroulé**, au premier clic sur « Configurer mes paiements avec Stripe » (site et application) :
  1. action `prefill` de `connect-onboarding` : renvoie la clé publique et les données d'identité, seulement si le compte n'existe pas encore et si `STRIPE_PUBLISHABLE_KEY` est configurée ;
  2. le navigateur ou l'application crée les jetons auprès de Stripe (`connectTokenRequest`, sans dépendance ajoutée) ;
  3. action `link` avec les jetons : création du compte (inchangée), puis profil public, jeton de l'entreprise et dirigeant, enfin le lien d'inscription.
- **Jamais bloquant** : chaque étape du pré-remplissage est indépendante ; un refus de Stripe est journalisé sans donnée personnelle (`logStripeError`) et l'inscription continue. Sans clé publique, seul le profil public est pré-rempli.
- **Site** : `https://api.stripe.com` ajouté aux connexions autorisées par la CSP (ADR 0103).
- **Comptes existants** : non concernés (identité verrouillée par Stripe). Le premier artisan pilote avait déjà terminé son inscription.

## Conséquences
- Pour une société dont l'inscrit est le dirigeant, il ne reste à saisir chez Stripe que la date de naissance et l'adresse personnelle du dirigeant, les autres associés éventuels, l'IBAN, puis l'acceptation des conditions.
- Nouveau secret des Edge Functions : `STRIPE_PUBLISHABLE_KEY` (`pk_test_…` en staging, `pk_live_…` en production). Ce n'est pas une donnée sensible, mais elle reste dans la configuration comme les autres clés.
- L'application profite du pré-remplissage à partir du prochain build ; le site dès son déploiement.
- TODO(legal) : vérifier que les conditions des artisans (CGV artisans) mentionnent que MENAO transmet à Stripe les informations de l'entreprise pour ouvrir le compte de paiement, avec le lien vers les conditions de Stripe (modèle de clause proposé par Stripe).
