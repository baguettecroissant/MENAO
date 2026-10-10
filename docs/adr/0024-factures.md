# ADR 0024 — Factures : émises par la base à l'encaissement, au nom de l'artisan

- Statut : accepté
- Date : 10 octobre 2026

## Contexte
- **F-35** :
  - les factures sont émises au nom de l'artisan, qui en est l'émetteur ; MENAO n'est que l'outil ;
  - une facture d'acompte est émise à l'encaissement de l'acompte, une facture de solde à l'encaissement du solde ;
  - la numérotation est chronologique, continue et propre à chaque artisan, sans trou ;
  - les mentions sont celles de F-20, plus le devis de référence, la date de paiement et le montant déjà réglé ;
  - les factures sont consultables dans le dossier du chantier, avec un export pour le comptable.
- **Facture électronique** : réception obligatoire depuis le 1er septembre 2026, émission obligatoire pour les PME en 2027. La V1 doit avoir un modèle de données compatible.
- **ADR 0023** : paiements par Stripe Checkout sur le compte de l'artisan.

## Décisions
- **Émission par la base, dans la transaction de l'encaissement** : `record_payment` → `app.create_payment_invoice`.
  - Une facture par paiement, sans doublon possible (`payment_id` unique) et sans intervention de quiconque.
  - Numéro `FAC-AAAA-NNNN`, propre à chaque artisan et à chaque année, attribué par un compteur transactionnel (`invoice_number_counters`), comme pour les devis (ADR 0021).
- **TVA de la facture d'acompte**, même règle en base et dans `packages/core` :
  - le montant payé est réparti entre les taux du devis, au prorata du TTC de chaque taux ;
  - dans chaque part, HT = TTC ÷ (1 + taux), arrondi au plus proche, et TVA = TTC − HT ;
  - la somme des parts vaut exactement le montant payé.
- **Données figées** (`invoices.document`) :
  - numéro, dates, montants, ventilation de la TVA ;
  - devis de référence et pourcentage d'acompte ;
  - émetteur, client et chantier, repris du devis signé (ADR 0021).

  Ce format structuré servira de base à la facture électronique (Factur-X, plateforme agréée en V1.1).
- **PDF** (`@menao/documents`) : même mise en page que le devis (outils partagés dans `pdf-layout.ts`), avec le titre « Facture d'acompte », le devis de référence et la ligne d'acompte. La facture indique aussi :
  - la date et le mode de paiement (en ligne, directement à l'entreprise) ;
  - la nature de l'opération ;
  - l'assurance décennale ;
  - la franchise de TVA s'il y a lieu.

  `generate-pdf` produit le PDF une fois et le conserve tel qu'émis (bucket privé `invoices`).
- **Accès** :
  - les parties du chantier et l'équipe lisent les factures (`invoice_document`), sans aucune écriture directe ;
  - côté client, le lien vers la facture d'acompte suit la mention « Acompte payé » ;
  - côté artisan, il figure sur la fiche chantier et sur la page « Factures » (`/pro/factures`), avec un export CSV pour le comptable (séparateur « ; », montants à virgule).

## Points à valider (TODO(legal))
- Mentions obligatoires des factures à faire valider par l'expert-comptable, dont celles introduites par la réforme de la facturation électronique (nature de l'opération, adresse de livraison, option pour la TVA sur les débits).
- Répartition de la TVA de l'acompte et arrondis.
- Émetteur figé à la signature du devis plutôt qu'à la date de facture (changement d'adresse entre les deux).

## Conséquences
- **Facture de solde (phase 5)** : elle reprendra les lignes du devis et déduira l'acompte déjà réglé. Elle sera émise par la même fonction, à l'encaissement du solde.
- **Export ZIP des PDF et dossier du chantier côté client (F-12)** : avec la 4d.
