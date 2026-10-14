# ADR 0079 — Application : notifications push (lot 6e, partie application)

- Statut : accepté
- Date : 14 octobre 2026

## Contexte
- La partie serveur (ADR 0078) envoie en push chaque notification destinée à un compte qui a enregistré un appareil, avec le lien de la page concernée.
- L'application devait demander l'autorisation, enregistrer le jeton Expo de l'appareil, ouvrir le bon écran au toucher et désinscrire l'appareil à la déconnexion.

## Décision
- **Dépendance `expo-notifications`** (~57.0.22, version du SDK par `expo install`). C'est le module prévu par la spécification (§4, Expo Notifications), maintenu par Expo et inclus dans Expo Go.
- **Autorisation demandée à l'appui**, jamais au lancement : une carte « Ne manquez rien de vos chantiers » sur l'accueil du client et le tableau de bord de l'artisan.
  - Elle ne s'affiche que pour un compte connecté, tant que le téléphone n'a ni autorisé ni refusé.
  - « Plus tard » la masque sur ce téléphone.
  - Un refus se change ensuite dans les réglages du téléphone.
- **Enregistrement de l'appareil** (`registerDevice`) à chaque ouverture par un compte connecté, si l'autorisation est donnée :
  - jeton Expo (`getExpoPushTokenAsync`, identifiant du projet EAS), envoyé à `register_push_token` ;
  - canal Android « MENAO » à importance haute ;
  - sans effet sur un simulateur, dans Expo Go sur Android (le push n'y est plus pris en charge) ou si le service ne répond pas.
- **Toucher une notification** ouvre l'écran concerné, application fermée comprise. Le lien de l'e-mail est converti par `appRouteForSitePath`, désormais étendu aux pages de l'espace artisan (demandes, chantiers, devis, factures, avis, agenda, disponibilités, messages). Sinon, le centre de notifications s'ouvre.
- **Au premier plan**, la notification s'affiche aussi et les compteurs de non-lus sont rafraîchis.
- **Déconnexion** (`signOut`) : l'appareil est désinscrit (`unregister_push_token`) avant la fermeture de la session.
- **Centre de notifications** : une notification sans écran dans l'application n'ouvre plus le site pour un artisan (règle 10).
- **Configuration native** :
  - couleur des notifications sur Android ;
  - environnement APNs de production pour les versions distribuées (profils EAS preview et production), de test sinon.

## Limites
- **Icône des notifications Android** : l'icône de l'application, faute d'une icône monochrome dédiée (à fournir avec les éléments de publication, lot 6f).
- **Essais réels** : il faut une version de développement (EAS) pour Android et les identifiants Apple (APNs) pour une version iPhone installée, ce qui dépend des comptes de développeur (lot 6f).
- **Réglages du push** dans l'application (par type de notification) : non proposés. L'autorisation du téléphone suffit pour l'instant.

## Conséquences
- **Lot 6f** : publication (comptes de développeur, identifiants APNs et FCM, icône des notifications, suppression du compte dans l'application).
