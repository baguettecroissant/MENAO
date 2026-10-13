# ADR 0070 — Application : photos du projet à la création de la demande (lot 6c, partie 4c)

- Statut : accepté
- Date : 13 octobre 2026

## Contexte
- Sur le site, le particulier joint jusqu'à 10 photos à la description de son projet (F-05), avant l'analyse. Il peut ensuite en ajouter ou en supprimer pendant la vérification des critères (F-07).
- Les artisans destinataires voient ces photos avec la demande.
- L'application ne proposait pas encore de photos à cette étape. Le module de photos existe depuis la partie 4b (ADR 0069).

## Décision
- **Saisie du projet** (`/recherche`), comme sur le site :
  - « Ajouter des photos » (appareil photo ou photothèque), 10 au plus, avec des miniatures et une croix « Retirer la photo » ;
  - après l'analyse, qui crée le projet, les photos sont envoyées une à une (destination `project_photo` de process-upload). L'écran animé affiche alors « Envoi de vos photos… » et sa dernière étape ;
  - si des photos n'ont pas pu être ajoutées, l'écran suivant le dit : « Vous pourrez les ajouter à l'étape suivante ».
- **Vérification des critères** : carte « Photos supplémentaires » :
  - ajout de photos, jusqu'à 10 par projet ;
  - suppression de la ligne puis du fichier, avec les droits du propriétaire (RLS), comme l'action serveur du site ;
  - messages d'erreur du site pour chaque statut de process-upload (projet verrouillé, limite, fréquence…).
- **Composants** : miniatures communes (`photo-thumbnails.tsx`) et carte des photos (`project-photos-card.tsx`).
- La session anonyme créée pour l'analyse (ADR 0012) sert aussi à l'envoi des photos.
- Aucun changement côté serveur.

## Limites
- **Dictée du projet** (ADR 0056) : pas encore de bouton de dictée comme sur le site. D'ici là, le micro du clavier du téléphone permet de dicter la description.

## Conséquences
- Dans la saisie du projet (phase 2), seule la dictée reste à faire dans l'application.
- **Parties suivantes** : réponse de l'artisan à l'avis du client (F-28), puis agenda.
