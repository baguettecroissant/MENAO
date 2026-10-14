# ADR 0089 — Site sur téléphone : résultats en carrousel, résumé du besoin et « Mes chantiers » sur une page

- Statut : accepté
- Date : 14 octobre 2026

## Contexte
L'audit des maquettes du 14 octobre 2026 relève trois écarts sur le site.

- **Résultats sur téléphone** : liste verticale de cartes sous le grand bloc « Résumé de mon besoin ». La spécification (F-09, « mobile : carrousel horizontal ») et la maquette « Résultat de recherche - in app » montrent une bande compacte du besoin puis un carrousel, comme l'application depuis l'ADR 0085.
- **Envoi de la demande sur téléphone** : la maquette met une bande « Résumé de mon besoin » en premier.
- **Fiche artisan** : à côté du menu latéral (1 280 px), le bouton « Envoyer une demande » passait sur deux lignes.
- **« Mes chantiers » sur téléphone** : onglets « Chantiers en cours / Chantiers terminés ».
  - Les maquettes montrent deux versions.
  - Choix du 14 octobre 2026 : une seule page partout, comme l'application (ADR 0086).

## Décision
- **Bande « Résumé de mon besoin »** (`ProjectSummaryBand`), sur téléphone et tablette seulement :
  - métier, lieu, date et nombre de photos en icônes, crayon vers la vérification des critères ;
  - le bloc complet reste dans la colonne de gauche sur ordinateur ;
  - résultats : la bande remplace le bloc en haut ;
  - envoi de la demande : la bande passe en premier, avant les artisans sélectionnés.
- **Résultats en carrousel** sous 640 px : cartes de 16,5 rem qui s'enclenchent, la suivante dépasse. Au-delà, la grille actuelle est conservée.
- **Fiche artisan** : libellé du bouton « Envoyer une demande » sur une ligne.
- **« Mes chantiers »** sur une seule page, sur ordinateur comme sur téléphone :
  - en cours, demandes en attente, recherches non envoyées, puis chantiers terminés (section affichée seulement s'il y en a) ;
  - le composant d'onglets `SectionTabs`, devenu inutile, est supprimé.
- Aucune migration, aucune nouvelle dépendance.

## Conséquences
- Le site sur téléphone suit les maquettes mobiles et l'application pour la recherche et « Mes chantiers ».
