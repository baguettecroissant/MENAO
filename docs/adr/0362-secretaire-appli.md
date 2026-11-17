# ADR 0362 — La secrétaire dans l'application : appels à traiter, historique, réglages (F-171, lot 68)

- Date : 17/11/2026
- Fonctionnalité : F-171 ; maquette du lot 68 (« SecretaireApp »), validée le 17/11/2026.
  Reprend dans l'application la rubrique « Secrétaire » du site (ADR 0244, 0249).

## Contexte

Dans l'application, l'artisan ne voyait de sa secrétaire que les rendez-vous qu'elle prenait,
dans l'agenda. Les appels à rappeler, l'historique et les réglages n'existaient que sur le site,
alors qu'un appel à rappeler se traite justement au téléphone, entre deux tâches.

## Décision

- **Écran « Secrétaire »** (`/pro-secretaire`), trois onglets : « À traiter » (appeler, ouvrir le
  rendez-vous dans l'agenda, marquer traité), « Traités » (un appel peut revenir à traiter),
  « Réglages » (nom annoncé, rendez-vous, durée, consignes, horaires) avec la carte de la
  secrétaire (état, minutes du mois) et l'essai.
- **Mêmes données que le site** : `my_ai_agents`, `secretary_settings`, `secretary_messages`,
  `secretary_message_done`, `save_secretary_settings` ; chiffres par `secretaryFigures` et
  `voiceGauge` (core). Patron et chef d'équipe (`withTeamPermission("secretary")`).
- **Essai** : le kit vocal ne tourne pas dans l'application ; l'appel passe par une page intégrée
  du site, `/appli/secretaire`, comme « Dicter avec Manon » (ADR 0235). La session arrive de
  l'application, jamais par l'adresse.
- **Entrées** : une ligne « Secrétaire » dans « Mon profil », avec le nombre d'appels à traiter,
  et une alerte sur l'accueil quand il y en a. Aucune entrée de menu en plus.
- **Aucun achat dans l'application** (règle 10) : ni « Recharger », ni lien vers les formules.
  Minutes épuisées : l'application le dit. Formule sans secrétaire : une explication seule.

## Conséquences

- Aucune migration ni fonction.
- La ligne « Secrétaire » de « Mon profil » est visible même sans la secrétaire dans la formule ;
  elle ouvre alors l'explication.
- L'essai consomme des minutes de la formule et ne se vérifie que sur un téléphone.
