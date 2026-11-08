# ADR 0250 — Ma vitrine et Mon profil repensés (refonte « Nette », lot 5)

- Statut : accepté
- Date : 8 novembre 2026
- Suite des ADR 0245 à 0249. Lot 5 maquetté (ordinateur, téléphone, application) et validé le 8 novembre.

## Décision
- **Ma vitrine** : grand titre « Ma vitrine » et phrase d'introduction au-dessus des onglets (Ma fiche, Avis, Mon grade), comme l'« Argent » ; les titres des onglets passent au niveau 2.
- **Ma fiche** : chiffres clés (fiche complétée `profileStrength`, note des clients, temps de réponse) ; à gauche, un **aperçu encadré** (visible ou non et pourquoi, liens « Modifier », en-tête identique à celui des particuliers) ; à droite, une **liste à cocher** des six éléments d'une fiche convaincante (faits cochés, à faire avec leur conseil et leur lien) et l'adresse web ; puis la suite de la fiche telle que la voient les particuliers. Sur téléphone, la liste passe avant l'aperçu.
- **Avis** : chiffres clés (note globale, avis vérifiés, sans réponse) ; filtres **Tous / Sans réponse / 4 étoiles ou moins** (`?filtre=`) ; à droite, la note détaillée et « Comment ça marche ».
- **Mon profil** : grand en-tête (photo, nom, entreprise, badges) avec « Voir ma fiche » et « Carte de visite » ; carte **« Prochaine étape »** sur fond bleu clair (anneau de complétude, conseil et son bouton) ; rubriques en listes, icônes de couleur par rubrique et **états en pastille**.
- **Application** : même modèle sur Mon profil et sur les Avis ; aucune ligne sur l'abonnement ni sur les factures MENAO (règle 10).

## Conséquences
- `PublicProfileScreen` reçoit la complétude (`strength`) ; `ReviewsScreen` un filtre ; `SectionTabs` un en-tête pour « Ma vitrine ».
- Filtres et chiffres des avis par `reviewFigures` et `reviewMatches` (@menao/core), mêmes règles sur le site et dans l'application ; « 4 étoiles ou moins » n'apparaît que s'il y a de tels avis.
- Écarts assumés : la note reste le score MENAO en pourcentage (pas une note sur 5) ; « Demander un avis » reste « Comment ça marche » (les avis sont demandés automatiquement à la fin du chantier).
