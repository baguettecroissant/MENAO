# ADR 0117 — Engagement de l'artisan

- Statut : accepté (texte provisoire)
- Date : 17 octobre 2026
- Complète les ADR 0104 (charte qualité), 0109 (charte pour les artisans déjà inscrits) et 0111 (adresse IP de la signature).

## Contexte
- **Cahier des charges du CEO** : l'engagement de l'artisan (travail déclaré, exactitude des documents) est obligatoire. Il se signe une fois, puis à chaque nouvelle version, par une signature électronique horodatée qui garde la date, l'heure, l'adresse IP et la version signée.
- **Décision de l'utilisateur** (17 octobre 2026) : le mettre en place. Le CEO n'a pas fourni le texte : un texte provisoire est rédigé, en attendant le sien.

## Décision
- **Une seule signature avec la charte** : l'engagement s'affiche dans le bloc de signature de la charte, sur le site et dans l'application. Une case « Je certifie sur l'honneur l'exactitude de ces déclarations » s'ajoute ; il n'y a pas de seconde signature. L'artisan certifie notamment :
  - entreprise immatriculée et à jour de ses déclarations sociales ;
  - travail déclaré, y compris en sous-traitance ;
  - documents authentiques et exacts ;
  - assurances adaptées ;
  - obligation de prévenir en cas de changement ;
  - suspension puis radiation en cas de fausse déclaration.
- **Texte et version** dans `packages/core/src/engagement.ts` :
  - `ENGAGEMENT_VERSION` vaut « B1 », pour brouillon ;
  - tant que `ENGAGEMENT_DRAFT` est vrai, la mention « Texte provisoire, en cours de validation » reste affichée.
- **En base** :
  - `artisan_charter_acceptances.engagement_version` ; la contrainte d'unicité devient une signature par version de la charte et de l'engagement ;
  - `accept_artisan_charter` exige l'engagement en vigueur (`app.current_engagement_version()`) ;
  - `app.charter_signed` sert à l'étape « charte » de `onboarding_missing_steps`, donc à l'envoi du dossier.
- **Nouvelle version** : changer `ENGAGEMENT_VERSION` et `app.current_engagement_version()` redemande la signature :
  - à l'inscription, l'étape « charte » est à refaire ;
  - pour un artisan validé, l'espace pro le renvoie à la charte, comme pour une nouvelle version de la charte (ADR 0109).
  - Une signature antérieure, sans engagement, compte comme non signée ; elle est conservée.
- **Affichage** : récapitulatif après la signature, relecture de la charte signée, back-office (version de l'engagement certifiée).

## Conséquences
- **Jeu de démonstration** : les signatures du seed portent l'engagement « B1 ».
- **Tests** :
  - les tests pgTAP 05, 51 et 57 passent l'engagement ;
  - nouveau test pgTAP 61 : refus sans engagement ou avec une version périmée, signature unique, adresse IP, signature antérieure à refaire ;
  - schéma de validation ;
  - bout en bout : inscription artisan et charte d'un artisan déjà inscrit.
- **TODO(legal)** : remplacer le texte provisoire par le texte validé (CEO, avocat), passer `ENGAGEMENT_DRAFT` à faux et changer la version, dans `packages/core` et en base.
- **Déploiement** : appliquer la migration. Aucune fonction Edge n'est concernée.
