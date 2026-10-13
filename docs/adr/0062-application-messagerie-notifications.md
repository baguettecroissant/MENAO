# ADR 0062 — Application : messagerie et notifications (lot 6b, partie 6)

- Statut : accepté
- Date : 13 octobre 2026

## Contexte
- Sur le site, le particulier échange avec l'artisan de chacun de ses chantiers (F-40, ADR 0031) et consulte ses notifications (F-41, ADR 0033).
- Dans l'application, l'onglet « Messages » et la cloche de l'accueil menaient encore à un écran d'attente avec un lien vers le site.

## Décision
- **Mêmes fonctions que le site**, sans rien ajouter côté serveur : `my_conversations`, `chantier_messages`, `send_message`, `mark_conversation_read`, `report_message`, `my_notifications`, `mark_notifications_read`, `set_notification_preferences` et les compteurs de non-lus.
- **Onglet « Messages »** :
  - une conversation par chantier, avec l'artisan, le chantier, le dernier message, l'heure et les non-lus ;
  - rechargé à chaque retour et en tirant vers le bas.
- **Conversation** (`/conversation/[id]`), comme sur le site :
  - bulles (les siennes à droite), séparateurs de jours, « Lu » sous son dernier message lu ;
  - messages masqués par l'équipe ;
  - photos et PDF reçus, ouverts dans le navigateur par leurs URL signées ;
  - mise à jour en temps réel tant que l'écran est affiché (Supabase Realtime) ;
  - messages marqués lus à l'affichage ;
  - envoi de texte (`conversationMessageSchema`) et « Signaler ce message » (`messageReportSchema`) ;
  - lecture seule si le chantier est annulé ou le devis refusé (`conversationClosed`).
- **Bouton « Message »** à côté de « Appeler » sur la page du chantier.
- **Centre de notifications** (cloche de l'accueil) :
  - mêmes textes que les e-mails, repris de `@menao/emails/content`, comme le site ;
  - toutes les notifications sont marquées lues à l'affichage, les non lues restent signalées pendant la visite ;
  - préférences d'e-mail (activité du chantier, rappels).
- **Liens des notifications** (`appRouteForSitePath`, testé) : chaque lien vers une page de l'espace client ouvre l'écran correspondant de l'application (chantier, devis, acompte, réception, solde, conversation). Les pages sans écran dans l'application (avis, signalement) s'ouvrent sur le site.
- **Pastilles** de non-lus sur l'onglet « Messages » et sur la cloche :
  - relues à l'ouverture de l'application, à son retour au premier plan, sur l'accueil et à la lecture ;
  - rien sans compte connecté.
- L'écran d'attente ne garde plus de lien vers le site : il ne sert plus qu'à l'espace artisan (règle 10).

## Conséquences
- **Envoi de photos et de PDF depuis l'application** : à venir. Il demande un module de choix des photos et de réduction des images, à justifier dans sa PR. D'ici là, les pièces jointes s'envoient depuis le site.
- **Notifications push** : lot 6e, avec les mêmes liens vers les écrans.
- **Plus tard** :
  - l'avis du client ;
  - le signalement d'un problème ;
  - l'annulation d'un chantier ;
  - les garanties ;
  - « Faire de nouveau appel à l'artisan ».
