# ADR 0042 — La recherche d'artisans dans l'espace client

- Statut : accepté
- Date : 12 octobre 2026
- Complète les ADR 0034 (coques site et application), 0035 (menu latéral) et 0040 (nouvelles demandes depuis l'espace).

## Contexte
- Depuis son espace, « Démarrer un chantier » (bouton, barre de recherche de l'en-tête, bouton central sur mobile) menait à la page publique `/recherche` : en-tête du site, plus de menu latéral.
- Toutes les étapes suivantes (critères, artisans, fiche, envoi) gardaient aussi l'en-tête du site. Le client avait l'impression de quitter son espace pour un autre site.
- La page publique `/recherche` est une page d'entrée du site, pré-générée et mise en cache (règle 13, spec §4.4). Lire la session dans sa mise en page la rendrait dynamique pour tous les visiteurs.

## Décision
- **Pas d'iframe** : elle créerait un double défilement, casserait le bouton retour et l'adresse de la page, compliquerait l'accessibilité et le redimensionnement, et doublerait le chargement. Les mêmes composants sont rendus dans la coque de l'espace client.
- **Saisie** : `/mon-espace/nouvelle-demande`, dans l'espace client (menu latéral, « Mes chantiers » actif). C'est le même formulaire que la page publique (texte, dictée, photos, analyse, raccourcis métiers, bandeau « Redemander un devis »), réservé à un compte particulier connecté.
  - Elle est accessible depuis « Démarrer un chantier », la barre de recherche de l'en-tête, le bouton central sur mobile et « Redemander un devis ».
- **Étapes d'un projet** (`/recherche/[id]/…` : critères, artisans, fiche artisan, envoi, confirmation) : une mise en page propre choisit la coque.
  - Espace client pour un compte particulier connecté.
  - En-tête du site sinon (visiteur, session anonyme de recherche, autre rôle).
  - Ces pages, propres à un projet, étaient déjà dynamiques.
- **Page publique** : elle passe dans un groupe de routes `recherche/(saisie)` avec sa mise en page (en-tête du site), et reste pré-générée. Les adresses ne changent pas.
- **Largeurs** :
  - La grille des résultats suit la place disponible (requêtes de conteneur) plutôt que la largeur de l'écran : 2 colonnes à côté du menu latéral, 3 sur le site public comme avant.
  - La barre collante de la fiche artisan se colle sous l'en-tête dans la largeur du contenu (`sticky`), au lieu d'occuper toute la largeur de l'écran par-dessus le menu latéral (`fixed`).

## Conséquences
- Un visiteur qui crée son compte au moment d'envoyer sa demande passe dans l'espace client dès qu'il est connecté (étape d'envoi, confirmation).
- Le parcours public (visiteur) ne change pas.
