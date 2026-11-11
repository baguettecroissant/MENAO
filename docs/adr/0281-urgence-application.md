# ADR 0281 — L'urgence dans le parcours de demande de l'application (F-130)

- Statut : accepté
- Date : 11 novembre 2026
- Reprend dans l'application iPhone l'ADR 0279 (site), d'après la maquette « UrgenceMobile » du lot 29 (validée le 11/11/2026).

## Décision
- **Saisie** : bouton « Urgent » dans la barre de la carte, entre l'appareil photo et le micro ; il s'allume tout seul quand la description décrit une urgence (`detectUrgency`, même repérage que le site), avec un léger retour au toucher. Encart « Urgence détectée : … » avec « Ce n'est pas urgent », ligne des numéros d'urgence. Le choix du particulier part avec la demande (`urgency` d'`analyze-need`).
- **Analyse** : orbite réduite (220 points), grand titre, « Ce que nous avons compris » (métier, lieu, délai) en pastilles, étapes, bandeau « Demande urgente », faits. L'écran défile sur les petits téléphones.
- **Critères** : bandeau « Demande urgente » en tête ; groupe « L'essentiel » (artisan, adresse, « Quand ? » en quatre choix dont « Urgent » en premier) ; groupe « Votre chantier » (description, chantier, photos) ; autres métiers en bas. Les cartes à crayon de l'application sont gardées (pas de lignes comme sur le site) : c'est le geste habituel de l'application, et chaque carte reste lisible au pouce.
- **Enregistrement** : comme le reste des critères dans l'application, l'urgence est enregistrée au lancement de la recherche (`set_project_urgency`, seulement si le particulier l'a changée), avant les critères.
- **Résumé du besoin** (résultats, envoi) : « Urgent » à la place de la date.

## Conséquences
- Rien à déployer côté serveur : la base et `analyze-need` sont déjà en ligne (ADR 0279). Les écrans arrivent avec la prochaine mise à jour de l'application (Expo Go : rechargement).
- TODO(legal) : la ligne des numéros d'urgence reste à faire relire, comme sur le site.
