# ADR 0005 — Tests et intégration continue

- Statut : accepté
- Date : 9 octobre 2026

## Décision
- **Unitaires** : Vitest sur `packages/*` (règles, schémas, tokens dont le contraste AA).
- **Base de données** : pgTAP (`supabase test db`) ; chaque fichier est autonome (utilisateurs fictifs créés dans la transaction, puis `rollback`). Un test garde-fou échoue si une table de `public` n'a pas la RLS.
- **Bout en bout** : Playwright contre l'application buildée et un Supabase local ; les e-mails sont lus dans Mailpit.
- **CI GitHub Actions sans aucun secret** : Supabase local démarré dans le runner (Docker). Déclenchée à chaque push de branche ; les runs `pull_request` ne servent qu'aux forks pour éviter les doublons.
- Les types générés (`packages/db`) sont vérifiés en CI : la PR échoue s'ils divergent du schéma.

## Conséquences
- La CI est la référence pour les tests SQL et e2e, y compris pour un poste sans Docker.
- Statuts requis pour protéger `main` : « Lint, typecheck, tests unitaires », « Base de données (migrations, RLS pgTAP, types) », « Bout en bout (inscription, connexion) ».
