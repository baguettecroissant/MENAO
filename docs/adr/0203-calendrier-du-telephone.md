# ADR 0203 — Synchronisation de l'agenda avec le calendrier du téléphone

- Statut : accepté
- Date : 29 octobre 2026
- Complète les ADR 0036 (agenda et disponibilités) et 0074 (calendrier dans l'application).

## Contexte
- **Demande de l'utilisateur** (29 octobre 2026) : synchroniser l'agenda MENAO avec Apple Calendrier et Google Agenda.
- **Existant** : l'abonnement .ics (ADR 0036) va de MENAO vers l'agenda de l'artisan, mais il est lent (Google peut mettre une journée) et à sens unique.
- **Choix de l'utilisateur** (« lot 1 ») : passer par le calendrier du téléphone, qui réunit iCloud, Google et Outlook. Une connexion directe à Google depuis le site reste un éventuel lot 2.

## Décision
- **Écriture (application)** :
  - les visites, démarrages et créneaux bloqués des 90 prochains jours sont écrits dans le calendrier choisi, puis réécrits s'ils changent et retirés s'ils disparaissent ;
  - le calcul est dans `phoneSyncPlan` (`packages/core`) ;
  - les identifiants des événements écrits sont gardés dans un fichier de l'application.
- **Lecture (application)** :
  - seulement les heures de début et de fin des événements des calendriers choisis, jamais le titre ni le détail ;
  - sont écartés les événements « journée entière », ceux marqués « libre » et ceux écrits par MENAO ;
  - les chevauchements sont fusionnés, avec 500 plages au plus (`phoneBusySlots`) ;
  - par défaut, les abonnements (jours fériés…) ne sont pas lus ; le calendrier « MENAO » de l'abonnement .ics et les anniversaires sont écartés.
- **Base** :
  - table `artisan_external_busy` : RLS activée, lecture par l'artisan, écriture par les fonctions seulement ;
  - `replace_external_busy` remplace les plages d'une période d'au plus 120 jours ;
  - `clear_external_busy` oublie tout quand l'artisan arrête la lecture.
- **Affichage** :
  - nouveau type d'élément d'agenda `occupe` (« Pris ailleurs »), sur le site et dans l'application ;
  - pris en compte par les avertissements des formulaires de rendez-vous et par les créneaux proposés ;
  - jamais repris dans l'abonnement .ics, puisqu'il en vient.
- **Moments de synchronisation** :
  - ouverture de l'application et retour au premier plan ;
  - affichage de l'agenda ;
  - après un rendez-vous fixé, un créneau bloqué ou libéré ;
  - deux minutes au moins entre deux synchronisations, sauf demande.
- **Réglages** : carte « Calendrier de votre téléphone » dans « Mes disponibilités », avec l'autorisation du téléphone, deux interrupteurs, le choix des calendriers et « Synchroniser maintenant ». L'abonnement .ics reste proposé en dessous.

## Conséquences
- **Nouvelle dépendance** `expo-calendar`, dans son API historique (`expo-calendar/legacy`), qui fonctionne aussi dans Expo Go. Le texte de la demande d'accès est dans `app.config.ts`. Il faut un nouveau build TestFlight.
- **Limites** :
  - pas de synchronisation garantie en arrière-plan : un rendez-vous pris sur le site arrive dans le calendrier à la prochaine ouverture de l'application ;
  - un autre rendez-vous ajouté au calendrier compte à la prochaine ouverture.
- **Données personnelles** : seulement des heures, avec l'accord du téléphone et un interrupteur. Elles sont supprimées en arrêtant la lecture, ou avec le compte (suppression en cascade).
- **Tests** : `packages/core` (`phone-calendar.test.ts`) et pgTAP `105_agenda_telephone`.
