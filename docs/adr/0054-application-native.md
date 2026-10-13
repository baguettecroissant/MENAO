# ADR 0054 — Application native : fondations (phase 6, lot 6a)

- Statut : accepté
- Date : 13 octobre 2026

## Contexte
- Phase 6 du cahier des charges : une application iOS et Android (Expo, builds EAS) où les parcours des phases 2 à 5 fonctionnent pour les particuliers et les artisans.
- Le Mac de développement n'a pas Xcode (disque presque plein) : pas de simulateur iOS en local.
- Règles du projet qui pèsent sur l'app :
  - règle 7 : les rôles sont lus dans `app_metadata` ;
  - règle 10 : aucun bouton ni lien d'achat de l'abonnement artisan dans l'app ;
  - règle 4 : aucune logique métier dans les écrans.

## Décision
- **Une seule application** pour tout le monde. L'espace affiché dépend du rôle lu dans `app_metadata` (`appSpaceForRole`, dans `packages/core`) :

  | Rôle | Espace |
  | --- | --- |
  | Sans session | Connexion, inscription, mot de passe oublié |
  | Particulier | Onglets Mes chantiers, Messages, Notifications, Compte |
  | Artisan, artisan en attente | Onglets Tableau de bord, Demandes, Agenda, Messages, Compte |
  | Équipe MENAO | Écran qui renvoie au back-office du site, sur ordinateur |

- **Expo SDK 57** (React Native 0.86) et **Expo Router** avec routes typées, dans `apps/mobile`.
  - Les versions natives sont celles d'Expo Go, contrôlées par `expo install --check`.
  - Expo Router tire indirectement Reanimated, Worklets et Gesture Handler. Sans précaution, pnpm installerait leurs dernières versions, incompatibles avec Expo Go. Ils sont donc déclarés dans l'app, aux versions d'Expo.
  - Les types React suivent ceux du site (19.3) : ils sont exclus du contrôle d'Expo, sans effet à l'exécution.
- **Authentification** : même projet Supabase et mêmes règles que le site.
  - Mêmes schémas Zod (`packages/validation`) et mêmes messages d'erreur (`authErrorKind`, partagé avec le site).
  - Les particuliers s'inscrivent dans l'app, avec les mêmes métadonnées que sur le site : profil et versions des documents légaux acceptés.
  - Les artisans s'inscrivent sur le site, car le parcours demande le SIRET, les documents et Stripe.
  - Les liens des e-mails (confirmation, nouveau mot de passe) s'ouvrent sur le site.
- **Session** gardée dans le trousseau chiffré du téléphone (expo-secure-store : Keychain sur iPhone, Keystore sur Android).
  - Elle est découpée en morceaux de 1 800 caractères, car une entrée est limitée à environ 2 Ko.
  - La version web de développement utilise le localStorage.
  - L'app n'a que la clé publiable : les droits viennent des politiques RLS.
- **Règle 10** :
  - aucun lien vers l'abonnement ;
  - pour les artisans, aucun lien vers le site. Le compte affiche seulement « Votre abonnement est géré depuis votre espace web » ;
  - les particuliers ont un lien vers le site tant que leurs écrans ne sont pas dans l'app.
- **Design** : couleurs, rayons et cible tactile de 44 points viennent de `packages/ui-tokens` (`nativeRadius`, `nativeTouchTarget`), avec la police Google Sans du site. L'accessibilité passe par les props `role` et `aria-*`, lues par iOS, Android et react-native-web.
- **Vérification** :
  - la CI lance le lint, le typecheck et les tests unitaires de l'app (Turborepo) ;
  - la version web (react-native-web) permet de vérifier les écrans sans Xcode ;
  - les essais sur téléphone se font avec Expo Go, les builds natifs avec EAS, dans le cloud.
- **Expo Go** n'ouvre que les projets rattachés à un compte Expo.
  - Il faut un compte gratuit, connecté dans Expo Go sur le téléphone et sur le Mac (`expo login`).
  - L'identifiant du projet Expo est lu dans `apps/mobile/.env` (`EAS_PROJECT_ID`), hors du dépôt public, comme le nom du compte.
- L'identifiant des stores `fr.menao.app` est provisoire, à confirmer avant la publication.

## Conséquences
- Les lots suivants remplacent les écrans « Bientôt dans l'application » :
  - 6b : parcours particulier ;
  - 6c : parcours artisan ;
  - 6d : suivi de chantier ;
  - 6e : notifications push ;
  - 6f : publication.
- À régler avant la publication (6f) :
  - **Suppression du compte depuis l'app** : Apple l'exige dès qu'une app permet de créer un compte (règle 5.1.1(v)). Elle passera par la fonction `request_account_deletion`, déjà utilisée par le site.
  - **Comptes développeur** Apple (99 $ par an) et Google (25 $ une fois) : décision du porteur de projet.
  - **Mention « inscription des artisans sur le site »** à l'écran d'inscription : à confirmer au regard des règles des stores sur les achats hors de l'app **[À VALIDER]**.
- À chaque montée de version d'Expo, lancer `npx expo install --check` dans `apps/mobile` et mettre à jour les versions fixées.
