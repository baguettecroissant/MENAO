# ADR 0124 — Paiements Stripe, visibilité et photos de réalisations dans l'application

- Statut : accepté
- Date : 18 octobre 2026
- Complète les ADR 0011 (Stripe Connect), 0060 (retour dans l'application) et 0123 (documents dans l'application).

## Contexte
- **Comparaison du site et de l'application** : après la validation, l'artisan devait passer par le site pour activer ses paiements, savoir pourquoi il ne recevait pas de demandes, et ajouter ses photos de réalisations.
- **Règles d'Apple** : Stripe Connect est permis dans l'application, puisque ce sont des paiements pour des travaux réels (3.1.3(e)). L'abonnement de l'artisan, lui, ne s'achète pas et ne se mentionne pas dans l'application (CLAUDE.md règle 10).
- **Décision de l'utilisateur** (18 octobre 2026) : faire ces trois points dans l'application.

## Décision
- **Écran « Paiements »** (`/pro-paiements`), comme l'étape du site :
  - l'état du compte (`connectAccountStatus`) : à démarrer, à compléter avec les rubriques demandées par Stripe et la date limite, en vérification, actif (avec le lien vers le tableau de bord Stripe) ou refusé ;
  - Stripe s'ouvre dans la fenêtre sécurisée du téléphone (`openHostedPage`) ;
  - `connect-onboarding`, appelée avec `app: true`, donne à Stripe la page de retour du site (`/retour-application`, écran `paiements`, états `connect` et `connect_expire`). Cette page rouvre l'application, qui relit alors l'état du compte (action `refresh`, sans attendre le webhook) ;
  - aucun argent ne transite par MENAO (règle 12).
- **Visibilité sur l'accueil d'un artisan validé** (`artisanVisibility`) :
  - « Votre profil est visible des particuliers », ou « pas encore visible » avec ce qui manque ;
  - paiements à activer : texte et bouton vers l'écran « Paiements » ;
  - abonnement inactif : « Votre inscription n'est pas encore finalisée : l'équipe MENAO vous a envoyé la marche à suivre par e-mail. » Pas de lien, pas de mot « abonnement », pas de prix.
- **Photos de réalisations** sur l'écran « Ma photo et ma présentation » :
  - grille, ajout depuis l'appareil photo ou la photothèque (plusieurs à la fois), retrait ;
  - 12 au plus (`PORTFOLIO_MAX_PHOTOS`, partagé avec le site) ;
  - envoi par `process-upload` (objet `portfolio`), comme sur le site.
- **Liens** : `/pro/onboarding/paiements` ouvre l'écran « Paiements ». Raccourci « Paiements » sur le tableau de bord.

## Conséquences
- **Tests** :
  - `packages/core` : retour dans l'application pour l'écran des paiements ;
  - application : correspondance des liens.
- **Vérifié à l'écran** : états du compte de paiement et carte des réalisations, sur la version web de l'application, avec des données fictives.
- **Déploiement** : redéployer `connect-onboarding`. Le site affiche les nouveaux messages de la page de retour.
- **Restent sur le site** :
  - la modification des métiers, de la zone et de l'entreprise ;
  - les certifications et le RGE ;
  - le logo ;
  - l'abonnement, volontairement.
