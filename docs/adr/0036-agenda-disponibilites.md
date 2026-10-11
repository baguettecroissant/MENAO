# ADR 0036 — Agenda et disponibilités de l'artisan

- Statut : accepté
- Date : 11 octobre 2026
- Complète F-44 (fichier .ics de chaque rendez-vous) et F-09 (« pas en pause / congés »).

## Contexte
- Le porteur du projet juge la section « Disponibilité » peu visible et peu utile. Elle se limitait, dans « Mon dossier », à une case « en pause » et à une date « disponible à partir du ».
- Il demande que l'artisan puisse vraiment personnaliser son agenda et ses disponibilités.
- La spec prévoit seulement un export .ics par rendez-vous (F-44) et l'exclusion des artisans « en pause / congés » de la recherche (F-09). Les congés n'avaient pas de support : seule la pause existait.

## Décision
- **Rubrique « Agenda »** dans le menu de l'espace pro, juste après le tableau de bord, avec deux onglets :
  - **Agenda** : la semaine (`?semaine=AAAA-MM-JJ`), avec les visites planifiées, les démarrages de chantier, les créneaux bloqués et les absences.
    - Sur ordinateur, une grille horaire montre les heures de travail en clair, les absences rayées et l'heure actuelle.
    - Sur mobile, une liste jour par jour.
  - **Mes disponibilités** :
    - le statut (pause, ou « nouveaux chantiers à partir du », en un clic) ;
    - les horaires de travail ;
    - les congés et absences ;
    - l'abonnement .ics.
- **Nouvelles tables**, toutes avec RLS et écrites seulement par des fonctions contrôlées. Les mêmes règles sont dans `@menao/core` (`agenda.ts`) et en base :
  - `artisan_hours` : trois plages disjointes par jour au plus. Les horaires ne sont pas publiés : ils servent aux créneaux proposés et à l'agenda ;
  - `artisan_absences` : journées entières, un an au plus, sans chevauchement, trente à venir au plus ;
  - `artisan_blocked_slots` : créneaux sur une journée, comme un rendez-vous personnel ou un chantier hors MENAO ;
  - `artisan_calendar_feeds` : un lien d'abonnement secret par artisan.
- **Lecture des données** :
  - horaires et absences : l'artisan, et l'équipe pour expliquer une absence des résultats ;
  - créneaux bloqués (notes personnelles) et lien d'abonnement : l'artisan seul.
- **Recherche** : un artisan absent aujourd'hui sort de `match_artisans` et de `public_artisans_for_commune`, donc aussi de l'envoi de demandes. Sa fiche l'indique « indisponible ». Il réapparaît de lui-même au lendemain de son absence.
- **Pause et date de disponibilité** se règlent séparément (`set_artisan_paused`, `set_artisan_available_from`). `set_artisan_availability` reste pour les versions déjà déployées de l'interface.
- **Statut dans le menu** : la carte de visibilité affiche « En pause » ou « En congés jusqu'au … », avec un lien vers « Mes disponibilités ».
- **Rendez-vous plus simples à fixer** :
  - « Fixer un rendez-vous » et « Modifier le rendez-vous » proposent jusqu'à quatre créneaux libres (`suggestSlots`). Ils tiennent compte des horaires, des absences et de l'agenda : au plus un le matin et un l'après-midi, au moins deux heures plus tard, par pas de 30 minutes ;
  - ces tiroirs et la date de démarrage avertissent d'une absence, d'un horaire en dehors des heures de travail ou d'un autre élément au même moment. Ces avertissements ne bloquent pas.
- **Abonnement .ics** (`/calendrier/<jeton>.ics`, lu sans session) :
  - jeton aléatoire de 48 caractères, renouvelable (l'ancien lien cesse aussitôt de répondre, en 404) et désactivable ;
  - contenu : visites, démarrages, créneaux bloqués, absences sur la journée entière, des 60 derniers jours et à venir ;
  - par prudence, l'abonnement ne contient que la **commune du chantier** et un lien vers sa fiche, sans adresse ni nom du client : le lien peut circuler (copie, partage d'agenda) ;
  - la dernière lecture par une application d'agenda est notée (toutes les 15 minutes au plus) et affichée à l'artisan.

## Conséquences
- Les applications d'agenda relisent l'abonnement d'elles-mêmes, en général toutes les quelques heures (Google peut mettre jusqu'à une journée). Le fichier .ics de chaque rendez-vous (F-44) reste disponible pour un ajout immédiat.
- Afficher l'adresse complète dans l'abonnement serait plus pratique pour le GPS. C'est possible plus tard sous forme d'option explicite, à valider.
- La synchronisation reste à sens unique (MENAO vers l'agenda de l'artisan). Lire l'agenda personnel de l'artisan pour éviter les conflits demanderait un accès OAuth à Google ou Microsoft, hors périmètre.
- Le fuseau est toujours Europe/Paris (dates de journée et heures saisies), comme pour les rendez-vous.
