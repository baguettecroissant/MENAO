# ADR 0107 — Rappel hebdomadaire du planning

- Statut : accepté (complète l'ADR 0105)
- Date : 15 octobre 2026

## Contexte
- **Charte qualité** (ADR 0104) : l'artisan s'engage à mettre son planning à jour au moins une fois par semaine, et MENAO lui promet « un rappel chaque semaine pour mettre ton planning à jour ».
- **Score MENAO** (ADR 0105) : le planning tenu à jour compte pour 10 %. Il est plein jusqu'à 7 jours sans mise à jour, puis décroît jusqu'à 0 à 28 jours.
- **Avant** : ni rappel, ni bouton « Mon planning est à jour » dans l'application mobile.

## Décision
- **Rappel** : notification `planning_relance` (e-mail et push), créée par `app.remind_planning()`, tâche pg_cron `menao-relance-planning` chaque lundi à 7 h UTC (9 h à Paris l'été, 8 h l'hiver).
- **Qui le reçoit** : les artisans visibles des clients (`app.artisan_is_visible` : dossier validé, abonnement, paiements actifs), hors pause, dont le planning n'a ni changé ni été confirmé depuis 7 jours.
  - Un planning à jour ne déclenche rien : le rappel arrive au moment où le critère du score commence à baisser.
  - Au plus un rappel sur 6 jours par artisan, même si la tâche est relancée.
- **Contenu** : jours écoulés depuis la dernière mise à jour (ou « pas encore confirmé »), rappel du bouton « Mon planning est à jour » et du poids dans le score. Lien vers « Mes disponibilités », qui ouvre l'écran de l'application depuis le push.
- **Préférences** : rappel facultatif, dans la catégorie « Rappels », comme les autres relances (ADR 0033).
- **Application mobile** : la carte « Votre score MENAO » du site (total, six critères, date du planning, bouton « Mon planning est à jour ») sur « Mon grade MENAO » et « Mes disponibilités ». Sans le lien « Comprendre le classement », qui mènerait au site (règle 10).

## Conséquences
- Un artisan qui confirme son planning chaque semaine ne reçoit jamais le rappel.
- Un artisan en pause ne reçoit rien ; à la reprise, la date du planning est remise à jour (déclencheur de l'ADR 0105).
- Engagements de la charte encore absents : mesure des appels, statut « Élite Menao ».
