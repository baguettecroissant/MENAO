# ADR 0041 — « Mes échanges avec MENAO » et garanties après la réception

- Statut : accepté
- Date : 12 octobre 2026
- Complète F-42 (signalements), F-03 (page Contact), F-25 (réception) et l'ADR 0032 (litiges).

## Contexte
L'audit de l'espace client (lot 3) relevait deux manques :
- Un client connecté qui écrivait depuis la page Contact (ou envoyait son dossier de recherche, ou demandait la suppression de son compte) ne voyait jamais la réponse dans son espace. Seuls les litiges avaient un fil d'échange.
  - De plus, une réponse de l'équipe à l'un de ces tickets aurait envoyé une notification vers `/signalements/…`, une page réservée aux litiges, donc introuvable.
- Après la réception, rien ne rappelait au client les garanties légales ni leurs échéances.

## Décision
- **« Mes échanges avec MENAO »** (`/echanges`), commun au client et à l'artisan, accessible depuis le menu du compte. Il liste ses tickets (message de contact, dossier de recherche, signalement sur un chantier, suppression du compte, avis, message ou expertise signalés) avec leur statut : en attente de réponse, réponse de l'équipe, clos.
  - Un litige garde sa page (`/signalements/…`).
  - Les autres tickets ont la page `/echanges/…` : message d'origine, fil des réponses, et réponse du déclarant tant que l'échange n'est pas clos (même fonction `add_ticket_message`, mêmes droits).
  - `/signalements/…` redirige vers `/echanges/…` quand le ticket n'est pas un litige.
- **Réponse de l'équipe** : `add_ticket_message` joint désormais le type du ticket à la notification `reponse_support`.
  - Le titre de repli devient « votre message » hors litige.
  - Le contenu de la notification parle alors de « message » et mène à `/echanges/…`. Une ancienne notification sans type reste traitée comme un litige.
  - Dans le back-office, les messages de contact, dossiers de recherche et demandes de suppression ont leur fil et un formulaire de réponse, comme les litiges.
- **Page Contact** : après l'envoi par un compte connecté, un lien mène à « Mes échanges avec MENAO ».
- **Garanties après la réception** : dans le dossier d'un chantier réceptionné, une carte rappelle :
  - les échéances (même quantième 1, 2 et 10 ans après la réception, le 29 février ramené au 28) de la garantie de parfait achèvement, de la garantie de bon fonctionnement et de la garantie décennale ;
  - une phrase sur ce que chacune couvre, et l'assureur décennal repris du devis figé ;
  - la formulation conditionnelle « selon la nature des travaux » et un conseil : prévenir l'artisan, puis l'équipe MENAO.

## Points à valider (TODO(legal))
- Formulation des garanties, exemples d'équipements (bon fonctionnement), application selon la nature des travaux, et calcul des échéances.

## Conséquences
- À déployer : la migration (`add_ticket_message`).
- Les tickets créés par une session anonyme (recherche sans compte) restent hors de « Mes échanges » : la réponse se fait à l'adresse indiquée.
