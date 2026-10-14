# ADR 0078 — Notifications push : jetons des appareils et envoi par le service Expo (lot 6e, partie serveur)

- Statut : accepté
- Date : 14 octobre 2026

## Contexte
- La spécification prévoit des notifications push (F-41) avec Expo Notifications (§4) et une table `push_tokens` (utilisateur, jeton Expo, plateforme ; RLS : le propriétaire, §14). La fonction `notify` doit envoyer push, e-mail et SMS.
- Les notifications sont une file (`notifications`) remplie par la base (`app.notify`, déclencheurs), affichée dans le centre de notifications, et envoyée par e-mail chaque minute par `notify` (ADR 0017).
- Les e-mails des messages et des nouveautés du chantier sont regroupés par fenêtre de 10 minutes.

## Décision
- **Table `push_tokens`** :
  - jeton Expo (format contrôlé), unique ;
  - plateforme (`ios`, `android`), dernière ouverture de l'application ;
  - RLS : lecture par le propriétaire seulement, aucune écriture directe.
- **Fonctions du compte** :
  - `register_push_token` : appelée à chaque ouverture de l'application par un compte connecté, jamais par une session anonyme de recherche. Le jeton change de compte si l'appareil a changé d'utilisateur. 10 appareils au plus par compte : les plus anciens sont oubliés ;
  - `unregister_push_token` : appelée à la déconnexion.
- **Envoi en push** :
  - toute notification de la file destinée à un compte qui a au moins un appareil est marquée « push à envoyer » (déclencheur), quel que soit le chemin d'insertion ;
  - le push part **tout de suite**, sans attendre la fenêtre de regroupement de l'e-mail : un push par fenêtre de 10 minutes pour les messages et les nouveautés ;
  - suivi séparé de l'e-mail : `push_status`, `push_attempts`, `push_locked_at`, `pushed_at`. Pas de push pour une notification déjà lue dans l'application, de plus d'un jour, ou si le compte n'a plus d'appareil. 3 tentatives au plus ;
  - `app.dispatch_notifications` appelle aussi `notify` quand seuls des pushes attendent.
- **Fonction `notify`** :
  - envoie les pushes par le service Expo (`ExpoPushProvider` derrière `NotificationProvider`, 100 messages par requête, jeton d'accès facultatif `EXPO_ACCESS_TOKEN`) ;
  - mêmes textes que le centre de notifications (`notificationContent` : objet, aperçu, page concernée) ;
  - jetons refusés par le service oubliés (`DeviceNotRegistered`) ;
  - les e-mails ne partent que si Resend est configuré, le push n'en dépend pas.
- **Préférences** : les préférences d'e-mail (activité, rappels) ne s'appliquent qu'aux e-mails. Le push se règle par l'autorisation du téléphone ; des réglages dans l'application pourront suivre.
- Tests pgTAP : RLS avec chaque rôle, enregistrement et changement de compte, limite d'appareils, file d'envoi, tentatives.

## Limites
- **Accusés de réception** d'Expo (seconde étape de l'envoi) : non relevés. Un jeton refusé plus tard le sera au prochain envoi.
- `TODO(legal)` : vérifier l'accord de traitement (DPA) d'Expo et le transfert hors UE du titre et de l'aperçu des notifications avant la mise en production, comme pour Resend et Brevo (F-41).

## Conséquences
- **Mise en service** : migration et fonction `notify` à déployer sur staging après la fusion (workflow « Migrations → staging »).
- **Partie suivante** : l'application (autorisation, enregistrement du jeton, ouverture de l'écran concerné au toucher, désinscription à la déconnexion).
