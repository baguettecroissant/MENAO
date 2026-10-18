# ADR 0130 — Accueil « À faire maintenant », onglet Demandes et menu (+) (lot 3 de la refonte)

- Statut : accepté
- Date : 18 octobre 2026
- Suit les ADR 0128 (fluidité) et 0129 (« Mon profil »). Remplace la barre d'onglets artisan de l'ADR 0084.

## Contexte
- **Les demandes**, cœur du métier avec 48 heures pour répondre, n'étaient accessibles que par « Voir tout » sur l'accueil.
- **L'accueil empilait** alertes, indicateurs, dernières demandes, rendez-vous et huit raccourcis, dont la moitié concernait le profil.
- **Choix de l'utilisateur** (18 octobre 2026), sur maquette :
  - barre d'onglets Accueil · Demandes · (+) · Chantiers · Messages, en s'écartant des maquettes Figma ;
  - accueil « À faire maintenant » ;
  - animations riches.

## Décision
- **Barre d'onglets** : Accueil · Demandes · (+) · Chantiers · Messages.
  - L'onglet Demandes porte une pastille rouge : le nombre de demandes encore ouvertes (statut « envoyée », non expirées, lues avec les droits de l'artisan).
  - L'ancien onglet Devis disparaît : `/pro/devis` renvoie vers `/pro/chantiers?vue=devis`, `/pro-demandes` vers l'onglet, et les liens du site suivent (`links.ts`).
- **Onglet Chantiers** : deux puces, « Chantiers » et « Devis » (à envoyer et envoyés), les devis étant liés à un chantier.
- **Onglet Demandes** (`inboxGroups`, `@menao/core`, testé) : « À traiter » en tête, l'échéance la plus proche d'abord, puis « Déjà traitées ».
- **Accueil « À faire maintenant »** (`artisanTodo`, `@menao/core`, testé) : une seule liste triée par urgence, chaque ligne menant à l'action.
  - Ordre : demande dont il reste moins de 12 h, rendez-vous du jour, autres demandes (échéance la plus proche d'abord), devis à envoyer, documents à renouveler ou attestation URSSAF manquante, paiements à activer, avis à répondre.
  - Quand il ne reste rien : « Tout est à jour », avec une petite animation.
  - L'en-tête dit bonjour et compte ce qui reste à faire.
  - Les alertes « URSSAF », « documents à renouveler » et « activer les paiements » deviennent des lignes de la liste.
  - Les rendez-vous affichés plus bas sont ceux des jours suivants (`laterAppointments`), ceux du jour étant dans la liste.
  - Les raccourcis ne gardent que l'activité : agenda, devis, factures, disponibilités. Le reste est dans « Mon profil ».
- **Menu (+)** : en plus du devis, du créneau bloqué et de la photo de chantier, « Mes disponibilités » et « Mon agenda ». La feuille monte avec un ressort et les actions apparaissent en cascade.
- **Aucun lien vers l'abonnement ni vers le site** (CLAUDE.md règle 10). L'inscription non finalisée reste une simple information.

## Conséquences
- Une demande, un rendez-vous ou un devis à faire est à un toucher de l'accueil, et les demandes à un toucher de n'importe où.
- Les maquettes Figma de la barre d'onglets ne sont plus la référence pour l'espace artisan.
- Le site reçoit la même organisation au lot 4.
