# ADR 0396 — Les moments forts des conseillers : primes, relances, notifications sur le téléphone

- Statut : accepté (lot 4 du plan de l'espace commercial du 28/11/2026, maquette lot 85 validée
  le même jour : « Oui, et code le lot », portable des inscrits visible compris)
- Fonctionnalité : F-196. Complète les ADR 0394 (espace terrain) et 0395 (inscription préparée) ;
  étend la file push de l'ADR 0078 aux navigateurs.

## Décision

- **Primes** : à la création d'une prime (dossier validé, premier paiement de l'abonnement), un
  déclencheur envoie `conseiller_prime` (« Bains & Co est validé : +110 € », montant attendu des
  réglages si la vérification n'est pas faite). À la prochaine ouverture de l'espace, une
  célébration s'affiche une fois par prime (`commercial_next_celebration`, `celebrated_at`), avec le
  total du mois et les validés de la semaine.
- **Vos artisans**, en tête d'« Aujourd'hui » (`commercial_artisan_alerts`) : fin d'essai proche
  (abonnement en essai), dossier bloqué (brouillon ou validé pas encore visible, sans mouvement
  depuis N jours), lien préparé pas ouvert. Délais réglables par les admins
  (`commercial_alert_settings` : 3, 7 et 2 jours par défaut). « Me le rappeler dans 2 jours ».
  Chaque matin, une notification par sujet et par semaine au plus (`conseiller_relance`,
  `conseiller_fin_essai`, `conseiller_lien`).
- **Relancer** : message prêt selon la première étape qui manque (`relanceMessage`, `@menao/core`),
  modifiable, envoyé par SMS, WhatsApp ou appel depuis le téléphone du conseiller.
- **Portable et prénom des inscrits** visibles par leur conseiller (décision du 28/11/2026), pour
  les relancer ; phrase ajoutée à la politique de confidentialité. TODO(legal) : relecture.
- **Notifications sur le téléphone (web push)**, une exception assumée pour l'espace web des
  conseillers, utilisé depuis l'icône de l'écran d'accueil :
  - service worker `/commercial-sw.js` (portée `/commercial`), sans cache ;
  - abonnement du navigateur après un toucher (`register_web_push`), table
    `web_push_subscriptions` ;
  - envoi par la file push existante : `claim_push_notifications` renvoie aussi les abonnements
    web, `notify` les envoie avec `web-push` (VAPID) et oublie ceux qui ont disparu ;
  - clé publique servie par la fonction `web-push-key` ; clés dans les secrets Supabase
    (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`), jamais dans le dépôt ;
  - chaque type se coupe (`set_push_preference`, `notification_preferences.push`) ; l'e-mail et la
    cloche restent toujours actifs ;
  - l'étape « Notifications sur ce téléphone » de « Bien démarrer » est faite dès qu'un téléphone
    est abonné.
- E-mails des quatre notifications dans `packages/emails` ; prime classée « activité », relances
  « rappels » (désactivables par e-mail).

## Conséquences

- Mise en service : `db push` ; secrets VAPID posés sur le projet ; `functions deploy notify
  web-push-key`. Sans secrets, rien n'est envoyé en push et l'activation n'est pas proposée.
- Sur iPhone, les notifications web ne marchent que depuis l'icône ajoutée à l'écran d'accueil
  (iOS 16.4 et plus).
- La date de mise à jour de la politique de confidentialité est à revoir avec l'avocat.
