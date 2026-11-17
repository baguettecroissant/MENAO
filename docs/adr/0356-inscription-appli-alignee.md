# ADR 0356 — Inscription dans l'application alignée sur le site (F-166)

- Date : 17/11/2026
- Fonctionnalité : F-166. Reprend dans l'application les ADR 0353 (étapes en parallèle), 0354
  (relance du registre, facultatif visible) et 0355 (une seule image, logo ou photo), faits sur le
  site seulement.

## Contexte

Les lots 62 à 64 ont changé l'inscription sur le site : paiements ouverts dès le début, Kbis relancé
au registre, image facultative au choix. L'application gardait l'ancien parcours : paiements après
l'envoi du dossier seulement, « Votre photo et votre présentation » sur une même ligne, carte
« Avant de commencer », aucun état « vérification en cours » pour le Kbis.

## Décision

- **« Mon dossier »** : la ligne des paiements passe dans un groupe « À faire en attendant »,
  montré dès que `connectOnboardingOpen` l'autorise (brouillon compris). Rien sur la formule : la
  règle 10 interdit tout achat d'abonnement dans l'application.
- **Kbis** : `registryCheckPending` (core) donne l'état ; l'application relance le contrôle
  (`sirene-check`, `{ registre: true }`) une fois par quart d'heure au plus, puis relit le dossier.
  La ligne affiche « En cours » et l'écran du Kbis l'explique.
- **Image** : carte « Votre image » avec le choix « Mon logo » / « Une photo ». Le logo part sans
  cadrage avec l'usage `image_logo` (PNG, comme le logo des documents) ; la photo garde le cadrage
  rond. La ligne « Votre image » est dans un groupe « Pour vous démarquer », marquée « Facultatif ».
- **Fiche publique dans l'application** : un logo est montré en entier (`ArtisanAvatar logo`).
- **« Avant de commencer »** retiré, comme sur le site : seule la vidéo de présentation reste.

## Conséquences

- Aucune migration ni fonction : tout existe déjà côté serveur.
- Les petits ronds (listes, messages) rognent encore un logo : à traiter à part.
- Non essayé sur iPhone au moment de la fusion : à vérifier avec Expo Go.
