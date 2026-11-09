# ADR 0259 — Back-office restant repensé (refonte « Nette », lot 14)

- Statut : accepté
- Date : 9 novembre 2026
- Suite des ADR 0245 à 0258 (back-office : ADR 0252). Lot 14 maquetté par type d'écran (liste, fiche, dossier, à surveiller, paiements, lancement, marché, journal, IA, référentiels, personnes, double authentification) et validé le 9 novembre. Site seulement.

## Décision
- Les ~30 pages restantes du back-office suivent les modèles validés grâce à leurs briques communes :
  - **titres** plus grands (Inter Tight) et introductions plus lisibles sur toutes les pages ;
  - **filtres** (`FilterChips`) soulignés, comme les listes de l'espace pro, avec leur nombre ;
  - **chiffres clés** (`SummaryTiles`) dans un seul cadre séparé par des filets, valeurs en grand (paiements, abonnements, parrainages, IA, partenaires) ;
  - **tableaux** (`admin-table`) : en-têtes en petites capitales sur fond beige, lignes séparées par un filet, survol beige ;
  - **sections des fiches** (`DetailSection`) : titres en Inter Tight ;
  - **recherche** plus arrondie ; onglets du lancement en bleu nuit.
- **Double authentification** : polices Inter, badge bleu nuit, une seule carte centrée.
- Les fiches (chantier, demande, personne, dossier) gardaient déjà leurs deux colonnes ; le fil d'un dossier montre les réponses de l'équipe en bulles bleu nuit (ADR 0258).

## Conséquences
- Écarts assumés :
  - pas de chiffres clés ajoutés aux listes qui n'en avaient pas (demandes, chantiers, personnes) : leurs filtres donnent déjà les nombres ;
  - la recherche reste sous le titre au lieu d'être à sa droite ;
  - pas de réponses types ni de décision « Faire reprendre / Annuler » ajoutées aux dossiers (actions existantes inchangées) ;
  - la carte du marché garde son composant actuel.
