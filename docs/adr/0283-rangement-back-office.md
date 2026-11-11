# ADR 0283 — Rangement du back-office, lot 1 : menu et noms (F-132)

- Statut : accepté
- Date : 11 novembre 2026
- Remplace le découpage du menu de l'ADR 0133 (pôles) ; complète les ADR 0049 (boîte de réception), 0051 (argent), 0052 (réglages), 0121 (contrôles aléatoires), 0146 (activité), 0219 (inscriptions bloquées) et 0282 (objectifs de demandes).

## Contexte
Le back-office a grandi lot par lot : 18 rubriques, 36 pages. L'utilisateur veut « le back-office le mieux rangé possible », pour les fondateurs comme pour les futurs salariés. L'audit du 11 novembre 2026 a relevé :
- des noms en doublon : « Dossiers » pour les dossiers des artisans et pour la boîte de réception (« Dossiers et messages ») ; « Activité » pour une page, une section du menu et une section de la fiche artisan ;
- des pages qui se recoupent : « À surveiller » et « Contrôles aléatoires » ; « Inscriptions bloquées » (hors menu) et l'onglet « Brouillon » ;
- des pages mal rangées : Partenaires, Parrainages et Commerciaux dans « Argent » ; les ventes de recharges de minutes dans « Suivi de l'IA » ; les notifications Stripe et DocuSeal sous « Paiements ».

Le rangement est découpé en quatre lots : 1. menu et noms (cet ADR) ; 2. réglages centralisés et page « Équipe MENAO » ; 3. fiche artisan en onglets ; 4. rôles des salariés. Maquettes validées le 11 novembre 2026 (lot 30 du canevas).

## Décision
- **Menu de 16 rubriques en 6 sections**, dans l'ordre d'usage :
  - *(sans titre)* Vue d'ensemble, Boîte de réception ;
  - **Artisans** : Dossiers artisans, Conformité, Objectifs de demandes ;
  - **Clients et chantiers** : Demandes, Chantiers, Comptes ;
  - **Croissance** : Lancement, Marché, Apporteurs ;
  - **Argent** : Paiements des chantiers, Abonnements ;
  - **Système** : Métiers et travaux, Journal d'audit, Suivi technique. La page « Réglages » arrive au lot 2.
- **Un mot désigne une seule chose** : « dossier » ne désigne plus que le dossier d'inscription d'un artisan.
  - La boîte du support devient « Boîte de réception », et son filtre « Messages et dossiers » devient « Messages ».
  - Les sections « Dossiers et messages » des fiches deviennent « Tickets ».
  - « Personnes » devient « Comptes ».
  - La catégorie « Dossiers artisans » de l'activité devient « Artisans ».
- **Le nom du menu est le titre de la page.** Exemples : « Paiements des chantiers », « Métiers et travaux ». Une rubrique à plusieurs pages garde un seul titre.
- **Onglets et filtres** : les rubriques à plusieurs pages ont des onglets en pilule, comme Lancement (`components/admin/admin-tabs.tsx`) ; les filtres restent soulignés en dessous.
  - Vue d'ensemble : « À traiter et chiffres », « Toute l'activité » (`/admin/activite`).
  - Conformité (`/admin/conformite`) : Renouvellements, Échéances (`/echeances`), Contrôles du mois (`/controles`). En tête, les chiffres des trois onglets.
  - Apporteurs : Commerciaux, Partenaires, Parrainages (adresses inchangées).
  - Abonnements : Abonnements, Recharges de minutes (`/admin/abonnements/recharges`, retirées de l'IA).
  - Suivi technique (`/admin/technique`) : IA, Notifications Stripe et DocuSeal (`/notifications`).
- **Dossiers artisans** : l'onglet « Inscriptions en cours » (ancienne page « Inscriptions bloquées ») vient en premier et remplace l'onglet « Brouillon ». Tous les brouillons y sont, avec les dossiers validés mais pas encore visibles ; `?statut=brouillon` y redirige.
- **Pastille de Conformité** : renouvellements à vérifier plus contrôles du mois restants.
- **File « À traiter »** : les pôles suivent l'ordre du menu (support d'abord) et prennent les noms des sections (Artisans, Clients et chantiers, Système). Les nouveaux artisans à accompagner et les objectifs de demandes passent au pôle Artisans. Les clés `?pole=` ne changent pas.
- **Anciennes adresses redirigées** (`next.config.ts`) : `/admin/surveillance`, `/admin/controles`, `/admin/ia` et `/admin/paiements/notifications`. Les favoris et les liens des e-mails continuent de marcher, et l'e-mail « Document à renouveler » mène aux échéances.
- Site seulement : aucun changement de base ni de droits. Le rôle support garde la seule boîte de réception (lot 4).

## Écarts avec les maquettes
- Pas de chiffres communs en tête d'Apporteurs (artisans apportés sur 30 jours, devenus abonnés, primes à régler). Il faudrait réunir trois sources ; chaque onglet garde ses propres chiffres.
- L'onglet « Recharges de minutes » reprend les blocs existants (chiffres du mois, minutes par artisan), sans liste détaillée des recharges.
