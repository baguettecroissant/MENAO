# ADR 0207 — Espace commercial, lot 3 : résultats, primes, tableau par commercial, zones

- Statut : accepté
- Date : 29 octobre 2026
- Complète les ADR 0205 (lot 1) et 0206 (lot 2) ; reprend le mécanisme des commissions des partenaires (ADR 0136, 0145).

## Contexte
- **Demande de l'utilisateur** (29 octobre 2026, « go le lot 3 ») : résultats et primes des commerciaux, tableau de suivi dans le back-office, zones et réattribution.
- **Montants non décidés** : la rémunération des commerciaux (fixe, prime par artisan validé ou abonné) est à trancher par les associés, et leur contrat est chez l'avocat (question n°3). Règle 15 : aucun montant dans le code.

## Décision
- **Réglages** (`commercial_bonus_settings`, une ligne) : prime par artisan validé, prime par artisan abonné, délai de vérification (30 jours par défaut, comme les partenaires) et objectif mensuel facultatif. Montants nuls par défaut : aucune prime n'est calculée tant qu'ils ne sont pas réglés dans le back-office.
- **Primes** (`commercial_bonuses`), une par artisan et par type :
  - **validation** : créée quand un artisan inscrit avec le code d'un commercial actif est validé ;
  - **abonnement** : créée au premier paiement réel de son abonnement ;
  - **vérification quotidienne** (`app.validate_commercial_bonuses`, après le délai) : dossier toujours validé ou abonnement toujours actif → « à payer », avec le montant du moment ; sinon annulée ; montant pas encore réglé → la prime attend.
- **Back-office** : tableau par commercial (inscrits, validés, abonnés, prospects suivis, primes à payer) ; fiche du commercial avec sa zone, le transfert ou la libération de ses prospects (départ d'un commercial), ses artisans et ses primes (marquer payées avec la référence du virement, annuler avec un motif) ; export CSV des primes à payer.
- **Espace commercial** : « Mes résultats » (inscrits, validés, abonnés du mois et au total, objectif s'il est réglé, prospects en cours, six derniers mois, primes et leur règle) ; onglet « Ma zone » dans les prospects quand une zone est réglée (débuts de codes postaux).

## Conséquences
- Les associés doivent régler les montants (et le délai) avant le premier paiement de primes ; les primes créées avant attendent le réglage.
- Le paiement reste hors de MENAO (virement), comme pour les partenaires ; MENAO n'encaisse rien sur les chantiers (règle 12 inchangée).
- TODO(legal) : contrat et rémunération des commerciaux (question n°3) ; mention de ces primes dans le contrat.
