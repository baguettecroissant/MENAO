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

## CI

GitHub Actions sur chaque PR et sur `main` : format, lint, typecheck, tests unitaires ; migrations + tests pgTAP + contrôle des types générés ; build + Playwright (inscription, confirmation e-mail, connexion). Aucun secret requis : Supabase tourne dans le runner.

## Environnements

### Supabase staging (`menao-staging`)
1. Secrets GitHub (environnement `staging`) : `SUPABASE_ACCESS_TOKEN`, `SUPABASE_STAGING_PROJECT_REF`, `SUPABASE_STAGING_DB_PASSWORD`, puis lancer le workflow **Migrations → staging** (migrations + Edge Functions).
   Secrets des Edge Functions (tableau de bord → Edge Functions → Secrets) : `INSEE_API_KEY` (et `INSEE_API_BASE_URL` si différente de la valeur par défaut).
2. Auth → URL Configuration : Site URL = URL Vercel de staging ; Redirect URLs = `https://<domaine>/**` et `https://*-<équipe>.vercel.app/**` (previews).
3. Auth → Providers → Email : confirmation obligatoire, mot de passe ≥ 12 caractères.
4. Auth → Email Templates : reprendre `supabase/templates/*.html` (liens `/auth/confirm?token_hash=…`).
5. Auth → SMTP : Resend (ADR 0002).

### Vercel
Projet lié au dépôt, **Root Directory = `apps/web`**, plafond de dépenses activé (spec §4.4). Variables : `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, et pour Sentry `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN`. Aucune clé secrète Supabase en phase 0.
