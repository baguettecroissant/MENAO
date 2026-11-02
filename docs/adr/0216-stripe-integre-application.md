# ADR 0216 — Formulaire Stripe intégré dans l'application

- Statut : accepté
- Date : 2 novembre 2026
- Suite de l'ADR 0215 (site) ; complète l'ADR 0124 (paiements dans l'application).

## Contexte
- **Demande de l'utilisateur** (2 novembre 2026, « go pour la PR 2 ») : le parcours de l'ADR 0215 dans l'application.
- Avant cette décision, l'application ouvrait le site de Stripe dans la fenêtre sécurisée du téléphone, seulement après la validation du dossier.

## Vérifications
- Le composant natif `ConnectAccountOnboarding` de `@stripe/stripe-react-native` est disponible (plus en préversion) depuis la 0.69.
- La version 0.81.0 est celle qu'Expo 58 attend (`bundledNativeModules`), avec `react-native-webview` 14.0.1 (dépendance du composant) ; `expo install --check` les accepte.
- Plein écran natif sur iPhone, fenêtre modale sur Android. La connexion à Stripe passe par la fenêtre sécurisée du système. Sur Android, le SDK déclare lui-même le lien de retour `stripe-connect://` : aucune configuration en plus.
- **iOS** : depuis la 0.78, le SDK passe par Swift Package Manager et impose de compiler l'application en frameworks dynamiques (`useFrameworks: "dynamic"`). Ce réglage change la compilation de tous les modules natifs. Le plugin Expo du SDK propose `disableSPM`, qui garde CocoaPods sans ce changement.

## Décision
- **Même parcours que le site** :
  - écran Paiements ouvert dès l'envoi du dossier (`connectOnboardingOpen`) ;
  - ligne « Recevoir les paiements de vos clients » dans le dossier pendant la vérification ;
  - premier passage : formulaire des compléments (`ConnectPrepare`), validé par `connectDetailsSchema`. La date de naissance se tape au clavier (JJ/MM/AAAA, acceptée par `birthDateOf`), ce qui est plus rapide qu'un calendrier ;
  - jetons créés par l'application avec la clé publique, puis compte créé (`create`), puis formulaire Stripe en plein écran (`session`).
- **Formulaire Stripe** (`StripeOnboarding`, fichier `.native.tsx`) :
  - couleurs et rayons de MENAO (`stripeConnectAppearance`), textes en français, police du système. La police de l'application est intégrée à l'app, et Stripe ne charge que des fichiers en ligne ;
  - à la sortie, l'état du compte est relu ;
  - **secours** : si la session ou le formulaire échoue, le site de Stripe dans la fenêtre sécurisée (parcours de l'ADR 0124, inchangé).
- **Version web de l'application** : le composant n'existe pas, donc le site de Stripe s'ouvre directement (`stripe-onboarding.tsx`).
- **Plugin Expo `@stripe/stripe-react-native` avec `disableSPM: true`** : SDK iOS par CocoaPods, sans frameworks dynamiques. Option retirée en 0.84 : à revoir à la prochaine montée de version du SDK (frameworks dynamiques, à essayer sur un build).
- **Dépendances ajoutées** : `@stripe/stripe-react-native` 0.81.0 et `react-native-webview` 14.0.1, versions attendues par Expo 58 et publiées depuis plus de deux semaines.

## Conséquences
- L'application profite du parcours au prochain build (EAS / TestFlight). Expo Go contient déjà ces modules natifs : un essai sur iPhone est possible sans build.
- Le build iOS est à vérifier : premier build avec le SDK Stripe natif.
- Rien ne change côté serveur : actions `prefill`, `create`, `session` et `link` de l'ADR 0215.
- Comme sur le site : aucune donnée des compléments n'est envoyée à MENAO. Le TODO(legal) de l'ADR 0215 (conditions des artisans) vaut aussi pour l'application.
