# ADR 0213 — Zone d'intervention par département, région ou France entière

- Statut : accepté
- Date : 31 octobre 2026
- F-68, demandé le 31 octobre 2026.

## Contexte

L'artisan choisissait un rayon autour de son adresse (100 km au plus à l'écran) ou une liste de communes. Une entreprise qui couvre un département, une région ou tout le pays ne pouvait pas le dire.

## Décision

- **Trois modes de plus** : `departements`, `regions`, `france`. Plusieurs départements ou régions se cumulent (06 + 83) ; la France entière est un choix à part.
- **Toutes les formules** y ont droit, sans contrôle d'abonnement.
- **Adresse de départ toujours demandée**, y compris pour la France : elle sert à la distance, à la zone élargie (ADR 0165) et à la fiche.
- **Couverture** : le code INSEE de la commune du chantier donne son département, puis sa région (`app.artisan_couvre_territoire`).
- **Classement** : les zones région et France passent après les artisans de proximité (rayon, communes, départements). Dans chaque groupe, l'ordre au mérite ne change pas ; la distance à l'adresse de départ départage désormais aussi les zones par territoire. Critère ajouté à la page publique des critères de classement (`TODO(legal)` : à relire avec le juriste).
- **Affichage** : `app.artisan_zone_labels` renvoie les communes ou les territoires dans le champ existant (`zone_communes`), ce qui évite de toucher aux cartes et aux fiches.
- **Référentiel** : tables `departements` et `regions` (lecture publique) et constantes de `packages/core/src/zone-territories.ts`, pour chercher sans appel réseau.

## Conséquences

- **Deux migrations** : une valeur d'enum ajoutée ne peut servir qu'une fois sa migration validée.
- **Nouvelle table** `artisan_territories`, avec RLS et tests pgTAP (`112_zone_territoires`). Elle est incluse dans les exports RGPD.
- **Après la fusion** : `db push` sur staging. Aucune Edge Function à déployer.
- **Application native** : il faut un nouveau build. Un ancien build ne sait pas lire un artisan en zone territoire (fiche publique, écran « Zone »).
- **Carte du marché du back-office** : elle ne compte encore que les rayons pour estimer la couverture d'une commune. Les tableaux de lancement, eux, comptent les territoires.
- **Pas de nouvelle dépendance.**
