# ADR 0121 — Contrôle aléatoire de 5 % des dossiers chaque mois

- Statut : accepté
- Date : 18 octobre 2026
- Complète les ADR 0045 (back-office) et 0120 (vérification côte à côte).

## Contexte
- **Cahier des charges du CEO** : « Contrôle aléatoire : chaque mois, revérification de 5 % des dossiers (appel à l'assureur si doute). »
- **Décision de l'utilisateur** (18 octobre 2026) : le mettre en place.

## Décision
- **Tirage** (`app.draw_spot_checks`) :
  - le 1er de chaque mois à 6 h UTC (`pg_cron`), ou à la demande d'un admin en double authentification (« Lancer le tirage du mois », `admin_draw_spot_checks`) ;
  - cible : 5 % des artisans validés, arrondis au supérieur (`spotCheckTarget`, miroir `app.spot_check_target`) ;
  - le tirage complète jusqu'à la cible, si bien qu'un second tirage dans le même mois ne retire personne ;
  - priorité aux artisans non contrôlés depuis un an, puis hasard ;
  - chaque dossier tiré est inscrit au journal (`artisan.controle_tire`).
- **Résultat** (`admin_complete_spot_check`) : conforme ou non conforme ; note obligatoire si non conforme ; case « Assureur appelé » ; auteur et date ; inscrit au journal (`artisan.controle_conforme` ou `artisan.controle_non_conforme`).
- **Non conforme** : l'équipe agit avec les outils existants (suspension, radiation, demande de document). Rien n'est automatique.
- **Back-office** :
  - rubrique « Contrôles aléatoires » (`/admin/controles`), avec les dossiers du mois, l'objectif, les points à revérifier et le résultat. Les mois précédents restent consultables ;
  - compteur dans le menu ;
  - carte « À traiter » sur la vue d'ensemble ;
  - section dans la fiche de l'artisan.
- **Données** : `artisan_spot_checks`, un contrôle par artisan et par mois, lisible par l'équipe seulement. Écriture uniquement par les fonctions.

## Conséquences
- **Tests** :
  - `packages/core` : cible et mois du contrôle ;
  - pgTAP 65 : cible, priorité, idempotence, droits, note obligatoire, journal, tâche planifiée ;
  - bout en bout de l'admin : tirage du mois, puis résultat.
- **Déploiement** : appliquer la migration. Aucune fonction Edge n'est concernée.
