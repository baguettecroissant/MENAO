# ADR 0053 — CI sur un runner auto-hébergé (Mac de développement)

- Statut : accepté
- Date : 12 octobre 2026

## Contexte
- Le dépôt est privé, sur l'offre gratuite de GitHub : 2 000 minutes de GitHub Actions par mois et 500 Mo de stockage d'artefacts.
- Une exécution de la CI coûte environ 13 minutes facturées : trois jobs en parallèle, chacun arrondi à la minute supérieure. Entre le 1er et le 12 octobre, 203 exécutions ont consommé environ 2 600 minutes, dont 67 en double sur `main` après une fusion. GitHub a alors refusé de lancer les jobs jusqu'au mois suivant.
- Payer GitHub est exclu. Rendre le dépôt public rendrait la CI gratuite, mais exposerait le code, l'historique et le cahier des charges.

## Décision
- **Runner auto-hébergé** sur le Mac de développement (Apple Silicon). Selon la documentation de GitHub, les runners auto-hébergés sont gratuits et sans limite de minutes, et le dépôt reste privé.
  - Les trois jobs y tournent par défaut (`runs-on: [self-hosted, macOS, ARM64]`).
  - La variable de dépôt `CI_RUNNER`, au format JSON, les renvoie ailleurs. Par exemple, `"ubuntu-latest"` revient aux runners de GitHub, une fois le quota du mois rétabli.
  - Un seul runner : les jobs s'enchaînent, sans conflit de ports.
- **Isolation du poste** (`scripts/ci/isoler-supabase.sh`). Dans sa propre copie de travail, la CI utilise :
  - un Supabase à elle (projet `menao-ci`, ports 553xx au lieu de 543xx) ;
  - l'application sur le port 3100 (`E2E_PORT`) ;
  - stripe-mock sur le port 12112.
  - Elle arrête et efface son instance avant et après chaque job. Le serveur et le Supabase de développement du poste ne sont jamais touchés.
- **Moins de travail inutile** :
  - sur `main` après une fusion, seuls les contrôles rapides tournent (lint, typecheck, tests unitaires), puisque la PR a déjà passé la base de données et les tests de bout en bout ;
  - une PR qui ne touche que la documentation ne lance pas la CI ;
  - les artefacts (captures, rapports, types) sont gardés 2 à 3 jours.

## Mise en place (une fois, sur le Mac)
1. Installer **Docker Desktop** pour Mac (Apple Silicon), gratuit pour une entreprise de moins de 250 salariés et de moins de 10 M€ de chiffre d'affaires. Le lancer, et le régler pour qu'il démarre à l'ouverture de session.
2. Sur GitHub : dépôt → Settings → Actions → Runners → **New self-hosted runner** → macOS, ARM64.
3. Dans un terminal, hors du dossier du projet (par exemple `~/actions-runner`), lancer les commandes affichées par GitHub : téléchargement, puis `./config.sh --url … --token …`, en acceptant les valeurs proposées.
4. Installer le runner comme service, pour qu'il démarre tout seul : `./svc.sh install`, puis `./svc.sh start`.

## Conséquences
- La CI ne tourne que lorsque le Mac est allumé, avec Docker lancé. Sinon, les jobs attendent dans la file, jusqu'à 24 heures.
- Pendant une exécution, la CI utilise le processeur et la mémoire du Mac : Postgres, Supabase, le build et Chromium.
- Les PR de Dependabot tournent aussi sur le Mac, comme toute mise à jour installée en local.
- Docker sur le poste permet aussi de lancer Supabase et les tests en local avant de pousser.
