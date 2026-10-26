# ADR 0192 — Chargements fluides et démarrage animé de l'application

- Statut : accepté
- Date : 26 octobre 2026
- Demande de l'utilisateur du 26 octobre 2026. En comparant avec TrustUp, l'application marque des temps d'attente entre les écrans, alors que d'autres montrent une animation juste le temps du chargement, même pour 1 ou 2 secondes. L'utilisateur demande aussi un écran de démarrage avec le logo entier. Les trois propositions ont été validées (« oui lance les trois ») après un aperçu animé.

## Décision
1. **Écrans squelettes sur mesure, avec reflet**.
   - Au premier chargement d'un écran principal (Accueil, Demandes, Chantiers, Devis, Factures, Dépenses, Messages), l'en-tête réel s'affiche tout de suite. Le contenu montre sa forme exacte : cartes, lignes, chiffres clés.
   - Un reflet traverse les blocs gris ; les données arrivent en fondu (250 ms).
   - L'animation dure exactement le temps du chargement. Un écran déjà chargé s'affiche sans squelette ni fondu.
   - Avec « Réduire les animations » : blocs fixes, sans fondu.
   - Les autres écrans gardent le squelette générique, qui reçoit aussi le reflet.
2. **Moins d'attente**.
   - **Préchargement** : à l'ouverture de l'espace artisan, les autres onglets se chargent en arrière-plan. Un onglet ouvert dans les 20 secondes s'affiche sans recharger une seconde fois.
   - **Mémoire entre deux ouvertures** :
     - les onglets (clés `tab:…`) sont gardés dans un fichier du dossier privé de l'application et relus avant le premier écran (400 ms au plus) ;
     - ils s'affichent aussitôt puis se mettent à jour en arrière-plan ;
     - le fichier est **effacé à la déconnexion et au changement de compte** ;
     - rien n'est écrit pendant le mode exemples ;
     - une erreur de chargement n'est pas gardée.
3. **Démarrage animé avec le logo entier**.
   - L'écran de démarrage du téléphone montre « menao » sur le bleu MENAO.
   - L'application prend le relais sans saut, une fois l'image affichée : le toit puis le sourire du logo se tracent au-dessus du mot (850 ms).
   - Si le chargement dure, le logo respire doucement. Dès que l'application est prête, fondu vers le premier écran.
   - Le démarrage ne dure jamais plus que le chargement, sauf le tracé, qui va jusqu'au bout. Avec « Réduire les animations », le logo est entier d'emblée.
- Animations discrètes, sans effet de ressort, comme demandé lors de la refonte de l'espace artisan.

## Technique
- `ui/motion.tsx` :
  - `Skeleton` : reflet animé (Reanimated) au lieu du clignotement ;
  - `useReveal(ready)` : fondu seulement si l'écran a commencé vide.
- `components/skeletons.tsx` : `RequestCardsSkeleton`, `ChantierCardsSkeleton`, `ListRowsSkeleton`, `FiltersSkeleton`, `DashboardSkeleton`.
- `lib/screen-cache.ts` :
  - fichier injecté (`setScreenCacheStore`) ;
  - `serializeScreenCache` et `parseScreenCache` (version, compte, onglets), `restoreScreenCache` ;
  - `writePreloadedScreen` et `takeFreshPreload` ;
  - effacement du fichier dans `setScreenCacheOwner` ; tests ajoutés.
- `lib/screen-store.ts` : fichier `menao-ecrans.json` (`expo-file-system`, ou localStorage sur la version web) et `useScreenCacheRestored`, attendu par la mise en page racine.
- `lib/preload.ts` : appelé par `app/pro/_layout.tsx` 800 ms après l'ouverture, puis à l'entrée ou à la sortie des exemples.
- `components/animated-splash.tsx` : superposition au-dessus de l'application dans `app/_layout.tsx`.
  - Image `assets/splash-logo.png` (220 × 148 points, « menao » en Google Sans 600, rendue en ×3), la même que dans `app.config.ts`.
  - L'ancienne `splash-icon.png` est retirée.
- Pas de nouvelle dépendance.

## Conséquences
- La nouvelle image de l'écran de démarrage du téléphone n'apparaît qu'avec un **nouveau build** (TestFlight). D'ici là, Expo Go et le build 9 montrent encore l'ancienne icône un court instant avant l'animation.
- Les photos des demandes et des chantiers utilisent des liens signés valables 1 heure. À la réouverture le lendemain, elles restent vides le temps de la mise à jour en arrière-plan, une seconde ou deux.
