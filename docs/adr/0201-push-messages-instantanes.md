# ADR 0201 — Notification push à chaque message de la messagerie

- Statut : accepté
- Date : 28 octobre 2026
- Complète les ADR 0017 (notifications), 0078 (push) et 0079 (push dans l'application).

## Contexte
- **Constat de l'utilisateur** (28 octobre 2026) : « lorsqu'on s'envoie des messages via la discussion instantanée, j'ai pas l'impression qu'il y a des push ».
- **Cause** : le push des messages reprenait la notification « nouveaux_messages » faite pour l'e-mail. Une seule par conversation et par fenêtre de 10 minutes : le 2e et le 3e message dans la foulée ne sonnaient pas. Elle partait avec le cron de chaque minute.
- Dans l'essai, aucun des deux comptes n'avait l'application avec les notifications autorisées : aucun push ne pouvait partir.

## Décision
- **Un push par message**, pour un destinataire qui a l'application (`push_tokens`) :
  - file `message_pushes` (RLS activée, aucun accès des comptes), remplie par le déclencheur des messages ;
  - appel immédiat de la fonction `notify` (`app.kick_notify`, pg_net, après la validation de la transaction) ; le cron de chaque minute reste le filet ;
  - texte : l'auteur en titre, le début du message (140 caractères) ou « Photo », « Fichier joint » ; la conversation au toucher (`messagePushContent`, `packages/emails`) ;
  - ignoré si le message est déjà lu ou masqué, ou s'il a plus d'une heure ; 3 tentatives ; lignes effacées après 7 jours.
- **L'e-mail reste groupé** (10 minutes, annulé si la conversation est lue) et ne part plus en push.
- **Application** :
  - le message d'une conversation déjà à l'écran ne sonne pas ;
  - dans une conversation, rappel discret si le téléphone a refusé les notifications, avec un lien vers les réglages.

## Conséquences
- Le texte du message apparaît sur l'écran verrouillé, comme dans les messageries courantes.
- Les messages ne sont pas regroupés en une conversation dans le centre de notifications de l'iPhone : le service Expo ne transmet pas d'identifiant de fil.
- **Tests** : pgTAP `104_push_messages_instantanes` (un push par message, rien sans appareil, e-mail sans push, lot d'envoi, message lu ignoré, droits de chaque rôle) ; `packages/emails` (texte du push).
