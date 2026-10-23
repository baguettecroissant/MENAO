# ADR 0170 — Un seul envoi pour plusieurs métiers

- Statut : accepté
- Date : 23 octobre 2026
- Suite des ADR 0167 à 0169, dernier point du plan validé le 23 octobre 2026 : « une section par métier, et un seul envoi pour contacter des artisans de chaque métier ».

## Décision
- **Résultats du chantier** (projet principal) :
  - sous les artisans du métier principal, chaque autre métier a sa section : nombre d'artisans trouvés, date de début (ADR 0169) et les artisans de la zone, à cocher ;
  - un métier sans artisan dans la zone garde le lien vers sa page, qui propose ceux d'un peu plus loin (ADR 0165).
- **Une seule barre d'envoi**, après tous les métiers :
  - elle compte les artisans cochés dans tous les métiers ;
  - elle bloque les cases au-delà de 3 artisans par métier, moins ceux déjà contactés.
- **Adresse de la page d'envoi** : `artisan=<id>` pour le métier principal, `lot=<lot>.<artisan>` pour les autres. On peut ne cocher que d'autres métiers.
- **Un seul formulaire** : le message, le téléphone et la préférence de rappel valent pour tous les artisans. Chaque artisan reçoit la demande de son métier.
- **Tout ou rien** : `send_chantier_requests` enchaîne `send_project_requests` pour chaque métier, dans une seule transaction.
  - Les règles de chaque métier ne changent pas : 3 artisans au plus, artisans toujours disponibles, limite des projets ouverts comptée par chantier.
  - Si un métier est refusé, rien ne part, et le message nomme le métier (« Carreleur : … »).
- **Sans compte** : la création du compte, la connexion et Google ou Apple gardent toute la sélection, y compris celle des autres métiers.
- **Confirmation** : elle reprend tous les artisans contactés dans cet envoi, puis propose les métiers qui restent.
- **Inchangé** : la page d'un métier et la fiche d'un artisan permettent toujours un envoi pour ce seul métier ; l'application aura le même parcours dans une PR suivante.

## Conséquences
- **Migration** `20261023061330_envoi_plusieurs_metiers.sql` : fonction `send_chantier_requests`.
- **Test pgTAP** `92_envoi_plusieurs_metiers`.
- **Validation** : `lotSelectionSchema` et `encodeLotSelection`.
- **Une demande jugée suspecte** (ADR 0157) ouvre un ticket par métier, comme si les envois avaient été faits l'un après l'autre.
- **Après la fusion** : `db push` sur staging ; aucune fonction Edge à redéployer.
- **Pas de nouvelle dépendance.**
