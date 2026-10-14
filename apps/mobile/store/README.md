# Visuels des stores (App Store et Google Play)

Visuels à déposer lors de la publication de l'application (ADR 0097). Ils sont générés à partir des vrais écrans de l'application, avec des données fictives : aucune donnée réelle, aucun avis client.

## Contenu

| Fichier | Store | Format | Usage |
|---|---|---|---|
| `ios/1-accueil.jpg` … `ios/6-devis.jpg` | App Store | 1320 × 2868 (iPhone 6,9 pouces) | Captures d'écran (Apple les réduit pour les autres tailles d'iPhone) |
| `android/1-accueil.jpg` … `android/6-devis.jpg` | Google Play | 1080 × 1920 (téléphone, 9:16) | Captures d'écran |
| `android/presentation-1024x500.jpg` | Google Play | 1024 × 500 | Image de présentation |
| `android/icone-512.png` | Google Play | 512 × 512 | Icône haute résolution de la fiche |
| `../assets/notification-icon.png` | Android | 96 × 96, blanc sur transparent | Icône de la barre d'état (déclarée dans `app.config.ts`) |

L'icône de l'application (`../assets/icon.png`, 1024 × 1024) sert déjà pour l'App Store.

Les six captures, dans l'ordre :
1. accueil ;
2. description du projet ;
3. choix des artisans ;
4. suivi du chantier ;
5. tableau de bord de l'artisan ;
6. devis dicté.

Les accroches reprennent des textes déjà publiés sur le site, sans chiffre ni promesse nouvelle.

## Régénérer

À refaire quand les écrans changent, avant la publication :

1. Lancer le serveur Expo : `pnpm --filter mobile start` (port 8081).
2. Depuis la racine du dépôt : `node apps/mobile/store/outils/generer.mjs`.
   - `--decouvrir` affiche les requêtes qu'un écran fait sans recevoir de données fictives (à ajouter dans `outils/donnees.mjs`).
   - `CHROMIUM_PATH` indique un Chromium précis si celui de Playwright n'est pas trouvé.

Le générateur ouvre la version web de l'application dans Chromium et intercepte toutes les requêtes vers Supabase : aucune ne quitte la machine. Une session fictive (jeton non signé) donne le rôle voulu (particulier ou artisan). Le texte et le téléphone sont ensuite mis en page aux formats des stores.

## Reste à faire pour la publication

Ces éléments ne sont pas des visuels et dépendent des comptes des stores :
- textes de la fiche : nom, sous-titre, description, mots-clés ;
- adresse du support et de la politique de confidentialité ;
- questionnaires de confidentialité (App Store) et de sécurité des données (Google Play) ;
- classification par âge.
