# ADR 0049 — Boîte de réception des tickets et accès du rôle support

- Statut : accepté
- Date : 12 octobre 2026
- Réalise le lot 4a de l'audit du back-office (F-55, F-56). Complète les ADR 0041 (échanges), 0045 à 0048 (back-office) et le §4 de la spec (rôle support).

## Contexte
- « Dossiers et messages » affichait jusqu'à 100 tickets sur une seule page, tous dépliés avec leurs fils et formulaires, sans filtre ni recherche, et sans savoir qui s'en occupait.
- Le rôle `support` (spec §4 : lecture, modération et litiges, sans paiements ni rôles) n'avait aucun accès à l'interface. Pourtant, les fonctions de la base pour les tickets l'acceptaient déjà (`app.is_staff`).

## Décision
- **Boîte de réception** (`/admin/tickets`), construite comme les autres listes (ADR 0046) :
  - les plus urgents d'abord ;
  - files : à traiter, en retard, mes tickets, litiges, signalements (avis, messages, expertises, réserves), messages et dossiers (contact, dossiers de recherche), suppressions de compte, clos, tous ;
  - recherche sur l'objet, le message, l'e-mail, le déclarant et le chantier ;
  - une ligne indique le type, le chantier, le nombre de notes, le statut, le responsable et l'échéance.
- **Page d'un ticket** (`/admin/tickets/[id]`) :
  - le déclarant et l'objet lié (demande, chantier, avis) ;
  - le message d'origine, puis le fil d'échange avec la réponse ;
  - la modération de l'avis ou du message signalé, et la décision sur un litige ;
  - le statut, la prise en charge et les notes internes.
  - Les fiches et la vue d'ensemble pointent désormais vers ces pages et ces files.
- **Prise en charge** : « Je m'en occupe » (`staff_take_ticket`) inscrit son auteur (`tickets.handled_by`) et passe le ticket en cours ; « Rendre la main » l'efface.
- **Notes internes** (table `ticket_notes`) :
  - lues et écrites par l'équipe seulement (RLS), au nom de leur auteur ;
  - ni modifiées ni supprimées : elles forment le journal du traitement ;
  - jamais visibles du déclarant.
- **Rôle support** :
  - après la double authentification (exigée aussi pour lui par l'interface), il arrive sur la boîte de réception (`homePathForRole`) ;
  - son menu ne montre que « Dossiers et messages », sans recherche globale ;
  - les autres pages du back-office (chiffres, paiements, personnes) le renvoient à sa boîte. Sur une page de ticket, les liens vers ces fiches ne s'affichent pas pour lui.
  - Les actions de tickets (réponse, statut, modération, litiges, notes) lui sont ouvertes, comme dans la base.
- **Données** : `staff_tickets`, `staff_ticket_counts` et `staff_take_ticket` (équipe), sur la fonction interne `app.staff_ticket_rows`.

## Conséquences
- À déployer : la migration.
- La base accepte le rôle support sans session aal2 (`app.is_staff`) ; seule l'interface exige la double authentification. Durcir `app.is_staff` demandera de revoir les tests des politiques de l'équipe.
- Lot 4b : alertes de l'équipe (nouveau ticket, dossier à vérifier, ticket en retard), avec la cloche dans le back-office.
