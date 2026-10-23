# ADR 0169 — Date souhaitée par métier

- Statut : accepté
- Date : 23 octobre 2026
- Suite des ADR 0167 (un lot par métier) et 0168 (parcours), dans le plan validé le 23 octobre 2026 : chaque lot reprenait la date du chantier, le carreleur croyait donc être attendu le premier jour, en même temps que le plombier.

## Décision
- **Une date propre à chaque métier**, facultative :
  - choisie par le particulier sur le chantier (`projects.lot_dates` du projet principal : `{ "<métier>": { date_mode, date_souhaitee } }`), avec `set_lot_start` ;
  - choix possibles : « Comme le reste du chantier » (aucune date propre), « Dès que possible », une date précise (jamais passée, comme pour le chantier), « Date de début inconnue ».
- **Application** :
  - un lot déjà créé et pas encore envoyé prend la nouvelle date aussitôt ;
  - un lot envoyé garde la date reçue par les artisans ;
  - à chaque lancement de la recherche, `sync_project_lots` reprend la date propre au métier, sinon celle du chantier ; une date propre devenue passée est ignorée.
- **Écrans** (site et application) : dans « Les autres métiers de votre chantier », chaque lot affiche « Début souhaité : … » et, tant qu'il n'est pas envoyé, un lien « Modifier ».
- **Indicatif** : chaque artisan fixe ses dates avec le client et MENAO ne coordonne pas les travaux (ADR 0167).
- **Pas dans ce lot** : un seul envoi pour tous les métiers.

## Conséquences
- **Migration** `20261023055033_date_par_metier.sql` : colonne `lot_dates`, fonction `set_lot_start`, `sync_project_lots` redéfinie.
- **Test pgTAP** `91_date_par_metier`.
- **Core** : `lotStart` lit la date propre à un lot.
- **Après la fusion** : `db push` sur staging ; aucune fonction Edge à redéployer.
- **Pas de nouvelle dépendance.**
