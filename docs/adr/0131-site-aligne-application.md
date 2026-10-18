# ADR 0131 — Espace artisan du site aligné sur l'application (lot 4 de la refonte)

- Statut : accepté
- Date : 18 octobre 2026
- Suit les ADR 0128 à 0130 (lots 1 à 3, application).

## Contexte
- **L'application a reçu « Mon profil » (ADR 0129) et l'accueil « À faire maintenant » (ADR 0130).**
- **Le site gardait l'ancienne organisation** : « Mon dossier » et « Ma fiche publique » dans le menu latéral, alertes de documents empilées sur le tableau de bord, menu de la photo minimal.
- **Plan de refonte** : même organisation et mêmes noms sur le site.

## Décision
- **Règles communes dans `@menao/core`** :
  - `profileHubStatuses` (testé) donne l'état de chaque rubrique sous forme de codes ; le site et l'application les traduisent chacun en textes ;
  - le code de l'application a été déplacé là sans changer de comportement (ses tests passent à l'identique) ;
  - `artisanTodo` et `laterAppointments` (ADR 0130) servent au tableau de bord du site.
- **Page « Mon profil »** (`/pro/mon-profil`), comme dans l'application :
  - en-tête (photo, nom, entreprise, badges, Score MENAO) ;
  - jauge « Fiche complète à X % » avec le conseil à suivre ;
  - « Voir ma fiche » ;
  - rubriques groupées avec leur état, qui mènent aux pages existantes (entreprise, métiers, zone, documents, charte, paiements, disponibilités, avis, grade, factures, compte, notifications, aide).
  - Différence voulue avec l'application : une ligne « Abonnement » (vers la formule). Le site peut en parler, jamais l'application (CLAUDE.md règle 10).
- **Tableau de bord** :
  - titre de bienvenue, avec le nombre de choses à faire ;
  - liste « À faire maintenant » à la place des alertes URSSAF et documents et des dernières demandes ;
  - rendez-vous des jours suivants ;
  - restent : les indicateurs, la suspension ou la radiation, et le profil non visible.
  - Les pages d'aperçu, dont celles des films, gardent l'ancien rendu : la liste est facultative dans `DashboardView`.
- **Menu latéral** :
  - Activité : Tableau de bord, Demandes, Chantiers, Devis, Messages, Agenda, Factures ;
  - Profil : Mon profil, Ma fiche (anciennement « Ma fiche publique »), Avis, Mon grade.
  - « Mon dossier » et « Paramètres du compte » quittent le menu : leurs pages sont dans « Mon profil ».
- **Menu de la photo** : Mon profil, Ma fiche, Identité et connexion, Notifications, Échanges, Aide.
- **Tests de bout en bout** adaptés : titre de bienvenue, ligne « Nouvelle demande », document « À renouveler », page « Mon profil », lien « Ma fiche ».

## Conséquences
- Un artisan retrouve la même organisation, avec les mêmes mots, sur le site et dans l'application.
- Les devis gardent leur propre entrée dans le menu du site, qui a la place pour tout montrer (dans l'application, ils sont sous Chantiers).
