# ADR 0215 — Compte de paiement Stripe : tout préparé dans MENAO, formulaire Stripe intégré

- Statut : accepté
- Date : 2 novembre 2026
- Complète les ADR 0011 (paiements directs sur le compte de l'artisan), 0204 (pré-remplissage) et 0124 (paiements dans l'application).

## Contexte
- **Demande de l'utilisateur** (2 novembre 2026) : rendre l'inscription Stripe des artisans la plus rapide possible. Trois lots ont été proposés ; la PR 1 réunit les lots 1 et 2 et le formulaire Stripe intégré au site (« go pour la PR 1 »). L'application suivra (PR 2), puis les notifications (lot 3).
- **Constats** :
  - après le pré-remplissage de l'ADR 0204, l'artisan saisissait encore chez Stripe sa date de naissance, son adresse personnelle, son IBAN et, en société, les associés ;
  - Stripe ne s'ouvrait qu'après la validation du dossier par l'équipe : l'artisan devait revenir un autre jour ;
  - l'inscription se faisait sur le site de Stripe, hors de MENAO.
- **Écarté** : collecter tout dans nos propres écrans et supprimer la connexion à Stripe. Stripe ne l'accepte que si MENAO porte les frais et les pertes des paiements (refus de l'API, essai du 2 novembre 2026) : contraire à la règle 12 et à l'ADR 0011.

## Règles de Stripe vérifiées (mode test, données fictives, 2 novembre 2026)
- Avec l'identité, la date de naissance, l'adresse personnelle et l'IBAN transmis par jetons avant le premier lien, Stripe ne demande plus que le site web (ou « pas de site ») et l'acceptation de ses conditions, en entreprise individuelle comme en société. Sans l'IBAN, le compte bancaire reste dû.
- **IBAN** : jeton `btok_…` créé avec la clé publique. L'ajout direct (`POST /v1/accounts/{id}/external_accounts`) est refusé pour un compte doté de son propre tableau de bord ; la mise à jour du compte (`external_account`) est acceptée.
- **Formulaire intégré** (composant Connect « account onboarding ») : il commence par une fenêtre de connexion à Stripe, imposée tant que Stripe collecte les informations (`requirement_collection: stripe`). Elle affiche le nom, l'icône et la couleur réglés dans les paramètres Connect de Stripe.
- Une session (`account_sessions`) ne sert qu'une fois : une nouvelle est créée à chaque ouverture et à chaque expiration.
- La fenêtre de connexion exige `Cross-Origin-Opener-Policy: unsafe-none` sur la page (valeur par défaut des navigateurs ; le site envoie `same-origin` ailleurs).
- Polices : Stripe les charge dans son cadre, seulement depuis des fichiers en HTTPS ; rayons de 24 px au plus.

## Décision
- **Lot 2 : ouverture dès l'envoi du dossier.** `connectOnboardingOpen` (`packages/core`) : dossier en vérification, validé ou suspendu. Utilisée par la fonction `connect-onboarding` et par le site. La visibilité ne change pas : validé, abonné et capable d'encaisser (F-14).
- **Lot 1 : compléments saisis dans MENAO** (premier passage, avant la création du compte) :
  - champs : date de naissance et adresse personnelle (case « même adresse que l'entreprise ») de l'entrepreneur ou du dirigeant, case « je suis le seul associé » (cochée d'office pour une EURL ou une SASU), IBAN ;
  - contrôlés par `connectDetailsSchema` (`packages/validation`), puis ajoutés aux jetons par `completeConnectPrefill` (`packages/core`) ; jetons créés par le navigateur avec la clé publique ;
  - **ces données vont directement à Stripe** : MENAO ne les reçoit pas, ne les enregistre pas et ne les journalise pas ;
  - fonction du dirigeant déduite de la forme juridique : « Président » (57xx), « Gérant » (54xx) ;
  - associé unique déclaré seulement si la case est cochée : 100 % du capital, associés déclarés (`owners_provided`) ;
  - « Tout remplir chez Stripe » : ouvre Stripe avec le seul pré-remplissage de l'ADR 0204.
- **Formulaire Stripe intégré au site** :
  - page `/pro/onboarding/paiements/stripe`, toujours ouverte par un lien simple (chargement complet) : seule page dont la CSP autorise les scripts, cadres et images de Stripe, et dont la `Cross-Origin-Opener-Policy` vaut `unsafe-none`. Le reste du site garde la politique stricte (une politique ne vaut que pour le document chargé) ;
  - action `session` de `connect-onboarding` : crée le compte si besoin, puis une session limitée au formulaire d'inscription ; action `create` : crée le compte avec les jetons ;
  - apparence : couleurs, rayons et taille de texte de MENAO (`stripeConnectAppearance`, `packages/ui-tokens`), police Google Sans du site (en HTTPS), textes en français ;
  - tout ce que Stripe exigera, même plus tard, est demandé d'un coup (`eventually_due`, exigences futures) : pas de blocage des virements en cours de chantier ;
  - à la sortie du formulaire, retour à l'étape Paiements, qui relit l'état du compte chez Stripe ;
  - **secours** : si le formulaire ne se charge pas, le lien vers le site de Stripe (action `link`, inchangée).
- **Bibliothèques ajoutées** au site : `@stripe/connect-js` 3.4.6 et `@stripe/react-connect-js` 3.4.4, officielles et légères (elles chargent le formulaire depuis Stripe). Versions publiées depuis plus de deux semaines.

## Conséquences
- Pour l'artisan : un seul passage. Après l'envoi du dossier, quatre champs dans MENAO, la connexion à Stripe (code par SMS), puis le site web et l'acceptation des conditions. Durée à mesurer avec les artisans pilotes.
- Un artisan refusé après coup peut garder un compte Stripe vide, sans argent : il n'est pas visible et ne reçoit aucun paiement.
- Les comptes déjà créés ne sont pas concernés par le lot 1 (identité verrouillée par Stripe) ; ils profitent du formulaire intégré.
- L'application garde l'ancien parcours (lien Stripe, après validation) jusqu'à la PR 2, qui utilisera le composant natif de `@stripe/stripe-react-native` (ADR 0216). La fonction reste compatible : réponse de `prefill` enrichie de champs facultatifs.
- Avant la mise en ligne réelle : nom, icône et couleur de MENAO dans les paramètres Connect de Stripe (MISE_EN_PRODUCTION.md).
- Pistes non retenues ici : adresse du site web pré-remplie (la fiche MENAO n'est publique qu'une fois l'artisan capable d'encaisser) ; caméra autorisée dans la page pour une vérification d'identité par photo (l'envoi d'un fichier reste possible).
- TODO(legal) : les conditions des artisans doivent mentionner que la date de naissance, l'adresse personnelle et l'IBAN saisis dans MENAO sont transmis directement à Stripe, sans être conservés par MENAO (complète la clause de l'ADR 0204).
