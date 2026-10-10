# ADR 0023 — Paiement de l'acompte : Stripe Checkout sur le compte de l'artisan

- Statut : accepté
- Date : 10 octobre 2026

## Contexte
- **F-31** : après la signature, le client paie l'acompte (onglet « Paiement de l'acompte »), avec l'échéancier sous les yeux. Le bénéficiaire affiché est l'entreprise de l'artisan.
- **F-30 et ADR 0011** : paiements par charges directes sur le compte Stripe Connect de l'artisan, sans commission ni `application_fee`. MENAO ne détient jamais d'argent (CLAUDE.md règle 12).
- **Phase 4** (spec §15) : paiements et chantier.

## Décisions
- **Paiement par Stripe Checkout, créé directement sur le compte de l'artisan** (`Stripe-Account`).
  - L'artisan est le marchand : son nom apparaît sur le relevé du client, les fonds arrivent sur son solde Stripe et il en paie les frais.
  - Aucun script Stripe dans les pages de MENAO.
  - Les moyens de paiement sont ceux que l'artisan active dans son compte : carte, Apple Pay, Google Pay, et éventuellement prélèvement.
  - Ce choix suit celui des abonnements (ADR 0010) et de la signature hébergée (ADR 0022).
- **Montant** : la tranche « à la signature » de l'échéancier figé à l'envoi du devis (ADR 0021). Il n'est jamais saisi ni recalculé à l'écran.
- **Table `payments`** : elle reflète les paiements Stripe, qui font foi.
  - Un seul paiement actif (en attente, en cours ou payé) par devis et par tranche.
  - `particulier_start_deposit` contrôle la demande : client du chantier, devis signé, chantier « devis signé », artisan capable d'encaisser. Elle crée ou reprend le paiement en attente.
  - `deposit-checkout` expire l'éventuelle session précédente avant d'en ouvrir une nouvelle : une seule session est payable à la fois.
- **Webhook Stripe** (point de terminaison Connect, signature vérifiée, traitement unique) :
  - les événements `checkout.session.*` des comptes connectés sont rattachés au devis et à la tranche par les métadonnées posées par MENAO ;
  - `record_payment` (service_role) vérifie le compte et le montant avant toute écriture ;
  - **paiement immédiat** (carte) : payé dès la fin du paiement ;
  - **paiement différé** (prélèvement, virement) : « en cours » jusqu'à la réception effective des fonds, puis payé ou échoué ;
  - **session expirée ou remplacée** : sans effet sur le paiement courant ;
  - l'acompte payé fait passer le chantier en `acompte_paye`, avec un e-mail à l'artisan (« confirmez la date de démarrage ») et au client.
- **Versements de l'artisan** : ils suivent le calendrier de son propre compte Stripe. Le versement « 48 h avant le démarrage » de la spec ne s'applique pas, puisqu'aucun fonds n'est retenu par MENAO (ADR 0011).
- **Remboursements et litiges** : ils se gèrent dans le tableau de bord Stripe de l'artisan (ADR 0011). Leur reflet dans MENAO viendra avec F-34.

## Points à valider
- **TODO(legal)** :
  - contrat conclu hors établissement : aucun paiement avant sept jours (art. L221-10 du Code de la consommation) ;
  - droit de rétractation de 14 jours pour les contrats à distance ou hors établissement ;
  - mentions sur l'acompte.

  Selon l'avis juridique, l'onglet « Paiement de l'acompte » pourra n'ouvrir qu'après le délai légal.
- **Virement bancaire [à confirmer avec Stripe]** : coordonnées bancaires fournies par Stripe pour le compte de l'artisan, rapprochement automatique (F-31). Cela demande un client Stripe sur le compte de l'artisan. Ce moyen sera ajouté après confirmation : le traitement des paiements différés est déjà prêt.

## Conséquences
- **Mise en service** : le webhook Connect doit recevoir `checkout.session.completed`, `async_payment_succeeded`, `async_payment_failed` et `expired`. Le script `scripts/stripe-setup.mjs` les synchronise.
- **Factures d'acompte et de solde (F-35)** : elles s'appuieront sur `payments`.
- **Paiement du solde (F-32)** : même mécanisme, tranche « à la réception », ouvert après le procès-verbal de réception (phase 5).
