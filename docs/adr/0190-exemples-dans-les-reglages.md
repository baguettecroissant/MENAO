# ADR 0190 — Données d'exemple depuis « Mon profil »

- Statut : accepté
- Date : 25 octobre 2026
- Demande de l'utilisateur du 25 octobre 2026 : « met le mode test dans les paramètres pour voir les données fictives ». Jusqu'ici, les exemples (ADR 0184) ne s'ouvraient que depuis la carte du dossier en vérification ou du tableau de bord encore vide. Ils devenaient inaccessibles dès la première demande, le premier chantier ou après « Masquer les exemples ».

## Décision
- **Application** : interrupteur « Afficher des données d'exemple » dans « Mon profil », section « Mon compte ».
  - Activé : l'espace artisan s'ouvre rempli d'exemples, avec le bandeau orange habituel.
  - Désactivé (ici ou avec « Quitter » sur le bandeau) : retour aux vraies données.
  - L'interrupteur reste actif pendant les exemples, alors que les vrais réglages sont verrouillés.
- **Site** : ligne « Voir des données d'exemple » dans « Mon profil », section « Mon compte », vers `/pro/decouvrir`, déjà ouvert à tout compte artisan. La ligne n'apparaît pas dans la version d'exemple de la page.
- Accessible **à tout moment**, quel que soit l'état du dossier, l'activité ou le masquage des exemples dans les listes. « Masquer les exemples » ne retire que les exemples affichés dans les listes vides.
- Rien ne change en base : les exemples restent des données fictives, ni lues ni écrites en base. Dans l'application, le mode n'est pas conservé après la fermeture.

## Technique
- Application : `SettingsSwitch` dans `profile-hub.tsx`, sur `setExamplesActive`. À l'activation, `router.dismissTo("/pro")` ; à l'arrêt, « Mon profil » se recharge.
- Site : rubrique `examples` dans `profile-hub-view.tsx`, filtrée en mode exemple.
