# ADR 0125 — Entreprise, métiers, certifications, zone et logo dans l'application

- Statut : accepté
- Date : 18 octobre 2026
- Complète les ADR 0113 (« Faire vérifier mon entreprise » dans l'application), 0118 (RGE), 0123 et 0124 (application).

## Contexte
- **Après l'inscription**, l'artisan ne pouvait modifier que sur le site : son entreprise, ses métiers et spécialités, son expérience, ses certifications, son RGE, sa zone et le logo de ses documents. Le dossier de l'application affichait « À compléter sur le site MENAO ».
- **Décision de l'utilisateur** (18 octobre 2026) : faire ces points dans l'application, troisième et dernier lot de la mise à niveau.

## Décision
- **« Mon entreprise »** (`/pro-entreprise`), comme l'étape « Entreprise » du site :
  - SIRET, modifiable tant que le dossier est en brouillon (garde-fou en base), et sa vérification auprès de l'INSEE (`sirene-check`) ;
  - raison sociale et adresse, avec l'avertissement si le code APE ne relève pas du bâtiment ;
  - nom commercial, TVA (et numéro de TVA intracommunautaire) ; raison sociale saisie seulement en cas de diffusion partielle Sirene ;
  - logo des devis, factures et PV : ajout, remplacement, retrait (`artisan_remove_logo`). Il est envoyé en **PNG** réduit à 600 px, pour garder la transparence, comme sur le site ;
  - accès aux métiers et à la zone.
- **« Métiers et certifications »** (`/pro-metiers`) :
  - métiers, spécialités des métiers cochés et années d'expérience (`set_artisan_trades`) ;
  - domaines RGE lus dans l'annuaire officiel, avec « Actualiser » (`rge-check`) ;
  - certifications : ajout et suppression ; l'équipe les vérifie avant affichage.
- **« Zone d'intervention »** (`/pro-zone`) : un rayon autour d'une adresse de départ, l'adresse enregistrée étant gardée si seul le rayon change, ou une liste de communes (`set_artisan_zone`). La recherche passe par la Géoplateforme, comme sur le site.
- **Mêmes contrôles et mêmes écritures que le site** (`@menao/validation`, RPC, droits du compte), regroupés dans `apps/mobile/src/lib/my-company.ts`.
- **Accès** :
  - la ligne « Votre entreprise, vos métiers, votre zone » du dossier ouvre « Mon entreprise » ;
  - raccourci « Mon entreprise » sur le tableau de bord ;
  - les adresses du site `/pro/onboarding/entreprise`, `/metiers` et `/zone` ouvrent ces écrans.

## Conséquences
- **L'application rejoint le site pour l'artisan.** Seul l'abonnement reste sur le site, volontairement (règles d'Apple, CLAUDE.md règle 10).
- **Tests** : correspondance des liens. Les règles sont celles, déjà testées, de `@menao/validation` et de la base.
- **Vérifié à l'écran**, sur la version web de l'application et avec des données fictives : formulaires de l'entreprise, des métiers, des certifications et de la zone, changement de mode et recherche d'adresse.
- **Déploiement** : aucun côté serveur. Une nouvelle build de l'application reprendra ces écrans.
