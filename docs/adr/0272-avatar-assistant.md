# ADR 0272 — Avatar de l'assistant écrit (lot 26)

- Statut : accepté
- Date : 10 novembre 2026
- Suite des ADR 0218 (assistant des pages Pro), 0220 (assistant des particuliers) et 0236 (assistant de l'espace artisan). Lot 4 du plan « mockups, images, vidéo » : sept pistes maquettées, piste E retenue le 10 novembre (« la E en vectoriel »).

## Décision
- **Une petite maison souriante en relief**, tirée du logo (le toit et le sourire, avec deux yeux), dessinée en SVG dans `AssistantAvatar` : nette à toutes les tailles, sans image à charger.
- **Pas un visage humain** : l'assistant ne se présente pas comme une personne, et le site ne gagne pas un personnage de plus à côté de Julien et de Camille (ADR 0271).
- **Où** : la bulle en bas à droite (à la place de l'icône de discussion), l'en-tête de la fenêtre (à la place du logo) et à gauche des messages de l'assistant, pour les assistants écrits du site (particuliers, pages Pro) et de l'espace artisan. Le simulateur d'entraînement des commerciaux, qui joue un prospect, ne l'utilise pas.
- **Clignement discret** des yeux toutes les six secondes dans la bulle et l'en-tête, désactivé si l'utilisateur limite les animations.
- **Aucun texte modifié** : l'assistant reste « Assistant MENAO », avec sa mention « IA ». Camille, la secrétaire téléphonique, reste sans visage.

## Conséquences
- L'application mobile garde son icône actuelle : à aligner dans un lot à part si souhaité.
- L'essai généré qui a servi de modèle reste hors du dépôt ; le dessin livré est entièrement vectoriel et fait à la main.
