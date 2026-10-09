# ADR 0003 — Monorepo et outillage

- Statut : accepté
- Date : 9 octobre 2026

## Décision
- pnpm (workspaces) + Turborepo ; Node 22 ; TypeScript strict (`noUncheckedIndexedAccess`, `verbatimModuleSyntax`).
- Paquets internes publiés **en TypeScript source** (`exports` → `src/index.ts`) : pas d'étape de build, Next.js les transpile (`transpilePackages`), Vitest et `tsc` les lisent directement.
- **TypeScript 6.0** et **ESLint 9** (et non TypeScript 7 / ESLint 10) : `typescript-eslint` exige TypeScript < 6.1, et plusieurs plugins de `eslint-config-next` (react, import, jsx-a11y) ne déclarent pas encore ESLint 10. Dependabot ignore ces majeures jusqu'à mise à jour de l'outillage.
- CLI Supabase installée comme dépendance npm du dépôt (version figée, identique en local et en CI).
- Next.js 16 : `src/proxy.ts` remplace `middleware.ts` (convention renommée en v16).

## Conséquences
- Une seule commande par tâche (`pnpm lint|typecheck|test`), mise en cache par Turbo.
- Les paquets internes ne sont pas utilisables hors du monorepo sans build (non requis).
