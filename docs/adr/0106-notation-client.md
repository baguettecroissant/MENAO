# ADR 0106 — Notation du client par l'artisan (F-23)

- Statut : accepté (site et application mobile)
- Date : 15 octobre 2026

## Contexte
- **Spec F-23** : après la clôture, l'artisan note son client sur trois critères au curseur de 0 à 100 % (accueil et accès, clarté du besoin, délai des paiements), avec un commentaire de 50 caractères au moins.
- **Visibilité** : notes visibles des seuls artisans MENAO, jamais du client ni du public. Ce point est **[À VALIDER] juridiquement** (décision D11).
- **Charte qualité (R5.2)** : l'artisan s'y engage à noter le client à la fin du chantier.
- **Demande** : l'utilisateur veut développer cette notation (15 octobre 2026).

## Décision
- **Table `client_ratings`** : une note par chantier, saisie seulement par `artisan_rate_client()`, qui vérifie que le chantier est celui de l'artisan et qu'il est clôturé, les bornes et le commentaire.
- **Droits de lecture** (RLS) :
  - l'artisan auteur relit ses notes ;
  - l'équipe MENAO voit tout ;
  - le client ne voit jamais rien.
- **Visibilité pour le réseau : une option de configuration** (règle des décisions [À VALIDER]).
  - Nouvelle table `platform_settings`, avec la clé `client_ratings_visible`, **désactivée par défaut**.
  - Un admin la règle depuis le back-office (Référentiels, « Paramètres de la plateforme »), avec double authentification et trace dans le journal d'audit.
  - Une fois activée, `client_reputation(demande)` renvoie la moyenne des trois critères et le nombre de notes, et seulement à l'artisan validé qui a reçu la demande. **Les commentaires ne sont jamais montrés aux autres artisans**, seulement à l'équipe.
- **Site** :
  - **chantier clôturé** : la vue de l'artisan propose le formulaire (curseurs, commentaire), puis un résumé de la note. Le texte indique honnêtement qui pourra la voir : l'équipe seulement, ou aussi les artisans qui reçoivent une demande, selon le paramètre ;
  - **demande reçue** : bloc « Ce client sur MENAO » quand la moyenne est visible ;
  - **back-office** : notes listées sur la fiche du client.
- **Application mobile** : mêmes écrans côté artisan, sans lien vers le site (règle 10).
  - **chantier clôturé** : formulaire (mêmes curseurs que l'avis du client), puis résumé de la note ;
  - **demande reçue** : bloc « Ce client sur MENAO » quand la moyenne est visible.
- **Gamification** (F-24) : la mesure `avis_clients` compte les notes laissées. Les objectifs « Premier avis », « Amateur des avis » et « Expert des avis » sont activés.

## Conséquences
- **Avant d'activer la visibilité** (`TODO(legal)`) :
  - avis de l'avocat sur la base légale d'une notation de particuliers partagée entre professionnels ;
  - information des clients (politique de confidentialité) ;
  - droits d'accès et de rectification ;
  - durée de conservation.
- **Pas encore fait** : relance de l'artisan s'il ne note pas le client (notification). À ajouter si besoin.
