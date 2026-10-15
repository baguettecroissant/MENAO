# ADR 0099 — Vidéo de l'Espace Pro, deuxième version

- Statut : accepté (complète l'ADR 0058)
- Date : 15 octobre 2026

## Contexte
- **Demande** : l'utilisateur veut une vidéo de la page Espace Pro (ADR 0058) « parfaite », avec la nouvelle voix et les écrans actuels de l'application et du site.
- **Ancienne version** : elle montrait des écrans antérieurs aux derniers lots (badges, couvertures, états vides, tableau de bord, devis) et utilisait la voix « Audrey » du Mac.
- **Voix** : l'utilisateur a choisi la voix Microsoft `fr-FR-VivienneMultilingualNeural`, à -10 %, générée avec l'outil edge-tts comme pour ses autres projets. Il le fait en connaissance de cause : cette voie n'apporte pas de licence commerciale, contrairement à Azure AI Speech. Un script Azure reste prêt si besoin.

## Décision
- **Même fichier, même intégration** : `apps/web/public/videos/menao-demo.mp4` est remplacé, avec son image d'aperçu `menao-demo.webp` et ses sous-titres `menao-demo.vtt`. Le composant `DemoVideo` et les textes de la page ne changent pas (« MENAO en 80 secondes », 82 s).
- **Déroulé** : le même que la première version. Les textes ont été corrigés pour coller au produit :
  - « la commune » au lieu de « l'adresse » : l'adresse exacte n'est donnée qu'après le rendez-vous ;
  - plus de « code de confirmation » à la signature.
- **Motion design** : l'ouverture et les animations de la première version sont reprises, et d'autres sont ajoutées :
  - reprises : logo qui se dessine entouré de tuiles d'icônes, écran « Analyse de votre projet en cours » animé (ondes, icônes de métiers en orbite, étapes cochées), carte « Nouvelle demande », indicateur de dictée, cartes « Acompte reçu » et « Facture d'acompte », grand « 0 % de commission », bulles du suivi, « Avis vérifié » ;
  - ajoutées : la demande qui file du téléphone du client à l'ordinateur de l'artisan, les lignes du devis qui sortent de la dictée, l'acompte qui part du téléphone vers le compte de l'artisan (compteur), des confettis sur le nouveau badge.
- **Prononciation** : « Ménao » seul faisait hésiter la voix multilingue sur la langue (accent étranger). Le nom est donc toujours dit dans une phrase française (« Ménao. Remplissez votre agenda… », « Ménao, de la demande… »).
- **Écrans réels, données fictives** :
  - **ordinateur** : les vraies pages de l'Espace Pro web (tableau de bord, demande, tiroir de rendez-vous, devis vide, dictée, lignes, aperçu, grade et nouveau badge, page Espace Pro), composées dans un aperçu local non versionné, et animées par une caméra (zoom et déplacement) et un curseur ;
  - **téléphone** : les vrais écrans de l'application (description du projet, critères, artisans, devis, acompte, suivi, réception, avis), avec les requêtes Supabase interceptées et une session fictive, comme pour les visuels des stores (ADR 0097) ;
  - les deux appareils se répondent : l'artisan fixe le rendez-vous sur ordinateur, et le client reçoit la notification sur son téléphone.
- **Personnes et images** :
  - personnages fictifs, les mêmes que dans les autres films (Julien Ferrand / JF Plomberie, Camille) ;
  - visages recadrés dans les photos générées par IA du site ;
  - photos de chantier Pexels sans personne identifiable ;
  - aucun avis client inventé ;
  - mention « Démonstration : personnes et données fictives ».
- **Fichiers** :
  - **site** : version sans sous-titres incrustés, car la page fournit les siens (`.vtt`), encodée à 3 Mb/s (environ 30 Mo) pour garder des textes nets pendant les mouvements de caméra. La vidéo n'est chargée qu'à la lecture (`preload="none"`) ;
  - **réseaux sociaux** : une version avec sous-titres incrustés est fournie à part, hors du dépôt.
- **Sources** dans `medias/films/page-pro/` (hors Git, comme celles de la première version) : captures, page du film, voix, musique et outils de rendu.

## Conséquences
- **Dépôt** : la vidéo passe d'environ 18 Mo à environ 30 Mo ; l'historique Git garde l'ancienne version.
- **Mise à jour** : si l'interface change avant le lancement, les captures et le rendu se refont depuis `medias/films/page-pro/`.
- **Licence de la voix** : si l'utilisateur veut une licence commerciale en règle, il faudra regénérer la voix avec Azure AI Speech (même voix) et refaire le mixage, sans retoucher les images.
