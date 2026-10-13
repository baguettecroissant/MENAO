# ADR 0066 — Application, espace artisan : chantiers, rendez-vous et messages (lot 6c, partie 2)

- Statut : accepté
- Date : 13 octobre 2026

## Contexte
- Après la partie 1 (ADR 0065), l'artisan fixe un rendez-vous dans l'application, mais il ne pouvait pas encore ouvrir ses chantiers ni écrire à ses clients.
- Sur le site, la vue d'un chantier côté artisan montre le rendez-vous jusqu'à l'acompte (F-18), puis le suivi du chantier (F-22).

## Décision
- **Mes chantiers** (`/pro-chantiers`, depuis le tableau de bord) : `artisan_chantiers`, avec l'état, le lieu, le client, et le rendez-vous ou le démarrage. Mêmes couleurs d'état que le site.
- **Vue du rendez-vous** (`/pro-chantier/[id]`), comme sur le site :
  - date et heure, modifiables tant que le rendez-vous est planifié (`artisan_reschedule_appointment`, mêmes contrôles que pour le fixer). Les champs reprennent l'heure de Paris ;
  - « Écrire au client » ;
  - dernier devis envoyé, avec la réponse du client, le PDF, puis l'acompte et sa facture ;
  - client et lieu, avec coordonnées, appel et carte une fois le rendez-vous fixé ; rappel du chantier ;
  - notes privées (`artisan_save_appointment_notes`) ;
  - « Annuler le chantier » pour les états annulables (`artisan_cancel_chantier`, message facultatif pour le client) ;
  - « Signaler un problème lié au chantier ».
- **Blocs de la demande** (client, lieu, description, date, message) : un composant commun à l'opportunité et au rendez-vous, comme sur le site.
- **Schéma du détail d'un chantier** : `artisanChantierDetailSchema` passe de l'espace pro du site à `@menao/validation`, avec ses tests.
- **Une demande dont le rendez-vous est fixé** s'ouvre sur la vue du chantier. Les rendez-vous du tableau de bord aussi.
- **Messages de l'artisan** :
  - l'onglet reprend la liste des conversations (`my_conversations`), avec les textes de l'espace pro et la pastille de non-lus ;
  - la conversation identifie l'interlocuteur selon le rôle : l'artisan du chantier pour le client, le client pour l'artisan (`artisan_chantier_detail`). Le lien « Voir le chantier » mène à la bonne vue.
- **Signalement d'un problème** : le même écran sert au client et à l'artisan (`loadReportContext`). Le suivi renvoie chacun vers sa vue du chantier.
- Règle 10 respectée : aucun lien vers l'abonnement ni vers le site.
- Aucun changement côté serveur.

## Limites
- **La préparation du devis** (lignes, TVA, échéancier, dictée, envoi) arrive dans la partie suivante. D'ici là, l'écran l'annonce, sans lien vers le site.
- **Le suivi après l'acompte** (confirmation du démarrage, nouvelles et photos, fin des travaux, levée des réserves) et l'agenda viendront ensuite. Les photos demanderont un module de choix des photos.

## Conséquences
- **Partie 3** : préparation et envoi du devis.
