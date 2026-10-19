# ADR 0146 — Pagination du back-office

- Statut : accepté
- Date : 19 octobre 2026
- Complète l'ADR 0046, qui a introduit la pagination des listes de suivi (50 lignes par page).

## Contexte
- **Demande de l'utilisateur** : éviter les pages à rallonge dans le back-office, sur la vue d'ensemble comme dans les rubriques qui compteront beaucoup de lignes.
- **État des lieux** :
  - déjà paginées : demandes, chantiers, personnes, tickets, paiements, notifications Stripe, abonnements, journal d'audit ;
  - affichées d'un bloc :
    - l'activité de la vue d'ensemble (40 derniers événements, sans accès aux précédents) ;
    - les dossiers artisans ;
    - les partenaires et les commissions d'un partenaire (coupées à 500) ;
    - les parrainages (coupés à 200) ;
    - l'historique des contrôles aléatoires (coupé à 120) ;
    - les tableaux « À surveiller ».

## Décision
- **Vue d'ensemble** : le bloc « Activité en direct » montre les 10 derniers événements et un lien « Voir toute l'activité ».
- **Page « Activité »** (`/admin/activite`, pôle Pilotage) :
  - tout l'historique, 50 événements par page ;
  - filtre par catégorie : recherches, demandes, chantiers, dossiers artisans, support, avis, abonnements. La correspondance entre catégories et types d'événements est dans `@menao/core` (`ACTIVITY_CATEGORIES`, `activityKinds`) ;
  - navigation « Plus récentes / Plus anciennes », sans total : il faudrait compter tout l'historique, qui mélange onze sources. La base renvoie une ligne de plus que la page pour savoir s'il en reste ;
  - `admin_activity(p_limit, p_offset, p_kinds)` : chaque source ne fournit que ce qu'il faut pour atteindre la page demandée ;
  - consultation bornée aux 5 000 derniers événements (cent pages) ;
  - l'ordre reste stable d'une page à l'autre, même pour deux événements à la même heure.
- **Pages de 50 lignes**, comme les listes existantes :
  - **dossiers artisans** (par statut), avec le nombre de résultats ;
  - **partenaires** ;
  - **commissions d'un partenaire** : les totaux et le virement portent toujours sur toutes ses commissions ;
  - **parrainages**, qui ne sont plus coupés à 200 ;
  - **historique des contrôles aléatoires**.
- **Mode de pagination** : les listes servies par une fonction de la base (partenaires, parrainages) sont paginées par l'interface, avec le décompte exact de PostgREST. Pas de nouvelle fonction.
- **« À surveiller »** : chaque tableau affiche 20 lignes, puis « Afficher 20 de plus » (`ShowMoreTable`). Ces listes sont bornées par les dates d'échéance ; leur longueur seule posait problème.
- **Fiches** (artisan, personne, ticket, chantier) : listes inchangées, courtes par nature (un dossier, un ticket, un chantier).

## Conséquences
- **Aucune page du back-office ne s'allonge sans fin** avec le volume.
- **Migration `pagination_back_office`** :
  - `admin_activity` recréée avec deux paramètres facultatifs ; l'appel existant reste valable ;
  - `admin_referrals` sans limite.
- **Tests** :
  - pgTAP `76_pagination_back_office` : pages successives sans doublon ni trou, filtre, borne, droits, plus de 200 parrainages ;
  - catégories dans `@menao/core` ;
  - e2e de l'administration, de la vue d'ensemble à la page « Activité » filtrée.
- **Pas de nouvelle dépendance.**
