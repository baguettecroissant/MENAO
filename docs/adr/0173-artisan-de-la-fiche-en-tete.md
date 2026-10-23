# ADR 0173 — L'artisan de la fiche publique en tête des résultats

- Statut : accepté
- Date : 23 octobre 2026
- Plan SEO, phase D (ADR 0144) : point choisi par l'utilisateur le 23 octobre 2026. Un client qui arrive depuis la fiche publique d'un artisan doit le retrouver en tête de ses résultats, présélectionné.

## Décision
- **Fiche publique** : le bouton « Décrire mon projet » ouvre `/recherche?metier=<métier>&fiche=<artisan>&nom=<prénom>`.
  - Le texte d'aide annonce que l'artisan sera proposé en premier s'il intervient chez le client.
  - La saisie affiche le même bandeau que « Redemander un devis » (ADR 0040).
- **Contrôle par le serveur** : `analyze-need` retient l'artisan comme préféré du projet (`projects.preferred_artisan_id`) seulement si sa fiche est en ligne (`slug`) et son dossier validé. Sinon, c'est une recherche ordinaire.
- **Résultats** :
  - L'artisan préféré est présenté en premier et présélectionné, s'il remplit les conditions habituelles (métier, zone, disponibilité). Le particulier peut le retirer de sa sélection.
  - La mention « Déjà venu chez vous » ne s'affiche qu'après un vrai chantier commun : jamais pour un artisan venu de sa fiche.
  - Si l'artisan n'intervient pas pour ce besoin, le message « … n'est pas disponible pour cette demande » s'affiche avec son nom, lu sur sa fiche.
- **Critères de classement** : l'exception couvre maintenant les deux cas, « Redemander un devis » et recherche depuis une fiche. La place ne vaut que pour la demande du particulier et ne dépend d'aucun paiement. Page datée du 23 octobre 2026, toujours en cours de validation juridique (TODO(legal), art. L111-7 du code de la consommation).
- **Hors champ** :
  - Les lots d'un chantier à plusieurs métiers (ADR 0167) ne reprennent pas l'artisan préféré, qui ne vaut que pour le métier principal.
  - L'application n'a pas de fiche publique.

## Conséquences
- **Pas de migration** : la colonne `preferred_artisan_id` existe déjà.
- **Après la fusion** : redéployer `analyze-need`.
- **Test de bout en bout** : depuis la fiche d'Inès, elle est proposée en premier et cochée d'office, sans la mention « Déjà venu chez vous ».
- **Pas de nouvelle dépendance.**
