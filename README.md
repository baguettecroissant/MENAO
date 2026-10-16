# MENAO

Plateforme de mise en relation entre particuliers et artisans du bâtiment vérifiés, avec un outil tout-en-un pour les artisans : demandes, devis, signature électronique, paiement via Stripe Connect, suivi de chantier, réception et avis.

- Spécification V1 : [`docs/CAHIER_DES_CHARGES_V1.md`](docs/CAHIER_DES_CHARGES_V1.md)
- Règles de travail (Claude Code) : [`CLAUDE.md`](CLAUDE.md)
- Pilote : Alpes-Maritimes (06)

## Stack
Monorepo pnpm + Turborepo · Next.js (web) · Expo (iOS/Android) · Supabase (Postgres + PostGIS, Auth, Storage, Realtime) · Stripe (Billing + Connect)

## Structure

```
apps/web            Next.js 16 : site public, espaces connectés (Vercel)
packages/core       Logique métier pure (rôles, règles) — testée avec Vitest
packages/validation Schémas Zod partagés web / app / serveur
packages/ui-tokens  Design tokens (TypeScript + thème Tailwind v4)
packages/db         Types Supabase générés
packages/config     tsconfig, ESLint, Prettier partagés
supabase/           Migrations SQL, tests pgTAP, seed, modèles d'e-mails
docs/adr/           Décisions d'architecture
```

## Démarrage local

Prérequis : Node 22, pnpm 9, Docker (Docker Desktop ou OrbStack) pour Supabase local.

```bash
pnpm install
pnpm db:start                         # Supabase local : migrations + seed
cp apps/web/.env.example apps/web/.env.local
# renseigner NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY avec la clé affichée par db:start
pnpm --filter web dev                 # http://localhost:3000
```

- E-mails envoyés en local (confirmation, lien magique) : Mailpit sur http://127.0.0.1:54324
- Comptes fictifs du seed : `particulier@example.test`, `support@example.test`, `admin@example.test`, `artisan@example.test` (en onboarding), mot de passe `menao-local-dev-only` (local uniquement)
- Edge Functions : secrets lus dans l'environnement au démarrage de Supabase. Copier les valeurs dans `supabase/functions/.env` (ignoré par Git), puis `set -a; . supabase/functions/.env; set +a` avant `pnpm db:start`. Variables : `INSEE_API_BASE_URL` (`https://api.insee.fr/api-sirene/3.11`) et `INSEE_API_KEY` (portail-api.insee.fr, API Sirene, plan « Accès public »).

## Commandes

| Commande | Rôle |
|---|---|
| `pnpm lint` · `pnpm typecheck` · `pnpm test` | Qualité et tests unitaires (Turbo) |
| `pnpm format` | Prettier |
| `pnpm db:reset` | Recrée la base locale (migrations + seed) |
| `pnpm db:test` | Tests RLS pgTAP |
| `pnpm db:types` | Régénère `packages/db/src/types.ts` |
| `pnpm exec supabase migration new <nom>` | Nouvelle migration |
| `pnpm functions:check` | Vérifie les Edge Functions (Deno) |
| `pnpm --filter web build && pnpm --filter web test:e2e` | Tests de bout en bout (Supabase local requis ; faux serveur Sirene lancé automatiquement, Supabase démarré avec `INSEE_API_BASE_URL=http://host.docker.internal:54399`) |

## Stripe (abonnements, F-15)

Clé de test dans `.env.staging` (`STRIPE_SECRET_KEY=sk_test_…`), puis, après application des migrations :

```bash
set -a; . ./.env.staging; set +a
SUPABASE_URL=https://izwdfxynzegntubminth.supabase.co SUPABASE_PUBLISHABLE_KEY=<clé publishable> \
  pnpm stripe:setup --env-file .env.staging --webhook-url https://izwdfxynzegntubminth.supabase.co/functions/v1/stripe-webhook
```

Le script crée les produits, prix, TVA, portail et webhook, et écrit `STRIPE_WEBHOOK_SECRET`, `STRIPE_TAX_RATE_ID`, `STRIPE_PORTAL_CONFIGURATION_ID` dans le fichier. Secrets des Edge Functions : `STRIPE_SECRET_KEY`, ces trois valeurs et `SITE_URLS` (origines autorisées pour le retour depuis Stripe). Ouvrir une formule : `ouverte = true` dans `plans`, puis relancer le script.

## Recherche IA (F-05 à F-07)

Analyse du besoin (`analyze-need`, Claude Haiku 5.5, repli Sonnet 5.5) et dictée (`transcribe`, Voxtral). Secrets des Edge Functions : `OPENROUTER_API_KEY` (tests et staging) ou, en production, `ANTHROPIC_API_KEY` et `MISTRAL_API_KEY` (prioritaires). Facultatifs : `AI_ANALYZE_MODEL`, `AI_ANALYZE_FALLBACK_MODEL`, `AI_TRANSCRIBE_MODEL`. Les sessions anonymes doivent être activées dans Auth (`enable_anonymous_sign_ins`). En e2e, `OPENROUTER_BASE_URL` et `GEOCODING_BASE_URL` pointent sur le faux serveur `apps/web/e2e/mock-ai.mjs` (port 54398). Voir l'ADR 0012.

