# ADR 0065 — Application, espace artisan : tableau de bord et demandes (lot 6c, partie 1)

- Statut : accepté
- Date : 13 octobre 2026

## Contexte
- L'espace particulier de l'application couvre les parcours des phases 2 à 5 (lot 6b).
- Dans l'espace artisan, le tableau de bord et les demandes renvoyaient encore à un écran d'attente.
- Règle 10 : aucun bouton ni lien d'achat de l'abonnement, et aucun lien vers le site pour les artisans (ADR 0054).

## Décision
- **Tableau de bord** (onglet), comme sur le site, avec les mêmes calculs (`@menao/core`) :
  - clients en attente de devis, encaissé ce mois avec son évolution, temps de réponse ;
  - rendez-vous et démarrages à venir, dernières demandes à traiter ;
  - compte suspendu signalé avec le texte du site ;
  - tant que le dossier n'est pas validé, l'état du dossier reste affiché à la place.
- **Demandes** (onglet) :
  - `artisan_inbox`, avec le statut, l'urgence, le temps restant pour répondre, le début souhaité et la première photo ;
  - rechargées à chaque retour et en tirant vers le bas.
- **Opportunité** (`/opportunite/[id]`), comme sur le site :
  - client, adresse, description (photos, critères), date souhaitée, message ;
  - coordonnées, adresse exacte et appel seulement une fois le rendez-vous fixé (ADR 0014) ;
  - préférence de rappel du client.
- **Fixer un rendez-vous** (`/opportunite/[id]/rendez-vous`) :
  - date et heure d'arrivée : calendrier et roue des heures (par 5 minutes) sur iPhone, boîtes de dialogue sur Android, saisie au clavier dans la version web ;
  - mêmes contrôles que le site (`appointmentSchema`, `appointmentInputError` : à venir, dans les 6 mois) ;
  - `artisan_fix_appointment` crée le chantier ; le client voit la date et reçoit les coordonnées de l'artisan.
- **Refuser le chantier** (`/opportunite/[id]/refuser`) : motif de la liste, précisé si « Autre » (`refusalSchema`, `artisan_respond_request`).
- **Schéma du détail d'une demande** : `requestDetailSchema` passe de l'espace pro du site à `@menao/validation` (`parseRequestDetail`, testé). Le site et l'application l'utilisent.
- Aucun changement côté serveur.

## Limites
- Les créneaux libres proposés et les avertissements de l'agenda (absence, hors horaires, autre rendez-vous) viendront avec l'agenda de l'application. La base contrôle déjà la date.
- « Ce chantier a besoin d'une expertise » reste sur le site pour l'instant.

## Conséquences
- **Partie 2** : vue du chantier côté artisan (rendez-vous, modification, notes, suivi, photos), puis l'agenda.
- **Parties suivantes** : devis (saisie, dictée, envoi), factures, messages de l'artisan.
