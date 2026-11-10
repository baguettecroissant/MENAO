# ADR 0273 — Téléphones tenus naturellement et photo de la côte (lot 27)

- Statut : accepté
- Date : 10 novembre 2026
- Suite de l'ADR 0271 (photos de Julien et de Camille) et de l'ADR 0264 (section « Où intervient MENAO ? »).

## Contexte
Dans cinq photos du lot 25, le téléphone était tourné vers l'objectif pour y incruster un vrai écran. Résultat : des poses fausses (personne qui regarde le dos de son téléphone, main à l'envers) et un écran trop petit pour être lu. Sur l'accueil, la carte dessinée de la section « Où intervient MENAO ? » faisait pauvre à côté des photos.

## Décision
- **Cinq scènes refaites** avec la même chaîne (mêmes personnages, mêmes décors) : la personne regarde son écran, on voit le dos du téléphone. Aucun écran incrusté dans ces photos ; le produit se montre dans les mockups (ADR 0270), pas dans les mains des personnages. Mêmes noms de fichiers, mêmes emplacements.
- **Photo de la côte** à la place de la carte dans `ZoneSection` (accueil) : image d'illustration générée, qui ne reproduit pas un lieu précis ; son texte alternatif ne nomme aucune ville. Les communes restent listées sous la photo.
- **La carte `ZoneMap` reste** sur les pages métier-ville, où elle situe la commune.
- Textes alternatifs mis à jour (`fr.site.scenes`). Aucun texte visible ajouté ni modifié.
- Provenance et prompts exacts dans `docs/images/photos-generees.md`.

## Conséquences
- `camille-artisans` garde son écran incrusté : la vue par-dessus l'épaule y est naturelle.
- Le film de vente (hors dépôt) part des anciennes photos : à reprendre si ces poses gênent aussi à l'écran.
- Le TODO(legal) de l'ADR 0271 sur le signalement des images générées vaut aussi pour la photo de la côte.
