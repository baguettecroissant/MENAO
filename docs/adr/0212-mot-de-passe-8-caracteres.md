# ADR 0212 — Mot de passe de 8 caractères minimum

## Contexte

Le mot de passe demandait 12 caractères depuis F-08, sans règle de complexité (ADR 0110). L'équipe
abaisse ce minimum pour fluidifier l'inscription et les accès.

## Décision

- Minimum de **8 caractères** partout : `PASSWORD_MIN_LENGTH` dans `packages/validation`, textes du
  site, `minimum_password_length` de Supabase. Les écrans de l'application lisent la constante.
- Pas de règle de complexité ajoutée : `password_requirements` reste vide.
- La limite haute de 72 caractères (bcrypt) ne change pas.

## Conséquences

- Les comptes existants gardent leur mot de passe.
- Le réglage Supabase de chaque projet hébergé doit passer à 8 (`docs/MISE_EN_PRODUCTION.md`) : sinon
  le serveur refuserait un mot de passe que le formulaire accepte.
- Remplace le minimum indiqué dans l'ADR 0110. Le back-office reste protégé par la double
  authentification (ADR 0008).
