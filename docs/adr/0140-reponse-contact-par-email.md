# ADR 0140 — Réponse de l'équipe par e-mail aux déclarants sans compte

- Statut : accepté
- Date : 19 octobre 2026
- Complète les ADR 0017 (notifications), 0041 (« Mes échanges avec MENAO ») et 0139 (candidature partenaire).

## Contexte
- **Ce que voyait l'utilisateur** : en répondant depuis le back-office à une candidature partenaire, aucun e-mail ne partait vers l'adresse du candidat.
- **Pourquoi** : `add_ticket_message` ne notifiait que les déclarants ayant un compte (notification, puis « Mes échanges avec MENAO »).
  - Un message de la page Contact, ou une candidature partenaire, vient le plus souvent d'un visiteur sans compte.
  - Sa réponse restait dans le back-office, alors que l'écran laissait croire qu'elle était partie.
- **Contraintes** :
  - envoi par `NotificationProvider` (Resend, règle 14), avec reprises, idempotence et domaines réservés comme les autres e-mails ;
  - aucune donnée personnelle dans les journaux (règle 11) ;
  - l'adresse du déclarant n'est pas copiée dans les données des notifications (règle de la table).

## Décision
- **Une notification peut viser un ticket** au lieu d'un compte :
  - `notifications.user_id` devient facultatif ;
  - nouvelle colonne `ticket_id` ;
  - contrainte : un compte, ou un ticket avec le canal e-mail.
- **Envoi** : `claim_notifications` garde sa forme et ses règles (envoi différé, préférences). L'adresse vient du compte, sinon du ticket (`contact_email`), lue au moment de l'envoi.
- **Création** (`add_ticket_message`) : quand l'équipe répond à un déclarant sans compte qui a laissé une adresse, une notification `reponse_contact` est créée avec l'objet du ticket et le texte de la réponse. Un déclarant avec compte reçoit la notification habituelle, sans e-mail en double.
- **E-mail** « Réponse de l'équipe MENAO à votre message » :
  - le texte de la réponse en citation, paragraphes conservés ;
  - une phrase de suite (« écrivez-nous depuis la page Contact, en reprenant l'objet ») ;
  - un bouton « Nous écrire ».
- **Ce qui ne change pas** : ni push, ni centre de notifications pour ces e-mails, puisqu'il n'y a pas de compte.
- **Back-office** : sous le champ de réponse, l'écran indique où part la réponse : l'espace du déclarant avec une notification, ou un e-mail à son adresse.

## Conséquences
- **Les candidats partenaires et les visiteurs** qui écrivent depuis la page Contact reçoivent les réponses de l'équipe.
- **Leur réponse crée un nouveau message de contact.** Un fil par e-mail (adresse de réponse dédiée, réception des réponses) reste possible plus tard.
- **Deux migrations** : la nouvelle valeur d'enum, puis son usage. Pas de nouvelle dépendance.
