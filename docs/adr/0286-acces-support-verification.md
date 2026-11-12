# ADR 0286 — Rangement du back-office, lot 4 : accès du support et rôle « Vérification » (F-135)

- Statut : accepté
- Date : 12 novembre 2026
- Suit les ADR 0283 à 0285 (lots 1 à 3). Complète les ADR 0049 (rôle support), 0210 (invitation de l'équipe) et 0284 (page Équipe MENAO).

## Contexte
Le back-office ne connaissait que deux accès : admin (tout) et support (la boîte de réception seulement). Un salarié du support ne pouvait pas ouvrir la demande, le chantier ou le compte dont parle un ticket. Et valider des dossiers d'artisans exigeait l'accès admin, qui donne aussi l'argent, le lancement et les réglages.

Décisions de l'utilisateur et maquettes validées le 12 novembre 2026 (lot 33 du canevas).

## Décision
### Support : consultation des fiches, sans action
- **Menu à cinq rubriques** : Boîte de réception, Dossiers artisans, Demandes, Chantiers, Comptes. La recherche du haut lui est ouverte. Il arrive toujours sur la boîte de réception.
- **Bandeau « Lecture seule »** sur les fiches demande, chantier, compte et artisan. Les boutons d'action n'y sont pas affichés.
- **Pas d'argent** :
  - pas de montants dans la liste des chantiers ;
  - sur la fiche chantier, pas de montants de devis, ni de paiements, ni de factures, ni de PDF de devis.
- **Pas de documents d'identité** : sur la fiche artisan, il a les onglets Vérification, Entreprise et profil, et Activité. Il ne voit ni les documents, ni la liste des points à vérifier, ni la décision, ni l'historique des décisions. Il ne voit pas non plus l'abonnement, l'objectif, le parrainage, la visibilité, ni l'onglet Compte.
- **Base** : ses lectures de tables passaient déjà par `app.is_staff()` depuis l'ADR 0049. Ce qui change :
  - Les fonctions des listes et fiches s'ouvrent au support : `admin_projects`, `admin_project_counts`, `admin_chantiers`, `admin_chantier_counts`, `admin_people`, `admin_people_counts`, `admin_user_emails`, `admin_user_account`, `admin_artisan_activity`, `admin_artisan_menao_score` et `admin_search`.
  - Toutes les actions restent sous `app.require_admin()`.
  - Les documents des artisans, les abonnements et le journal d'audit restent réservés aux admins.

### Nouveau rôle « Vérification »
- **Valeur `verification`** de `app_role`, posée par un admin (invitation ou menu « ⋯ » de la page Équipe), jamais à l'inscription.
- **Menu à deux rubriques** : Dossiers artisans (avec Inscriptions en cours) et Conformité (renouvellements, échéances, contrôles aléatoires). Il arrive sur Dossiers artisans.
- **Fiche artisan à deux onglets** : Vérification (documents, certifications, RGE, charte, décision, contrôles, historique) et Entreprise et profil. Retirer des recherches et radier restent aux admins.
- **Recherche du haut** : artisans seulement. La base filtre les autres résultats.
- **Alerte « dossier à vérifier »** : envoyée aux admins et à la vérification.
- **Base** :
  - Aide `app.is_verifier()` : admin, ou rôle `verification` en session aal2. Aides `app.require_verifier()` et `app.require_staff()`.
  - Politiques de lecture sur l'artisan et son dossier : artisans, documents, certifications, métiers, zones, territoires, photos, charte, RGE, contrôles, décisions.
  - Profils : ceux des artisans et ceux de l'équipe, pas ceux des particuliers.
  - Stockage : documents et logos des artisans.
  - Ouverts au rôle : `admin_review_document`, `admin_verify_certification`, `admin_decide_artisan`, `admin_complete_spot_check`, `admin_draw_spot_checks` et `admin_stalled_signups`. L'Edge Function `rge-check` aussi.
  - Il ne lit ni les demandes, ni les chantiers, ni les messages, ni l'argent, ni le journal d'audit.

### Équipe
- Trois accès à l'invitation (`staff-invite`, `admin_record_staff_invite`), dans le menu « ⋯ » (« Changer l'accès » : les deux autres accès) et dans « Ce que voit chaque accès ».
- `app.staff_target`, `admin_staff_members`, `admin_set_staff_role`, le filtre « Équipe » des comptes et la protection des comptes de l'équipe (`app.admin_account_target`) comptent les trois accès.

### Code
- Gardes de page par accès (`lib/admin/guard.ts`) :
  - `requireTeam` : les trois accès ;
  - `requireStaff` : admin et support ;
  - `requireVerifier` : admin et vérification ;
  - `requireAdmin` : admin seulement.
- Menu : `roles` sur chaque rubrique (`nav-config.ts`).
- `packages/core` : rôle `verification`, `isTeam()`, accueil `/admin/artisans`, espace « équipe » dans l'application native.
- Migrations `20261112090000_role_verification` (valeur d'enum, seule dans sa transaction) et `20261112090100_acces_support_verification`. Les fonctions y sont reprises de leur définition en vigueur ; seule la garde ou la liste des rôles change.
- Tests : pgTAP 136, et e2e « support » et « vérification » (compte fictif `verification@example.test` dans le seed).
