# ADR 0105 — Score MENAO de la charte qualité pour le classement des artisans

- Statut : accepté (remplace le critère de tri de l'ADR 0030), ordre du classement modifié par l'ADR 0151
- Date : 15 octobre 2026

## Contexte
- **Demande** : la charte qualité (ADR 0104) annonce le calcul du « score Menao ». L'utilisateur a choisi d'en faire **la règle de classement** des artisans proposés aux clients.
- **Poids de la charte** :

  | Critère | Poids |
  |---|---|
  | Notes des clients en fin de chantier | 40 % |
  | Respect de la règle des 72 h | 20 % |
  | Réactivité aux messages et appels | 15 % |
  | Planning tenu à jour chaque semaine | 10 % |
  | Chantiers menés à terme, sans annulation | 10 % |
  | Ancienneté et badges obtenus | 5 % |

- **Avant** : `match_artisans` triait d'abord par la moyenne des avis (`artisan_scores.global_score`).

## Décision
Chaque critère est noté de 0 à 100. Les mêmes formules existent dans `packages/core/src/ranking.ts` (tests) et dans `app.artisan_charter_score()` (base).

### Les critères
- **Notes** : moyenne des avis publiés (`artisan_scores`), lissée.
- **72 h** : sur 365 jours, demandes acceptées dont le premier devis est parti dans les 72 h suivant la demande.
  - Une demande acceptée encore dans le délai est ignorée.
  - Une demande expirée sans réponse compte comme un échec.
  - Une demande refusée ne compte pas.
- **Réactivité** : sur 180 jours, demandes acceptées ou refusées dans les 24 h (une expiration est un échec), plus les messages des clients suivis d'une réponse de l'artisan dans les 24 h.
  - Seul le premier message d'une suite compte, et il faut qu'il ait au moins 24 h.
  - Les appels ne sont pas mesurés.
- **Planning** : plein jusqu'à 7 jours sans mise à jour, puis décroissance jusqu'à 0 à 28 jours.
  - Nouvelle colonne `artisans.planning_updated_at`.
  - Mise à jour par déclencheur sur les horaires, absences, créneaux bloqués, disponibilité et pause.
  - Ou par `artisan_confirm_planning()`, le bouton « Mon planning est à jour ».
- **Chantiers menés à terme** : sur 365 jours, chantiers réceptionnés ou clôturés, rapportés aux annulations faites par l'artisan (journal `chantier_events`). Les annulations du client ne comptent pas.
- **Ancienneté et badges** : moitié ancienneté depuis la validation du dossier (24 mois pour le maximum), moitié part des badges actifs obtenus.

### Calcul et classement
- **Valeur neutre** : les taux sont lissés à partir de 70 %, comptés comme 3 événements. Un nouvel artisan n'est ni écrasé ni favorisé, et ses résultats réels prennent le dessus peu à peu.
- **Score** : somme pondérée arrondie, de 0 à 100. Il est calculé à la volée pour les artisans candidats d'une recherche (quelques dizaines au plus), donc toujours à jour, sans table ni tâche planifiée.
- **Classement** (`match_artisans`) : score de la charte, puis disponibilité, puis distance, puis ordre aléatoire propre au projet.

### Où le score est visible
- **Artisan** : `my_charter_score()` alimente une carte « Votre score MENAO » (total, critères, bouton du planning) sur « Mon grade MENAO » et « Mes disponibilités ».
- **Fiche publique** : elle continue d'afficher la moyenne des avis (« Score MENAO » de l'ADR 0030). Le score de classement n'est pas publié aux clients.
- **Textes publics** : la page « Critères de classement » et les rappels du site décrivent le nouveau calcul.

## Conséquences
- **`TODO(legal)`** : faire valider la description publiée (art. L111-7 du Code de la consommation, règlement P2B).
- **Nom** : la fiche publique et le classement parlent tous deux de « Score MENAO », sans être la même chose. Renommer l'un des deux est à décider.
- **Engagements de la charte encore absents** :
  - mesure des appels ;
  - statut « Élite Menao ».
- **Rappel hebdomadaire du planning et bouton « Mon planning est à jour » dans l'application** : ADR 0107.
