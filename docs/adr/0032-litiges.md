# ADR 0032 — Signalement d'un problème et litige

- Statut : accepté
- Date : 10 octobre 2026

## Contexte
- **F-42** : depuis la vue du chantier, le client ou l'artisan signale un problème (catégorie : retard, malfaçon, comportement, paiement, autre ; description ; photos).
  - Le signalement crée un ticket dans le back-office et passe le chantier en `en_litige`.
  - La spec prévoit aussi de geler les versements à l'artisan non encore effectués (90 jours maximum).
  - Le déclarant suit son ticket et échange avec le support.
- **Machine à états (§9)** : litige depuis tout état actif ; « litige résolu » ramène à l'état d'avant le litige ; « litige annulé » annule le chantier.
- **ADR 0011 et D12** : paiements directs sur le compte Stripe de l'artisan (type Standard), sans détention de fonds par MENAO.

## Décisions
- **Signalement** (`report_chantier_problem`, une partie du chantier) :
  - catégorie et description (20 à 2 000 caractères) ; photos ajoutées ensuite au ticket (`process-upload`, bucket privé `ticket-photos`, 20 au plus) ;
  - ticket `litige` (chantier, catégorie), un seul ouvert par personne et par chantier ;
  - chantier actif : transition `litige_ouvert`, journalisée ; ses étapes sont suspendues ;
  - chantier clôturé ou annulé : ticket seul ;
  - l'autre partie est notifiée (`litige_ouvert`), sans la description.
- **Pas de gel des versements** : MENAO ne détient pas les fonds et n'a pas la main sur les versements des comptes Stripe des artisans (ADR 0011).
- **Suivi** :
  - page `/signalements/[id]`, réservée au déclarant (RLS) : statut, description, échanges avec l'équipe (`ticket_messages`, `add_ticket_message`), photos ;
  - la réponse de l'équipe passe le ticket « en cours » et notifie le déclarant (`reponse_support`).
- **Décision de l'équipe** (`admin_close_dispute`, depuis les tickets du back-office) :
  - reprise du chantier (`litige_resolu`, retour à l'état d'avant le litige) ou annulation (`litige_annule`), avec une explication ajoutée aux échanges ;
  - ticket clos, décision journalisée (`audit_logs`), deux parties notifiées (`litige_clos`) ;
  - un litige se clôt toujours par une décision : la bascule de statut générique du ticket n'est pas proposée.
- **Interface** :
  - lien « Signaler un problème lié au chantier » vers le formulaire (vue du chantier, client et artisan, vue du rendez-vous) ;
  - bannière « Litige en cours » ou « signalement en cours de traitement », avec « Suivre mon signalement » ;
  - côté artisan, la vue de suivi du chantier couvre aussi l'état `en_litige`.
- **Tests** :
  - `packages/core`, `packages/validation`, e-mails ;
  - pgTAP 30 : droits de chaque rôle, passage en litige, échanges, photos, décisions, notifications ;
  - e2e : signalement d'un chantier clôturé, suivi et message.

## Points à valider
- TODO(legal) : information des parties et médiation de la consommation (art. L612-1 du Code de la consommation).
- Gel des versements prévu par la spec : impossible sans détention de fonds ; à revoir avec Stripe si nécessaire (F-34).
- Délai de réponse aux litiges : 7 jours comme les autres tickets (aucun délai spécifique dans la spec).
- Échanges entre l'équipe et l'autre partie : hors ticket pour l'instant (e-mail, téléphone).

## Conséquences
- Déploiement : migrations `types_litiges` et `litiges`, puis redéploiement de `process-upload` et `notify`.
- **5g** : centre de notifications et préférences (F-41).
