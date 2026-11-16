# ADR 0352 — Finitions de l'inscription : couverture métier, étapes numérotées, « Lu », attentes animées (F-162, lot 61, fin)

- Statut : accepté (16/11/2026)
- Fonctionnalité : F-162 ; maquette du lot 61

## Constat

Trois écarts restaient avec la maquette du lot 61 : pas d'image sur la fiche d'un artisan sans
photo, « Mon dossier » sans numéro ni durée par étape, et rien ne disait ce que MENAO avait lu
dans un document. Les attentes (lecture d'un document, réponse du chat des plans, recherche
d'entreprise) n'affichaient qu'une phrase fixe.

## Décision

- **Couverture par métier** (`TradeCover`) : sans photo, la fiche publique et l'aperçu du profil
  montrent l'image du premier métier de l'artisan, déjà présente dans `public/images/metiers`
  (aucune image générée, aucune dépense). Elle porte toujours la mention « Image d'illustration »
  et n'apparaît jamais parmi les réalisations (pas de fausses photos de chantier). Dès qu'une
  photo est déposée, elle la remplace.
- **« Mon dossier » numéroté** : chaque étape porte son numéro (une coche une fois faite) et,
  tant qu'elle reste à faire, une durée indicative (« ≈ 2 min »). Numéro et durée sont décoratifs
  (`aria-hidden`) : le nom accessible des liens ne change pas.
- **Champs « Lu »** : après la lecture automatique (ADR 0176), `UploadForm` liste ce qui a été lu
  (date, assureur, numéro, code de sécurité, couverture) avec une pastille « Lu ». Les champs
  restent modifiables ; l'artisan vérifie avant d'envoyer.
- **Attente animée** (`AiWorking`) : une feuille balayée par un trait de lecture et trois points,
  pour la lecture d'un document, le chat « Demander à MENAO » et la recherche d'entreprise.
  `role="status"` conservé ; immobile avec « réduire les animations ». La lecture des plans garde
  son écran dédié (`ReadingScreen`).

## Conséquences

- Aucune migration, aucune logique métier : affichage seulement.
- Les durées sont indicatives et centralisées dans l'écran du dossier ; à ajuster si les essais
  réels montrent autre chose.
