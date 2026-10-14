# ADR 0097 — Visuels des stores générés depuis les vrais écrans

- Statut : accepté
- Date : 14 octobre 2026

## Contexte
- **Revue des visuels manquants** (point 4), demandée par l'utilisateur le 14 octobre 2026. Pour publier l'application, il faut :
  - des captures d'écran App Store (iPhone 6,9 pouces) et Google Play ;
  - l'image de présentation Google Play (1024 × 500) et son icône 512 × 512 ;
  - une icône de notification Android monochrome. Sans elle, Android affiche un carré blanc.
- **Contraintes** :
  - pas de Xcode ni de simulateur sur le Mac ;
  - je ne crée pas de compte de test ;
  - aucune donnée réelle dans le dépôt public ;
  - aucun chiffre, avis ou promesse inventés (F-01) ;
  - pas d'achat d'abonnement dans l'application (règle 10).
- **Évolution** : l'interface évoluera d'ici la publication. Les visuels doivent pouvoir être refaits sans effort.

## Décision
- **Générateur** `apps/mobile/store/outils/generer.mjs`, qui reprend la chaîne Chromium headless de la vidéo de démonstration (ADR 0058) :
  - il ouvre la version web de l'application (serveur Expo) et capture six écrans réels : accueil, description du projet, choix des artisans, suivi du chantier, tableau de bord de l'artisan, devis dicté ;
  - toutes les requêtes vers Supabase sont interceptées et reçoivent des données fictives (`donnees.mjs`) : rien ne quitte la machine, aucun compte n'est nécessaire ;
  - une session fictive, avec un jeton non signé qui n'est jamais envoyé ailleurs, donne le rôle voulu ;
  - les captures sont mises en page aux formats des stores : fond bleu MENAO, accroche, téléphone avec barre d'état et barre d'accueil ;
  - il produit aussi l'image de présentation, l'icône 512 × 512 et l'icône de notification.
- **Données de démonstration** :
  - noms fictifs déjà utilisés dans les tests (« Noé Exemple », « Inès Démo ») ;
  - aucun avis client affiché ;
  - photo de profil de démonstration faite d'initiales, sans visage ;
  - dates calculées à partir du jour de génération.
- **Accroches** reprises de textes déjà publiés sur le site (accueil, Espace Pro), sans chiffre ni promesse nouvelle.
- **Icône de notification** : logo blanc sur fond transparent (96 × 96), déclarée dans le module `expo-notifications` de `app.config.ts`, avec la couleur bleue déjà configurée.
- **Fichiers versionnés** dans `apps/mobile/store/` (environ 3,5 Mo, en JPEG), avec un README qui les liste et explique comment les refaire.

## Conséquences
- **Mise en service** : aucune migration ni Edge Function. L'icône de notification sera prise en compte au prochain build EAS ; Expo Go ne l'utilise pas.
- **Mise à jour** : avant la publication, relancer le générateur pour que les captures suivent l'interface. Un écran qui lit une nouvelle table ou fonction est signalé par `--decouvrir`.
- **Reste à faire pour la publication** (comptes des stores) : textes de la fiche, adresses du support et de la confidentialité, questionnaires sur les données, classification par âge.
