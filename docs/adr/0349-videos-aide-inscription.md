# ADR 0349 — Vidéos verticales de l'aide à l'inscription

- Statut : accepté
- Date : 16 novembre 2026
- F-161, troisième couche du lot 60 (après les ADR 0347 et 0348). Style validé sur une vidéo pilote, voix choisie par l'utilisateur.

## Contexte
- Onze vidéos verticales de 12 à 39 secondes : une par étape de l'inscription et par pièce à obtenir.
- Elles sont faites avec les vrais écrans de MENAO (données fictives : Plomberie des Oliviers), une voix off et des sous-titres incrustés.
- Les sites de l'URSSAF et des assureurs ne sont jamais filmés : leur chemin est montré en cartes texte.
- Les sources et la chaîne de fabrication sont dans `medias/films/aide`, hors du dépôt public.
- La vidéo 12 (essai et formule) n'est pas faite : son texte reste à valider, et elle ne pourra pas aller dans l'application (règle 10).

## Décision
- **Hébergement** :
  - compartiment public `aide-videos` du stockage Supabase (migration), limité aux MP4 et aux aperçus JPEG ;
  - aucune politique d'écriture : les fichiers sont déposés par `scripts/aide-videos.mjs` avec la clé serveur ;
  - rien sur Vercel (règle 13) ;
  - versions légères en 720 × 1280, de 1,4 à 4 Mo.
- **Contenu partagé** (`@menao/core`) :
  - `HELP_VIDEOS` : titre et durée ;
  - `DOCUMENT_HELP_VIDEO` : vidéo de chaque pièce, aucune pour le Kbis ;
  - `helpVideoUrls` : adresses publiques.
- **Site** : `HelpVideo`, une carte avec l'aperçu qui ouvre la vidéo dans une fenêtre (`<dialog>`, lecteur du navigateur). La politique de sécurité autorise déjà les médias du stockage Supabase.
- **Application** : `HelpVideoCard` ouvre la vidéo dans le navigateur du téléphone (expo-web-browser, déjà présent) : pas de nouvelle bibliothèque.
- **Emplacements** :
  - « Avant de commencer » ;
  - les étapes entreprise, métiers, zone, charte et présentation ;
  - l'écran d'une pièce (« Bien photographier un document ») ;
  - chaque « Où trouver ce document ? » ;
  - « Gardez sous la main » avant Stripe.
  - Sur le site, les vidéos des étapes ne s'affichent que pendant l'inscription, pas dans l'espace d'un artisan validé.

## Conséquences
- Après la fusion :
  - appliquer la migration sur staging (`db push`) ;
  - déposer les vidéos (`node scripts/aide-videos.mjs --project <ref> --dossier medias/films/aide/sortie`).
  - Même chose en production (MISE_EN_PRODUCTION.md).
- Tant qu'une vidéo n'est pas déposée, sa carte s'affiche avec un aperçu vide : déposer les fichiers avant d'ouvrir.
- Voix : la voix Denise de Microsoft, obtenue sans licence commerciale (outil edge-tts). La version payante (Azure AI Speech) donne la même voix sous licence : à régulariser avant l'ouverture. TODO(legal).
- Quand un écran filmé change, sa vidéo est à refaire avant la mise en ligne : liste des écrans dans `medias/films/aide/outils/captures.mjs`.
