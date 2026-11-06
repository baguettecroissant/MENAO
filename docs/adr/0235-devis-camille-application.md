# ADR 0235 — Devis avec Camille dans l'application

- Statut : accepté
- Date : 6 novembre 2026
- F-85, PR 2 du lot 4 des agents IA (« on passe à la PR 2 »). Suite de l'ADR 0234 (devis dicté en conversation sur le site).

## Contexte
Le kit vocal de Vapi pour l'application demande des modules natifs (WebRTC) absents d'Expo Go, avec lequel l'application est essayée. Le kit web, lui, fonctionne dans une vue web intégrée sur iPhone (micro accordé à la page).

## Décision
- **Dans l'éditeur de devis de l'application**, pour les formules qui l'incluent, le bouton « Dicter avec Camille » ouvre en bas de l'écran une petite vue web : la page `/appli/devis-camille` du site. Elle lance l'appel dès l'affichage, avec le bouton pour raccrocher et couper le micro.
- **Session** :
  - l'application pose la session de l'artisan et le chantier dans la page avant son chargement (`window.__MENAO_APP__`), jamais dans l'adresse ;
  - la page appelle `voice-session` (usage « devis ») avec cette session, comme le site ;
  - la vue n'accepte aucune autre adresse dans son cadre principal.
- **Les lignes arrivent dans l'éditeur de l'application pendant l'appel** :
  - la page transmet à l'application le début de l'appel, chaque liste proposée par Camille (outil `devis_proposer`) et la fin de l'appel ;
  - l'application relit les lignes avec les mêmes fonctions de `@menao/core` que le serveur ;
  - à la fin de l'appel, les lignes enregistrées par le serveur font foi.
- Le brouillon d'un appel précédent se reprend ou s'écarte comme sur le site. Il est clos dès que le devis est enregistré. `voiceDraftLines` est partagé dans `@menao/validation`.
- **Aucun achat dans l'application** (CLAUDE.md règle 10) : minutes épuisées, la page le dit sans parler de recharge.
- La page est ouverte malgré la page d'attente (`appli` dans les adresses toujours servies), n'est pas indexée et reste statique.
- Pas de bouton sur la version web de l'application : le site a déjà le sien.

## Conséquences
- À vérifier sur iPhone (Expo Go) une fois la page en ligne : autorisation du micro, son de l'appel, lignes en direct.
- Plus tard : le même appel par téléphone sur la ligne de l'artisan, reconnu par son numéro.
