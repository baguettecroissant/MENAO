# ADR 0103 — CSP appliquée, audits d'accessibilité et de performance

- Statut : accepté (finitions de la phase 7, spec §18)
- Date : 15 octobre 2026

## Contexte
- **CSP** : depuis la phase 0, elle n'était qu'en mode « Report-Only » : elle signalait sans rien bloquer.
- **Exigences de la spec (§18)** : en-têtes de sécurité (CSP, HSTS), accessibilité RGAA / WCAG 2.1 AA visée, LCP < 2,5 s sur mobile pour les pages publiques.

## Décision

### CSP
- La politique est **appliquée** (`Content-Security-Policy`), construite par `src/lib/site/csp.ts` :
  - scripts, styles, polices et manifeste depuis le site seulement ;
  - images et médias depuis le site, `data:`, `blob:` et Supabase ;
  - connexions vers le site, Supabase (HTTPS et temps réel), la Base Adresse Nationale (`data.geopf.fr`) et Sentry ;
  - aucun cadre (`frame-src 'none'`, `frame-ancestors 'none'`), aucun plugin (`object-src 'none'`), `base-uri 'self'` ;
  - envois de formulaires limités au site et aux pages de paiement (Stripe Checkout, portail, Connect) et de signature (DocuSeal).
- **Scripts en ligne** : ils restent autorisés (`'unsafe-inline'`), car Next.js en insère pour l'hydratation. Des nonces imposeraient un rendu dynamique de chaque page, donc la fin des pages statiques (§4.4). La politique ferme tout le reste, dont les scripts d'autres origines.
- **Variantes** : `'unsafe-eval'` en développement seulement (rechargement à chaud), et `vercel.live` sur les prévisualisations Vercel (barre de commentaires).
- **Signalement** : avec un DSN Sentry, les violations y sont signalées (`report-uri` déduit du DSN).
- **Nouvel en-tête** : `Cross-Origin-Opener-Policy: same-origin`.
- **Garde-fou en CI** : les tests e2e importent `e2e/test.ts`. Toute violation de la CSP pendant un test le fait échouer, y compris dans les parcours connectés.

### Audit d'accessibilité
- **Méthode** : axe-core, déjà présent via `eslint-plugin-jsx-a11y`, sur 17 pages publiques, ordinateur et mobile, règles WCAG 2.1 A et AA. Les animations sont coupées pendant la mesure, sinon les contrastes sont mesurés en plein fondu.
- **Corrigé** :
  - liste du simulateur de commission (`dl` mal construit) ;
  - numéros d'étapes de « Comment ça marche » (contraste 1,39, porté à 3,25) ;
  - libellé « Erreur 404 » (bleu sur crème à 4,23, passé en `primary-strong`).
- **Résultat** : 0 violation.

### Audit de performance
- **Méthode** : mesures sur un téléphone simulé (processeur ralenti 4 fois, 4G lente : 150 ms, 1,6 Mb/s), à froid.
- **Images** :
  - versions réduites, même cadrage : bandeau de l'accueil en 960 px, photos de métiers en 400 px ;
  - servies par `srcset` ;
  - générées par `scripts/photos-reelles.mjs` (aussi à chaque remplacement par une vraie photo, ou seules avec `--variantes`).
- **Adresses métier ou ville inconnues** : `dynamicParams = false`. Seules les pages générées au build existent, une adresse inconnue répond 404 tout de suite, sans fonction ni requête à la base. Une nouvelle commune ou un nouveau métier demande donc un nouveau déploiement.
- **Résultats** (LCP mobile) :

  | Page | Avant | Après |
  |---|---|---|
  | Accueil | 4,0 s | 2,3 s |
  | Page 404 | 3,1 s | 0,85 s |
  | Pages métier et ville | 2,2 à 2,4 s | 2,2 à 2,4 s |
  | Autres pages | environ 1 s | environ 1 s |

  CLS ≤ 0,01 et TBT < 200 ms partout.

## Conséquences
- **Nouvelle origine** (service tiers chargé par le navigateur) : à ajouter dans `csp.ts`, sinon les tests e2e échouent.
- **Pages connectées** : leur accessibilité n'a pas été auditée (il faut des comptes de test). À refaire avec un compte de chaque rôle sur staging.
- **JavaScript** : environ 360 Ko transférés par page (React, Next.js, Sentry). Le temps de blocage reste faible, une réduction peut venir plus tard.
