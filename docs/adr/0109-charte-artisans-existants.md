# ADR 0109 — Charte qualité pour les artisans déjà inscrits

- Statut : accepté (site et application mobile)
- Date : 16 octobre 2026

## Contexte

- **Charte qualité** (ADR 0104) : elle se signe à l'inscription pro, à l'étape « Charte qualité », avant l'envoi du dossier.
- **Artisans déjà validés** : inscrits avant la charte, ils ne l'ont jamais signée. La même question se posera à chaque nouvelle version de la charte (`CHARTER_VERSION`, `app.current_charter_version()`).
- **Demande** (16 octobre 2026) : faire signer la charte aux artisans existants.

## Décision

- **Où** : l'espace pro (`requireProSpace`, partagé par la coque et toutes les pages) exige la signature de la charte dans sa version en vigueur. Sinon, il redirige vers `/pro/charte`. « Mon dossier » (pages de l'inscription, dans la coque de l'espace pro) aussi.
- **Page `/pro/charte`** :
  - même lecture et même signature qu'à l'inscription (`CharterForm`, `accept_artisan_charter`), précédées d'un court message en tutoiement, comme la charte ;
  - puis l'écran de bienvenue, avec « Accéder à mon espace pro », et la charte relisible (`?relire=1`) ;
  - un artisan encore en inscription est renvoyé à l'étape « Charte qualité » de l'inscription.
- **Blocage** : le temps de lire et signer (quelques minutes), l'artisan ne voit pas ses demandes ni ses chantiers. C'est le choix le plus simple et le plus cohérent avec l'inscription. Ses chantiers en cours ne sont pas touchés : les clients et la base ne voient aucune différence.
- **Jeu de données** : les artisans du seed ont signé, sauf `charte@example.test`, réservé au test de bout en bout de ce parcours.
- **Application mobile** :
  - l'espace artisan (`app/pro/_layout.tsx`) fait le même contrôle (`charterRequired`) et ouvre l'écran `pro-charte` ;
  - mêmes textes (packages/core), même contrôle (`charterAcceptanceSchema`) et même enregistrement (`accept_artisan_charter`) que sur le site ;
  - signature tracée au doigt, dans le même cadre de 600 × 150 ;
  - en cas d'erreur de lecture, l'espace n'est pas bloqué.

## Conséquences

- **Visibilité inchangée** : un artisan qui ne se connecte pas reste proposé aux clients sans avoir signé. Conditionner la visibilité à la signature serait une règle de classement à valider.
- **Nouvelle version de la charte** : changer `CHARTER_VERSION` et `app.current_charter_version()` suffit à redemander la signature à tous.
