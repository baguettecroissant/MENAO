# ADR 0037 — Notifications de l'artisan : dossier et échéances des documents

- Statut : accepté
- Date : 11 octobre 2026
- Complète l'ADR 0017 (e-mails de notification) et F-51 (suivi des documents).

## Contexte
- L'artisan n'était prévenu ni de la décision sur son dossier (validé, refusé, complément demandé), ni de l'échéance de ses assurances. Il ne l'apprenait qu'en se connectant.
- La tâche quotidienne suspendait automatiquement un artisan dont la décennale ou la RC Pro avait expiré, sans le prévenir.
- La spec (F-41) prévoit « Document expirant (assurance) J-30, J-7 », pour l'artisan et pour l'équipe, par e-mail et notification.

## Décision
- **Huit nouveaux types de notification**, tous transactionnels (jamais désactivables, `app.notification_category`) :

  | Type | Destinataire | Déclenchement |
  |---|---|---|
  | `dossier_valide` | Artisan | Décision « valide » |
  | `dossier_refuse` | Artisan | Décision « refuse », avec le message de l'équipe |
  | `dossier_complement` | Artisan | Décision « complement », avec le message de l'équipe |
  | `document_refuse` | Artisan | Renouvellement refusé, artisan validé ou suspendu |
  | `document_a_renouveler` | Artisan | J-30, puis J-7 |
  | `document_a_renouveler_equipe` | Admins | J-30, puis J-7 |
  | `compte_suspendu` | Artisan | Assurance expirée |
  | `compte_reactive` | Artisan | Assurances de nouveau valides |

- **Décision sur le dossier** :
  - un déclencheur sur `artisan_reviews` (une ligne par décision) envoie la notification, sans dupliquer `admin_decide_artisan` ;
  - l'e-mail « validé » indique les étapes restantes pour être visible (formule, paiements) ou annonce que le profil est visible.
- **Document refusé** : la notification n'est envoyée que pendant un renouvellement (artisan validé ou suspendu). Pendant la vérification du dossier, la décision sur le dossier suffit : un seul e-mail.
- **Relances d'échéance** (`app.remind_expiring_documents`, pg_cron chaque jour à 7 h UTC) :
  - elles portent sur les documents surveillés validés (décennale, RC Pro, pièce d'identité, comme `MONITORED_DOCUMENT_TYPES`) d'un artisan validé ou suspendu ;
  - pas de relance si un renouvellement est déjà déposé ;
  - une relance par seuil, retenue dans `artisan_documents.renewal_reminder_days` (30, puis 7) ;
  - l'équipe (profils `admin`) n'est relancée que pour les assurances, dont l'expiration suspend l'artisan.
- **Suspension et levée** : `app.daily_compliance` nomme les assurances manquantes ou expirées dans l'e-mail de suspension. `app.reactivate_if_compliant` prévient l'artisan et indique s'il réapparaît aussitôt dans les recherches.
- **Textes** dans `packages/emails/src/content.ts`, partagés par l'e-mail (fonction `notify`) et le centre de notifications de l'espace pro.

## Conséquences
- Au déploiement, la fonction `notify` doit être redéployée en même temps que la migration. Sinon, elle ne sait pas rédiger les nouveaux types.
- Sur staging, l'envoi passe par l'adresse de test de Resend (`onboarding@resend.dev`), qui ne remet les e-mails qu'au titulaire du compte Resend. Les artisans ne les recevront qu'une fois le domaine d'envoi vérifié et `EMAIL_FROM` configuré (F-41). Les notifications restent visibles dans leur centre de notifications.
- Les admins n'ont pas de centre de notifications : leur copie n'existe que par e-mail. Le suivi complet reste sur la page « À surveiller » du back-office.
- Une pièce d'identité expirée déclenche une relance, mais pas de suspension (règle F-51 inchangée).
