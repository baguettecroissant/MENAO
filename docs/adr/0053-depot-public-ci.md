# ADR 0053 — Dépôt public et CI plus sobre

- Statut : accepté
- Date : 12 octobre 2026

## Contexte
- Sur l'offre gratuite de GitHub, un dépôt privé dispose de 2 000 minutes de GitHub Actions par mois et de 500 Mo de stockage d'artefacts.
- Une exécution de la CI coûte environ 13 minutes facturées : trois jobs en parallèle, chacun arrondi à la minute supérieure. Entre le 1er et le 12 octobre, 203 exécutions ont consommé environ 2 600 minutes, dont 67 en double sur `main` après une fusion. GitHub a alors refusé de lancer les jobs jusqu'au mois suivant.
- Payer GitHub est exclu.
- Un runner auto-hébergé sur le Mac de développement a été essayé, puis abandonné : disque presque plein, Docker Desktop exigé, trousseau macOS inaccessible au service, installation lourde.

## Décision
- **Le dépôt devient public.** GitHub Actions y est gratuit et sans limite sur ses runners standard. La CI reste sur `ubuntu-latest`.
- **Vérification avant publication** :
  - aucun secret dans les 404 commits de l'historique (clés Stripe, Supabase, Resend, Brevo, IA, jetons, clés privées, fichiers `.env`) ;
  - le nom du fondateur et le business plan n'y figurent pas (confidentiels) ;
  - les données des tests et du jeu d'exemple sont fictives.
- **Une CI plus sobre**, toujours utile :
  - sur `main` après une fusion, seuls les contrôles rapides tournent (lint, typecheck, tests unitaires), puisque la PR a déjà passé la base de données et les tests de bout en bout ;
  - une PR qui ne touche que la documentation ne lance pas la CI ;
  - les artefacts (captures, rapports, types) sont gardés 2 à 3 jours.

## Conséquences
- Le code, l'historique, le cahier des charges et les ADR sont lisibles par tous, ainsi que l'adresse e-mail des auteurs des commits.
- La règle n° 1 (jamais de secret dans le dépôt) devient critique : tout ce qui est poussé est public. Les secrets restent dans Vercel, Supabase, EAS et les secrets GitHub, que les PR venues de forks ne peuvent pas lire.
- Les PR de contributeurs extérieurs exigent l'approbation d'un mainteneur avant de lancer la CI (réglage par défaut de GitHub). Aucun runner auto-hébergé ne doit être relié à ce dépôt public.
