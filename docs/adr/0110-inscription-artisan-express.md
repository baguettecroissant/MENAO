# ADR 0110 — Inscription artisan en un seul parcours

- Statut : accepté (site ; application mobile à suivre)
- Date : 17 octobre 2026
- Complète l'ADR 0006 (onboarding artisan) et l'ADR 0108 (Google et Apple).

## Contexte
- **Demande** (17 octobre 2026) : une inscription artisan « la plus fluide, facile et rapide possible », à partir du cahier des charges du CEO (« Inscription et vérification des artisans », V2) et d'une maquette cliquable validée.
- **Avant** :
  - un long formulaire de compte (prénom, nom, SIRET, téléphone, e-mail, mot de passe, trois cases) ;
  - un lien de confirmation à ouvrir dans sa boîte mail, qui coupait le parcours ;
  - puis huit étapes affichées d'un coup, avec plusieurs champs par page et un SIRET à taper à la main.
- **Pas de SMS** : l'utilisateur écarte la vérification du téléphone par SMS (coût). L'adresse e-mail est vérifiée par un code.

## Décision
- **Trois temps** :
  1. « Créer mon profil » : ce parcours, en 2 minutes ;
  2. « Faire vérifier mon entreprise » : charte et documents, l'onboarding actuel (sa refonte suit) ;
  3. après la validation : paiements (Stripe Connect) et formule.
- **Le parcours** (`/pro/inscription`, page sans menu) :
  - une question par écran, bouton principal toujours visible en bas, retour en arrière, barre de progression ;
  - accueil → métiers → entreprise → zone → compte → code reçu par e-mail.
- **Entreprise** :
  - recherche par nom ou SIRET dans l'API Recherche d'entreprises de l'État (annuaire-entreprises.data.gouv.fr) : gratuite, sans clé, CORS ouvert, appelée depuis le navigateur ;
  - elle pré-remplit raison sociale, siège (adresse et coordonnées) et dirigeants ;
  - les entreprises fermées sont affichées mais ne peuvent pas être choisies ;
  - à défaut, SIRET saisi à la main (clé de Luhn contrôlée) ;
  - deux questions : « Êtes-vous [dirigeant] ? » (nouvelle colonne `artisans.is_dirigeant`, déclarative) et « Votre entreprise facture-t-elle la TVA ? » ;
  - c'est un pré-remplissage : le SIRET est revérifié auprès de l'INSEE (`sirene-check`) dès la création du compte, et les données INSEE restent les seules écrites sur la fiche (ADR 0006).
- **Dirigeants** : seuls le prénom usuel, le nom et la qualité sont lus, jamais la date de naissance. Ils ne servent qu'à l'affichage et au pré-remplissage du nom ; seule la réponse « dirigeant » est enregistrée.
- **Zone** : rayon autour du siège (modifiable : autre adresse, Géoplateforme), avec les rayons habituels (10 à 100 km). La liste de communes reste possible depuis l'espace.
- **Brouillon** : métiers, entreprise et zone sont gardés dans le stockage local du navigateur (`menao.inscription-pro.v1`), jamais le mot de passe. L'artisan les retrouve s'il revient, ou après Google ou Apple. Le brouillon est effacé à l'arrivée sur « Votre profil est créé ».
- **Compte par e-mail** :
  - un seul envoi : `signUp` avec, dans les métadonnées, l'objet `signup` (métiers, TVA, dirigeant, zone) ;
  - `app.after_auth_user_insert` crée la fiche en brouillon et applique ces choix (`app.apply_artisan_signup`) ;
  - les métadonnées viennent du navigateur : chaque valeur est revérifiée en base (métier actif, rayon autorisé, coordonnées, code INSEE), et une valeur invalide est ignorée sans faire échouer l'inscription.
- **Code reçu par e-mail** :
  - l'e-mail de confirmation porte un code à 6 chiffres (`{{ .Token }}`) en plus du lien ;
  - le code se saisit dans la page (`verifyOtp`, type `email`), sans quitter le parcours ;
  - « Renvoyer le code » et « Modifier l'adresse » sont proposés.
- **Google et Apple pour les artisans** :
  - mêmes boutons à l'étape compte, retour sur `/pro/finaliser` ;
  - le parcours reprend avec le brouillon ; l'artisan complète nom, téléphone (obligatoire), CGU, politique de confidentialité et CGV artisans ;
  - `complete_artisan_oauth_signup()` transforme le compte « à finaliser » (ADR 0108) en artisan en attente, crée la fiche et applique les choix ;
  - c'est possible une seule fois, et seulement pour un compte particulier tout neuf, sans fiche artisan. Un compte client déjà en service ne devient pas un compte pro ;
  - le garde du site (`proxy.ts`) et `/auth/confirm` laissent passer `/pro/finaliser` au lieu de « Finaliser mon compte ».
- **« Votre profil est créé »** (`/pro/bienvenue`) :
  - aperçu de la fiche (raison sociale INSEE, métiers, zone, « Vérification à faire ») ;
  - liste des pièces à fournir et bouton « Faire vérifier mon entreprise » ;
  - un SIRET introuvable, fermé ou déjà utilisé y est signalé.

## Conséquences
- **Staging et production** : après la fusion, appliquer la migration et le nouveau modèle d'e-mail (`scripts/supabase-auth.mjs`), sinon l'e-mail ne contient pas le code. Le script aligne aussi la longueur du code sur `supabase/config.toml` (6 chiffres, valable 1 heure) : Supabase hébergé en envoie 8 par défaut.
- **Mot de passe** : 12 caractères minimum, comme pour les clients (la maquette indiquait 8).
- **CGU et CGV** : deux cases distinctes, comme avant. Les réunir en une seule est une question juridique, laissée de côté.
- **Hors périmètre de cette étape** :
  - refonte de « Faire vérifier mon entreprise » (liste des pièces, photo, signature unique, adresse IP de la signature) ;
  - relances par e-mail si l'inscription est abandonnée ;
  - nouvelles exigences du cahier des charges (attestation URSSAF, décennale couvrant les métiers, statut « Radié », relances J-15) ;
  - inscription dans l'application mobile.
- **`TODO(legal)`** : la politique de confidentialité doit mentionner l'Annuaire des entreprises comme source des données de l'entreprise, et Google et Apple pour les artisans.
