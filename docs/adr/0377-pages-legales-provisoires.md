# ADR 0377 — Pages légales rédigées, en version provisoire

- Statut : accepté (demande de l'utilisateur du 18/11/2026)
- Fonctionnalité : F-180

## Contexte

Les pages « Conditions générales d'utilisation » et « Politique de confidentialité » affichaient
« Document en cours de rédaction », les mentions légales « [À compléter] » et la page cookies deux
lignes. La société éditrice est maintenant connue (MENAO FRANCE, SAS en cours d'immatriculation à
Nice) et les projets de textes ont été rédigés pour l'avocat.

## Décision

- Les quatre pages reçoivent leur texte : mentions légales, conditions d'utilisation (14 articles),
  politique de confidentialité (données, finalités, prestataires, droits) et politique cookies
  (liste des cookies et mémoires réellement déposés).
- Les textes vivent dans `apps/web/src/content/legal`, un fichier par page, avec les mêmes blocs
  que les guides (ADR 0135) : paragraphes, listes, tableaux, liens. `fr.ts` ne garde que les
  libellés d'interface. La société éditrice est décrite une seule fois (`company.ts`).
- `LegalBody` affiche un texte légal ; les tableaux défilent dans leur cadre sur un petit écran.
- La mention « Version provisoire » reste affichée sur chaque page : aucun de ces textes n'a
  encore été validé par l'avocat. Chaque fichier porte un `TODO(legal)` qui liste ce qui attend.
- Aucun passage « à compléter » n'est publié : ce qui n'est pas décidé est omis du texte, pas
  laissé entre crochets (un test de bout en bout le vérifie).
- Adresse de contact unique : contact@menao.fr.

## Ce qui attend

- Conditions générales de vente artisans : la page reste en attente. Le projet prévoit un
  engagement de douze mois, alors que le site et le paiement proposent encore « au mois sans
  engagement » ou l'année payée d'avance (ADR 0200). Les deux changeront ensemble.
- SIREN, numéro de TVA et téléphone, après l'immatriculation.
- Médiateur de la consommation, s'il est requis pour un service gratuit pour les particuliers.
- Durées de conservation : seules « 3 ans d'inactivité » et « 10 ans pour la comptabilité »
  viennent du cahier des charges ; les autres sont des propositions à valider.
- Tableau des prestataires et tableau des cookies : relevés dans le code au 18/11/2026, à tenir à
  jour à chaque ajout (un bandeau de consentement avant toute mesure d'audience).

## Conséquences

- Un nouveau prestataire, un nouveau cookie ou une nouvelle mémoire locale oblige à mettre à jour
  `content/legal` dans la même PR.
- Après la validation de l'avocat, la mention « Version provisoire » se retire page par page
  (`draft={false}` sur `LegalPage`).
