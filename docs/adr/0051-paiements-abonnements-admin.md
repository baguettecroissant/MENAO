# ADR 0051 — Paiements, abonnements et notifications des services dans le back-office

- Statut : accepté
- Date : 12 octobre 2026
- Réalise le lot 5a de l'audit du back-office (F-54, F-58). Complète les ADR 0011 (paiements directs à l'artisan), 0023 (acompte), 0032 (litiges), 0045 (vue d'ensemble) et 0046 (listes).

## Contexte
- Côté argent, le back-office n'affichait que trois chiffres sur la vue d'ensemble. Il n'avait ni liste des paiements des chantiers, ni liste des abonnements, ni revenu mensuel, ni taux de désabonnement.
- Les résiliations étaient datées par la dernière mise à jour de l'abonnement, que modifie chaque notification de Stripe.
- Quand le traitement d'une notification Stripe échouait, sa trace était effacée pour que Stripe la renvoie. Personne ne savait donc qu'un paiement ou un abonnement pouvait être en retard. DocuSeal gardait la trace, mais nulle part de visible.

## Décision
- **Paiements des chantiers** (`/admin/paiements`), en lecture seule :
  - versé aux artisans sur 30 jours et depuis le lancement, paiements en cours, paiements échoués ;
  - liste filtrable (reçus, en cours, échoués, annulés), avec une recherche sur le chantier, l'artisan, le client et le numéro de devis ;
  - MENAO n'encaisse rien et ne peut rien geler : les fonds vont directement sur le compte Stripe de l'artisan (ADR 0011, 0032). Le gel des versements prévu par F-54 n'a donc pas d'objet.
- **Abonnements des artisans** (`/admin/abonnements`) :
  - **revenu mensuel récurrent** : abonnements actifs, plus les impayés que Stripe relance encore (`past_due`), au tarif HT de leur formule, **hors remises et coupons**. Le montant exact reste dans Stripe ;
  - essais (avec le revenu attendu à leur fin), impayés, fins programmées, résiliations sur 30 jours ;
  - **taux de désabonnement sur 30 jours** : parmi les abonnements en cours il y a 30 jours, part de ceux résiliés depuis (`churnRate`, `packages/core`) ;
  - répartition par formule, puis la liste par situation (actif, essai, impayé, fin programmée, résilié).
- **Date de fin des abonnements** (`subscriptions.ended_at`, lue dans l'`ended_at` de Stripe) : elle date les résiliations. Les abonnements déjà résiliés reprennent leur dernière mise à jour.
- **Notifications des services** (`/admin/paiements/notifications`) :
  - un échec de traitement n'est plus effacé : `webhook_events` garde la date du dernier échec, le nombre d'échecs et un code technique ;
  - ce code reprend le nom, le type et le code de l'erreur, jamais son message, qui pourrait contenir des données personnelles (CLAUDE.md règle 11) ;
  - états : en échec ; bloquée (ni traitée ni en échec un quart d'heure après sa réception) ; rétablie ; traitée ;
  - la tentative suivante du service retraite la notification, puisqu'elle n'a pas de date de traitement.
- **Vue d'ensemble** : une carte « Abonnements des artisans » (revenu, désabonnement), des liens vers ces pages, et une carte « À traiter » quand une notification est en échec.
- **Menu** : nouvelle section « Argent » (Paiements, Abonnements), réservée aux admins. Le support n'y a pas accès (spec §4).

## Conséquences
- À déployer : la migration, puis les fonctions `stripe-webhook` et `signature-webhook`.
- Chaque artisan a une seule ligne d'abonnement. S'il se réabonne, la nouvelle remplace l'ancienne, et sa résiliation précédente sort des statistiques.
- Non traité : les contestations de paiement (rejets de carte) sur les comptes des artisans, que MENAO ne reçoit pas encore.
- Lot 5b : listes de métiers, travaux et pièces, journal d'audit consultable et suivi de l'IA.
