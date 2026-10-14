# ADR 0074 — Application, espace artisan : synchronisation de l'agenda avec le calendrier du téléphone (lot 6c, partie 6c)

- Statut : accepté
- Date : 14 octobre 2026

## Contexte
- Sur le site, « Mes disponibilités » (F-44) crée un lien d'abonnement .ics secret. Google Agenda, Apple Calendrier ou Outlook relisent ensuite l'agenda MENAO d'eux-mêmes.
- Le lien est servi par la route `/calendrier/<jeton>.ics` du site. C'est un flux de données lu par les applications d'agenda, pas une page à visiter.
- L'écran « Mes disponibilités » de l'application (ADR 0073) n'avait pas encore cette carte.

## Décision
- **Carte « Synchroniser avec votre agenda »** dans « Mes disponibilités », comme sur le site :
  - créer le lien (`renew_artisan_calendar_feed`), le renouveler (l'ancien cesse de fonctionner) ou désactiver l'abonnement (`disable_artisan_calendar_feed`) ;
  - lien affiché en clair (sélectionnable). « Partager ou copier le lien » ouvre la feuille de partage du téléphone (`Share` de React Native), qui permet aussi de le copier, sans nouvelle dépendance ;
  - « Ajouter à » : Apple Calendrier sur iPhone (lien `webcal://`, qui ouvre directement l'abonnement), Google Agenda et Outlook (mêmes adresses que le site) ;
  - date de dernière lecture par une application d'agenda, délai de mise à jour et mise en garde sur le caractère personnel du lien.
- Le lien est bâti avec l'adresse du site de l'application (`EXPO_PUBLIC_SITE_URL`), comme les autres liens servis par le site. Aucun bouton n'envoie l'artisan vers une page du site (règle 10).
- Aucune nouvelle dépendance, aucun changement côté serveur.

## Conséquences
- **Partie suivante** : créneaux proposés et avertissements (hors horaires, absence, conflit) dans les formulaires de rendez-vous et de démarrage (`suggestSlots`, `slotWarnings`).
