# ADR 0182 — Demande de la zone montrée aux artisans qui s'inscrivent

- Statut : accepté
- Date : 24 octobre 2026
- Proposition du 24 octobre 2026, acceptée par l'utilisateur avec la carte du marché (ADR 0181). Sur les 14 derniers jours, 22 recherches sont allées jusqu'aux résultats sans qu'aucune demande ne parte, faute d'artisans. Montrer cette demande à l'artisan qui s'inscrit l'encourage à finir son dossier.

## Décision
- **Sur la page du dossier** (« Faire vérifier mon entreprise », site et application), dès que l'artisan a choisi ses métiers et sa zone et tant qu'il n'est pas validé, une carte s'affiche : « Des particuliers cherchent déjà ».
  - Elle donne le nombre de recherches de ses métiers dans sa zone ces 30 derniers jours, avec le détail par métier s'il en a plusieurs.
  - Elle se termine par « Terminez votre dossier pour recevoir les prochaines demandes. »
- **Seuil de 5 recherches** sur les 30 derniers jours (`ZONE_DEMAND_MIN_SEARCHES`, choix de l'utilisateur du 24 octobre 2026) : en dessous, rien ne s'affiche, car un petit chiffre découragerait.
- **Des nombres seulement**, jamais une recherche, une description ni un particulier.
- **Formulation honnête** : on promet les prochaines demandes, pas les recherches passées, qui ne lui seront pas envoyées.

## Technique
- **`public.my_zone_demand()`** (`security definer`, réservée aux comptes connectés) compte, pour l'artisan du compte, les recherches des 30 derniers jours :
  - de l'un de ses métiers (les lots d'un chantier à plusieurs métiers comptent chacun pour leur métier) ;
  - situées dans sa zone : à moins de son rayon de son adresse de base (adresse de la recherche, sinon centre de sa commune), ou dans l'une de ses communes.
  - Elle renvoie le total et le détail par métier ; rien pour un compte sans fiche artisan.
  - Test pgTAP `99_demande_de_la_zone`.
- Les nombres incluent toutes les recherches, essais de l'équipe compris tant que le site tourne sur la base de staging.

## Conséquences
- Migration `demande_de_la_zone`. Après la fusion : `db push` sur staging.
- Pas de nouvelle dépendance.
