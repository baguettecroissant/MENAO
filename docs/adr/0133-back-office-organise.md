# ADR 0133 — Back-office organisé : file par urgence, menu par pôle, fiche artisan

- Statut : accepté
- Date : 18 octobre 2026
- Complète les ADR 0045 (vue d'ensemble), 0049 (rôle support) et 0120 (vérification côte à côte).

## Contexte
- **Audit du back-office demandé par l'utilisateur** : un outil de travail agréable, simple et organisé pour les fondateurs et toute l'équipe.
- **Ce qui marchait déjà** : la vue d'ensemble (cartes « À traiter », activité en direct, chiffres clés), la recherche globale, et les listes avec recherche, filtres et pagination.
- **Ce qui freinait** :
  - jusqu'à 11 cartes « À traiter » de même poids, dans un ordre fixe : on ne voyait pas par quoi commencer ;
  - un menu « Pilotage » qui mélangeait vérification, support et activité ;
  - une fiche artisan de 17 sections, avec la décision (valider ou refuser) tout en bas.
- **Choix de l'utilisateur** : ces trois chantiers. Le raccourci ⌘K, l'attribution des tickets et la tendance des chiffres clés sont laissés pour plus tard.

## Décision
- **File « À traiter » par urgence** (`adminQueue`, `@menao/core`, testé) :
  - une seule liste en trois groupes : Urgent (litiges, tickets en retard, demandes qui expirent sous 12 h, notifications en échec), Important (suppressions de compte, assurances sous 7 jours, paiements échoués, impayés), À faire (dossiers, contrôles aléatoires, renouvellements) ;
  - dans un groupe, l'échéance la plus proche passe devant, et elle est affichée sur la ligne (« expire dans 3 h 24 », « avant le 7 novembre 2026 ») ;
  - filtres par pôle (`?pole=`, sans JavaScript), montrés seulement quand plusieurs pôles ont quelque chose : Tout, Vérification, Support, Activité, Argent, Technique ;
  - chaque élément reste un article nommé par son titre (lecteurs d'écran, tests de bout en bout).
- **Menu par pôle** :
  - Pilotage : Vue d'ensemble ;
  - Vérification : Dossiers artisans, À surveiller, Contrôles aléatoires ;
  - Support : Dossiers et messages, Personnes ;
  - Activité : Demandes, Chantiers ;
  - Argent : Paiements, Abonnements ;
  - Réglages : Métiers et travaux, Journal d'audit, Suivi de l'IA.
  - Le rôle support garde seulement ses rubriques (ADR 0049).
- **Fiche artisan** :
  - en-tête fixe sous la barre du haut : nom, statut, SIRET et, pour un dossier en vérification, le bouton « Décider » ;
  - navigation dans la page : À vérifier, Documents, Décision, Entreprise, Profil, Abonnement, Activité, Historique ;
  - en tête, « Ce qui reste à vérifier » (`adminReviewChecklist`, `@menao/core`, testé) : documents déposés, refusés ou manquants, certifications à vérifier, SIRET non vérifié ou entreprise inactive, charte non signée ; ou « Tout est vérifié » ;
  - pour un dossier en vérification, la décision suit directement les documents ; sinon elle reste plus bas ;
  - les mêmes règles que le dossier s'appliquent : une fois l'artisan validé, le Kbis de plus de 3 mois ne compte plus.

## Conséquences
- En ouvrant le back-office, chacun voit d'abord ce qui presse, et peut se limiter à son pôle.
- Le vérificateur lit le résumé, contrôle les documents et décide sans faire défiler toute la fiche.
- Aucune migration. Les chantiers non retenus (⌘K, tickets attribués, tendances) restent possibles plus tard.
