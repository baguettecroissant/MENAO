# ADR 0376 — Inscription progressive : entrer en 5 minutes, être en ligne quand tout est validé

- Statut : accepté (maquette du lot 73 validée le 18/11/2026)
- Fonctionnalité : F-179 (suite des ADR 0111, 0353, 0370, 0373)

## Contexte

Un artisan qui doit attendre son assureur avant d'envoyer son dossier est souvent perdu pour de
bon. Jusqu'ici l'envoi exigeait les cinq documents, et « Mon dossier » empilait quatre blocs
(vidéo, bandeau, trois groupes, trois cartes) avec des compteurs qui ne se recoupaient pas.
L'objectif : qu'il entre chez MENAO seul, en quelques minutes, choisisse sa formule, et dépose
chaque pièce dès qu'il l'a.

## Décision

**Tout reste obligatoire pour être en ligne ; rien ne bloque la suite.**

1. **Envoi du dossier** : entreprise, métiers, zone, charte, Kbis, pièce d'identité et fiche
   (`canSubmitOnboarding`, `SEND_DOCUMENT_TYPES` ; miroir SQL `app.send_documents_complete` dans
   `app.onboarding_missing_steps`). Les trois attestations (décennale ou « non soumis », RC Pro,
   URSSAF) n'en font plus partie.
2. **Envoi automatique** : le dossier part à l'équipe dès qu'il peut partir (`sendWhenReady`,
   après la charte, un dépôt ou la fiche), sans bouton « Envoyer ». Après un refus ou une demande
   de compléments, l'artisan renvoie lui-même son dossier (« Renvoyer mon dossier »).
3. **Dépôt après l'envoi** : `process-upload` et `read-document` acceptent le statut
   `en_verification` ; un document déjà validé est gardé, comme pour un renouvellement.
   « Non soumis à la décennale » reste déclarable jusqu'à la validation.
4. **Mise en ligne inchangée** : `admin_decide_artisan` ne valide un dossier que si tous les
   documents sont validés (`app.documents_complete`), et `app.artisan_is_visible` exige un artisan
   validé, abonné, avec Stripe actif. Aucun nouveau statut : « inscrit » = `en_verification`.
5. **Un seul parcours** (`guideSteps`) : charte, pièce d'identité (et Kbis si le registre ne l'a
   pas vérifié), fiche, **formule et carte**, attestations (un seul écran pour les trois,
   `/pro/onboarding/attestations`), paiements. La formule est une étape numérotée avec une sortie
   « Plus tard ». Dans l'application, pas d'étape formule (règle 10, `withPlan: false`).
6. **« Mon inscription »** (`InscriptionPath`) : une liste dans l'ordre, un compteur qui compte ce
   qu'on voit, la prochaine étape en avant, et en bas le même bouton que dans les étapes. La ligne
   « Dossier transmis à l'équipe MENAO » remplace l'écran « Dossier envoyé ».
7. **Relances** : `app.remind_attestations`, à J+3, J+7, J+14 et J+30 de l'envoi, tant qu'une
   attestation manque. Même type de notification que la relance de l'inscription (catégorie
   « rappels », désactivable), distingué par `data.phase = 'attestations'`. L'e-mail « dossier
   reçu » ne dit plus que les documents sont figés.
8. **Back-office** : « Inscriptions en cours » liste les dossiers envoyés dont les attestations
   manquent (`etat = 'attestations'`), pour que l'équipe sache qu'elle n'a rien de plus à vérifier.
   L'écran de validation tient compte du cas « non soumis » (il exigeait à tort cinq documents).

## Conséquences

- Durée annoncée : environ 5 minutes pour envoyer (écran de bienvenue, FAQ, mémo du commercial).
- `TODO(legal)` : un abonnement peut être pris avant la vérification des assurances ; à confirmer
  avec l'avocat et à décrire dans les conditions de vente.
- **Pas dans cette PR** : l'essai gratuit démarre toujours au paiement. Le faire démarrer à la mise
  en ligne (essai « en attente » de 12 mois, ramené à 60 jours ce jour-là) fait l'objet d'une PR à
  part, pour pouvoir l'annuler seule. D'ici là, les textes ne promettent rien de plus qu'avant.
- L'application garde ses écrans actuels jusqu'à sa propre PR ; elle compile avec le nouveau
  parcours et envoie déjà le dossier selon la nouvelle règle.
- Une migration (`20261118170000_inscription_progressive.sql`) et deux fonctions à redéployer
  (`process-upload`, `read-document`).
