# ADR 0068 — Application, espace artisan : suivi du chantier après l'acompte (lot 6c, partie 4a)

- Statut : accepté
- Date : 13 octobre 2026

## Contexte
- Sur le site, la fiche d'un chantier devient, après l'acompte, la vue de son suivi (F-22) : démarrage, journal, fin des travaux, réception, réserves et solde.
- Dans l'application, l'artisan voyait encore la vue du rendez-vous à tous les stades.

## Décision
- **Vue du chantier après l'acompte** (même écran `/pro-chantier/[id]`, comme sur le site) :
  - photo, état, « Acompte reçu », adresse ;
  - client, avec appel et message ;
  - avancement en 5 étapes ;
  - litige ou signalement en cours ;
  - « Suivi » (journal, prochaine intervention) et « Dossier » (documents, échéancier, client et lieu, notes privées).
- **Actions**, avec les mêmes règles que le site :
  - **confirmer la date de démarrage** (`/pro-chantier/[id]/demarrage`), pré-remplie avec la date du devis et 08h00, puis la modifier tant que les travaux n'ont pas commencé (`chantierStartSchema`, `chantierStartInputError`, `artisan_confirm_start`) ;
  - **publier un message** au journal tant qu'il est ouvert (`isJournalOpen`, `chantierMessageSchema`, `artisan_add_chantier_message`) ;
  - **déclarer le chantier terminé** après « Ce chantier est-il terminé ? » (`canDeclareFinished`, `artisan_declare_finished`) ;
  - **signaler la levée des réserves**, avec un message facultatif (`liftMessageSchema`, `artisan_signal_reserves_lifted`).
- **Étapes de fin de chantier** : en attente de la réception, réserves émises par le client, levée signalée, réception validée (avec le solde restant), clôture (solde reçu), avis à venir.
- **Composants communs aux deux vues** : le journal, l'échéancier et les documents (`dossier.tsx`) servent au client et à l'artisan. La ligne de la personne affiche « Votre artisan » ou « Votre client », sans le badge « Artisan vérifié » pour le client.
- Aucun changement côté serveur.

## Limites
- **Photos du journal** : partie 4b, avec un module de choix des photos (aussi pour la messagerie et les signalements).
- **Réponse à l'avis du client** et **agenda** : parties suivantes.

## Conséquences
- **Partie 4b** : photos (journal, messagerie, signalement).
