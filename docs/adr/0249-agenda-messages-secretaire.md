# ADR 0249 — Agenda, Messages et Secrétaire repensés (refonte « Nette », lot 4)

- Statut : accepté
- Date : 8 novembre 2026
- Suite des ADR 0245 à 0248. Lot 4 maquetté (ordinateur, téléphone, application) et validé le 8 novembre.

## Décision
- **Agenda** :
  - Grand titre ; « Agenda | Mes disponibilités » et « Bloquer un créneau » gardés.
  - Ordinateur : grille de la semaine plus aérée (heure plus haute, samedi et dimanche plus étroits, aujourd'hui en pastille bleu nuit, blocs arrondis) et, à droite, une colonne **« À venir »** (trois prochaines visites ou démarrages, `upcomingAgenda`) avec le lien vers le chantier, et une carte **« Calendrier du téléphone »** qui mène à sa synchronisation (patron et chef d'équipe).
  - Téléphone et application : **bande des 7 jours** avec un point de couleur par rendez-vous, le **jour choisi** (`?jour=` sur le site, état local dans l'application ; par défaut aujourd'hui ou le lundi), ses horaires, ses rendez-vous et ses **plages libres**, puis **« Plus tard cette semaine »**.
  - Calculs dans `@menao/core` : `defaultAgendaDay`, `agendaItemsAfter`, `freeRangesOn`, `placeAgendaItem` (testés).
- **Messages** :
  - Ordinateur : **deux colonnes** dans un même cadre — conversations à gauche avec **recherche** (client, chantier) et filtre **« Non lus »**, conversation ouverte à droite (en-tête avec le client, le lien vers le chantier et « Appeler » si son numéro est déjà connu). Sur /pro/messages, la colonne de droite invite à choisir une conversation.
  - Téléphone : la liste seule, puis la conversation seule.
  - Bulles : les miennes en bleu nuit, celles reçues blanches et bordées ; zone d'écriture arrondie. Même présentation côté particulier (composants partagés).
- **Secrétaire** (site seulement, l'application n'a pas cette rubrique) :
  - Chiffres clés : à traiter (dont urgents), rendez-vous pris ce mois, appels pris ce mois avec les minutes restantes (`secretaryFigures`, testé).
  - Un appel par carte : appelant, ville, « Urgent », « Rendez-vous pris : … » ou « Message à rappeler », ses mots, puis Appeler, Voir dans l'agenda et Traité.
  - À droite en grand écran : la carte de la secrétaire (état, jauge des minutes, réglages en bref, essai, lien vers les réglages).

## Conséquences
- `SecretaryView` porte l'affichage de la rubrique (page réelle et aperçu) ; `ProMessagesLayout` et `ProConversationPane` celui des messages de l'espace pro (réel et exemples) ; `ConversationList` accepte une conversation active et un mode sans cadre.
- Écarts assumés : pas d'« Itinéraire » ni d'« Appeler » dans la colonne « À venir » et les lignes de l'agenda (la liste ne porte ni l'adresse complète ni le téléphone ; la fiche du chantier les a) ; sur ordinateur, aucune conversation n'est ouverte d'office sur /pro/messages (l'ouvrir la marquerait comme lue).
- Application : la lecture des rendez-vous de la secrétaire dans l'agenda passe par `secretary_messages.blocked_slot_id` (données déjà visibles du patron).
