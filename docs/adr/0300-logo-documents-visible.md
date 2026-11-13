# ADR 0300 — Logo des documents : le rendre visible là où il sert

- Statut : accepté (13/11/2026)
- Fonctionnalité : F-145 (complète l'ADR 0038)

## Contexte

Le logo de l'entreprise s'affiche depuis octobre en haut des devis, factures, procès-verbaux et du
PDF du DPGF (ADR 0038), mais son dépôt était caché en bas de « Mon profil → Entreprise ». Le
13/11/2026, aucun des 12 artisans de staging n'en avait déposé, et l'utilisateur pensait que la
fonction n'existait pas.

## Décision

- **Mon profil** (site et application) : une ligne « Logo sur vos documents » avec son état
  (« Ajouté » / « À ajouter »), calculé dans `@menao/core` (`profileHubStatuses`, rubrique `logo`,
  fait `hasLogo`). Elle mène au cadre du logo (`/pro/onboarding/entreprise#logo` ; écran
  Entreprise dans l'application).
- **Éditeur de devis** : tant que l'entreprise n'a pas de logo, une carte « Ajoutez le logo de
  votre entreprise » avec le dépôt sur place (même circuit `process-upload`, ADR 0038). Patron
  seulement : le logo appartient à l'entreprise.
- **Cartes de visite de l'application** : le logo remplace les initiales, comme sur le site
  (URL signée du bucket privé `artisan-logos`).
- L'Excel du DPGF n'est pas modifié : c'est le fichier de l'architecte, rempli tel quel ; le
  logo figure sur le PDF.

## Conséquences

- Aucun changement de base ni de fonction.
- Le rendu du logo est vérifié par les tests de `@menao/documents` (ADR 0038) et par un devis de
  contrôle avec un logo fictif.
