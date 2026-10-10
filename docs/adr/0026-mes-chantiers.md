# ADR 0026 — « Mes chantiers » et vue d'un chantier commune au client et à l'artisan

- Statut : accepté
- Date : 10 octobre 2026

## Contexte
- **F-12** :
  - le client voit ses chantiers « en cours » et « terminés » ;
  - chaque carte présente la photo, le titre, l'adresse, l'état, le stepper, l'artisan, la prochaine intervention et l'action attendue (« Voir et signer le devis », « Payer maintenant »), avec « Ajouter à mon agenda » (Google, Outlook, Apple) ;
  - la vue d'un chantier a deux onglets : « Suivi du chantier » (photos et messages de l'artisan, prochaine intervention) et « Dossier du chantier » (documents, échéancier).
- **Maquettes** : « Mes chantiers » (bureau et mobile) et « Vue d'un chantier » (suivi, dossier, date à confirmer, chantier en cours, fin de chantier, chantier achevé). L'artisan et le client y partagent la même vue.
- **ADR 0025** : la 4c a donné à l'artisan une fiche au bandeau bleu (« Vue d'un rendez-vous »), différente des maquettes, et ouvrait le journal dès la planification.

## Décisions
- **Données** :
  - `particulier_chantiers(p_chantier_id)` renvoie les chantiers du client : artisan, coordonnées si la demande est acceptée, photo, prochaine intervention, dernier devis envoyé, acompte prévu et son état, dates de fin et de clôture ;
  - le reste est lu directement, sous RLS : devis, paiements, factures, journal.
- **Avancement** (`packages/core`) :
  - stepper en 5 étapes déduit de l'état (spec §9) : Signature jusqu'au devis signé, Paiement, Planification (acompte payé, date confirmée), Travaux, Réception jusqu'au solde ;
  - action attendue : signer le devis envoyé, puis payer l'acompte, sauf pendant la confirmation d'un paiement différé ;
  - échéancier : déjà payé et restant à payer, toujours calculés ;
  - chantiers terminés : clôturés, annulés ou dont le devis a été refusé.
- **« Mes chantiers »** :
  - chantiers en cours, demandes encore sans chantier, puis chantiers terminés (onglets sur mobile) ;
  - les demandes acceptées mènent à leur chantier.
- **Vue d'un chantier**, mêmes composants pour les deux rôles :
  - photo, pastilles, personne (« Votre artisan » / « Votre client » avec « Appeler »), stepper ;
  - onglets Suivi / Dossier, chacun avec son adresse (`?onglet=dossier`) ;
  - journal en mosaïque : photo la plus récente en grand, « Voir les N photos », deux derniers messages puis « Afficher tous les messages ».
  - Côté artisan, après l'acompte :
    - confirmation de la date dans un panneau en bas de l'écran, puis message « Date de démarrage des travaux confirmée » ;
    - journal grisé avant les travaux ;
    - tiroir « Ce chantier est-il terminé ? » qui permet d'ajouter les photos finales.
  - Jusqu'à l'acompte, l'artisan garde la « Vue d'un rendez-vous ».
- **Journal** : il s'ouvre au début des travaux (`en_cours`), comme le prévoient la spec (« pendant les travaux ») et la maquette. Cette règle révise l'ADR 0025.
- **Agenda** :
  - `chantier_appointment` couvre aussi le démarrage des travaux (`kind`) ;
  - « Ajouter à mon agenda » propose Google Agenda, Outlook et le fichier .ics, construits par `packages/core` (`googleCalendarUrl`, `outlookCalendarUrl`) ;
  - ces liens transmettent le titre et l'adresse du chantier au service choisi, à l'initiative de l'utilisateur.
- **Nouveautés du journal** (« Jean a ajouté 6 nouvelles photos ») :
  - une notification `chantier_nouveautes` par fenêtre de 10 minutes : un index unique partiel cumule photos et messages tant qu'elle n'est pas partie ;
  - envoi différé grâce à `notifications.send_after`, respecté par `claim_notifications` et `dispatch_notifications` ;
  - une notification déjà tentée n'est plus complétée.
- **E-mails** : les e-mails du client liés à un chantier mènent à sa vue (`/mon-espace/chantiers/<id>`).
- **Écarts assumés par rapport aux maquettes** :
  - pas de bouton « Message » ni de bloc « Messagerie » (messagerie F-40, phase 5) ;
  - pas de modale QR code vers les stores tant que l'application n'est pas publiée (phase 6) ;
  - « Acompte sécurisé » devient « Acompte reçu », car MENAO ne détient pas les fonds (spec §16.8) ;
  - « Signaler un problème lié au chantier » mène au formulaire de contact en attendant les litiges (F-42) ;
  - le titre de l'espace client devient « Mes chantiers », comme sur la maquette.

## Conséquences
- **Phase 5** : réception (« Valider la réception du chantier », réserves) et solde dans la même vue, messagerie, litiges.
- **Revue du design** : le scénario e2e capture ces écrans (ordinateur et mobile 390 px) ; la CI les publie (artefact `captures-ecrans`).
