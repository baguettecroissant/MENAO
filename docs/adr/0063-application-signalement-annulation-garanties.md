# ADR 0063 — Application : signalement, annulation et garanties (lot 6b, partie 7a)

- Statut : accepté
- Date : 13 octobre 2026

## Contexte
- La page d'un chantier sur le site propose aussi :
  - le signalement d'un problème et son suivi avec l'équipe (F-42, ADR 0032) ;
  - l'annulation du chantier avant tout devis signé (F-12) ;
  - les garanties après la réception (ADR 0041).
- Dans l'application, ces parcours manquaient : un client en litige devait passer par le site.

## Décision
- **Signaler un problème** (`/chantier/[id]/signaler`), comme sur le site :
  - nature du problème et description (`problemReportSchema`) ;
  - un message prévient si le chantier passera en litige (`reportSuspendsChantier`) ;
  - `report_chantier_problem`, puis ouverture du suivi ;
  - si un signalement est déjà ouvert sur le chantier, on le suit au lieu d'en créer un autre.
- **Suivi du signalement** (`/signalement/[id]`) :
  - statut, description, échanges avec l'équipe MENAO, photos de l'équipe ;
  - réponse (`ticketMessageSchema`, `add_ticket_message`) tant que le signalement n'est pas clos.
- **Page du chantier** :
  - litige en cours ou signalement ouvert, avec « Suivre mon signalement » ;
  - garanties après la réception, dans le dossier ;
  - liens « Signaler un problème lié au chantier » et « Annuler le chantier », ce dernier seulement pour les états où le client peut annuler (`CLIENT_CANCELLABLE_STATUSES`).
- **Annulation** : un même formulaire sert à la demande et au chantier (motif de `CLIENT_CANCEL_REASONS`, mot facultatif). Il appelle `particulier_cancel_request` ou `particulier_cancel_chantier`.
- **Assureur décennal** : sa lecture dans le devis figé (`decennaleInsurer`) passe de la page du site à `@menao/core`, avec ses tests. Le site et l'application l'utilisent.
- **Liens des notifications** : `/signalements/[id]` ouvre maintenant le suivi dans l'application.
- Aucun changement côté serveur.

## Points à valider
- TODO(legal) : formulation et exemples des garanties, déjà signalés sur le site (ADR 0041).

## Conséquences
- **Photos d'un signalement depuis l'application** : à venir, avec l'envoi de photos dans la messagerie (même module).
- **Partie 7b** : avis du client (F-28) et « Faire de nouveau appel à l'artisan ».
