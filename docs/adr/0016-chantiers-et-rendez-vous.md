# ADR 0016 — Chantiers, machine à états et rendez-vous

- Statut : accepté
- Date : 10 octobre 2026

## Contexte
F-16 à F-18 et spec §9 : l'artisan fixe un rendez-vous depuis une demande, puis crée un devis. La machine à états du chantier doit être « implémentée dans `packages/core` et protégée en base », chaque transition journalisée (CLAUDE.md règle 6). Les demandes (ADR 0014) gèrent déjà l'envoi, le refus et l'expiration après 48 h.

## Décisions
- **Le chantier naît au rendez-vous.** « Fixer un rendez-vous » (`artisan_fix_appointment`) remplace l'acceptation simple. Cette fonction crée le chantier à l'état `demande_envoyee` puis le fait passer en `rdv_planifie` par `transition_chantier()`. Les états `refusee` et `expiree` du schéma de la spec restent des statuts de la demande : un projet envoyé à 3 artisans ne crée pas 3 chantiers. Les demandes acceptées avant cette version, sans rendez-vous, peuvent encore recevoir une date.
- **Machine à états à deux niveaux, même contenu.** `packages/core/src/chantier-state.ts` (`CHANTIER_TRANSITIONS`, `nextChantierStatus`) et la table `chantier_transitions` contiennent les 30 mêmes transitions. Les tests unitaires et pgTAP vérifient la liste complète.
  - « litige_resolu » ramène à l'état d'avant le litige, lu dans le journal.
  - L'annulation n'est possible qu'avant l'acompte.
- **Une seule porte d'entrée.** `transition_chantier(chantier, événement, détails)` :
  - refuse toute transition absente du référentiel ;
  - écrit dans `chantier_events`, avec auteur, rôle (« systeme » pour le serveur) et détails ;
  - n'est exécutable que par les fonctions de la base et la clé `service_role` (webhooks à venir). Les utilisateurs passent par des fonctions métier qui vérifient leurs droits.
  - Un déclencheur empêche toute modification de l'état en dehors d'elle, même par le serveur, et fige les parties du chantier.
  - Le journal ne peut être ni modifié ni effacé, sauf par cascade (suppression d'un compte).
- **Rendez-vous** (`appointments`) :
  - heure saisie à Paris, à venir et au plus 180 jours plus tard (même règle dans `packages/core` et en base) ;
  - notes privées lisibles par l'artisan seul : la table n'est pas lisible par le particulier ni par l'équipe ; le particulier lit la date par `particulier_requests()` et `chantier_appointment()` ;
  - date modifiable tant que le devis n'est pas envoyé. Ce n'est pas sur la maquette, mais l'artisan fixe la date avant d'avoir le numéro du client (décision C de l'ADR 0014).
- **Annulation par l'artisan** : tant qu'aucun devis n'est signé (`TODO(legal)` pour l'annulation après signature). La demande passe en « annulée » : le particulier retrouve une place et peut contacter un autre artisan. Les coordonnées du client sont de nouveau masquées.
- **« Ce chantier a besoin d'une expertise »** : ticket `expertise` (corps de métier, précisions) pour l'équipe MENAO, un seul ouvert par projet et par artisan.
- **Espace pro** (`/pro/tableau-de-bord`, `/pro/demandes`, `/pro/chantiers`) :
  - en-tête dédié et barre de navigation mobile des maquettes sur les écrans principaux ;
  - les artisans validés y arrivent après connexion ; les autres terminent leur inscription ;
  - le tableau de bord reprend les alertes du dossier (documents à renouveler, suspension).
  - **Masqués en attendant leurs fonctionnalités** : la cloche (notifications, phase 5), « Envoyer un message via Menao » (F-40), « Créer un devis » et le bouton « + » (F-19).
  - **« Généré ce mois »** vaut 0 € tant qu'aucun devis ne peut être signé (F-13).
- **Agenda** : fichier `.ics` (RFC 5545, en UTC) servi par `/agenda/[id]` aux deux parties seulement (F-44).

## Conséquences
- Les e-mails « rendez-vous fixé », « rendez-vous modifié », « chantier annulé » et le rappel de la veille (F-18, F-41) arrivent avec l'envoi des notifications (phase 3b, Resend). `appointments.reminder_sent_at` est prêt.
- Les transitions suivantes (`devis_envoye`, `devis_signe`…) passeront par les fonctions des PR devis et signature, ou par `service_role` pour les webhooks.
- Le stepper à 5 étapes (spec §9) sera calculé à partir de l'état avec F-12 (phase 4).
