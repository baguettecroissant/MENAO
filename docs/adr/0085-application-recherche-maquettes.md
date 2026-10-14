# ADR 0085 — Application : recherche, fiche artisan et envoi de la demande d'après les maquettes

- Statut : accepté
- Date : 14 octobre 2026

## Contexte
- Les maquettes mobiles montrent la recherche dans l'application :
  - « Résultat de recherche - in app » : bande « Résumé de mon besoin », titre, carrousel horizontal de cartes, dernière carte « Vous ne trouvez pas votre artisan idéal ? » ;
  - « Fiche artisan » : grande photo, identité, cartes d'informations, sections ;
  - « Envoyez votre demande de chantier » : bandes du besoin et de l'artisan sélectionné, message, coordonnées, préférence de rappel.
- La spécification (F-09) prévoit « mobile : carrousel horizontal ».
- L'application affichait une liste verticale de cartes, une fiche en cartes empilées et un formulaire sans résumé.
- L'envoi du dossier à l'équipe MENAO (`send_project_to_menao`, F-56) existait sur le site seulement.

## Décision
- **Résumé du besoin** (`NeedSummaryBand`), bande blanche en haut des résultats et de l'envoi :
  - métier, ville, date souhaitée et nombre de photos, en icônes comme la maquette (`loadNeedSummary`) ;
  - le crayon revient à la vérification des critères ;
  - un bouton retour est ajouté à gauche : la maquette n'en a pas, mais l'écran en a besoin.
- **Résultats en carrousel** (`ArtisanTile`) :
  - cartes de 236 px qui s'enclenchent ; la suivante dépasse pour inviter à faire défiler ;
  - contenu : photo, nom, « Électricien depuis 8 ans », zone et distance, disponibilité (verte si immédiate), deux spécialités au plus puis « +N » ;
  - un appui ouvre la fiche ;
  - la sélection jusqu'à 3 artisans (F-11, D2) est conservée, par une coche en haut à droite de la photo. La maquette n'en a pas, mais l'envoi groupé existe ; un artisan déjà sollicité porte « Demande envoyée ».
- **Dernière carte** : « Vous ne trouvez pas votre artisan idéal ? », avec les textes du site, sans la promesse de la maquette (« au moins un artisan sous 7 jours », F-01). Elle ouvre l'envoi du dossier à MENAO, comme sur le site : message facultatif, e-mail demandé à une recherche anonyme.
- **Fiche artisan** :
  - grande photo bord à bord (photo de l'artisan, sinon une réalisation), avec un retour rond et la barre d'état claire ;
  - « Prénom - Métier », disponibilité, cartes d'informations défilantes (expérience, zone, temps de réponse en valeur courte) ;
  - présentation repliée avec « Voir plus », arc décoratif du score ;
  - chantiers récents en grille de trois colonnes, ouverts en grand ;
  - avis dans une seule carte, chacun marqué « Avis vérifié » (seuls les clients d'un chantier peuvent noter, F-28).
- **Envoi de la demande** :
  - bandes du besoin et des artisans sélectionnés, en haut (le crayon de la sélection revient aux résultats) ;
  - message dans une carte avec compteur, préférence de rappel en boutons radio ;
  - bouton et délai de réponse en pied d'écran.
- **Confirmation** : coche bleue, comme la maquette.
- Aucune migration, aucune nouvelle dépendance.

## Conséquences
- Le parcours de recherche de l'application suit les maquettes mobiles.
- L'envoi du dossier à MENAO est disponible dans l'application comme sur le site.
