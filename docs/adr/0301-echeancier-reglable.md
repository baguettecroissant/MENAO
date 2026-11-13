# ADR 0301 — Échéancier de paiement réglable : sans acompte et paiement au démarrage

- Statut : accepté (13/11/2026)
- Fonctionnalité : F-146 (maquette lot 40), PR 1 sur 3 : base et règles

## Contexte

L'échéancier d'un devis était toujours en deux tranches : un acompte de 1 à 99 % à la signature
(30 % par défaut, réglable à l'envoi), puis le solde à la réception. L'utilisateur veut que
l'artisan règle son système de paiement. Décisions du 13/11/2026 : un écran « Mes paiements »
dans Argent, un devis **sans acompte** possible, et une **troisième tranche facultative au
démarrage des travaux** (par exemple 30 / 40 / 30).

## Décision

- **Tranches** : `signature` (acompte, 0 à 99 %), `demarrage` (0 à 99 %), `reception` (le reste,
  au moins 1 %). Une tranche à 0 % n'est pas écrite dans `quotes.payment_schedule`. Chaque part
  est arrondie au centime inférieur, le solde calcule le reste (règle 5). Mêmes règles dans
  `@menao/core` (`paymentSchedule`, `paymentScheduleError`) et en base
  (`app.check_payment_schedule`, `app.build_payment_schedule`).
- **Échéancier par défaut** : `artisans.default_deposit_percent` (désormais 0 à 99) et
  `default_start_percent` (nouveau, 0 par défaut), enregistrés par `set_payment_defaults` ou
  depuis l'envoi d'un devis (« En faire mon échéancier par défaut »). Patron ou chef d'équipe,
  comme l'envoi des devis.
- **Envoi** : `artisan_send_quote` gagne un dernier paramètre `p_start_percent` (0 par défaut) ;
  recréée avec `app.my_manager_artisan_id()` (droits d'équipe, ADR 0240).
- **Sans acompte** : à la signature, `record_quote_signature` enchaîne la transition existante
  `devis_signe → acompte_paye`, journalisée avec `sans_acompte: true`. Aucune notification
  « acompte payé » ; l'e-mail « devis signé » invite l'artisan à fixer la date. La machine à
  états ne change pas.
- **Paiement au démarrage** : nouveau `payment_kind` `demarrage`. Il est dû quand le chantier
  passe « en cours » (événement `demarrage`, notification `demarrage_du` au client), payable
  jusqu'à la réception (`particulier_start_demarrage`, Stripe Checkout sur le compte de
  l'artisan, sans commission, règle 12), relançable depuis « À encaisser ». Il ne bloque pas le
  chantier. Encaissé, il donne une facture d'acompte (`kind = demarrage`, part réglée dans
  `quote.tranche_percent`) et la notification `demarrage_paye` (artisan, client, chef d'équipe).
- **Solde** : toujours `total − déjà payé`. La facture de solde déduit tous les acomptes
  (`acompte` et `demarrage`). Un paiement au démarrage resté en attente à la réception est
  annulé et compris dans le solde ; s'il est en cours de confirmation, le solde attend.
- **Documents** : tranche « au démarrage des travaux » sur le devis, « Acompte versé au
  démarrage » sur la facture de solde, « Déjà versé » sur le PV quand l'acompte n'est pas le seul
  versement.

## Conséquences

- Écrans à venir : PR 2 (site : « Mes paiements », envoi du devis, pages du client, chantier,
  Suivi) puis PR 3 (application). D'ici là, les écrans client lisent les tranches par moment de
  paiement et ne proposent pas de payer un acompte absent.
- Tests : pgTAP `143_echeancier` (30 / 40 / 30 de bout en bout, sans acompte, droits) et
  `19_envoi_devis` (0 % accepté, 100 % et somme sans solde refusés) ; tests de `@menao/core`,
  `@menao/validation`, `@menao/documents` et `@menao/emails`.
- Déploiement : migrations d'abord, puis `deposit-checkout` et `stripe-webhook`.
- TODO(legal) : délai de rétractation d'un contrat hors établissement (C. conso. L221-10 :
  aucun paiement exigible pendant 7 jours ; L221-25 : travaux commencés avant la fin du délai) à
  faire confirmer par l'avocat, pour l'acompte comme pour le paiement au démarrage.
