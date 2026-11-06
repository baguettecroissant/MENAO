# ADR 0230 — Horaires d'accueil de l'équipe et récapitulatif du matin de Camille

- Statut : accepté
- Date : 6 novembre 2026
- F-80 (récapitulatif) et F-81 (horaires d'accueil), demandés le 6 novembre 2026. But des associés : pas de secrétaire dédiée. Camille répond 24 h/24, l'équipe actuelle traite ce qu'elle transmet. Plus tard, une ligne en 04 sonnera chez l'équipe aux heures d'accueil et chez Camille le reste du temps (ADR 0228).

## Décision
- **Horaires d'accueil** (`reception_settings`, réglage unique) :
  - plages par jour de la semaine, plusieurs par jour possible (pause de midi), heure de Paris ;
  - fermetures exceptionnelles ;
  - jours fériés fermés ou non.
  - Par défaut : du lundi au vendredi, de 9 h à 17 h, jours fériés fermés.
  - Jours fériés de France métropolitaine calculés en base : fêtes fixes, lundi de Pâques, Ascension et lundi de Pentecôte (`app.is_french_public_holiday`).
  - Réglage par un admin dans le back-office (page « Dossiers et messages », carte « Horaires d'accueil »), avec le même éditeur d'horaires que l'agenda des artisans et les mêmes contrôles (`hoursErrors`). Le support les voit sans pouvoir les modifier.
- **Une seule source de vérité : la base.** `reception_status()` (équipe et rôle service) renvoie si l'accueil est ouvert, l'heure de fermeture de la plage en cours, sinon la prochaine ouverture sur 14 jours.
- **Camille s'en sert** après une demande de rappel. Elle dit « l'équipe est joignable aujourd'hui jusqu'à dix-sept heures » ou « elle rappelle lundi neuf novembre à partir de neuf heures », au lieu de « sous un jour ouvré » (`receptionCallbackSpoken`, `@menao/core`). Elle ne promet pas d'heure précise.
- **Récapitulatif du matin** (`app.send_camille_recap`) :
  - planifié toutes les heures, il n'envoie qu'à 8 h heure de Paris, heure d'été comprise, une fois par jour ;
  - il couvre la période depuis le précédent (24 h la première fois, 7 jours au plus) ;
  - destinataires : les admins et le support, par la notification `equipe_recap_camille` ;
  - contenu : nombre d'appels et minutes, dont appels hors horaires d'accueil ; demandes de rappel avec leurs motifs (5 au plus) ; rendez-vous pris avec un commercial ; demandes de travaux préparées au téléphone et celles déjà envoyées par le particulier (`project_transfers.via_telephone`) ;
  - aucun envoi s'il ne s'est rien passé ;
  - ni coordonnée ni prénom dans la notification : ils restent dans les tickets et « Ma journée ».

## Conséquences
- Test pgTAP `120_accueil_recap_camille` (jours fériés, ouverture, prochaine ouverture, droits, récapitulatif).
- L'éditeur d'horaires de l'agenda accepte une autre action et d'autres textes ; l'agenda des artisans ne change pas.
- La future ligne téléphonique lira le même `reception_status()` pour l'aiguillage.
