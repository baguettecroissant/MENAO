# ADR 0380 — Recrutement des conseillers MENAO : page publique, réunion d'information, suivi

- Statut : accepté (maquette du lot 77 validée par l'utilisateur le 19/11/2026, « Validé, code-la »)
- Fonctionnalité : F-183 (reprend le lot 58 du 16/11/2026, mis à jour)

## Contexte

MENAO doit recruter des conseillers indépendants (commerciaux de terrain, payés à la commission)
pour les tournées de janvier 2027. Les annonces (Indeed, Leboncoin, LinkedIn, groupes Facebook)
renvoyaient vers des messages privés : chaque candidat posait les mêmes questions, et rien ne
disait quel canal fonctionnait.

## Décision

- **Page publique `/devenir-conseiller`** : l'offre avec la photo de l'équipe, le métier en
  4 étapes, un simulateur de gains, les outils, le profil, les questions fréquentes, puis la
  candidature. Page statique régénérée toutes les heures ; ouverte pendant la pré-ouverture
  (`prelaunch.ts`) et ajoutée au plan du site.
- **Barème** : lu dans `commercial_bonus_settings` (fonction publique `commercial_bonus_rates`,
  montants seulement). Tant que rien n'est réglé, la page affiche le barème annoncé
  (`RECRUITMENT_PUBLISHED_RATES` : 110 € à la validation, puis 30 €, 100 € ou 200 € selon la
  formule). Le simulateur calcule avec `@menao/core` (`simulateRecruitmentEarnings`) et rappelle
  que c'est un exemple, avant cotisations, pas une promesse de revenus.
- **Candidature sans compte** : `apply_as_commercial` (security definer, accessible sans compte)
  contrôle tout en base, limite à 60 candidatures par heure et refuse un même e-mail ou téléphone
  sous 90 jours. Provenance cochée par le candidat ou pré-cochée par le lien d'une annonce
  (`?source=linkedin`, lu dans le navigateur pour garder la page statique). Accord explicite :
  conservation 2 ans au plus après le dernier échange (tâche `menao-purge-candidats`).
- **Réunion d'information collective en visio** : juste après l'envoi, le candidat choisit un
  créneau parmi les réunions posées dans le back-office (date, durée, places, lien Google Meet).
  Un jeton secret, dans l'adresse et les e-mails, lui permet de changer de créneau ou de demander
  à être rappelé pendant 60 jours. Places vérifiées sous verrou ; plus de réservation 2 heures
  avant le début.
- **E-mails aux candidats** : la file `notifications` accepte un candidat comme destinataire
  (colonne `candidate_id`, adresse lue au moment de l'envoi, comme les tickets de l'ADR 0140).
  Cinq e-mails : confirmation avec le lien de visio, rappels la veille et une heure avant
  (`menao-rappel-reunions-recrutement`, toutes les 10 minutes), annulation, réponse polie, lien de
  démo. Pied de page propre : pas de compte, donc pas de préférences d'e-mail.
- **Back-office (Apporteurs › Candidats)**, administrateurs en double authentification seulement :
  liste filtrée par étape avec la provenance, prochaine réunion et provenance des 30 derniers
  jours ; fiche avec grille d'entretien (6 critères notés de 1 à 5), étape, envoi du lien de démo,
  « Ne pas retenir » (e-mail poli) et « Inviter comme commercial » (invitation déjà remplie ; le
  candidat passe en « Retenu ») ; réunions : création, présents et absents (un présent passe en
  « Entretien »), annulation qui prévient les inscrits.
- **Test de vente en entretien** : le simulateur de l'espace conseiller (ADR 0224) s'ouvre depuis
  la fiche ; l'Edge Function `commercial-copilot` accepte `candidateId` pour un administrateur
  (vérifié par la base), et garde sur la fiche la note et le compte rendu du coach, jamais
  l'échange.

## Conséquences

- Les candidats ne sont visibles que des administrateurs ; l'identité et les réponses d'un
  candidat ne se modifient pas (droits par colonne).
- Le nom « conseiller » de la maquette est gardé ; les annonces parlent de « commercial
  indépendant ». À harmoniser si l'utilisateur le souhaite.
- Aucun lien vers la page n'est ajouté au pied de page ni au menu (rien de visible non demandé) :
  elle est diffusée par les annonces et le plan du site.
- Production : créer au moins une réunion dans le back-office avant de diffuser la page ; sans
  réunion ouverte, le candidat ne peut que demander à être rappelé.
- TODO(legal) : le statut des conseillers (agent commercial, apporteur d'affaires) reste à faire
  valider par l'avocat ; la page parle seulement d'« un statut d'indépendant ».
