# ADR 0165 — Zone élargie

- Statut : accepté
- Date : 22 octobre 2026
- Lot 1 du plan V1.1 (« À 72 h sans réponse : nouveaux artisans proposés au particulier, zone élargie si besoin »), reporté par l'ADR 0156 et demandé le 22 octobre 2026.

## Décision
- **Quand** (`showWiderZone`) : s'il reste des places au particulier et qu'aucun artisan de la zone n'est encore à contacter, soit qu'aucun ne couvre son secteur, soit qu'il les a déjà tous sollicités (par exemple après 72 h sans réponse, ADR 0156). Des artisans un peu plus loin lui sont alors proposés.
- **Qui** (`match_artisans`, colonne `hors_zone`) : les artisans qui répondent à tout le reste (visibles, métier, hors pause et absence, budget minimum, ADR 0164) et dont la zone s'arrête à **20 km au plus** du chantier (`ZONE_WIDENING_KM`) :
  - **zone en rayon** : base à moins de rayon + 20 km ;
  - **zone en communes** : base à moins de 20 km.
- **Ordre** : ils sont renvoyés après tous les artisans de la zone, du plus proche au plus éloigné, avec la distance au chantier. Les artisans de la zone gardent leur ordre au mérite (ADR 0155) et la place réservée aux nouveaux (ADR 0151).
- **Affichage** (site et application) : une carte « Un peu hors de sa zone ».
  - **Aucun artisan dans le secteur** : la page l'annonce et montre ceux d'un peu plus loin.
  - **Tous déjà sollicités** : une section « Un peu plus loin » s'ajoute sous les résultats.
  - **Même parcours** : sélection, fiche, envoi.
- **Côté artisan** :
  - la demande est notée `requests.hors_zone` ;
  - le détail l'indique, avec la possibilité de la décliner sans pénalité (motif « Hors zone », déjà existant) ;
  - la zone de l'artisan ne change pas.
- **Contrôle à l'envoi** : `send_project_requests` accepte un artisan de la zone ou de la zone élargie et note ces derniers. Une sélection hors de ces deux listes reste refusée.

## Conséquences
- **Migration** : `zone_elargie`. `match_artisans` gagne la colonne `hors_zone` (supprimée puis recréée) ; `send_project_requests` et `artisan_request_detail` sont redéfinies. Tests pgTAP : `88_zone_elargie`.
- **Après la fusion** : pousser la migration, après celle de l'ADR 0164.
- **Pas de nouvelle dépendance.**
