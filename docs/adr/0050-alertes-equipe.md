# ADR 0050 — Alertes de l'équipe MENAO

- Statut : accepté
- Date : 12 octobre 2026
- Réalise le lot 4b de l'audit du back-office. Complète les ADR 0017 (envoi des notifications), 0033 (centre de notifications) et 0049 (boîte de réception).

## Contexte
- Seule l'échéance d'une assurance prévenait l'équipe (`document_a_renouveler_equipe`, F-51). Un nouveau ticket, un litige, un dossier artisan à vérifier ou un ticket en retard passaient inaperçus si personne n'ouvrait le back-office.
- La cloche des notifications était masquée dans le back-office.

## Décision
- **Trois alertes**, par e-mail et dans la cloche, toujours envoyées (transactionnelles, ADR 0033) :
  - **nouveau ticket** (`equipe_nouveau_ticket`), à toute l'équipe (admins et support) : le type et l'objet du ticket, avec un lien vers sa page ;
  - **dossier artisan à vérifier** (`equipe_dossier_a_verifier`), aux admins seulement, à chaque envoi ou renvoi en vérification ;
  - **ticket en retard** (`equipe_ticket_en_retard`), chaque matin (pg_cron, 7 h UTC). Elle va à son responsable s'il est pris en charge, sinon à toute l'équipe. Une seule alerte par ticket (`tickets.overdue_notified_at`).
- **Déclencheurs** : à l'insertion d'un ticket et au passage d'un dossier en vérification. Ainsi, chaque origine est couverte sans toucher aux fonctions existantes : page Contact, dossier de recherche, signalement, litige, suppression de compte, réserves, expertise.
- **Cloche dans le back-office**, comme dans les espaces client et pro. La page « Notifications » de l'équipe s'ouvre dans la coque du back-office, après la double authentification.

## Conséquences
- À déployer : les deux migrations (valeurs de notification ; colonne, déclencheurs et tâche planifiée) et la fonction `notify` (nouveaux e-mails).
- Le volume dépend du nombre de tickets. Si besoin, un résumé quotidien ou des préférences propres à l'équipe pourront remplacer l'envoi immédiat.
