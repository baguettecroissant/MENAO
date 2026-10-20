# ADR 0152 — « Votre argent » : aperçu du compte Stripe de l'artisan

- Statut : accepté
- Date : 20 octobre 2026
- Complète les ADR 0011 (paiements directs sur le compte de l'artisan) et 0124 (paiements dans l'application).

## Contexte
- **L'onglet Paiements** (site et application) disait seulement si le compte Stripe était actif. Pour voir son solde ou ses virements, l'artisan devait ouvrir son tableau de bord Stripe.
- **Demande de l'utilisateur** : afficher des données utiles du compte Stripe Connect de l'artisan, comme le solde.
- **Comptes Connect** : tableau de bord Stripe complet (l'ancien type « Standard », ADR 0011), créés par MENAO. Les paiements des chantiers y sont faits directement. La plateforme peut lire ces comptes par l'API, au nom du compte (`Stripe-Account`).
- **Deux options comparées** :
  - nos propres cartes, alimentées par une fonction serveur ;
  - les composants intégrés de Stripe (Connect embedded components). Plus riches (virement, changement d'IBAN), mais ils demandent à un artisan au tableau de bord complet de **se connecter à Stripe** dans le composant, imposent le design de Stripe, un script tiers dans la politique de sécurité du site, et une intégration à part dans l'application.
- **Choix de l'utilisateur** : nos propres cartes.

## Décision
- **Fonction serveur `connect-overview`**, en lecture seule :
  - réservée à l'artisan connecté, dont le compte peut encaisser ;
  - au plus 120 appels par heure.
- **Quatre lectures en parallèle, au nom du compte de l'artisan** :
  - le solde (`balance`) ;
  - les 10 derniers virements (`payouts`) ;
  - le compte (`accounts`), pour le calendrier des virements et la banque de destination ;
  - les mouvements du mois en cours, heure de Paris (`balance_transactions`), pour les frais Stripe.
- **Lecture des réponses** : `packages/core/src/connect-overview.ts` (`connectOverviewFromStripe`), un fichier autonome importé par la fonction, testé :
  - montants en centimes, en euros seulement ;
  - prochain virement = le plus proche des virements prévus ou en route ;
  - 5 derniers virements ;
  - aucune erreur sur une réponse incomplète.
- **Encaissé via MENAO** : ce mois et depuis le 1er janvier, heure de Paris (`collectedTotals`). Il est calculé à partir des paiements payés en base, sans appel à Stripe.
- **Affichage**, site (`/pro/onboarding/paiements`) et application (écran Paiements), quand le compte est actif. Bloc « Votre argent » :
  - **Chiffres** : disponible, en cours, prochain virement, encaissé via MENAO ;
  - **Infos du compte** : banque de destination (•••• 1234), calendrier des virements, délai de disponibilité, frais Stripe du mois ;
  - **Derniers virements** avec leur état.
  - Si Stripe ne répond pas, un message le dit. Le reste de la page s'affiche normalement.
- **Lecture seule** : virements, remboursements et coordonnées bancaires restent dans le tableau de bord Stripe de l'artisan (lien existant). MENAO ne déplace aucun fonds (règle 12).
- **Données** : les montants ne sont ni journalisés ni stockés par MENAO. Seule l'erreur Stripe (type et code) est journalisée.

## Conséquences
- **L'artisan voit son argent sans quitter MENAO**, dans le même format sur le site et dans l'application.
- **Aucun changement de configuration Stripe**, aucune nouvelle dépendance, aucune table.
- **Mise en service** : déployer la fonction `connect-overview` sur la base en ligne après la fusion. Sans elle, le bloc affiche le message d'indisponibilité.
- **Tests** :
  - `packages/core` : lecture des réponses, début du mois à Paris, encaissé ;
  - e2e Connect : le bloc s'affiche avec stripe-mock en CI.
