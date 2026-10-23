# ADR 0171 — Choix « Afficher ma fiche dans Google » dans l'application

- Statut : accepté
- Date : 23 octobre 2026
- Suite de l'ADR 0144 (fiches artisans publiques) : un des points restants de la phase D du plan SEO, « case Google dans l'app ».

## Décision
- **Application** : l'écran « Votre photo et votre présentation » se termine par l'interrupteur « Afficher ma fiche dans Google ».
  - Il est activé par défaut, comme sur le site, avec les mêmes explications.
  - Le choix est enregistré aussitôt, avec la confirmation « Choix enregistré. ».
- **Pas de lien vers la fiche** : l'adresse publique de la fiche et le badge restent sur le site seulement, parce que l'application ne renvoie jamais vers le site (règle 10).
- **Même donnée** : `artisans.indexable`, la seule colonne que la base autorise l'artisan à modifier sur sa fiche (ADR 0144).
- **Délai** : sur le site, l'enregistrement vide aussitôt le cache de la fiche. Depuis l'application, la fiche est remise en cache dans l'heure (`revalidate = 3600`), ce qui reste négligeable à côté du retrait par Google, qui prend quelques semaines.

## Conséquences
- Pas de migration ni de nouvelle dépendance.
- Rien à déployer après la fusion.
