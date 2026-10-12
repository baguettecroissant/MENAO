# ADR 0047 — Personnes, recherche globale et suspension d'un artisan

- Statut : accepté
- Date : 12 octobre 2026
- Réalise la première partie de F-52 (lot 3a de l'audit du back-office). Complète les ADR 0045 (vue d'ensemble) et 0046 (demandes et chantiers).

## Contexte
- L'équipe ne pouvait pas retrouver une personne : pas de recherche, pas de fiche client. Pour un artisan, seule la fiche du dossier existait, sans son activité.
- Un artisan validé ne pouvait pas être suspendu à la main (plaintes, fraude). Seule la suspension automatique pour assurance expirée existait (F-51).

## Décision
- **Recherche globale** dans la barre du haut du back-office (une icône sur mobile), résultats sur `/admin/recherche`, regroupés par type. Chaque résultat ouvre sa fiche :
  - personnes (nom, e-mail, téléphone) ;
  - artisans (nom commercial, raison sociale, ou SIRET saisi même avec des espaces) ;
  - chantiers (titre) ;
  - devis et factures (numéro).
- **Personnes** (`/admin/personnes`), construite comme les listes de l'ADR 0046 : pastilles Particuliers, Artisans, Équipe MENAO, recherche, pagination.
  - **Les sessions anonymes ne sont jamais listées** : elles naissent à chaque recherche sans compte.
  - La fiche d'une personne montre son compte (e-mail, téléphone, inscription, dernière connexion, e-mail confirmé, communications), ses demandes, ses chantiers, ses avis et ses dossiers, plus un lien vers la fiche artisan s'il y a lieu.
- **Fiche artisan** :
  - section « Activité » : demandes reçues et réponses, taux de réponse (`packages/core`), chantiers en cours et terminés, avis ;
  - liens vers son compte et vers ses chantiers.
- **Suspension manuelle** (section « Statut du compte ») :
  - seulement pour un artisan validé, avec un motif obligatoire ;
  - le motif est transmis à l'artisan dans un e-mail dédié, qui ne parle pas d'assurance et l'invite à écrire à l'équipe ;
  - la suspension est journalisée (`artisan.suspendu`) ; ses chantiers en cours ne changent pas.
  - La levée ne vaut que pour une suspension décidée par l'équipe, et jamais sans assurances à jour. Une suspension automatique se lève par le renouvellement du document, comme avant (F-51).
- **Données** : des fonctions réservées aux admins en session aal2.
  - `admin_people`, `admin_people_counts`, `admin_user_account`, `admin_search`, `admin_artisan_activity`, `admin_suspend_artisan` et `admin_reactivate_artisan`.
  - Elles s'appuient sur la fonction interne `app.admin_people_rows`, non exposée.

## Points à valider (TODO(legal))
- Règlement P2B (UE 2019/1150) : motivation de la suspension transmise à l'artisan. Faire valider les délais, le traitement des réclamations et la mention dans les CGV artisans.

## Conséquences
- À déployer : la migration.
- Lot 3b : actions sur les comptes (suspendre un compte client, lien de réinitialisation du mot de passe, export RGPD, traitement des demandes de suppression avec les règles de conservation à valider).
