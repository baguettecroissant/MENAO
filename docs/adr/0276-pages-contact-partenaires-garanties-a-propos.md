# ADR 0276 — Refonte de Contact, Devenir partenaire, Garanties & Confiance et À propos (F-124, lot 28)

- Statut : accepté
- Date : 10 novembre 2026
- Suite des ADR 0261 (refonte « Nette » du site), 0271 et 0273 (photos de Julien et de Camille) et 0270 (mockups en grand). Maquettes du lot 28, validées le 10 novembre.

## Contexte
Le lot 16 n'avait donné à ces quatre pages que l'habillage commun (police, titres, pied de page) : elles restaient sans photo, avec de petites cartes et une mise en page d'octobre.

## Décision
- **Bandeau commun** : `PageHero` accepte une photo (`photo`), fondue dans le dégradé à droite, au-dessus du titre sur mobile, et un élément posé dessus (`overlay`). Les autres pages qui utilisent `PageHero` ne changent pas.
- **Briques communes** (`components/site/info-blocks.tsx`) : ligne à pictogramme, ligne cochée, étapes en grands numéros.
- **Contact** : photo dans le bandeau, les quatre raccourcis « Avant de nous écrire » avant le formulaire, formulaire dans une grande carte (e-mail et sujet côte à côte).
- **Devenir partenaire** : photo du rendez-vous et les deux cas récompensés en cartes dans le bandeau, bouton « Candidater » vers le formulaire, « Pour qui ? » en quatre cartes, étapes sur fond bleu nuit, récompenses et transparence côte à côte, candidature en deux colonnes.
- **Garanties & Confiance** : le dossier vérifié posé sur le portrait d'un artisan, les contrôles en liste à côté de la vraie fiche d'un artisan, le trajet de l'argent avec l'écran de l'acompte, la réception du chantier avec l'écran de l'avis, les données personnelles avec une photo, « En cas de problème » en trois cartes numérotées puis le classement, appel final avec photo.
- **À propos** : photo du rendez-vous, mission avec les deux portraits, engagements sur fond bleu nuit avec les trois chiffres de l'accueil (`fr.trust.stats`), zone avec la photo de la côte, « En savoir plus » en grille, appel final avec photo.
- **Textes** : titres et textes inchangés. Seuls ajouts : le bouton « Candidater » du bandeau (libellé du titre du formulaire) et les trois chiffres de l'accueil sur À propos.

## Conséquences
- La section « L'équipe » d'À propos (décidée le 9 novembre) n'est pas affichée : elle attend les photos, noms, rôles et présentations.
- Le visuel dessiné de l'avis (`ReviewVisual`) est supprimé : la page montre le vrai écran.
- Aucune migration, aucune fonction : site seulement.
