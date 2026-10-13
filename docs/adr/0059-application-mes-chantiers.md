# ADR 0059 — Application : « Mes chantiers » (lot 6b, partie 4)

- Statut : accepté
- Date : 13 octobre 2026

## Contexte
- Après l'envoi de la demande (ADR 0057), l'onglet « Mes chantiers » de l'application renvoyait au site.
- Sur le site, l'espace client suit les demandes et les chantiers (F-11, F-12) grâce aux fonctions `particulier_chantiers` et `particulier_requests`, et aux règles d'avancement de `@menao/core`.

## Décision
- **Même source que le site**, sans rien ajouter côté serveur :
  - `particulier_chantiers`, `particulier_requests`, et les tables lues avec les droits du compte (journal, paiements, factures) ;
  - photos privées affichées par des liens signés d'une heure.
- **Mêmes règles que le site**, prises dans `@menao/core` :
  - stepper en 5 étapes (`chantierStepIndex`) ;
  - action attendue (`clientChantierAction`) ;
  - échéancier toujours recalculé (`paymentProgress`, CLAUDE.md règle 5) ;
  - journal (`journalSummary`) ;
  - prochaine intervention (`nextIntervention`), qui passe du site à `@menao/core` pour servir aux deux.
- **Onglet « Mes chantiers »**, actualisé en tirant vers le bas et à chaque retour sur l'onglet :
  - compteurs ;
  - « En cours » et « Terminés » ;
  - cartes de chantier ;
  - demandes en attente, regroupées par projet, avec le délai de réponse, les coordonnées une fois la demande acceptée et l'annulation avec un motif (`particulier_cancel_request`) ;
  - recherches non envoyées, à reprendre.
- **Vue d'un chantier** : avancement, artisan (appel une fois les coordonnées échangées), action attendue ou prochaine intervention, puis « Suivi » (messages et photos de l'artisan) et « Dossier » (échéancier, documents).
- **Provisoire, d'ici la partie 5** : la signature du devis, les paiements et les documents PDF s'ouvrent sur le site, avec le compte du client. Rien ne mène à l'abonnement artisan (règle 10 : l'espace concerné est celui du particulier).

## Conséquences
- **Partie 5** : signature du devis, paiement de l'acompte et du solde, réception (procès-verbal, réserves) et documents PDF, directement dans l'application.
- **Partie 6** : messagerie et notifications.
