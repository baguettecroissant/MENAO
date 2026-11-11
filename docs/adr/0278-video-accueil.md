# ADR 0278 — Vidéo de présentation sous le bandeau de l'accueil (F-126)

- Statut : accepté
- Date : 11 novembre 2026
- Complète l'ADR 0264 (structure de l'accueil) ; même intégration que la vidéo de l'Espace Pro (ADR 0058, 0275).

## Décision
- La vidéo de présentation fournie par le propriétaire du projet (« MEANO-VDO-V3 », 67 s, 1080p, voix off) est placée juste sous le bandeau de l'accueil, à la demande du propriétaire.
- Fichier statique `apps/web/public/videos/menao-accueil.mp4`, réencodé à 3,5 Mb/s (30 Mo au lieu de 90 Mo, son conservé), image d'aperçu `menao-accueil.webp` (le logo, à 6 s). Chargée seulement à la lecture (`preload="none"`), sans lecture automatique.
- Aucun titre ni texte visible ajouté ; libellé d'accessibilité seulement.

## Conséquences
- Pas de sous-titres : la vidéo n'en a pas. À ajouter (fichier `.vtt`) pour les visiteurs sourds ou qui regardent sans le son.
- Le contenu de la vidéo n'est pas modifié ici : il cite Paris et Bordeaux alors que MENAO démarre dans les Alpes-Maritimes, et montre des artisans fictifs.
