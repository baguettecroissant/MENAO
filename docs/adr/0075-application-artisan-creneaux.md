# ADR 0075 — Application, espace artisan : créneaux proposés et avertissements à la saisie d'un rendez-vous (lot 6c, partie 6d)

- Statut : accepté
- Date : 14 octobre 2026

## Contexte
- Sur le site, les formulaires « Fixer un rendez-vous », « Modifier le rendez-vous » et « Confirmer la date de démarrage » s'appuient sur l'agenda de l'artisan (F-18, F-44).
  - Les rendez-vous proposent des créneaux libres (`suggestSlots`).
  - Les trois formulaires avertissent, sans bloquer, d'une absence, d'un horaire hors de la plage de travail ou d'un autre élément au même moment (`slotWarnings`, `slotConflicts`).
- Les mêmes formulaires de l'application n'avaient ni créneaux proposés ni avertissements.

## Décision
- **Contexte d'agenda d'un formulaire** (`loadAppointmentAgenda`), comme `appointmentAgenda` du site :
  - horaires, absences à venir et éléments de l'année (visites, démarrages, créneaux bloqués) ;
  - sans le rendez-vous en cours de modification ;
  - créneaux libres calculés par `suggestSlots`.
  Le chargement de l'agenda de l'application est factorisé pour servir aussi la semaine (ADR 0072). Sans contexte (erreur de chargement), le formulaire reste utilisable.
- **Créneaux libres** (`SlotSuggestions`) dans « Fixer un rendez-vous » et « Modifier le rendez-vous ». Un appui remplit la date et l'heure.
- **Avertissements** (`SlotWarnings`) dans les trois formulaires, avec les textes du site. Le démarrage n'a que les avertissements, comme sur le site.
- Aucune nouvelle dépendance, aucun changement côté serveur.

## Conséquences
- L'agenda (F-44) est complet dans l'application : semaine, créneaux bloqués, disponibilités, synchronisation du calendrier, créneaux proposés et avertissements.
- **Parties suivantes** : « Ce chantier a besoin d'une expertise », liste des devis et factures de l'artisan, notifications push (lot 6e).
