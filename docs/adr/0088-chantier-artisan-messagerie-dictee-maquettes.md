# ADR 0088 — Vue d'un chantier côté artisan, « Messagerie avec … » et dictée du devis d'après les maquettes

- Statut : accepté
- Date : 14 octobre 2026

## Contexte
L'audit des maquettes du 14 octobre 2026 relève trois autres écarts.

- **Vue d'un chantier côté artisan dans l'application** : ancienne mise en page (barre de titre, photo dans une carte, boutons empilés, confirmation de la date de démarrage sur un autre écran).
  - Les maquettes « Date à confirmer » et « Chantier en cours » reprennent la vue du client : grande photo, client avec « Message » et « Appeler », étapes, onglets.
  - L'action principale est en pied d'écran : « Confirmer la date de démarrage » (date et heure sur place) ou « Déclarer le chantier terminé » (feuille « Ce chantier est-il terminé ? »).
- **Carte « Messagerie avec … »** en tête du suivi côté artisan (dernier message, champ d'envoi) : absente du site comme de l'application.
- **Dictée du devis dans l'application** : saisie par le micro du clavier. La maquette « Dictez votre devis » et le site ont un enregistreur intégré (minuteur sur 2 minutes, pause, effacer, « Sauvegarder cet enregistrement »).

## Décision
- **Mise en page commune de la vue d'un chantier** (`ChantierLayout`), utilisée côté client et côté artisan :
  - grande photo bord à bord, retour rond, barre d'état claire ;
  - section blanche : titre, adresse, pastilles, description, « Votre artisan » ou « Votre client » au-dessus de sa carte, « Message » et « Appeler » (si le numéro est communiqué), étapes ;
  - pied d'écran fixe facultatif.
- **Côté artisan (application)** :
  - même pastille d'état que le client et le site (« Démarrage prévu le … »), plus « Acompte reçu » ;
  - `acompte_paye` : « Confirmer la date de démarrage » en pied d'écran, avec date et heure compactes côte à côte (date prévue au devis par défaut), date prévue au devis et avertissements de l'agenda (F-44) ;
  - après confirmation, message de confirmation et « Retourner à mon tableau de bord » ;
  - la modification d'une date déjà confirmée garde son écran ;
  - travaux en cours : « Déclarer le chantier terminé » en pied d'écran, qui ouvre la feuille « Ce chantier est-il terminé ? » (rappel des photos, confirmation).
- **Feuille commune** (`BottomSheet`) : fond assombri, poignée, titre, « Fermer », suit le clavier. Elle sert à « Ajouter à mon calendrier », à la fin de chantier et à la dictée.
- **« Messagerie avec … »** (site et application), en tête de l'onglet « Suivi du chantier » côté artisan :
  - nom du client et date du dernier message (`my_conversations`), messages non lus ; un appui ouvre la conversation ;
  - envoi rapide d'un message avec les règles de la conversation (`send_message`, `conversationMessageSchema`) ;
  - masquée quand la conversation est fermée ;
  - sur le site, l'envoi revalide aussi la vue du chantier.
- **Dictée du devis (application)**, dans une feuille ouverte par « Dictée intelligente » (désormais en pied de l'éditeur, comme la maquette) :
  - enregistrement par prises, 2 minutes au total, chaque prise transcrite et ajoutée au texte modifiable ;
  - minuteur et barre de progression, effacer, pause et reprise, niveau du micro et silence signalé ;
  - « Sauvegarder cet enregistrement » (`artisan_save_dictation`), et dictée sauvegardée reprise à l'ouverture (`quote_dictations`), comme sur le site ;
  - la capture du micro est partagée avec la dictée du projet (`useDictation`).
- Aucune migration, aucune nouvelle dépendance.

## Conséquences
- Les vues d'un chantier client et artisan partagent leur mise en page dans l'application.
- L'artisan peut écrire à son client depuis le suivi du chantier, sur le site comme dans l'application.
- La dictée du devis fonctionne de la même façon sur le site et dans l'application.
