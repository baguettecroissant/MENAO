# ADR 0028 — Levée des réserves : signalée par l'artisan, confirmée par le client

- Statut : accepté
- Date : 10 octobre 2026

## Contexte
- **F-26** :
  - après un PV avec réserves, le chantier est en `reserves_a_lever` ;
  - le client confirme la levée (« Le chantier est-il parfait ? » → « Confirmer la levée des réserves ») ;
  - si l'artisan a signalé la levée sans confirmation du client, le client est relancé à J+7 ; au-delà de J+30, le dossier est escaladé au support.
- **ADR 0011 et 0027** : sans détention de fonds, le solde est demandé une fois le chantier réceptionné, c'est-à-dire après la levée.

## Décisions
- **Signalement** (`artisan_signal_reserves_lifted`) :
  - message facultatif (1 000 caractères), conservé sur le PV (`receptions.lift_*`) ;
  - le client est notifié (`levee_signalee`) ;
  - un nouveau signalement est possible si la reprise est complétée ; relance et escalade repartent alors de cette date.
- **Confirmation** (`particulier_confirm_reserves_lifted`) :
  - transition `reserves_levees` (→ `receptionne`), possible même sans signalement préalable (le client constate la reprise) ;
  - l'artisan est notifié (`levee_confirmee`).
- **Relances** :
  - la tâche pg_cron `menao-relance-levee-reserves` (quotidienne) appelle `app.remind_reserves_lifting()` ;
  - J+7 après le signalement : une relance du client (`levee_relance`) ;
  - J+30 : un ticket `reserves` pour l'équipe, au nom du client ;
  - une seule fois chacun ; l'instant de référence est un paramètre (tests).
- **Interface** :
  - côté artisan, encadré « Réserves émises par … », bouton « Signaler la levée des réserves » (tiroir avec le message), puis « Levée signalée le … » ;
  - côté client, encadré « Vos réserves », levée signalée (avec le message de l'artisan), puis « Confirmer la levée des réserves » (tiroir « Le chantier est-il parfait ? », rappel du solde).
- **Tests** : le scénario e2e passe désormais par le PV avec réserves et leur levée ; le PV sans réserves est couvert par pgTAP (test 25).

## Points à valider
- Aucun PV de levée distinct n'est établi : la confirmation est journalisée (`chantier_events`), avec la date du signalement. TODO(legal) : forme de la levée des réserves.
- Photos jointes au signalement : l'artisan ajoute ses photos de reprise dans le suivi du chantier, ouvert jusqu'à la réception.

## Conséquences
- **5c** : paiement du solde au chantier réceptionné, facture de solde, clôture.
