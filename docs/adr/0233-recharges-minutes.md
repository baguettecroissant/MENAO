# ADR 0233 — Recharges de minutes de voix (agents IA, lot 2)

- Statut : accepté
- Date : 6 novembre 2026
- F-84, demandé le 6 novembre 2026 (« go pour le lot 2 avec 12 mois »). Suite des ADR 0231 (minutes par formule) et 0232 (secrétaire dédiée). Rapport « Agents IA de MENAO : coûts et formules », validé le même jour : recharges de 100 minutes à 19 € HT, réservées à Premium et Entreprise.

## Décision
- **Catalogue en base** (`voice_topup_offers`), lisible par tous et modifiable sans déploiement : une offre au départ, 100 minutes, 19 € HT, valable 12 mois, clé de prix Stripe `menao_recharge_100`. `pnpm stripe:setup` crée le produit et le prix (paiement unique, HT, `tax_behavior` exclusif) à partir de ce catalogue.
- **Achat sur le site uniquement** (règle 10) : bouton « Recharger 100 minutes · 19 € HT » dans « Vos agents IA » (« Ma formule »). Il est mis en avant à partir de 80 % des minutes incluses, et les e-mails d'alerte y renvoient.
- **`billing-topup`** (artisan connecté) :
  - vérifie que le dossier est validé et que la formule permet les recharges (`plans.limites.agents.recharges`) ;
  - ouvre une session Stripe Checkout de paiement unique : carte, TVA 20 % par le taux déjà en place, facture créée par Stripe ;
  - mention « minutes valables 12 mois, paiement unique, sans abonnement » près du bouton de paiement.
- **Crédit par `stripe-webhook`** seulement : signature vérifiée, événement traité une fois (`webhook_events`), session payée et marquée `menao_kind = recharge_minutes`. `voice_credit_topup` (rôle service) crédite une seule fois par session (clé unique), avec le montant HT et l'échéance.
- **Validité de 12 mois**, pour les minutes rechargées comme pour les minutes offertes par l'équipe. Les minutes rechargées ne repartent pas à zéro chaque mois ; elles servent après les minutes incluses du mois (ADR 0231).
- **Expiration** (`app.expire_voice_credits`, chaque nuit) : à l'échéance, le reste d'une recharge passe en débit « expiration ». Les minutes les plus anciennes sont consommées en premier : le reste d'une recharge, c'est ce que les débits n'ont pas couvert, jusqu'à elle comprise.
- **Back-office** (« Suivi de l'IA ») : recharges vendues du mois, encaissé HT, minutes vendues, marge estimée si toutes les minutes servent (à 0,09 € la minute).

## Conséquences
- Test pgTAP `123_recharges_minutes`.
- `TODO(legal)` : caractère non remboursable des minutes achetées et leur durée de validité, à inscrire dans les CGV artisans.
- Après la fusion : `db push`, déploiement de `billing-topup` et de `stripe-webhook`, puis `pnpm stripe:setup` en mode test sur staging pour créer le prix de la recharge.
