# ADR 0366 — Primes des commerciaux selon la formule choisie (F-174)

- Date : 17/11/2026
- Fonctionnalité : F-174. Complète l'ADR 0207 (primes des commerciaux).

## Contexte

Le barème réel des agents commerciaux a été donné par l'utilisateur le 17/11/2026 (document
« Simulation de gains 2027 ») : 110 € à chaque artisan validé, puis, quand l'artisan devient
abonné payant après ses 2 mois offerts, 30 € pour l'offre 150 €, 100 € pour l'offre 500 € et
200 € pour l'offre 1 500 €. MENAO ne connaissait qu'une seule prime d'abonnement.

## Décision

- Deux montants de plus dans `commercial_bonus_settings` : primes d'abonnement Premium et
  Entreprise. La prime existante devient celle de Base. Vide : même montant que Base.
- La vérification quotidienne prend le montant de la formule de l'abonnement actif
  (`app.commercial_subscription_bonus_cents`). `validate_commercial_bonuses` et
  `commercial_results` sont complétées en place (`pg_get_functiondef`), jamais recopiées.
- Les montants restent réglés dans le back-office (Réglages › Primes des commerciaux), pas dans
  la migration : le barème réel est saisi sur staging après déploiement.
- « Mes résultats » montre le barème complet au commercial ; le texte de la démo est mis à jour.

## Conséquences

- La prime suit la formule au moment de la vérification : un artisan qui change de formule pendant
  le délai reçoit la prime de sa nouvelle formule.
- Le délai de vérification (30 jours par défaut) reste en place, alors que le document annonce un
  règlement en fin de mois : à régler dans le back-office si besoin.
