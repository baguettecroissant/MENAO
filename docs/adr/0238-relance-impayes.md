# ADR 0238 — Agent comptable avancé : la relance des impayés

- Statut : accepté
- Date : 7 novembre 2026
- F-87, PR B du lot 5 des agents IA (« go pour la PR B »). Premium et Entreprise, suite de l'ADR 0237 (suivi de l'argent).

## Décision
- **Relance d'un toucher** depuis « À encaisser » :
  - site : bouton « Relancer » ; application : toucher la ligne, puis « Relancer le client » ;
  - elle concerne un acompte dû depuis la signature ou un solde dû depuis la réception ;
  - au plus une relance tous les 3 jours par paiement, et seulement si le paiement est encore dû (`artisan_send_payment_reminder`, contrôles en base) ;
  - la ligne affiche ensuite « Relancé le … » et le nombre de relances.
- **Relances automatiques** (`payment_reminder_settings`), **désactivées par défaut** (décision du 7 novembre 2026) :
  - activées, une tâche quotidienne (`app.send_auto_payment_reminders`, 8 h 30 UTC) envoie le palier atteint, J+7, J+15 ou J+30 après l'échéance ;
  - chaque palier part une seule fois, jamais moins de 3 jours après une autre relance du même paiement, et plus rien après J+30.
- **Le rappel** (`paiement_relance`) part au client par e-mail (et notification), au nom de l'entreprise de l'artisan :
  - montant, chantier, lien vers son chantier pour payer, « si vous avez déjà réglé, merci de ne pas tenir compte de ce message » ;
  - ton neutre, sans pénalité ni mise en demeure ;
  - modèles fixes, pas d'IA : sur de l'argent, aucun montant ni formule inventés.
  - Notification transactionnelle : le client ne peut pas la couper, puisque c'est l'artisan qui relance au sujet de son contrat.
- **Journal** `payment_reminders`, lu par l'artisan seul. Les fonds vont toujours directement à l'artisan (règle 12).
- La relance J+2 de l'acompte (ADR 0090), envoyée par MENAO dans toutes les formules, ne change pas. La formule Base n'a pas les relances avancées.
- `TODO(legal)` : contenu et fréquence des relances envoyées à un particulier au nom de l'artisan, à faire valider par l'avocat.

## Conséquences
- Tests pgTAP `127_relances_impayes` ; tests de l'e-mail et du cœur (`canRemindNow`).
- `packages/emails` a changé : redéployer `notify`, `voice-assistant` et `accountant-export`.
- La carte « Vos agents IA » affiche l'agent comptable comme inclus.
