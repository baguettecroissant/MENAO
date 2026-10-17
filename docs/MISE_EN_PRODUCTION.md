# Plan de mise en production de MENAO

Liste ordonnée de tout ce qu'il faut faire pour passer de la page d'attente (site branché sur Supabase **staging**) à un site ouvert au public sur la **production**. À tenir à jour : cocher au fur et à mesure, et noter les écarts.

**Qui fait quoi** :
- **Toi** : comptes, paiements, clés secrètes, réglages des tableaux de bord (Vercel, Supabase, Stripe, Google, Apple). Les clés ne passent jamais par le dépôt ni par Claude (CLAUDE.md, règle 1).
- **Claude** : code, scripts, vérifications. Claude n'agit sur la **production** qu'avec ton accord explicite, donné au moment même.
- **Ensemble** : ce que Claude prépare et que tu valides ou appliques.

Projets Supabase : staging `izwdfxynzegntubminth`, production `ffidtbwxiyqybyfdqmkj` (CLAUDE.md).

---

## Phase A — Préalables (avant de toucher à la production)

### Comptes et abonnements (Toi)
- [ ] **Supabase** : offre payante pour le projet de production (sauvegardes quotidiennes, pas de mise en pause, limites plus hautes). Vérifier la **région** : la spec demande `eu-west-1` ; staging est à Londres (`eu-west-2`), un écart déjà signalé.
- [ ] **Vercel** : passage en **Pro**. L'offre gratuite (Hobby) interdit l'usage commercial. Garder le plafond de dépenses (spec §4.4).
- [ ] **Stripe** : activer le compte en mode réel (identité de l'entreprise, compte bancaire). Pour **Connect** : profil de plateforme, image de marque des pages d'inscription des artisans, et décision sur la migration vers Accounts v2, laissée en suspens (ADR 0011).
- [ ] **DocuSeal** : compte de production (UE), offre adaptée au volume de signatures.
- [ ] **Resend** : offre adaptée au volume. L'offre gratuite est limitée à 100 e-mails par jour, en tout.
- [ ] **Apple Developer** (compte particulier choisi) et **Google Play Console** : nécessaires pour l'app (phase E) et pour « Se connecter avec Apple ».
- [ ] **Sentry** : projet ou environnement de production.

### Juridique (Toi, avec l'avocat)
- [ ] Valider les points marqués `TODO(legal)` dans le code (`git grep "TODO(legal)"`), une quarantaine aujourd'hui. Les principaux :
  - CGU, CGV artisans, politique de confidentialité (y compris Google et Apple comme fournisseurs d'identité, ADR 0108), mentions légales ;
  - droit de rétractation, valeur de la signature électronique ;
  - description publique du classement (P2B, art. L111-7, ADR 0105) ;
  - partage des notes des clients (décision D11, ADR 0106).
- [ ] Fournir l'**identité de l'éditeur** du site pour les mentions légales.
- [ ] Trancher les décisions marquées [À VALIDER] dans la spec.

### Code (Claude, puis PR)
- [ ] Remplacer les versions « brouillon » des documents légaux (`packages/core/src/legal.ts`, `LEGAL_DOCUMENT_VERSIONS`) par les versions définitives datées, et publier les textes validés sur `/cgu`, `/cgv-artisans`, `/confidentialite` et `/mentions-legales`.
- [ ] Lever les `TODO(legal)` une fois les réponses connues.
- [ ] Renommer l'un des deux « Score MENAO » (moyenne des avis sur la fiche, ou score de classement, ADR 0105), selon ta décision.

---

## Phase B — Base de production (Supabase)

### Base de données (Ensemble ; Claude avec ton accord)
- [ ] Lier la CLI au projet de production, en vérifiant deux fois `supabase/.temp/project-ref`.
- [ ] Appliquer toutes les migrations : `supabase db push`. Elles créent aussi les extensions, les espaces de stockage (buckets privés), les tâches planifiées (`pg_cron`) et les données de référence (formules, métiers, communes, gamification, paramètres).
- [ ] Vérifier : liste des tâches planifiées (`cron.job`), espaces de stockage, et paramètre `client_ratings_visible` à `false`.
- [ ] **Ne pas** appliquer `supabase/seed.sql` (données fictives) ni `supabase/scripts/demo-artisans-06.sql`.

### Fonctions (Claude avec ton accord ; secrets : Toi)
- [ ] Déployer les 15 fonctions : `analyze-need`, `billing-checkout`, `billing-portal`, `connect-onboarding`, `deposit-checkout`, `generate-pdf`, `notify`, `process-upload`, `quote-from-voice`, `rge-check`, `signature-create`, `signature-webhook`, `sirene-check`, `stripe-webhook`, `transcribe` (`supabase functions deploy … --use-api`). `rge-check` lit l'annuaire RGE public de l'ADEME : aucune clé à fournir.
- [ ] Secrets des fonctions (tableau de bord, Edge Functions puis Secrets) :
  - `SITE_URLS` : `https://menao.fr,https://www.menao.fr` (sans localhost ni Vercel) ;
  - Stripe : `STRIPE_SECRET_KEY` (clé réelle `sk_live_…`), plus les quatre valeurs écrites par `scripts/stripe-setup.mjs` (phase C) : `STRIPE_WEBHOOK_SECRET`, `STRIPE_CONNECT_WEBHOOK_SECRET`, `STRIPE_TAX_RATE_ID`, `STRIPE_PORTAL_CONFIGURATION_ID` ;
  - DocuSeal : `DOCUSEAL_API_KEY`, `DOCUSEAL_WEBHOOK_SECRET` (et `DOCUSEAL_API_URL` pour l'UE, `DOCUSEAL_OTP`) ;
  - e-mails : `RESEND_API_KEY` (clé propre à la production), `EMAIL_FROM` ;
  - notifications : `NOTIFY_SECRET` (nouvelle valeur aléatoire) et `EXPO_ACCESS_TOKEN` (push) ;
  - IA : `ANTHROPIC_API_KEY` et `MISTRAL_API_KEY` (clés directes en production, plutôt qu'OpenRouter : RGPD, README), et facultativement `AI_ANALYZE_MODEL`, `AI_ANALYZE_FALLBACK_MODEL`, `AI_QUOTE_MODEL`, `AI_TRANSCRIBE_MODEL` ;
  - Sirene : `INSEE_API_KEY`.
- [ ] Secrets du coffre (Vault), sans lesquels aucune notification ne part : `menao_notify_url` (adresse de la fonction `notify` de production) et `menao_notify_secret` (la même valeur que `NOTIFY_SECRET`).

### Authentification (Ensemble)
- [ ] `scripts/supabase-auth.mjs --project ffidtbwxiyqybyfdqmkj --production oui --site-url https://menao.fr --extra-urls https://www.menao.fr --app-urls menao://** --smtp oui` (avec la clé SMTP Resend de production) :
  - adresse du site, adresses de retour autorisées (jamais `exp://**` en production), modèles d'e-mails français, envoi par Resend.
- [ ] Réglages à vérifier dans le tableau de bord :
  - confirmation de l'e-mail obligatoire ;
  - mot de passe d'au moins 12 caractères ;
  - nouvelle authentification pour changer de mot de passe ;
  - **sessions anonymes activées** (recherche sans compte, ADR 0012) ;
  - double authentification TOTP activée (back-office, ADR 0008).
- [ ] **Google** :
  - ajouter `https://ffidtbwxiyqybyfdqmkj.supabase.co/auth/v1/callback` aux adresses de retour de l'identifiant OAuth ;
  - activer Google dans Supabase avec l'ID et le secret ;
  - passer l'application Google de « Test » à **« Production »**, sinon seuls les testeurs déclarés peuvent se connecter ;
  - faire vérifier l'identité de MENAO (nom, logo, pages confidentialité et CGU accessibles sans le code d'accès) ;
  - option : domaine personnalisé chez Supabase (payant), pour afficher menao.fr au lieu de l'adresse technique sur l'écran de Google.
- [ ] **Apple** (ADR 0108, étapes B à E) :
  - Services ID et clé ; adresse de retour de production ;
  - secret client dans Supabase, **à renouveler tous les 6 mois** (mettre un rappel) ;
  - déclaration de menao.fr et `notifications@menao.fr` pour les adresses e-mail masquées.

### Comptes de l'équipe (Toi)
- [ ] Créer les comptes administrateurs et support (README, « Créer un administrateur »), puis activer la double authentification à la première connexion.

---

## Phase C — Paiements, signature et services

- [ ] **Stripe, mode réel** : `scripts/stripe-setup.mjs` avec la clé réelle et `--webhook-url https://ffidtbwxiyqybyfdqmkj.supabase.co/functions/v1/stripe-webhook`.
  - Il crée les produits et prix (150, 500 et 1 500 € HT par mois, ADR 0010), la TVA à 20 %, le portail client et les webhooks (abonnements et Connect).
  - Copier ensuite les valeurs écrites dans les secrets des fonctions.
  - Rappel (règle 12) : MENAO ne touche jamais l'argent des chantiers. Paiements directs sur le compte Connect de l'artisan, sans commission ni `application_fee`.
- [ ] **Vérifier les formules ouvertes** : `plans.ouverte`. Aujourd'hui, seule « Base » est ouverte.
- [ ] **Virement bancaire** pour les comptes connectés : à confirmer avec Stripe (spec, « à confirmer »).
- [ ] **DocuSeal** : webhook vers `https://ffidtbwxiyqybyfdqmkj.supabase.co/functions/v1/signature-webhook`, avec son secret.
- [ ] **Resend** : vérifier que le domaine menao.fr est toujours vérifié, et créer une clé d'API distincte pour la production. Option recommandée : un sous-domaine d'envoi dédié (`mail.menao.fr`), voir les mails séparés de l'équipe.

---

## Phase D — Site (Vercel)

- [ ] **Staging déplacé** sur `staging.menao.fr` (déploiements d'aperçu ou projet séparé), toujours branché sur Supabase staging. Mettre à jour `SITE_URLS` et l'adresse du site de staging.
- [ ] **Variables de production** (Toi) :
  - `NEXT_PUBLIC_SITE_URL=https://menao.fr` ;
  - `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` de la **production** ;
  - `NEXT_PUBLIC_OAUTH_PROVIDERS=google,apple` ;
  - Sentry : `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN` ;
  - **garder `PRELAUNCH_ACCESS_CODE`** pour l'instant : la page d'attente reste jusqu'à la phase G ;
  - `ALLOW_INDEXING` reste absent (robots fermés).
- [ ] **Redéployer**, puis tester : accueil, recherche, inscription, connexion par e-mail, Google et Apple, et l'arrivée d'un e-mail de confirmation.

---

## Phase E — Application mobile

- [ ] **Variables EAS** de production : `EXPO_PUBLIC_SUPABASE_URL` et `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` de la production, `EXPO_PUBLIC_SITE_URL=https://menao.fr`, `EXPO_PUBLIC_OAUTH_PROVIDERS=google,apple`.
- [ ] **Builds de production** iOS et Android (EAS). Les notifications push fonctionneront enfin, ce qui est impossible dans Expo Go.
- [ ] **TestFlight** (iPhone) et **test interne** Google Play, avec l'équipe et quelques artisans.
- [ ] **Fiches des stores** :
  - visuels prêts (ADR 0097) ;
  - formulaires de confidentialité (« App Privacy » chez Apple, « Sécurité des données » chez Google) ;
  - coordonnées de « commerçant » demandées par le règlement européen sur les services numériques (adresse et téléphone professionnels).
- [ ] **Règle 10** : vérifier qu'aucun bouton ni lien d'achat d'abonnement n'apparaît dans l'app.
- [ ] **Soumission** aux revues d'Apple et de Google (plusieurs jours chez Apple).
- [ ] **Une fois publiée** : `NEXT_PUBLIC_APP_STORE_URL` et `NEXT_PUBLIC_PLAY_STORE_URL` dans Vercel (fenêtre « depuis votre poche » sur le site, ADR 0090).

---

## Phase F — Répétition générale

- [ ] **Parcours complet en production**, avec de vrais comptes de l'équipe :
  - client : recherche, demande, rendez-vous, devis, signature, acompte, suivi, réception, solde, avis ;
  - artisan : inscription, charte, documents, validation par l'admin, abonnement, Connect, devis, notation du client.
  - Paiements réels de petit montant, remboursés ensuite depuis le compte Stripe de l'artisan.
- [ ] **E-mails et push** : chaque notification arrive, et les liens ouvrent le bon écran (site et app).
- [ ] **Back-office** : validation d'un dossier, ticket, litige, avec la double authentification.
- [ ] **Audit d'accessibilité des pages connectées** et contrôle des performances (pages publiques en cache, spec §4.4).

---

## Phase G — Ouverture

- [ ] **Artisans du pilote (06)** inscrits, validés, abonnés et visibles **avant** d'ouvrir aux clients, pour qu'une recherche donne des résultats.
- [ ] **Retirer `PRELAUNCH_ACCESS_CODE`** dans Vercel et redéployer : la page d'attente disparaît (ADR 0101).
- [ ] **`ALLOW_INDEXING=true`**, redéployer, puis déclarer le site et le plan du site dans la Google Search Console.
- [ ] **DMARC** : passer de `p=none` à `p=quarantine` après quelques semaines de rapports sans anomalie.
- [ ] **Annonce** (films marketing, réseaux, formats courts).

---

## Phase H — Après l'ouverture

- [ ] **Surveiller** : Sentry, journaux Supabase, webhooks Stripe en échec, rebonds Resend, notifications en échec dans la base.
- [ ] **Rappels récurrents** : secret Apple tous les 6 mois, renouvellement de l'abonnement Apple Developer, attestations des artisans (géré par l'application, F-51).
- [ ] **Staging** : supprimer les artisans de démonstration (`supabase/scripts/demo-artisans-06-cleanup.sql`) s'ils ne servent plus.
- [ ] **Coûts** : suivre Vercel, Supabase, Resend, Stripe, DocuSeal et l'IA, et ajuster les plafonds.
