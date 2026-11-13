# ADR 0297 — Lot 38 : espace partenaire, page co-marquée, widget, conversation de litige et cartes du commercial

- Statut : accepté (13/11/2026)
- Fonctionnalité : F-143 (refonte « Nette », écrans oubliés hors espace artisan)

## Contexte

Le recensement du 12/11/2026 a trouvé cinq écrans jamais maquettés : l'espace partenaire (lien
privé, ADR 0139), la page co-marquée (ADR 0142), le widget (ADR 0138), la conversation lue depuis
un litige (ADR 0277) et la planche de cartes du commercial (ADR 0205). Le lot 38 les a maquettés
et l'utilisateur l'a validé.

## Décision

- **Espace partenaire** (`PartnerSpaceView`) : résultats en une carte, primes en trois étapes
  (en attente → à facturer → payées) avec les montants, liens à copier dans une colonne à droite
  (`CopyField`), kit en onglets avec aperçu (`PartnerKitTabs` : lien et bouton dans un cadre isolé
  sans script, widget et iframe par la vraie page du widget), bannières en vignettes
  (`BannerKit variant="grid"`, code gardé dans un champ lisible par les lecteurs d'écran).
- **Page co-marquée** : nom du partenaire et logo MENAO côte à côte dans le bandeau (pas de logo
  partenaire en base), formulaire plus large, mot du partenaire en carte et transparence avec
  « Nos garanties ». Titre et textes inchangés.
- **Widget** : logo et « Lien partenaire » en tête, titres et bouton du site ; la ligne « Service
  proposé par MENAO » disparaît (absente de la maquette).
- **Conversation de litige** (`TicketConversationView`) : en-tête du chantier et des participants,
  messages groupés par jour, mention du journal et repères à droite. Le titre du chantier est lu
  sur le ticket.
- **Cartes du commercial** : la carte en grand (modèle Nuit), l'impression et son conseil à
  droite ; la planche n'apparaît plus qu'à l'impression. La carte n'a qu'une face (QR compris) :
  pas de verso, contrairement à la maquette.

## Conséquences

- Aucun changement de base ni de fonction.
- Le test de bout en bout des partenaires vérifie le kit par son onglet « Lien texte ».
