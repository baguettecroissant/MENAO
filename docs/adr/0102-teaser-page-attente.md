# ADR 0102 — Teaser de la page d'attente

- Statut : accepté (complète l'ADR 0101)
- Date : 15 octobre 2026

## Contexte
- **Demande** : l'utilisateur veut, sur la page d'attente de menao.fr, une vidéo de teasing à la place de la vidéo de présentation de l'Espace Pro.
- **Choix de l'utilisateur** : musique seule, sans voix ; lecture automatique en boucle et en sourdine.

## Décision
- **Déroulé** (27 s) :
  - une accroche tapée au clavier (« Trouver un bon artisan… c'est déjà tout un chantier. ») ;
  - trois galères barrées une à une ;
  - le toit du logo qui se dessine dans le silence ;
  - huit flashs calés sur le tempo : vrais écrans de l'application en très gros plan et floutés, un élément animé, un mot (Décrivez, Vérifiés, Chiffré, Signé, Payé, Suivi, Terminé, Reconnu) ;
  - « Particuliers. Artisans. Une seule plateforme. » ;
  - impact sur le logo, puis « Bientôt. », menao.fr et Alpes-Maritimes ;
  - un fondu final pour que la boucle reprenne sans à-coup.
- **Musique** : composée par programme et libre de droits. Elle suit le minutage partagé avec l'image (`film/temps.js`).
- **Contenus** :
  - données fictives, avec la mention « Démonstration : données fictives » pendant les flashs ;
  - aucun chiffre marketing ni avis inventé (F-01).
- **Intégration** :
  - `apps/web/public/videos/menao-teaser.mp4`, version légère encodée à environ 2,2 Mb/s, et son image d'aperçu `menao-teaser.webp` (la carte de fin) ;
  - le composant `TeaserVideo` lance la vidéo en sourdine et en boucle, avec un bouton « Activer le son » qui la reprend au début ;
  - avec « réduire les animations », la vidéo reste sur son image d'aperçu, avec les commandes du navigateur ;
  - la vidéo de l'Espace Pro (ADR 0099) reste sur `/pro`.
- **Sources** dans `medias/films/teaser/`, hors Git, comme les autres films. Les versions HD 16:9 et 9:16, destinées aux réseaux, sont fournies à part.

## Conséquences
- **Bande passante** : chaque visite charge environ 8 Mo de vidéo, sans conséquence au volume d'avant-lancement. À revoir si le trafic monte avant le retrait de la page d'attente.
- **Retrait** : au lancement, la page d'attente disparaît avec `PRELAUNCH_ACCESS_CODE`. Le teaser reste disponible pour les réseaux.
