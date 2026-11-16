# ADR 0355 — Une seule image, logo ou photo, au choix de l'artisan et facultative (F-165, lot 64)

- Statut : accepté (16/11/2026)
- Fonctionnalité : F-165 ; maquette du lot 64. Complète l'ADR 0038 (logo des documents) et
  modifie la règle d'envoi du dossier (F-14).

## Constat

L'écran « Votre fiche » demandait une « Photo de profil » obligatoire (« votre portrait ou votre
logo ») puis, juste en dessous, un « Logo sur vos documents » : deux dépôts pour la même image
quand l'artisan met son logo. Beaucoup d'artisans ne veulent montrer que le logo de leur
entreprise, et certains rien ; or sans photo le dossier ne pouvait pas partir.

## Décision (option 1 retenue par l'utilisateur)

- **Une carte « Votre image »**, facultative, avec deux choix :
  - **« Mon logo »** : un seul dépôt (`process-upload`, usage `image_logo`) range le fichier
    comme logo des documents et comme image de la fiche, et pose `artisans.image_logo`. La fiche
    publique et l'aperçu l'affichent en entier, sans recadrage.
  - **« Une photo »** : comme avant (cadrée, en rond) ; elle remet `image_logo` à faux. Le logo des
    documents reste proposé à part, sous la carte.
- **L'image n'empêche plus l'envoi du dossier** : l'étape « profil » ne demande plus que la
  présentation (`onboardingProgress` dans core, `app.onboarding_missing_steps` en base). Sans
  image, la fiche montre l'image du métier et les initiales (ADR 0352).
- `app.artisan_profile_json` publie `image_logo`.

## Conséquences

- Les petites pastilles rondes (messagerie, suivi de chantier) recadrent encore un logo : seul
  l'en-tête de la fiche publique et l'aperçu l'affichent en entier.
- L'image ne compte pas dans le Score MENAO au-delà de ce qui existait (critère « profil ») ; la
  phrase de la maquette à ce sujet a été retirée.
- Des fiches sans image peuvent être publiées : choix assumé pour ne pas perdre d'inscriptions.
- À déployer après fusion : la migration et la fonction `process-upload`.
