# ADR 0081 — Application : dictée du projet (F-05)

- Statut : accepté
- Date : 14 octobre 2026

## Contexte
- Sur le site, le particulier peut dicter son projet (F-05) :
  - le navigateur enregistre, convertit en WAV PCM 16 bits mono 16 kHz et l'envoie à la fonction `transcribe` ;
  - le texte transcrit est ajouté à la description.
- `transcribe` n'accepte que ce WAV : elle en vérifie la durée (2 minutes au plus) avant d'appeler Mistral (production) ou OpenRouter (staging).
- Dans l'application, seul le micro du clavier du téléphone permettait de dicter.
- Les enregistreurs classiques des téléphones posent problème :
  - Android ne produit que des formats compressés (AAC, WebM), sans PCM ;
  - la documentation officielle de Mistral ne liste pas les formats acceptés.

## Décision
- **Nouvelle dépendance `expo-audio`** (~57.0.5, version du SDK par `expo install`), module officiel d'Expo inclus dans Expo Go.
  - Son flux `useAudioStream` (depuis la version 56) livre le **PCM brut du micro sur iPhone et Android**, en 16 bits à la fréquence demandée (16 kHz).
  - La dictée marche ainsi sur les deux téléphones **sans aucun changement côté serveur**, avec le même WAV que le site.
- **Conversion commune** dans `@menao/core` (testée) :
  - `pcm16ToChannels` (PCM entrelacé → échantillons) ;
  - `captureToWav` (morceaux capturés → WAV 16 kHz mono, avec détection d'un micro muet), qui rééchantillonne si le téléphone ne livre pas 16 kHz ;
  - `toBase64`, encodeur par blocs sans dépendance, désormais utilisé aussi par le site.
- **Bouton micro** sous la description (`DictationButton`), comme sur le site :
  - « Écoute… N s », niveau du micro en trois barres, « On ne vous entend pas… » après un silence prolongé ;
  - arrêt automatique à 2 minutes (« Dictée limitée à 2 minutes. ») ;
  - « Transcription en cours… », puis texte ajouté à la description (5 000 caractères au plus) ;
  - rien n'est envoyé si aucun son n'a été capté ;
  - session anonyme de recherche au besoin (ADR 0012), mêmes messages d'erreur que le site.
- **Autorisations** :
  - micro demandé à l'usage, avec un texte français sur iPhone (le même pour `expo-image-picker`) ;
  - `RECORD_AUDIO` sur Android : le réglage photos ne le bloque plus ;
  - lecture et enregistrement en arrière-plan désactivés : ni mode audio permanent sur iPhone, ni service au premier plan sur Android.

## Limites
- Dictée intelligente du devis côté artisan (ADR 0067) : toujours par le micro du clavier ; le même bouton pourra l'alimenter.

## Conséquences
- La saisie du projet de l'application rejoint celle du site : clavier, dictée, photos.
