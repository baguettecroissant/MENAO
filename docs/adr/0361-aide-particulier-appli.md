# ADR 0361 — Aide du particulier dans l'application : questions, contact, assistant (F-170, lot 67)

- Date : 17/11/2026
- Fonctionnalité : F-170 ; maquette du lot 67 (« AideClientApp »), validée le 17/11/2026.

## Contexte

Dans l'application, « Questions fréquentes » et « Nous contacter » ouvraient le site pour un
particulier, alors que l'artisan a son aide dans l'application (ADR 0129, 0236). Le particulier
quittait son parcours et retombait sur un site où il n'était pas forcément connecté.

## Décision

- **Écran « Aide »** (`/aide`, particulier et visiteur) : l'assistant, « Écrire à l'équipe MENAO »,
  puis les questions fréquentes par thème. L'artisan garde son écran.
- **Questions partagées** : les questions des particuliers passent des textes du site à
  `packages/core/src/client-faq.ts` (`CLIENT_FAQ`) ; la page du site et l'application lisent le
  même texte.
- **Contact** (`/contact`) : sujet en pastilles, chantier concerné, message ; envoi par
  `send_contact_message`, comme le site. Le compte connecté est joint par la base ; un visiteur
  donne son adresse e-mail.
- **« Mes échanges avec MENAO »** (`/echanges`, `/echanges/[id]`) : les messages de contact, leur
  état, les réponses de l'équipe et une réponse à écrire (`add_ticket_message`).
- **Assistant** (`/assistant`), version simple : l'Edge Function `client-assistant` du site
  (F-71), sans accès au compte. Une demande préparée s'ouvre dans la recherche.
- **Textes légaux** (CGU, confidentialité) : ils restent des pages du site, ouvertes dans la
  fenêtre intégrée de l'application ; une seule version du texte.

## Conséquences

- Aucune migration ni fonction : tout existait côté serveur.
- Aucun délai de réponse n'est promis (« sous 24 h » retiré à la validation).
- Les signalements sur un chantier gardent leur propre écran de suivi ; « Mes échanges » ne liste
  que les messages de contact.
- L'assistant ne connaît pas le compte : il ne dit pas « vous avez un devis en attente ». À
  étudier ensuite si le besoin se confirme.
