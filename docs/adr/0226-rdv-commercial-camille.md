# ADR 0226 — Camille réserve un rendez-vous avec le commercial du secteur

- Statut : accepté
- Date : 5 novembre 2026
- F-76, demandé le 5 novembre 2026 (« Camille réserve directement un créneau dans le planning du commercial du secteur, au lieu d'un simple ticket de rappel »). Suite de l'ADR 0225 (secrétaire vocale) ; s'appuie sur les zones des commerciaux (ADR 0207) et le suivi des prospects (ADR 0206).

## Décision
- **Le commercial du secteur** : Camille demande la commune. Son code postal vient de la Base Adresse Nationale (géocodage déjà utilisé par la recherche). Le commercial retenu est le commercial actif dont la zone couvre ce code postal : le début de code le plus long l'emporte, puis le moins chargé. Si aucun commercial ne couvre la commune, Camille propose la demande de rappel (ADR 0225).
- **Les créneaux** (`nextCommercialSlots`, `@menao/core`) :
  - en semaine, toutes les demi-heures de 10 h à 12 h 30 et de 14 h à 19 h 30, heure de Paris (plage d'appel du guide terrain) ;
  - au moins deux heures d'avance, sur deux semaines ;
  - à plus d'une heure de tout rendez-vous déjà pris, trajet compris : ceux de Camille et les rendez-vous du suivi des prospects ;
  - au plus un créneau par demi-journée, trois proposés.
  - Les commerciaux ne règlent pas encore leurs disponibilités : la plage du guide fait foi.
- **Les outils de Camille** (Edge Function `voice-assistant`) :
  - `proposer_creneaux` (commune, appel ou visite) renvoie le prénom du conseiller et les créneaux, chacun avec un code à rendre tel quel ;
  - `reserver_creneau` réserve avec le prénom, le numéro, l'adresse e-mail et, pour une visite, l'adresse de l'entreprise, puis envoie une confirmation à l'artisan par e-mail.
- **La base refait les contrôles** (`voice_book_commercial_appointment`, rôle service seulement) : commercial actif, début prévu, délai, écart d'une heure, adresse pour une visite, 2 rendez-vous au plus par numéro sur 7 jours. Les réservations d'un même commercial sont traitées l'une après l'autre : deux appels simultanés ne prennent pas le même créneau.
- **Le commercial** :
  - il est prévenu par la notification `rdv_commercial` (e-mail sans téléphone ni adresse e-mail, comme toutes les notifications) ;
  - il voit ses rendez-vous dans « Ma journée » (« Rendez-vous pris par Camille ») avec le bouton Appeler, l'adresse e-mail et l'adresse de la visite ;
  - il peut annuler un rendez-vous (`commercial_cancel_appointment`), ce qui libère le créneau, mais c'est à lui de prévenir l'artisan.
- **Données** : table `commercial_appointments`, lue par le commercial concerné ou un admin, aucune écriture directe, purge 12 mois après la date du rendez-vous. Test pgTAP `117_rdv_commercial_camille`.

## Conséquences
- Après la fusion : `db push` sur staging (deux migrations), redéploiement de `voice-assistant` et de `notify` (nouveau type de notification).
- Côté associés : deux outils de plus dans Vapi, consigne mise à jour, et une zone réglée pour au moins un commercial actif.
- Plus tard : disponibilités réglées par chaque commercial, rendez-vous inscrits dans le suivi d'un prospect, rappel la veille.
- Pas de nouvelle dépendance.
