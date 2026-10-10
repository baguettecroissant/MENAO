# ADR 0029 — Paiement du solde, facture de solde et clôture du chantier

- Statut : accepté
- Date : 10 octobre 2026

## Contexte
- **F-32** : après la réception, le client paie le solde (total TTC − acomptes payés, calculé, jamais saisi), avec les mêmes moyens que l'acompte.
- **F-35** : la facture de solde est émise au nom de l'artisan à l'encaissement (référence au devis, date de paiement, montant déjà réglé), dans la numérotation continue de l'artisan.
- **Machine à états (§9)** : `receptionne ──(solde payé)──► cloture`.
- **ADR 0011, 0027 et 0028** : paiements directs sur le compte Stripe de l'artisan, sans détention de fonds ; avec réserves, le solde n'est demandé qu'une fois leur levée confirmée (chantier réceptionné).

## Décisions
- **Montant** : `app.quote_balance` = total TTC du devis signé − paiements reçus, mêmes règles que `paymentProgress` (`packages/core`).
- **Ouverture du paiement** (`particulier_start_balance`) :
  - réservée au client du chantier, chantier `receptionne`, dernier devis signé, compte Stripe de l'artisan actif ;
  - paiement `solde` créé ou repris (montant recalculé) ;
  - refusée si le solde est déjà payé, ou si un paiement différé (virement) attend sa confirmation.
- **Stripe Checkout** : `deposit-checkout` accepte `{ chantierId }` pour le solde.
  - Même charge directe sur le compte de l'artisan, sans `application_fee`, métadonnée `menao_kind = solde` ; la session précédente est expirée.
  - Retour sur la vue du chantier (`?paiement=termine` : « confirmation en cours » jusqu'au webhook) ; abandon : retour à la page du solde.
- **Encaissement** : `record_payment` (appelée par `stripe-webhook`, inchangé et idempotent) émet la facture de solde, puis la transition `solde_paye` clôture le chantier, journalisée dans `chantier_events`.
- **Facture de solde** (`app.create_payment_invoice`) :
  - TVA par taux = TVA du devis − TVA des factures d'acompte (`balanceInvoiceVat` dans `packages/core`, `app.balance_invoice_vat` en base) : les factures du chantier totalisent le devis au centime près ;
  - contenu : lignes du devis (quantité, unité, prix unitaire HT), totaux des travaux, acomptes déduits (numéro de facture, montant TTC), puis solde HT, TVA et TTC ; en franchise de TVA : total des travaux, acomptes, solde net ;
  - garde-fou : si HT + TVA diffère du montant encaissé (impossible en principe), la facture n'est pas émise et un avertissement est journalisé en base ; le paiement reste enregistré.
- **Notifications** : `solde_paye`, à l'artisan (« Solde reçu pour « … » ») et au client (« Votre chantier est terminé »).
- **Interface** (maquettes « Signature du PV – Paiement du solde » et « Vue d'un chantier », chantier clôturé) :
  - client : bloc « Vous avez un paiement à effectuer » (« Réglez le solde pour clôturer votre chantier ») ;
  - page `/mon-espace/chantiers/{id}/solde` : étapes « Signature du PV ✓ · Paiement du solde », montant déjà payé, montant à payer aujourd'hui, total, bénéficiaire (l'entreprise de l'artisan), versement direct ;
  - après le paiement : stepper complet, « Vous avez finalisé le paiement de ce chantier le … », pastille « Terminé le … », chantier rangé dans « Mes chantiers terminés », facture dans le dossier ;
  - artisan : « Réception validée par … Prochaine étape : le paiement du solde (…) », puis « Chantier clôturé le … : solde de … reçu, facture de solde émise. » ; facture dans le dossier, la liste des factures et l'export CSV.
- **Écarts assumés aux maquettes** :
  - pas d'onglet « Laissez votre avis » avant le paiement (ordre retenu par la spec : PV, solde, puis avis) ;
  - pas d'Alma (F-33, hors V1) ;
  - pas de « Fonds sécurisés par Menao… versés 48 h avant » (spec §16, ADR 0011) ;
  - le moyen de paiement se choisit dans Stripe Checkout.
- **Tests** :
  - `packages/core` : `balanceInvoiceVat`, action `payer_solde` ;
  - pgTAP 27 : droits, montant, reprise, encaissement, facture, clôture, notifications ;
  - PDF de la facture de solde, e-mails ;
  - e2e jusqu'à la clôture (facture `FAC-AAAA-0002`, export CSV).

## Décision confirmée
- Avec réserves, le solde est demandé après leur levée confirmée, au lieu du « versement suspendu » de F-32 (sans détention de fonds, ADR 0011) : confirmé par le porteur du projet le 10 octobre 2026.

## Points à valider
- TODO(legal) : mentions de la facture de solde (reprise des lignes du devis, déduction des acomptes) et arrondis de la ventilation, à faire valider par l'expert-comptable.
- TODO(legal) : retenue de garantie (jusqu'à 5 % pendant un an, si le marché la prévoit) non proposée en V1.
- Aucune relance automatique du solde impayé pour l'instant.
- Facture non émise (garde-fou) : alerte de l'équipe à prévoir avec le centre de notifications (5f).

## Conséquences
- Les migrations `types_solde` et `solde` remplacent `record_payment`, `app.create_payment_invoice`, `particulier_chantiers` (nouveaux champs `balance_cents`, `balance_status`) et `app.notify_chantier_event`.
- Déploiement : `deposit-checkout`, `generate-pdf` (modèle de facture) et `notify` (nouveau type).
- **5d** : avis du client (F-28) après la clôture (bloc « Noter … pour son chantier » de la maquette).
