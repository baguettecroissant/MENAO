# ADR 0073 — Application, espace artisan : « Mes disponibilités » (lot 6c, partie 6b)

- Statut : accepté
- Date : 14 octobre 2026

## Contexte
- Sur le site, « Mes disponibilités » (F-44) règle la pause, la date de reprise, les horaires de travail et les absences de l'artisan. On y crée aussi le lien d'abonnement à son calendrier.
- L'agenda de l'application (ADR 0072) affichait le statut et les horaires sans pouvoir les modifier.
- La logique de l'éditeur d'horaires (modèles, nouvelle plage, recopie du lundi, total) était écrite dans le composant du site.

## Décision
- **Éditeur d'horaires commun** : `weekHours`, `hoursOfWeek`, `HOURS_PRESETS`, `DEFAULT_DAY_RANGES`, `nextDayRange`, `copyMondayToWeekdays` et `weeklyMinutes` passent dans `@menao/core` (testés). Le composant du site les utilise, sans changement de comportement.
- **Écran « Mes disponibilités »** (`/pro-disponibilites`), ouvert depuis la pastille de statut de l'agenda et depuis « Renseigner mes horaires » :
  - **statut** : pause ou reprise des demandes (`set_artisan_paused`). « Nouveaux chantiers à partir du » propose des raccourcis (dès maintenant, 1 ou 2 semaines, 1 mois) ou une autre date. Les contrôles sont ceux du site, puis `set_artisan_available_from` ;
  - **horaires de travail** :
    - jusqu'à trois plages par jour et modèles courants ;
    - recopie du lundi et total de la semaine ;
    - mention « Modifications non enregistrées ». L'enregistrement est bloqué tant qu'une plage est incorrecte (`hoursSchema`, `hoursErrors`, `set_artisan_hours`) ;
  - **congés et absences** : absences en cours et à venir, ajout avec motifs fréquents (`absenceSchema`, `absenceError`, `add_artisan_absence`), suppression.
- **Saisie adaptée au téléphone** :
  - sur iPhone, des pastilles compactes ouvrent le calendrier ou la roue des heures (`compact` de `DateTimeFields`, `CompactTimePicker`) ;
  - sur Android, des boîtes de dialogue ;
  - dans la version web, des champs au clavier.
- Aucune nouvelle dépendance, aucun changement côté serveur.

## Limites
- **Synchronisation avec un calendrier** (lien d'abonnement .ics) : partie suivante.
- **Visibilité du profil** (dossier incomplet) : non rappelée dans l'application, faute d'écran de dossier sans renvoi au site (règle 10).

## Conséquences
- **Partie suivante** : synchronisation du calendrier, puis créneaux proposés et avertissements dans les formulaires de rendez-vous.
