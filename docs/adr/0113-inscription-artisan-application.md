# ADR 0113 — Inscription artisan dans l'application

- Statut : accepté (« Créer mon profil » ; « Faire vérifier mon entreprise » à suivre)
- Date : 17 octobre 2026
- Reprend dans l'application les ADR 0110 (inscription en un seul parcours) et 0111 ; modifie l'ADR 0054.

## Contexte
- **Avant** : l'application renvoyait les artisans vers le site, « sur ordinateur » (ADR 0054), car l'inscription demandait le SIRET, les documents et Stripe.
- **Depuis les ADR 0110 et 0111**, l'inscription est un parcours court, pensé pour le téléphone (recherche de l'entreprise, documents en photo).
- **Décision de l'équipe** (17 octobre 2026) : l'abonnement artisan reste payé sur le site, pas par l'achat intégré d'Apple ou de Google. C'est une commission de 15 à 30 % évitée, et MENAO garde la main sur la facturation.

## Décision
- **Inscription dans l'application** (`/pro-inscription`), comme sur le site :
  - accueil → métiers → entreprise (Annuaire des entreprises, ou SIRET saisi) → zone → compte → code reçu par e-mail ;
  - mêmes schémas (`@menao/validation`), même mise en forme des choix pour la base (`artisanSignupMetadata`, partagée avec le site) ;
  - mêmes enregistrements en base (`signUp` avec l'objet `signup`, `complete_artisan_oauth_signup`) ;
  - même vérification du SIRET auprès de l'INSEE (`sirene-check`).
- **Brouillon** : gardé sur le téléphone (trousseau chiffré, `kv`), jamais le mot de passe ; effacé une fois le compte créé.
- **Google et Apple** :
  - au retour du fournisseur, le parcours reprend sur le même écran et le compte se finalise en compte artisan ;
  - le garde de l'application (`SignupGate`) envoie un compte à finaliser vers l'inscription artisan si elle a été commencée sur ce téléphone, sinon vers « Finaliser mon compte » (client) ;
  - un artisan existant va à son espace ; un compte client déjà en service ne devient pas un compte pro.
- **« Votre profil est créé »** (`/pro-bienvenue`) : aperçu de la fiche et liste de ce qu'il reste à fournir.
- **Points d'entrée** : la carte « Vous êtes artisan ? » de l'écran Compte et l'écran d'inscription mènent au parcours.
- **Règle 10**, inchangée :
  - aucun bouton, lien ni écran d'abonnement dans l'application ;
  - l'invitation à choisir sa formule passera par e-mail, après la validation du dossier ;
  - le mot « abonnement » n'apparaît pas dans le parcours.

## Conséquences
- **Suite** : « Faire vérifier mon entreprise » dans l'application (charte, documents en photo, photo et présentation, envoi du dossier). En attendant, « Votre profil est créé » mène à l'espace pro.
- **Revue d'Apple** : fournir un compte artisan de démonstration déjà validé, sinon les vérificateurs restent bloqués à « dossier en vérification ».
- **ADR 0054** : la ligne « les artisans s'inscrivent sur le site » ne vaut plus ; le point [À VALIDER] sur la mention « inscription des artisans sur le site » disparaît, puisque l'inscription se fait dans l'application.
