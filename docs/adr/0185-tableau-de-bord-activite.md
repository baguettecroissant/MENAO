# ADR 0185 — Tableau de bord artisan : activité et chiffre d'affaires

- Statut : accepté
- Date : 25 octobre 2026
- Comparaison avec le tableau de bord de TrustUp (25 octobre 2026) : le nôtre est tourné vers l'action (« À faire maintenant »), le leur vers l'argent. L'artisan ne voyait pas d'un coup d'œil son chiffre d'affaires de l'année, ce qu'il attend, ni qui lui doit de l'argent. Proposition de cinq blocs, validée par l'utilisateur : « oui fais les 5 sur le site et l'appli ».

## Décision
« À faire maintenant » reste en tête. Cinq blocs s'ajoutent, sur le site (deux colonnes en grand écran) et dans l'application :

1. **Raccourcis** :
   - « Préparer un devis » ouvre le premier chantier qui attend un devis, sinon la liste des devis ;
   - « Bloquer un créneau » ouvre l'agenda ;
   - « Partager ma fiche » et « Inviter un artisan » (parrainage) ;
   - dans l'application, s'y ajoutent les factures et les disponibilités.
2. **Chiffre d'affaires de l'année** :
   - en tête, trois montants : l'encaissé de l'année, l'à venir (reste à payer sur les devis signés des chantiers en cours) et l'à recevoir (soldes des chantiers réceptionnés) ;
   - un graphique en colonnes mois par mois et le choix de l'année.
   - L'encaissé compte les acomptes et soldes payés (statut « payé »), au mois de Paris du paiement. Un virement en cours de confirmation n'est pas encore encaissé.
3. **Devis en attente** : les trois derniers devis envoyés sans réponse et leur montant total. S'y ajoutent le taux de signature sur 6 mois (devis signés ÷ devis envoyés, versions remplacées exclues) et le montant moyen d'un devis signé.
4. **Chantiers en cours**, du devis signé aux réserves levées : l'étape et la part déjà payée.
5. **Soldes à recevoir** : chantiers réceptionnés dont le solde n'est pas payé.
   - Aucun « retard » n'est affiché : MENAO ne fixe pas de délai de paiement du solde, et la règle ne s'invente pas.

**Le graphique**, d'après les règles de conception des graphiques :
- une seule série, donc sans légende ;
- colonnes fines arrondies en haut et axe discret ;
- le mois le plus haut écrit au-dessus de sa colonne, les autres au survol (site) ou au toucher (application) ;
- les initiales des mois sous les colonnes ;
- un tableau des mêmes valeurs pour les lecteurs d'écran.

**L'espace d'exemples** (ADR 0184) montre les mêmes blocs, remplis par un historique fictif : neuf chantiers terminés, un solde à recevoir et deux devis refusés.

## Technique
- **`packages/core/src/artisan-activity.ts`** :
  - `dashboardActivity` (calcul, montants en centimes) et `activityInputFromRows` (lignes de `payments`, `artisan_quotes`, `artisan_chantiers`) ;
  - `activityYears`, `activityYear`, `activityCurrentMonth` et `revenueTicks` (graduations rondes) ;
  - tests unitaires (mois de Paris, statuts, taux, années).
- **Aucune nouvelle fonction en base** : les lectures existantes suffisent (RLS), avec `artisan_quotes` en plus sur le tableau de bord.
- Exemples : `exampleActivityInput` (`space-examples.ts`).
- Site : `dashboard-activity.tsx`, branché dans `DashboardView` (`activity`). Application : `dashboard-activity.tsx`, branché dans `DashboardScreen`. Aucune mention d'abonnement dans l'application (règle 10).

## Conséquences
- Pas de migration ni de nouvelle dépendance.
