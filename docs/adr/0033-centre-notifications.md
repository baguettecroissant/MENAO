# ADR 0033 — Centre de notifications et préférences

- Statut : accepté
- Date : 10 octobre 2026

## Contexte
- **F-41** : notifications par push, e-mail et SMS selon l'événement ; préférences par utilisateur, sauf pour les notifications transactionnelles obligatoires.
- Les notifications sont déjà créées en base (`notifications`, une ligne par destinataire) puis envoyées par e-mail par `notify` (phase 3b).
- La colonne `read_at` était prévue pour le centre de notifications.
- La maquette de la fiche artisan montre une cloche dans l'en-tête.

## Décisions
- **Centre de notifications** (`/notifications`, client ou artisan) :
  - `my_notifications`, `my_unread_notifications`, `mark_notifications_read` ;
  - mêmes textes que les e-mails (objet, aperçu, lien vers la page concernée), repris de `@menao/emails` (sous-chemin `content`, sans les composants React Email) ;
  - les notifications sont marquées lues à l'affichage du centre, et les non lues restent signalées pendant la visite.
- **Cloche** dans l'en-tête du site et de l'espace pro, avec le nombre de non lues. Le compteur est lu dans le navigateur : les pages publiques restent statiques (spec §4.4), et rien ne s'affiche sans compte connecté.
- **Préférences d'e-mail** (`set_notification_preferences`, `profiles.notification_preferences`) :
  - facultatives et désactivables : activité du chantier (nouvelles photos, nouveaux messages) et rappels (rendez-vous de la veille, avis à laisser, levée des réserves à confirmer) ;
  - toutes les autres sont transactionnelles et toujours envoyées ;
  - même classement dans `packages/core` (`notificationCategory`) et en base (`app.notification_category`, `app.email_wanted`).
- **Envoi** : `claim_notifications` passe à `ignoree` les e-mails facultatifs refusés ; ils restent visibles dans le centre.
- **Au passage** : l'en-tête du site n'est plus affiché en double sur les pages Messages et Factures de l'espace pro.
- **Tests** :
  - `packages/core` ;
  - pgTAP 31 : lecture limitée à ses notifications, marquage, préférences, e-mails ignorés ou envoyés ;
  - e2e : cloche, centre, préférences.

## Points à valider
- Push (application native, phase 6) et SMS (nouvelle demande non lue en 2 h, Brevo) : à venir.
- Résumé quotidien par e-mail de l'activité (spec F-41) : remplacé par le regroupement par fenêtre de 10 minutes (ADR 0026, 0031).

## Conséquences
- Déploiement : migrations `types_centre_notifications` et `centre_notifications` (pas de fonction à redéployer : `notify` passe par `claim_notifications`).
- **Phase 5 terminée** côté web ; la phase 6 (application native) reprend ces parcours.
