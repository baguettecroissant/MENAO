# CLAUDE.md — Règles de travail du projet MENAO

Plateforme de mise en relation particuliers ↔ artisans du bâtiment, avec outil tout-en-un (devis, signature, paiement, suivi de chantier). Spécification complète : `docs/CAHIER_DES_CHARGES_V1.md` (à lire avant toute tâche).

## Stack
- Monorepo pnpm + Turborepo, TypeScript strict.
- `apps/web` : Next.js (App Router), Tailwind, déployé sur Vercel.
- `apps/mobile` : Expo + Expo Router, builds EAS.
- `packages/core` : logique métier pure (machine à états chantier, calculs devis/TVA/échéancier). Aucune dépendance UI ni réseau.
- `packages/validation` : schémas Zod partagés. `packages/db` : types Supabase générés.
- `supabase/` : migrations SQL, Edge Functions (Deno), tests pgTAP, seed.
- `packages/emails` : modèles React Email (envoi Resend). SMS et marketing : Brevo. DNS : Cloudflare.
- Supabase prod : `https://ffidtbwxiyqybyfdqmkj.supabase.co` (eu-west-1). Staging : projet séparé.

## Commandes
- `pnpm install` · `pnpm dev` · `pnpm lint` · `pnpm typecheck` · `pnpm test`
- `pnpm --filter web dev` · `pnpm --filter mobile start`
- `supabase start` (local) · `supabase db reset` · `supabase migration new <nom>` · `supabase gen types typescript --local > packages/db/src/types.ts` · `supabase test db`

## Règles absolues
1. **Jamais de secret dans le dépôt.** Clés dans `.env.local` (ignoré) et dans Vercel/Supabase/EAS. La clé `service_role` n'est utilisée que côté serveur.
2. **RLS activée sur chaque nouvelle table**, avec ses politiques **et** ses tests pgTAP dans la même PR.
3. **Toute modification de schéma passe par une migration** (`supabase migration new`). Jamais de modification manuelle en production.
4. **Aucune logique métier dans les écrans.** Calculs, règles et transitions dans `packages/core`, la base ou les Edge Functions.
5. **Montants en centimes entiers** (`integer`), jamais de flottants. Solde = total − acomptes, toujours calculé.
6. **Transitions de chantier uniquement via `transition_chantier()`** ; chaque transition est journalisée dans `chantier_events`.
7. **Rôles dans `app_metadata`**, jamais dans `user_metadata`.
8. **Buckets privés + URL signées** pour tout document ou photo non public.
9. **Webhooks** : vérifier la signature, traiter de façon idempotente.
10. **App native** : aucun bouton ni lien d'achat d'abonnement artisan (paiement sur le web uniquement).
11. **Pas de données personnelles** dans les logs, PostHog, prompts IA, seeds ou tests.
12. **MENAO ne prend jamais d'argent sur les chantiers** : paiements exclusivement via Stripe Connect, directement sur le compte de l'artisan, sans commission ni `application_fee`. Seul l'abonnement artisan est encaissé par MENAO.
13. **Hébergement Vercel maîtrisé** (spec §4.4) : pas d'optimisation d'images Vercel, pages publiques pré-générées et en cache, aucun service propriétaire Vercel (Blob, KV, Edge Config, Cron, Postgres) ; logique serveur lourde dans les Supabase Edge Functions. Le code doit rester déployable sur Cloudflare via OpenNext.
14. **E-mails via Resend** (React Email, `packages/emails`), **SMS et marketing via Brevo**, toujours derrière `NotificationProvider`.
15. Les décisions marquées [À VALIDER] dans la spec ne se tranchent pas seul : option de configuration ou question.

## Conventions
- Branches : `feat/F-xx-description`, `fix/...`. Commits conventionnels citant la fonctionnalité : `feat(F-19): dictée intelligente du devis`.
- Une PR = une fonctionnalité ou une partie cohérente ; CI verte obligatoire (lint, typecheck, tests unitaires, tests RLS).
- Textes de l'interface en français, centralisés (pas de chaînes en dur dispersées) pour permettre la traduction plus tard.
- Composants web et mobile utilisent les tokens de `packages/ui-tokens` ; reprendre l'interface depuis Figma, en corrigeant les erreurs listées en section 16 de la spec.
- Nouvelle dépendance : justifier dans la PR ; préférer les bibliothèques maintenues et légères.
- Décision d'architecture notable : ajouter un fichier dans `docs/adr/`.

## Façon de travailler
- Avancer phase par phase (section 15 de la spec). Avant de coder une fonctionnalité, résumer le plan en quelques lignes et lister les fichiers touchés.
- Écrire d'abord les tests de `packages/core` pour les calculs et transitions.
- Après chaque fonctionnalité : lancer lint, typecheck, tests ; vérifier les politiques RLS avec un utilisateur de chaque rôle.
- En cas de doute sur une règle légale (devis, factures, avis, paiements), ne pas inventer : signaler et laisser un `TODO(legal)`.
