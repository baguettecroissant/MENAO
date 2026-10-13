# ADR 0069 — Application : photos du journal, de la messagerie et des signalements (lot 6c, partie 4b)

- Statut : accepté
- Date : 13 octobre 2026

## Contexte
- Sur le site, l'artisan ajoute des photos au journal du chantier (F-22). Le client comme l'artisan joignent des photos à la conversation (F-40) et à un signalement (F-42).
- Le navigateur réduit chaque photo et la dépose dans `uploads/<user_id>/<uuid>`. L'Edge Function process-upload la vérifie, la range et l'enregistre.
- L'application n'avait pas encore accès aux photos du téléphone.

## Décision
- **Deux dépendances Expo**, aux versions du SDK 57 (`expo install`). Elles sont incluses dans Expo Go et ne demandent ni compte ni service tiers :
  - `expo-image-picker` : sélecteur de photos du système. La photothèque ne demande aucune autorisation (iOS 14 et plus, Android) ; l'appareil photo la demande la première fois ;
  - `expo-image-manipulator` : réduction et conversion en JPEG sur le téléphone. process-upload n'accepte que le JPEG et le PNG, et refuserait donc les photos HEIC de l'iPhone.
- **Même circuit que le site** (`src/lib/photos.ts`) :
  - la photo est réduite à 2 000 px au plus sur son côté le plus long, puis réencodée en JPEG (qualité 0,85). Le fichier est léger (spec §4.4) et perd ses métadonnées, dont la position GPS. process-upload les retire de toute façon ;
  - elle est déposée dans `uploads/<user_id>/<uuid>`, avec un identifiant v4 créé dans l'application (Hermes n'a pas `crypto.randomUUID`) ;
  - process-upload est appelée avec la même destination que sur le site : `chantier_photo`, `message_attachment` ou `ticket_photo` ;
  - la copie réduite est retirée du cache du téléphone après l'envoi.
- **Écrans**, avec les textes du site :
  - **journal de l'artisan**, pendant les travaux : « Ajouter une photo ». Jusqu'à 10 photos à la fois, envoyées une à une avec la progression. L'envoi s'arrête au plafond de 100 photos ou à la limite de fréquence (`uploadBatch`, testé). Le lien « Ajouter des photos » figure aussi dans « Ce chantier est-il terminé ? » ;
  - **messagerie**, pour le client et l'artisan : bouton « Joindre une photo » à gauche du champ. La photo s'affiche comme un message ;
  - **signalement** : « Ajouter une photo » tant qu'il n'est pas clos.
  - Chaque bouton propose « Prendre une photo » ou « Choisir dans mes photos ». La version web ouvre directement le sélecteur de fichiers.
- **Autorisations** (`app.config.ts`) : sur iPhone, les demandes d'accès aux photos et à l'appareil photo sont expliquées en français. L'accès au micro n'est pas demandé, faute de vidéo ; il est aussi retiré sur Android.
- Aucun changement côté serveur.

## Limites
- **Documents PDF dans la messagerie** : seulement sur le site pour l'instant. Il faudrait un sélecteur de documents, donc une dépendance de plus.
- **Android** : si le système ferme l'application pendant la prise de vue (mémoire insuffisante), la photo est perdue et doit être reprise. `getPendingResultAsync` n'est pas utilisé.
- **Photos du projet** (F-05), ajoutées par le particulier à la création de sa demande : absentes de l'application pour l'instant.

## Conséquences
- **Partie suivante** : photos du projet à la création de la demande (F-05), avec le même module.
- **Ensuite** : réponse à l'avis du client et agenda.
