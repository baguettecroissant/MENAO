# ADR 0277 — Conversation du chantier consultée par l'équipe sur un litige ou un signalement (F-125)

- Statut : accepté
- Date : 11 novembre 2026
- Complète les ADR 0031 (messagerie), 0046 (suivi des chantiers dans le back-office) et 0049 (boîte des tickets).

## Contexte
Les messages entre le client et l'artisan étaient privés : l'ADR 0046 prévoyait un accès de l'équipe « sur un litige ou un signalement », mais aucun écran ne le permettait. Sur un message signalé, l'équipe ne voyait que ce message ; sur un litige, rien de la conversation. Pour trancher un litige, l'équipe a besoin des échanges.

## Décision
- **Accès limité aux tickets de litige et de message signalé**, jamais depuis la fiche d'un chantier ni pour un chantier quelconque.
- **Rôles** : admin en double authentification ou support (`app.is_staff()`), comme pour la modération des messages. Refusé aux parties, aux commerciaux et aux autres rôles.
- **Fonction `admin_ticket_conversation(ticket)`** : vérifie le rôle et le type du ticket, retrouve le chantier (celui du litige, ou celui du message signalé), inscrit la consultation au journal d'audit (`conversation.consultee`, chantier visé, ticket et type), puis renvoie toute la conversation : côté et nom de l'auteur, contenu, pièces jointes, lecture, masquage et motif, message signalé repéré.
- **Messages masqués** : contenu et motif visibles par l'équipe (ils peuvent compter dans un litige).
- **Écran** : bouton « Voir la conversation » sur le ticket, page à part (`/admin/tickets/[id]/conversation`) en lecture seule, sans préchargement, pour que seule une ouverture volontaire soit journalisée. Pièces jointes servies par URL signées.
- Aucune table nouvelle ; tests pgTAP `132_conversation_litige`.

## Conséquences
- Chaque consultation est traçable dans le journal du back-office (lisible par les admins).
- TODO(legal) : annoncer cet accès aux utilisateurs avant la mise en service publique. Texte proposé, à faire relire par l'avocat, pour les conditions d'utilisation et la politique de confidentialité :
  > « Les messages échangés entre un particulier et un artisan sur MENAO sont privés. En cas de signalement d'un message ou de litige sur un chantier, l'équipe MENAO peut consulter la conversation de ce chantier, uniquement pour traiter le dossier. Chaque consultation est enregistrée. »
