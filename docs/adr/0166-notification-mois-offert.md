# ADR 0166 — Notification « mois offert »

- Statut : accepté
- Date : 22 octobre 2026
- Suite de l'ADR 0160 (mois offert de démarrage), proposée dans cet ADR et demandée le 22 octobre 2026.

## Décision
- **Déclenchement** : quand un artisan reçoit son mois offert de démarrage (aucun devis signé pendant ses 2 premiers mois payants), un déclencheur sur `artisan_free_months` (`reason = 'demarrage'`) le prévient (notification `mois_offert`).
  - Une seule fois : un seul mois de démarrage par artisan.
  - Les mois de parrainage ne déclenchent rien.
- **Contenu** : le mois suivant est offert et s'applique tout seul à la prochaine facture.
  - Conseils pour décrocher un premier chantier : fiche complète, réponses rapides, devis sous 72 h.
  - Lien vers « Mon profil ».
- **Canaux** : e-mail et centre de notifications du site seulement.
  - Jamais en push (`app.notifications_push_status`) ni dans l'application (`WEB_ONLY_NOTIFICATIONS`).
  - L'abonnement ne s'évoque pas dans l'app (CLAUDE.md règle 10, comme l'impayé de l'ADR 0158).

## Conséquences
- **Migrations** : `type_mois_offert` (valeur d'enum seule) et `notification_mois_offert`. Tests pgTAP : `89_notification_mois_offert`.
- **Après la fusion** :
  - pousser les migrations ;
  - redéployer `notify` (nouveau modèle d'e-mail).
- **[TODO(legal)]** : les conditions du mois offert restent à écrire dans les CGV artisans (ADR 0160).
- **Pas de nouvelle dépendance.**
