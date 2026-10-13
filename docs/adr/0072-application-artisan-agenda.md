# ADR 0072 — Application, espace artisan : agenda de la semaine et créneaux bloqués (lot 6c, partie 6a)

- Statut : accepté
- Date : 13 octobre 2026

## Contexte
- Sur le site, l'agenda de l'artisan (F-44) montre ses visites, démarrages de chantier, créneaux bloqués et absences, semaine par semaine, sur ses horaires de travail. Il permet de bloquer un créneau et de le libérer.
- Dans l'application, l'onglet « Agenda » affichait « Bientôt dans l'application ».
- L'assemblage des éléments de l'agenda (visites et démarrages tirés des chantiers, créneaux bloqués) était écrit dans le site.

## Décision
- **Assemblage commun** : `agendaItemsFrom` et les types `AgendaItem` et `AgendaItemKind` passent dans `@menao/core` (testés). Le site et l'application les utilisent. Le type `AgendaKind` du tableau de bord (visite ou démarrage) reste inchangé.
- **Onglet « Agenda »**, comme la version mobile du site :
  - navigation de semaine en semaine, retour à la semaine en cours, titre « Du 12 au 18 octobre 2026 » ;
  - statut de disponibilité (disponible, en pause, en congés, nouveaux chantiers à partir du…), calculé par `availabilityStatus` ;
  - chaque jour : horaires de travail ou « Fermé », absence, visites et démarrages (vers le chantier), créneaux bloqués avec « Libérer » ;
  - message si les horaires ne sont pas renseignés, légende des couleurs.
- **« Bloquer un créneau »** (`/pro-agenda/bloquer`) :
  - date, heures de début et de fin, motif facultatif ;
  - mêmes contrôles que le site (`blockedSlotSchema`, `blockedSlotError`), puis `add_artisan_blocked_slot` ;
  - l'agenda s'ouvre ensuite sur la semaine du créneau, avec « Créneau bloqué ».
- Nouveau champ « heure seule » (`TimeField`), à côté des champs de date et d'heure existants.
- L'écran provisoire « Bientôt dans l'application » n'a plus d'usage : il est retiré.
- Aucune nouvelle dépendance, aucun changement côté serveur.

## Limites
- **Mes disponibilités** (pause, nouveaux chantiers à partir du, horaires de travail, absences, synchronisation avec un calendrier) : partie suivante. D'ici là, le statut et les horaires se règlent sur le site, sans lien depuis l'application (règle 10).
- **Créneaux proposés et avertissements** à la saisie d'un rendez-vous (`suggestSlots`, `slotWarnings`) : à ajouter aux formulaires de rendez-vous et de démarrage.

## Conséquences
- **Partie suivante** : « Mes disponibilités » dans l'application.
