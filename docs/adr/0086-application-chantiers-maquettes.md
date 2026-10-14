# ADR 0086 — Application : « Mes chantiers » et vue d'un chantier d'après les maquettes

- Statut : accepté
- Date : 14 octobre 2026

## Contexte
- Les maquettes mobiles montrent les chantiers du client :
  - « Mes chantiers - Mobile » : une seule page, chantiers en cours puis chantiers terminés, compteurs en pastilles, carte de paiement avec le montant à payer et le total du chantier, avatar à initiales sur fond bleu ;
  - « Vue d'un chantier » : grande photo bord à bord, identité du chantier, artisan, boutons « Message » et « Appeler », étapes, puis deux onglets « Suivi du chantier » et « Dossier du chantier ».
- L'application séparait « En cours » et « Terminés » en deux onglets, et la vue d'un chantier empilait des cartes sous une barre de titre.
- Le site propose d'ajouter la prochaine intervention à son agenda (Google, Outlook, fichier .ics) ; pas l'application.
- L'écran de démarrage (bleu et logo) suit déjà les maquettes.

## Décision
- **« Mes chantiers » sur une seule page** :
  - dans l'ordre : chantiers en cours, demandes en attente, recherches non envoyées, puis chantiers terminés (section affichée seulement s'il y en a) ;
  - compteurs en pastilles blanches bordées.
- **Carte de paiement** (acompte ou solde) : « À payer maintenant » avec le montant en bleu, puis « Total du chantier ». Pour un devis à signer, le total du chantier en bleu.
- **Chantiers terminés** :
  - l'adresse du chantier remplace le nom de l'artisan, qui reste dans le lien « Redemander un devis à… » ;
  - l'image remplit toute la hauteur de la carte.
- **Vue d'un chantier** :
  - grande photo bord à bord avec un retour rond, barre d'état claire ;
  - section blanche : titre, adresse, statut, description, artisan, boutons « Message » et « Appeler » (seulement si le numéro de l'artisan est communiqué), étapes du chantier ;
  - au-dessus des onglets : ce qui attend le client (signature ou paiement, réception, avis, signalement) ;
  - onglet « Suivi du chantier » : journal de l'artisan et prochaine intervention ;
  - onglet « Dossier du chantier » : documents, échéancier et garanties ;
  - l'échéancier devient une frise : « Déjà payé » en bleu, « Restant à payer », puis le total.
- **« Ajouter à mon calendrier »** sur la prochaine intervention, comme sur le site :
  - feuille de choix : Google Agenda ou Outlook, ouverts dans le navigateur intégré, ou calendrier du téléphone ;
  - pour le téléphone, un fichier .ics est créé dans le cache puis proposé au partage du système ;
  - liens, fichier et durée viennent de `packages/core` (`googleCalendarUrl`, `outlookCalendarUrl`, `buildIcs`, `APPOINTMENT_DURATION_MINUTES`), comme sur le site.
- **Avatar des en-têtes** : fond bleu plein et initiales du prénom et du nom (« NS » des maquettes) ; l'accueil affiche aussi les deux initiales. Le nom est lu avec le prénom, avec les droits du compte (RLS).
- **Côté artisan** : le suivi d'un chantier prend les mêmes onglets « Suivi du chantier » et « Dossier du chantier ».
- Les boutons acceptent une icône après le libellé.
- Aucune migration, aucune nouvelle dépendance (`expo-sharing`, `expo-file-system` et `expo-web-browser` sont déjà installés).

## Conséquences
- Les écrans de chantier de l'application suivent les maquettes mobiles.
- Le client peut ajouter la prochaine intervention à son calendrier depuis l'application, comme sur le site.
