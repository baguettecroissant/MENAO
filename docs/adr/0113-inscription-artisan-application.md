# ADR 0113 — Inscription artisan dans l'application

- Statut : accepté
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
- **« Faire vérifier mon entreprise »** (onglet Accueil de l'espace pro, tant que le dossier n'est pas validé), comme sur le site (ADR 0111) :
  - même liste et mêmes règles : `onboardingProgress`, `documentState`, `dossierItemsLeft`, `canSubmitOnboarding` (`packages/core`) ;
  - même envoi : `submit_artisan_onboarding` ;
  - charte : l'écran déjà présent (`/pro-charte`, ADR 0109) ;
  - chaque document (`/pro-document`) : photo prise ou choisie, puis les mêmes champs et contrôles que le site (`documentMetadataSchema`), envoi par `process-upload` (photo réduite et réencodée en JPEG, sans position GPS) ;
  - photo et présentation (`/pro-profil-public`) ;
  - entreprise, métiers et zone, faits dans le parcours, ne se modifient que sur le site. L'application l'indique, sans lien ;
  - les liens des notifications vers le dossier (`/pro/onboarding`) ouvrent cet écran.
- **Règle 10**, inchangée :
  - aucun bouton, lien ni écran d'abonnement dans l'application ;
  - l'invitation à choisir sa formule passera par e-mail, après la validation du dossier ;
  - le mot « abonnement » n'apparaît pas dans le parcours.

## Conséquences
- **Pas dans l'application** : les PDF (seulement des photos), la modification de l'entreprise, des métiers et de la zone, le compte de paiement (Stripe Connect) et la formule. MENAO écrit à l'artisan une fois son dossier validé.
- **Revue d'Apple** : fournir un compte artisan de démonstration déjà validé, sinon les vérificateurs restent bloqués à « dossier en vérification ».
- **ADR 0054** : la ligne « les artisans s'inscrivent sur le site » ne vaut plus ; le point [À VALIDER] sur la mention « inscription des artisans sur le site » disparaît, puisque l'inscription se fait dans l'application.
