# ADR 0058 — Vidéo de démonstration de l'Espace Pro

- Statut : accepté
- Date : 13 octobre 2026

## Contexte
- La page Espace Pro (F-03) présente MENAO aux artisans. Une vidéo de démonstration d'environ 80 secondes montre le parcours complet, de la demande du client à la réception du chantier.
- La vidéo est montée à partir des vrais écrans de MENAO, avec les données fictives des tests, et porte une voix off et une musique d'ambiance.
- La spécification (§4.4) écarte les services propriétaires de Vercel (Blob…) et exige un code déployable sur Cloudflare.

## Décision
- **Fichier statique du site** : `apps/web/public/videos/menao-demo.mp4`, comme les images de la vitrine (`public/images`). C'est portable vers Cloudflare et n'utilise aucun service Vercel.
- **Allégée pour le web** : H.264 en 1920 × 1080, environ 1,6 Mb/s pour l'image, son AAC, autour de 18 Mo.
- **Chargée seulement à la lecture** (`preload="none"`) : la page reste légère et statique. Une image d'aperçu WebP de 42 Ko s'affiche avant la lecture.
- **Sous-titres français** (WebVTT) calés sur la voix off, pour l'accessibilité et pour une lecture sans le son.
- **Voix off et musique sans droits à céder** :
  - voix de synthèse d'Apple (macOS) ;
  - musique composée par programme.
- **Textes repris du site** (page Espace Pro, garanties) : aucun chiffre ni témoignage inventé (F-01).
- **Sources hors du dépôt** : les scripts de montage et de rendu sont conservés en local, dans `medias/` (exclu de Git).

## Conséquences
- À chaque changement visible de l'interface, il faudra refaire la vidéo et remplacer le fichier, qui alourdit l'historique du dépôt d'environ 18 Mo à chaque version. Il faudra donc remplacer la vidéo rarement.
- Si l'audience grandit, la vidéo pourra passer sur un stockage dédié (Supabase Storage ou Cloudflare R2). Il faudra alors ajouter ce domaine à `media-src` dans la politique de sécurité (CSP).
