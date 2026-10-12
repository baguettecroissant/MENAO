# ADR 0045 — Vue d'ensemble du back-office, en direct

- Statut : accepté
- Date : 12 octobre 2026
- Avance F-58 (tableau de bord, prévu en phase 7). Complète les ADR 0034 et 0035 (coques et menu latéral) et le §13 de la spec.

## Contexte
- `/admin` renvoyait sur la file des dossiers artisans. L'équipe n'avait aucune vue de ce qui se passe sur MENAO : ni chiffres, ni suivi des demandes, ni activité.
- Ce qui demandait une action était éparpillé entre trois pages : dossiers, échéances, tickets.
- Le porteur du projet veut un suivi en temps réel et une vue sur l'ensemble de la plateforme, le plus simple possible.

## Décision
- **`/admin` devient la vue d'ensemble**, première rubrique du menu et page d'arrivée après la double authentification. Elle a trois blocs :
  1. **À traiter maintenant** : dossiers à vérifier (le plus ancien, accès direct aux trois premiers), litiges ouverts, tickets en retard, demandes sans réponse qui expirent sous 12 h (avec l'artisan à relancer), documents renouvelés à vérifier, assurances qui expirent sous 7 jours, paiements échoués, abonnements impayés. Seules les cartes non vides s'affichent ; chacune dit pourquoi et mène à la page où traiter.
  2. **Activité en direct** : les 40 derniers événements de toute la plateforme (recherches, demandes et réponses, étapes des chantiers, dossiers et décisions, tickets, avis, abonnements).
  3. **Chiffres clés**, sur 30 jours sauf mention contraire : demandes (volumes, taux de réponse et d'acceptation, conversion des recherches), chantiers par étape, artisans et abonnements, paiements versés aux artisans, avis et tickets. Les chiffres qui ont une page y mènent.
- **Données** : deux fonctions en lecture seule, réservées aux admins en session aal2 (`app.is_admin`).
  - `admin_overview()` renvoie tous les compteurs en un appel ;
  - `admin_activity(p_limit)` renvoie le fil.
  - Les regroupements (étapes des chantiers) et les taux sont calculés dans `packages/core` (`overview.ts`).
- **Données personnelles** : le fil ne nomme pas les particuliers ; leurs recherches et demandes apparaissent par métier et ville. Les artisans apparaissent par le nom de leur entreprise.
- **Rôle support** : pas d'accès pour l'instant. Les chiffres des paiements ne lui sont pas destinés (spec §4). Son accès au back-office viendra avec le lot des tickets.
- **En direct** : les tables `projects`, `requests`, `chantier_events`, `tickets` et `artisans` rejoignent la publication `supabase_realtime`.
  - La page s'abonne à leurs changements et se recalcule, au plus une fois toutes les 2 secondes.
  - Chaque abonné ne reçoit que les lignes que la RLS lui permet de lire.
  - Sans temps réel (coupure, ou CI qui ne démarre pas Realtime), la page s'actualise chaque minute tant qu'elle est visible.
  - L'indicateur affiche « En direct » ou « Actualisation automatique », avec l'heure de mise à jour.
- **Au passage** : l'abonnement d'un artisan s'affiche en français dans sa fiche (formule, statut, fin d'essai, résiliation programmée), et non plus avec le statut Stripe brut.

## Conséquences
- À déployer : la migration (fonctions et publication).
- Les pages de suivi des demandes, des chantiers, des paiements et des utilisateurs (lots suivants) rendront cliquables les chiffres et les événements qui ne mènent encore nulle part.
- Coût : quelques requêtes par actualisation, pour un petit nombre d'admins ; le temps réel passe par Supabase, sans service Vercel (règle 13).
