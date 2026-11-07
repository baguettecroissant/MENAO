# ADR 0243 — Comptes d'équipe : messages, journal et notifications

- Statut : accepté
- Date : 7 novembre 2026
- F-89, PR 3 des comptes d'équipe (« go pour la PR 3 comme tu recommandes »), après les ADR 0240 à 0242.

## Contexte
Un message n'avait qu'un auteur et une marque « lu » : avec une équipe, le message d'un collègue s'affichait comme celui du client, comptait comme non lu, et l'ouvrir le marquait « lu » pour le client qui ne l'avait pas vu. Les notifications ne partaient qu'au titulaire de la fiche.

## Décision
- **Messages** (`chantier_messages`) : `mine` veut dire « de son côté » (toute l'entreprise pour un membre ou le patron) ; `author_name` donne l'auteur quand ce n'est pas soi : prénom du collègue pour l'équipe, « Prénom (Entreprise) » d'un membre pour le client ; un message du patron reste au nom de l'entreprise. Nom de l'entreprise : nom commercial, sinon raison sociale (`app.artisan_company_name`).
- **Non lus et « lu »** : côté entreprise, seuls les messages du client comptent comme non lus (`my_unread_messages`, `my_conversations`) et sont marqués lus (`mark_conversation_read`).
- **Journal** : `chantier_update_authors` donne l'auteur des entrées d'un collègue (équipe) ou d'un membre (client), affiché sur le site et dans l'application.
- **Notifications des messages** : un message du client prévient le patron, ses chefs d'équipe et les ouvriers du chantier (e-mail regroupé et notification du téléphone) ; un message d'un membre prévient le client avec « Prénom (Entreprise) ».
- **Autres notifications** : un déclencheur copie celles adressées au patron au chef d'équipe (demandes, rendez-vous, devis, paiements, réception, litiges, secrétaire) et à l'ouvrier attribué au chantier (rendez-vous, démarrage, annulation). Dossier, abonnement, parrainage, avis, grade et minutes restent au patron.
- **Attribution** : `set_chantier_team` prévient le membre nouvellement attribué (`chantier_attribue`, catégorie transactionnelle, e-mail « Chantier attribué »).

## Conséquences
- Tests : pgTAP `131_messages_equipe` ; modèle d'e-mail `chantier_attribue`.
- Mise en service : migrations `types_equipe` puis `messages_equipe` ; redéploiement de `notify` et des fonctions qui importent `packages/emails` (`voice-assistant`, `accountant-export`).
- `TODO(legal)` de l'ADR 0240 toujours à faire valider avant de vrais salariés.
