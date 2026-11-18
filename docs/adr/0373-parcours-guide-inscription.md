# ADR 0373 — Parcours guidé de l'inscription artisan

- Statut : accepté (maquette du lot 72 validée le 18/11/2026)
- Fonctionnalité : F-178 (suite de F-14)

## Contexte

Essai réel du 18/11/2026 avec un ancien maçon : inscription jugée trop longue, aucun bouton
« suivant » (il fallait revenir à « Mon dossier » après chaque étape), charte à 25 cases, raison de
Stripe incomprise. L'écran « Votre profil est créé » annonçait 5 minutes et une liste de sept
lignes, Kbis compris alors que le registre l'avait déjà vérifié.

## Décision

1. **Un parcours guidé.** `guideSteps` (`packages/core/src/onboarding-guide.ts`) donne les étapes
   dans un ordre fixe : la charte, les documents exigés, la fiche. L'entreprise, les métiers et la
   zone n'y figurent que s'ils restent à terminer ; le Kbis disparaît quand le registre l'a vérifié
   (ADR 0217), la décennale pour un artisan « non soumis » (ADR 0116). `nextGuideStep` donne la
   première étape à faire après celle qu'on quitte ; à la fin, « Mon dossier ».
2. **La suite passe par une route.** `/pro/onboarding/suite?apres=<étape>` calcule l'étape
   suivante côté serveur et y redirige : les liens (« Commencer », « Passer pour l'instant »,
   suite de la charte) y mènent. Les enregistrements (dépôt d'un document, présentation) calculent
   la page suivante eux-mêmes et y redirigent directement : la redirection d'une action serveur
   vers une route sans page ne s'achève pas dans le navigateur. Une étape déjà faite que l'artisan
   revient modifier ramène à « Mon dossier », comme avant.
3. **Une barre en bas, toujours au même endroit** (`GuideBar`) : le bouton qui fait avancer,
   ce qui suit (« Suite : RC Pro »), « Retour » sur ordinateur. En haut : l'étape précédente,
   « Étape 2 sur 6 », le temps restant et « Mon dossier », qui reste la vue d'ensemble et l'écran
   de reprise.
4. **Jamais bloqué.** Sans fichier choisi, la barre d'un document propose « Passer pour
   l'instant » : l'étape suivante s'ouvre, la pièce reste à faire dans « Mon dossier » et les
   relances par e-mail (ADR 0219) la rappellent. `nextGuideStep` ne repropose pas une étape
   passée : la fin du parcours ramène au dossier, qui reprend à la première pièce manquante.
5. **Documents allégés.** Les champs (assureur, dates…) n'apparaissent qu'une fois le fichier
   choisi, remplis par la lecture automatique (ADR 0176). L'aide devient des lignes à ouvrir ;
   « Ce que l'équipe vérifie » et l'encadré « plus tard » ne sont plus affichés pendant le parcours.
6. **Charte : une partie par écran, texte inchangé.** Neuf écrans : les six parties de la charte
   V5, ce que MENAO promet, l'engagement (ADR 0117), la signature. Le bouton du bas fait défiler
   (« Lire la suite ») puis accepte la partie (« J'accepte ces 5 règles ») ; pour l'engagement il
   porte la phrase certifiée. Nom, entreprise et SIRET connus sont récapitulés, « Modifier » rouvre
   les champs. Seule la consigne d'usage (« coche chaque règle ») change, puisqu'il n'y a plus de
   case par règle. La base reçoit les mêmes données qu'avant (version, 25 règles, signataire, tracé,
   engagement).
7. **« Dossier envoyé ».** L'envoi mène à `/pro/onboarding/envoye` : la formule et les paiements,
   expliqués en une phrase (« MENAO ne touche jamais l'argent de vos chantiers »), puis l'espace
   rempli d'exemples. Ils restent ouverts avant l'envoi depuis « Mon dossier » (ADR 0353, 0370).
8. **« Votre profil est créé »** annonce environ 10 minutes et trois blocs avec leur durée
   (`guideBlocks`) ; « Commencer » ouvre la première étape.

## Conséquences

- Acceptation de la charte par partie (6 gestes) au lieu de règle par règle (25) : la preuve
  enregistrée ne change pas, mais le geste si. `TODO(legal)` : à faire confirmer par l'avocat avec
  le reste de la charte (voir `packages/core/src/charter.ts`).
- Durées indicatives dans `GUIDE_SECONDS` (2 min la charte, 1 min 30 par document, 2 min la
  fiche) : à ajuster d'après les essais réels.
- Non fait ici : le code à scanner pour reprendre sur le téléphone (lot à part) ; l'application
  native, qui garde ses écrans actuels jusqu'à sa propre PR.
- Aucune migration, aucune fonction à déployer.
