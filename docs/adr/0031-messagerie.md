# ADR 0031 — Messagerie par chantier

- Statut : accepté
- Date : 10 octobre 2026

## Contexte
- **F-40** : une conversation par chantier entre le particulier et l'artisan (texte, photos, fichiers) ; temps réel uniquement quand l'écran de conversation est ouvert, sinon notification ; non lus, dernier message, horodatage ; écran « Messages » ; signalement d'un message.
- **F-40 [À VALIDER]** : masquer automatiquement les numéros de téléphone et e-mails avant l'acceptation de la demande.
- **F-41** : nouveaux messages, notification push et résumé par e-mail.
- **D3** : les coordonnées ne sont visibles qu'après l'acceptation de la demande.
- La maquette « Vue d'un chantier » prévoit un bouton « Message » à côté de « Appeler » ; aucune maquette de l'écran de conversation n'a été trouvée parmi les captures.

## Décisions
- **Ouverture** : la conversation existe dès que le chantier existe, c'est-à-dire après l'acceptation de la demande (rendez-vous fixé). Aucun échange n'est possible avant : l'option de masquage des coordonnées est donc sans objet, et la question [À VALIDER] n'a pas à être tranchée.
- **Fermeture** : lecture seule si le chantier est annulé ou le devis refusé (`app.conversation_closed`, `conversationClosed` dans `packages/core`) ; la conversation reste ouverte après la clôture (questions après les travaux, garanties).
- **Messages** (`messages`) :
  - texte (1 à 2 000 caractères, `send_message`, 30 envois par minute au plus), photo ou document PDF (`record_message_attachment`, appelée par `process-upload` après contrôle du type réel, 200 pièces jointes par chantier au plus) ;
  - pièces jointes dans le bucket privé `message-attachments`, servies par URL signées d'une heure ;
  - lu par le destinataire à l'affichage de la conversation (`mark_conversation_read`).
- **Lecture** : `chantier_messages` (contenu des messages masqués retiré), `my_conversations` (interlocuteur, chantier, dernier message, non lus), `my_unread_messages` (pastille). Lecture directe de la table par les deux parties et l'équipe (RLS), nécessaire au temps réel.
- **Temps réel** : table publiée dans `supabase_realtime` ; l'écran de conversation s'abonne aux nouveaux messages de son chantier et se rafraîchit, puis se désabonne à la fermeture.
- **Notifications** : `nouveaux_messages`, une par conversation et par fenêtre de 10 minutes (nombre de messages), supprimée si la conversation est lue entre-temps ; l'e-mail ne reprend pas le contenu des messages.
- **Modération** : signalement d'un message par une partie (ticket `message`, un seul ouvert par personne et par message) ; masquage motivé ou rétablissement par l'équipe depuis les tickets du back-office (`admin_moderate_message`, journalisé).
- **Interface** :
  - liste « Messages » côté client (`/mon-espace/messages`, accès depuis « Mon espace » avec le nombre de non-lus) et côté artisan (`/pro/messages`, entrée de la navigation) ;
  - conversation : bulles (les siennes à droite), séparateurs de jours, heure, « Lu » sous son dernier message lu, pièces jointes, signalement ; Entrée pour envoyer, Maj + Entrée pour aller à la ligne ;
  - bouton « Message » à côté de « Appeler » sur la vue du chantier (client et artisan), « Écrire au client » sur la vue du rendez-vous.
- **Tests** : `packages/core` et `packages/validation`, pgTAP 29 (droits de chaque rôle, non lus, notification groupée, pièces jointes, fermeture, signalement, masquage, temps réel), e-mails, e2e (message du client, réponse de l'artisan, « Lu »).

## Points à valider
- Écran de conversation sans maquette : à revoir avec le design.
- Contenu d'un message masqué : retiré de l'affichage, mais toujours lisible par les deux parties en lecture directe (nécessaire au temps réel).
- Push : prévu avec l'application native (phase 6) ; d'ici là, l'e-mail groupé fait office de notification.

## Conséquences
- Déploiement : migrations `types_messagerie` et `messagerie`, puis redéploiement de `process-upload` et `notify`.
- **5f** : litiges (F-42) et centre de notifications (F-41).