## Créer un administrateur

Le rôle se trouve dans `app_metadata`, jamais modifiable depuis l'application. Dans l'éditeur SQL du projet Supabase (après inscription normale de la personne) :

```sql
update auth.users set raw_app_meta_data = raw_app_meta_data || '{"role": "admin"}'
where email = 'adresse@exemple.fr';
```

À la connexion suivante, le back-office (`/admin`) impose l'activation de la double authentification (TOTP). Sans elle, la base refuse tout droit admin (ADR 0008).

## Application mobile : build de développement (iPhone)

Une vraie version de MENAO sur l'iPhone, reliée au serveur Expo du Mac comme Expo Go, avec les fonctions natives en plus : notifications push, retour `menao://` après Google ou Apple. Le build se fait dans le cloud d'Expo (EAS), sans Xcode.

Prérequis : compte Apple Developer, projet Expo rattaché (`EAS_PROJECT_ID` dans `apps/mobile/.env`), iPhone en **mode développeur** (Réglages, puis Confidentialité et sécurité, puis Mode développeur).

Une seule fois, depuis `apps/mobile` :

```bash
# Identifiant du projet pour les serveurs de build (lu dans .env, sans l'afficher).
npx eas-cli env:create --name EAS_PROJECT_ID --value "$(grep '^EAS_PROJECT_ID=' .env | cut -d= -f2-)" \
  --environment development --environment preview --environment production --visibility plaintext
# Enregistrement de l'iPhone (QR code à ouvrir sur le téléphone).
npx eas-cli device:create
# Build (connexion au compte Apple demandée ; certificats et clé des notifications push créés par EAS).
npx eas-cli build --profile development --platform ios
```

Installer l'app depuis le lien donné à la fin du build, puis lancer le serveur et ouvrir « MENAO » sur l'iPhone :

```bash
REACT_NATIVE_PACKAGER_HOSTNAME="$(scutil --get LocalHostName).local" pnpm --filter mobile start
```

Le nom `.local` remplace l'adresse IP, refusée par Supabase comme adresse de retour (ADR 0108). Pour continuer avec Expo Go : `pnpm --filter mobile start --go`. Un nouveau build n'est nécessaire que si un module natif change.

## CI

GitHub Actions sur chaque PR et sur `main` : format, lint, typecheck, tests unitaires ; migrations + tests pgTAP + contrôle des types générés ; build + Playwright (inscription, confirmation e-mail, connexion). Aucun secret requis : Supabase tourne dans le runner.

## Environnements

Mise en production (passage de staging à la production, ouverture du site) : [docs/MISE_EN_PRODUCTION.md](docs/MISE_EN_PRODUCTION.md).

### Supabase staging (`menao-staging`)
1. Secrets GitHub (environnement `staging`) : `SUPABASE_ACCESS_TOKEN`, `SUPABASE_STAGING_PROJECT_REF`, `SUPABASE_STAGING_DB_PASSWORD`, puis lancer le workflow **Migrations → staging** (migrations + Edge Functions).
   Secrets des Edge Functions (tableau de bord → Edge Functions → Secrets) : `INSEE_API_KEY` (et `INSEE_API_BASE_URL` si différente de la valeur par défaut).
2. Auth → URL Configuration : Site URL = URL Vercel de staging ; Redirect URLs = `https://<domaine>/**` et `https://*-<équipe>.vercel.app/**` (previews).
3. Auth → Providers → Email : confirmation obligatoire, mot de passe ≥ 12 caractères.
4. Auth → Email Templates : reprendre `supabase/templates/*.html` (liens `/auth/confirm?token_hash=…`).
5. Auth → SMTP : Resend (ADR 0002).

État au 9 octobre 2026 : migrations de `main` appliquées, Edge Function `sirene-check` déployée (`--use-api`, import de `packages/core` vérifié), secret `INSEE_API_KEY` défini, Site URL `http://localhost:3000`. À faire : SMTP Resend (requis pour personnaliser les modèles d'e-mails sur l'offre gratuite), mot de passe minimum 12 et liste des URL de redirection dans Auth.

Aperçu local branché sur staging : `apps/web/.env.local` avec l'URL et la clé « publishable » de `menao-staging`. Sur l'offre gratuite sans SMTP, Supabase n'envoie les e-mails d'authentification qu'aux membres de l'équipe du projet (environ 2 par heure).

### Vercel
Projet lié au dépôt, **Root Directory = `apps/web`**, plafond de dépenses activé (spec §4.4). Variables : `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, et pour Sentry `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN`. Aucune clé secrète Supabase en phase 0.
