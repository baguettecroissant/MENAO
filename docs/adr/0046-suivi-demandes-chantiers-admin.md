# ADR 0046 — Suivi des demandes et des chantiers dans le back-office

- Statut : accepté
- Date : 12 octobre 2026
- Réalise F-53 (chantiers) et le suivi des demandes du lot 2 de l'audit du back-office. Complète l'ADR 0045 (vue d'ensemble).

## Contexte
- La vue d'ensemble (ADR 0045) montre ce qui se passe, mais l'équipe ne pouvait ouvrir ni une demande ni un chantier. Un client qui appelle, une demande restée sans réponse, un chantier bloqué : rien n'était consultable dans le back-office.
- La spec (F-53) prévoit, pour les chantiers, la recherche, l'historique des événements et les documents.

## Décision
- **Deux rubriques du menu, construites de la même façon** : une recherche, des pastilles de filtre avec leur nombre, une liste de 50 lignes par page, puis une fiche. L'adresse garde le filtre, la recherche et la page : elle se partage telle quelle.
- **Demandes** (`/admin/demandes`), une ligne par projet de particulier :
  - étape calculée par la base : recherche non envoyée, en attente de réponse, rendez-vous fixé (ou demande acceptée), sans suite (refusée, expirée ou annulée) ;
  - filtre supplémentaire « Expirent sous 12 h » ;
  - recherche sur le client, son e-mail, les artisans, la ville, le métier et la description.
  - La fiche montre la description et le message, les critères, les photos (URL signées), la réponse de chaque artisan (dates, motif de refus, délai restant), le chantier ouvert, les dossiers liés et les coordonnées du client.
- **Chantiers** (`/admin/chantiers`), filtrés par étape. Les étapes sont les regroupements de `packages/core` (`statusesOfStage`), sans dupliquer la correspondance dans la base.
  - La fiche montre l'historique des événements (avec leur auteur : artisan, client, équipe ou automatique), les devis (versions, statut, PDF hors brouillon), les paiements, les factures et PV, l'artisan, le client, la demande d'origine et les signalements.
  - **Les messages entre le client et l'artisan restent privés** : l'équipe n'y accède que sur un litige ou un signalement (tickets).
- **Données** : des fonctions réservées aux admins en session aal2.
  - `admin_projects`, `admin_project_counts`, `admin_chantiers` et `admin_chantier_counts` s'appuient sur des fonctions internes (`app.admin_project_rows`, `app.admin_chantier_rows`) non exposées.
  - `admin_user_emails` donne l'e-mail des comptes affichés, jamais celui d'une session anonyme.
  - La recherche échappe `%` et `_`.
  - Les fiches lisent les tables par les politiques RLS de l'équipe.
- **Vue d'ensemble** :
  - le fil d'activité porte désormais l'identifiant de la demande et du chantier, et chaque événement ouvre sa fiche ;
  - « En attente de réponse », « Recherches non envoyées » et les étapes des chantiers mènent à leur liste filtrée ;
  - la carte des demandes qui expirent mène à leurs fiches.

## Conséquences
- À déployer : la migration.
- Le seed compte un troisième admin fictif, réservé au test de bout en bout du suivi.
- Lot suivant : la recherche globale et les fiches des personnes (clients, artisans) réutiliseront ces listes.
