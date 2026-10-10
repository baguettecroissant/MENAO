# ADR 0017 — Notifications par e-mail : file d'envoi en base, fonction notify, Resend

- Statut : accepté
- Date : 10 octobre 2026

## Contexte
F-41 (spec §12) et F-18 (rappel la veille du rendez-vous). ADR 0002 : e-mails par Resend avec React Email, derrière `NotificationProvider`. Les événements naissent en base : demandes (ADR 0014), transitions de chantier et rendez-vous (ADR 0016). La logique serveur lourde va dans les Edge Functions (spec §4.4). Aucune donnée personnelle ne doit apparaître dans les journaux (CLAUDE.md règle 11).

## Décisions
- **File d'envoi `notifications`** : destinataire, type, canal, données du modèle, état (`a_envoyer`, `en_cours`, `envoyee`, `echec`), tentatives, dernière erreur.
  - Le destinataire peut lire ses notifications ; aucun utilisateur ne peut y écrire.
  - La même table servira au centre de notifications (`read_at`, phase 5).
- **Notifications créées par la base**, sans toucher aux fonctions métier :
  - nouvelle demande (déclencheur sur `requests`), pour l'artisan, avec un résumé sans coordonnées ;
  - rendez-vous fixé et chantier annulé par l'artisan (déclencheur sur le journal `chantier_events`), pour le particulier ;
  - rendez-vous déplacé (déclencheur sur `appointments.starts_at`), pour le particulier ;
  - rappel de la veille : tâche horaire, à partir de 18 h (heure de Paris), pour le particulier et l'artisan, une seule fois par rendez-vous (remis à zéro si la date change).
- **Données** : seulement ce dont le modèle a besoin (titre, date, prénom ou nom affiché, adresse pour le rappel de l'artisan). Jamais d'e-mail ni de téléphone ; l'adresse du destinataire est lue au moment de l'envoi.
- **Envoi** : `pg_cron` appelle chaque minute la fonction `notify` par `pg_net`, seulement s'il reste des notifications à envoyer.
  - L'adresse de la fonction et un secret partagé sont dans Vault (`menao_notify_url`, `menao_notify_secret`) ; sans eux (local, CI), rien n'est appelé.
  - `notify` (sans jeton Supabase, secret comparé à temps constant) prend un lot verrouillé (`claim_notifications` : 20 au plus, reprise après 10 minutes, 5 tentatives), rend le modèle, envoie, puis enregistre le résultat (`complete_notification`).
- **`NotificationProvider`** (`_shared/notifications.ts`), mis en œuvre par Resend :
  - clé d'idempotence = identifiant de la notification, donc jamais deux envois ;
  - erreurs 429 et 5xx retentées, autres 4xx définitives ;
  - seuls le code et le nom de l'erreur sont conservés, car le message de Resend peut citer une adresse.
  - Les SMS (Brevo) et le push s'ajouteront derrière la même interface.
- **Modèles** : React Email dans `packages/emails`, textes en français centralisés, dates à l'heure de Paris, version texte, données échappées.
  - Les composants sont importés un par un, pour un paquet léger aussi chargé par Deno.
  - Le paquet est testé avec Vitest, et la fonction est vérifiée par `deno check` en CI.
- **Expéditeur** : `EMAIL_FROM`. Par défaut `onboarding@resend.dev`, qui n'écrit qu'au titulaire du compte Resend ; les autres destinataires échouent sans nouvel essai. À remplacer par une adresse de `notifications.menao.fr` une fois le domaine vérifié.

## Conséquences
- **Mise en service par environnement** :
  - secrets de fonctions `NOTIFY_SECRET` et `RESEND_API_KEY` (et `EMAIL_FROM` une fois le domaine vérifié) ;
  - secrets Vault `menao_notify_url` et `menao_notify_secret` ;
  - déploiement de `notify`.
- **Reste à faire** :
  - SMS « nouvelle demande non lue en 2 h » (Brevo) ;
  - push (app native, phase 6) ;
  - préférences de notification (les messages actuels sont tous transactionnels) ;
  - e-mails d'authentification par le SMTP de Resend (avec le domaine).
- **Prochains événements** (devis reçu, devis signé, acompte…) : il suffira d'ajouter un type et un modèle, puis un cas dans le déclencheur du journal.
