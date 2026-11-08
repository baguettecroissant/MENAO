# ADR 0248 — Listes « Demandes » et « Chantiers » repensées (refonte « Nette », lot 3)

- Statut : accepté
- Date : 8 novembre 2026
- Suite des ADR 0245, 0246 et 0247. Lot 3 maquetté (ordinateur, téléphone, application) et validé le 8 novembre.

## Décision
- **Titres courts** : « Demandes » et « Chantiers » (comme le menu et « Argent »), en grand, avec la phrase d'introduction existante.
- **Bandeau de chiffres clés** en tête de chaque liste — sur ordinateur, intitulé, valeur et détail ; sur téléphone et dans l'application, **trois chiffres serrés sur une ligne** (valeur puis intitulé court) :
  - Demandes : à traiter (et temps restant de la plus urgente), reçues ce mois-ci et acceptées (ordinateur), plus urgente (téléphone), temps de réponse moyen sur 6 mois (`my_response_stats`, comme l'accueil).
  - Chantiers : rendez-vous à venir (et le prochain), en attente du client (devis à signer, acomptes dus), en travaux (planifiés, en cours), chantiers terminés (ordinateur).
- **Demandes** : deux groupes titrés, « À traiter » (échéance la plus proche en tête) puis « Déjà traitées ». Une demande à traiter montre métier, « Urgent », résumé, lieu, prénom, date de réception, début souhaité et le **temps restant pour répondre** en grand avec sa barre sur 72 h (rouge si urgente ou à moins de 24 h) : à droite sur ordinateur, en bas de la ligne sur téléphone. Les demandes traitées sont des lignes courtes avec l'état en pastille.
- **Chantiers** : **filtres par phase** (Tous, Avant devis, Devis et paiement, Travaux, Terminés ; une phase vide est masquée) et **recherche** (titre, client, ville), filtrés dans le navigateur ; « Tous » montre les chantiers en cours puis un groupe « Terminés ». Chaque chantier : icône à la couleur de son état, titre, lieu et client, **prochaine étape** (date du rendez-vous ou du démarrage, sinon ce qui est attendu : signature, acompte, réception…), **avancement en cinq segments** (signature → réception, comme la frise de la fiche, `chantierStepIndex`) et état en pastille. **Tableau** quand la liste est large (requête de conteneur, pas de largeur d'écran : la liste reste en cartes dans une colonne étroite), cartes sinon.
- Calculs dans `@menao/core` (`requestFigures`, `chantierFigures`, `chantierPhase`, testés), comme le reste (règle 4).

## Conséquences
- `MoneyFigures` sert aussi aux listes : mode `dense`, cases réservées à l'ordinateur ou au téléphone, quatre colonnes possibles.
- `InboxList` a deux variantes (`open`, `done`) ; `RequestsView` et `ChantiersView` portent la page entière, pour l'espace réel comme pour les exemples (ADR 0184).
- Écarts assumés avec la maquette : pas de filtres sur la liste des demandes (les deux groupes suffisent) ; « terminés cette année » devient « chantiers terminés » (la liste ne porte pas la date de clôture) ; pas de « fin prévue » ni de « devis envoyé il y a 3 jours » dans la prochaine étape (données absentes de la liste).
- **Application** : même modèle sur les onglets Demandes et Chantiers (chiffres serrés, groupes, compte à rebours en ligne, pastilles de filtre qui défilent, avancement en segments), le glisser pour répondre est gardé.
