# ADR 0128 — Fluidité de l'application (lot 1 de la refonte de l'espace artisan)

- Statut : accepté
- Date : 18 octobre 2026
- Premier des cinq lots de la refonte de l'espace artisan, décidée le 18 octobre 2026 : fluidité, « Mon profil », accueil « À faire », site aligné, finitions.

## Contexte
- **Chaque écran affichait un rond de chargement à chaque ouverture**, même déjà vu dans la session : les données ne vivaient que le temps de l'écran.
- **Les confirmations (« Zone enregistrée. ») apparaissaient dans la carte du formulaire**, parfois hors de l'écran.
- **Peu de retours physiques** : ni vibration, ni enfoncement au toucher (seulement une baisse d'opacité).
- **Demande de l'utilisateur** : une application « hyper fluide », sans aucune difficulté pour l'artisan.

## Décision
- **Données des écrans gardées en mémoire** (`src/lib/screen-cache.ts`, testé). `useFocusData` affiche aussitôt les dernières données connues, puis les met à jour en arrière-plan.
  - L'écran n'est redessiné que si les données ont changé.
  - La clé est la fonction de chargement, ou un texte pour les écrans à paramètre (`pro-chantier:<id>`, `opportunite:<id>`, `chantier:<id>`). Au plus 40 écrans à paramètre, les plus anciens oubliés.
  - Mémoire seulement, rien n'est écrit sur le téléphone. Tout est vidé dès que le compte change, avant l'affichage du nouveau compte (`setScreenCacheOwner` dans la session).
  - Les écrans de paiement (acompte, signature, solde) gardent un chargement frais : leur fonction change à chaque ouverture, donc sans mémoire.
- **Blocs gris de chargement** (`ScreenSkeleton`, `Skeleton`) à la place des ronds pour le premier chargement, avec la barre de retour.
- **« Tirer pour actualiser »** sur les écrans qui savent se recharger (`Screen onRefresh`).
- **Confirmations en bas de l'écran** (`toast.success`), avec une vibration et une annonce VoiceOver. Les erreurs de saisie restent près du champ.
- **Vibrations** (`src/lib/haptics.ts`) : choix coché, onglet, menu (+), succès, erreur. Sans effet sur la version web de développement.
- **Enfoncement au toucher** (`Tappable`, ressort Reanimated) sur les boutons, cartes et lignes de l'espace artisan.
- **« Réduire les animations » respecté** : sans ressort ni pulsation, l'opacité baisse simplement.

## Nouvelle dépendance
- `expo-haptics` (~57.0.3), module officiel d'Expo : léger, compatible Expo Go et aligné sur le SDK 57. Seul moyen standard de faire vibrer légèrement l'iPhone (Taptic Engine) depuis Expo.
- Reanimated 4 et son moteur (`react-native-worklets`) étaient déjà installés.

## Conséquences
- Un écran rouvert s'affiche instantanément ; le premier affichage montre la forme du contenu.
- Si les données ont changé ailleurs (sur le site), l'écran montre brièvement l'ancienne version puis la nouvelle.
- Sur la version web de développement, dans un onglet masqué, les animations ne démarrent pas (pas d'images d'animation) ; sans effet sur l'iPhone.
