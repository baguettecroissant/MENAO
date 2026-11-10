# ADR 0275 — Film de vente de l'Espace Pro (F-123)

- Statut : accepté (remplace la vidéo des ADR 0058 et 0099)
- Date : 10 novembre 2026
- Lot 5 du plan « mockups, images, vidéo » (ADR 0270 à 0273).

## Contexte
La vidéo de `/pro` était une visite guidée de 82 secondes : pas d'offre, pas d'appel à l'action, une voix sans licence commerciale, et les écrans d'avant la refonte.

## Décision
- **Un film de vente de 62 secondes**, validé par le propriétaire du projet : le problème de l'artisan, la promesse, puis la demande qualifiée, le devis dicté et signé, l'acompte sans commission, la secrétaire Manon, la réception et l'avis, et l'offre (abonnement fixe, deux mois offerts, sans engagement, `menao.fr/pro`).
- **Images** : cinq plans filmés générés à partir des photos de Julien et de Camille (ADR 0271, téléphone tenu naturellement, ADR 0273), les vrais écrans de l'application dans un téléphone, et des animations (titres, cartes, compteurs, signature tracée, volets de transition). Personnes et données fictives.
- **Voix off** de synthèse, musique et bruitages composés par programme. Sous-titres français.
- **Fichiers statiques** dans `apps/web/public/videos` : `menao-film-pro.mp4` (1080p, 27 Mo), `.webp` (image d'aperçu) et `.vtt`. Nouveaux noms, pour que les navigateurs ne gardent pas l'ancienne vidéo ; les fichiers `menao-demo.*` sont supprimés. Chargement à la lecture seulement, comme avant (`preload="none"`).
- **Titre de la section** : « MENAO en 60 secondes » (la durée annoncée était 80 secondes).
- Les sources du film (plans, voix, page animée, scripts) restent hors du dépôt, comme pour les autres films.

## Conséquences
- La mention « Démonstration : personnes et données fictives » des vidéos précédentes a été retirée de l'image à la demande du propriétaire du projet.
- TODO(legal) : faire confirmer avant toute diffusion payante (publicité) les conditions d'usage commercial de la voix de synthèse et des plans générés, et l'obligation éventuelle de signaler à l'écran les images générées (même point que l'ADR 0271).
