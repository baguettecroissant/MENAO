# ADR 0167 — Chantier à plusieurs métiers : un lot par métier

- Statut : accepté
- Date : 23 octobre 2026
- Constat de l'utilisateur : une recherche « réfection de salle de bains » ne proposait qu'un métier, alors qu'il en faut plusieurs. Plan validé le 23 octobre 2026 (« fais ce que tu recommandes »).

## Contexte
- La V1 (F-06) prévoit un seul métier par projet. L'IA retenait « le corps de métier principal » et écartait les travaux des autres métiers.
- La recherche, les demandes (3 artisans au plus), le chantier et le devis reposent sur ce métier unique.
- La limite de 2 projets ouverts (ADR 0157) bloquait en plus le client qui aurait relancé une recherche par métier.

## Décision
- **Détecter tous les métiers** :
  - **IA** : `analyze-need` renvoie le métier principal et les métiers complémentaires, chacun avec ses travaux (`metiers_complementaires`, `extraTrades`). Une réparation ponctuelle n'en a aucun ;
  - **référentiel des chantiers composés** (`COMPOSITE_PROJECTS`, `compositeTrades`) : salle de bains, cuisine, combles, extension, logement entier. Il complète l'IA de façon fiable, seulement avec une intention de rénover, créer ou construire, jamais pour une réparation ou un seul ouvrage. Un jeu de descriptions types le vérifie en CI ;
  - **lots proposés** (`suggestedLots`, `projects.suggested_lots`) : ceux de l'IA d'abord, puis ceux du référentiel, sans le métier principal, **4 au plus**.
- **Le client choisit** : à l'étape des critères, la carte « Autres métiers du chantier » (site et application) montre les métiers proposés, à cocher, et permet d'en ajouter (`set_project_lot_trades`, `projects.lot_trades`). Rien n'est coché d'office.
- **Un lot par métier**, au lancement de la recherche (`validate_project_criteria`, puis `app.sync_project_lots`) :
  - chaque métier choisi devient un projet rattaché au projet principal (`parent_project_id`) ;
  - le lot reprend la description, la demande en bref, le lieu, les pièces, la surface, le budget, la date et l'adresse, avec les travaux proposés pour ce métier ;
  - **photos partagées** : mêmes fichiers (unicité par projet et par chemin), copiées au lancement puis suivies (`app.sync_lot_photos`). L'artisan d'un lot lit les photos du dossier du chantier ;
  - **lot retiré** : supprimé tant qu'aucune demande n'est partie. Un lot déjà envoyé ne change plus ;
  - un lot n'a pas ses propres lots. Ses critères sont ceux du chantier : sa page de critères renvoie à celle du chantier.
- **Tout le reste fonctionne lot par lot**, sans refonte : recherche (`match_artisans` sur le métier du lot, zone élargie et budget minimum compris), demandes avec **3 artisans au plus par métier**, devis, chantier et paiements.
- **Session anonyme rattachée au compte** (`claim_project`) : tout le chantier passe au compte, projet principal et lots, quel que soit le lien de transfert ouvert.
- **Limite des 2 chantiers ouverts** (ADR 0157, `app.particulier_open_projects`) : elle compte le chantier entier, projet principal et lots ensemble.
- **Résultats** :
  - **projet principal** : sous ses artisans, « Les autres métiers de votre chantier » donne, pour chaque lot, le nombre d'artisans trouvés et un lien vers ses résultats ;
  - **lot** : un bandeau le situe dans le chantier, avec un lien de retour ;
  - les lots n'apparaissent pas parmi les recherches en brouillon.
- **Côté artisan** : le détail de la demande indique « Ce chantier prévoit aussi : … » (`autres_metiers`), sans jamais les coordonnées des autres artisans.
- **Une entreprise pour tout le chantier** (recommandation retenue) :
  - un artisan qui exerce plusieurs métiers peut être choisi pour plusieurs lots, avec une demande et un devis par lot ;
  - MENAO ne propose pas de chantier « clé en main » coordonné, et chaque artisan reste responsable de ses travaux. L'interface le dit : « Chaque artisan intervient pour son métier et établit son propre devis. »
- **Pas dans ce lot** :
  - un envoi unique pour tous les métiers (un envoi par lot pour l'instant) ;
  - le regroupement des lots dans « Mes chantiers » (chaque lot y apparaît sous son métier) ;
  - l'ordre indicatif des métiers et une date par lot (coordination) ;
  - les pistes de Mickaël (devis à plusieurs avec ses partenaires, « je transmets à mon partenaire ») ;
  - l'évaluation de l'IA sur un jeu de descriptions réelles, qui demande des appels payants au modèle.

## Conséquences
- **Migration** : `chantier_plusieurs_metiers`. Tests pgTAP : `90_chantier_plusieurs_metiers`.
- **Après la fusion** :
  - pousser la migration, après celles des ADR 0164 à 0166 ;
  - redéployer `analyze-need`.
- **[TODO(legal)]** : plusieurs artisans indépendants sur un même chantier, sans coordination par MENAO. À préciser dans les CGU (rôle d'intermédiaire, pas de maîtrise d'œuvre).
- **Pas de nouvelle dépendance.**
