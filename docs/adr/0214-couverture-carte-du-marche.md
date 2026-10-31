# ADR 0214 — Couverture de la carte du marché, tous modes de zone

- Statut : accepté
- Date : 31 octobre 2026
- Suite de l'ADR 0181 (carte du marché) et de l'ADR 0213 (F-68).

## Contexte

L'entonnoir de la carte du marché calculait la couverture d'une commune dans `packages/core`, à partir du rayon seul. Les artisans en mode communes, département, région ou France comptaient pour zéro : une commune bien couverte pouvait apparaître « À recruter ».

## Décision

- **Calcul dans la base** : `admin_market` renvoie `couverture` pour chaque ligne commune + métier, avec la même règle que `admin_launch_coverage` (artisan validé, du métier, commune choisie, rayon ou territoire). `coveringArtisans` et `distanceKm` disparaissent de `packages/core`.
- **Zones larges isolées** : `couverture_large` compte les régions et la France, affichées à part dans l'entonnoir. Sans cela, une seule entreprise nationale ferait disparaître « À recruter » pour tout son métier, sans qu'on le voie.
- **« À recruter » reste strict** : aucun artisan validé du métier ne couvre la commune, zones larges comprises.
- **Dessin** : seuls les rayons sont tracés. Les contours des départements et des régions demanderaient un fichier de géométrie ; les autres zones se lisent au survol du point (`zone_labels`), et une note indique combien d'artisans sont concernés quand la couche « Zones d'intervention » est affichée.

## Conséquences

- **Une migration**, à pousser sur staging. Aucune Edge Function.
- **Tests** : `113_carte_marche_territoires` (pgTAP), `market-map.test.ts` (entonnoir).
- La couverture de `demandByCommune` n'existe plus : elle dépend du métier et ne s'additionne pas.
- **Pas de nouvelle dépendance.**
