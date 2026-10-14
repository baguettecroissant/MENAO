# ADR 0091 — Gamification artisan : règles, calcul et critère « propreté »

- Statut : accepté
- Date : 14 octobre 2026

## Contexte
- **Spécification F-24 (phase 7)**. Elle prévoit :
  - des points (XP) gagnés : avis laissés sur les clients, ponctualité, photos de chantier, avis cinq étoiles, chantiers sans réserve ;
  - des niveaux de 1 à 5 et des badges ;
  - les écrans « Mon grade MENAO », la progression d'un badge et « Nouveau badge débloqué » ;
  - une notification push ;
  - une récompense physique au niveau 5, traitée à la main par l'équipe ;
  - des règles « paramétrées en base ».
- **Maquettes**, valeurs par défaut validées par l'utilisateur le 14 octobre 2026 :
  - niveau 5 à 1 000 XP ;
  - objectifs à +100, +150 ou +200 XP (« Ponctualité exemplaire », « Artisan de confiance », « Premier avis », « Amateur des avis », « Expert des avis ») ;
  - badges : « Artisan exceptionnel », « Toujours à l'heure », « Maître des finitions », « Expert de la photo », « Pro du nettoyage », « Artisan appliqué », « Main d'or », « Main d'argent », « Artisan attentionné ».
- **Badge « Pro du nettoyage »** : aucune donnée ne permettait de le calculer. L'utilisateur a demandé d'ajouter un critère « propreté » à l'avis du client.

## Décision
Ce premier lot couvre la base de données et les règles ; les écrans suivent dans deux autres lots.

- **Propreté du chantier dans l'avis du client** (F-28) :
  - quatrième curseur, avec les libellés « Inacceptable », « Peu soigné », « Correct », « Propre », « Impeccable » ;
  - `reviews.cleanliness`, obligatoire pour les nouveaux avis (`particulier_submit_review`), absente des plus anciens ;
  - elle sert aux badges et n'entre pas dans le score MENAO en V1 (formule inchangée, fiches publiques inchangées) ;
  - elle est affichée à l'artisan avec les autres notes.
- **Règles en base**, lues par les comptes connectés, modifiées par migration en attendant le paramétrage du back-office (F-57) :
  - `gamification_levels` : seuils et récompense. Niveau 2 à 150 XP, 3 à 350, 4 à 600, 5 à 1 000 avec « Ensemble de chantier MENAO » (veste et pantalon) ;
  - `gamification_objectives` : titre, mesure, cible, points ;
  - `badges` : libellé, mesure, cible.
- **Mesures**, calculées sur les données existantes (`app.gamification_metric`) :
  - chantiers clôturés ;
  - PV signés sans réserves ;
  - photos du suivi, au total et sur un même chantier ;
  - avis publiés dans la tranche du haut, à 90 % ou plus : score global, qualité, délais (« À l'heure »), communication, propreté ;
  - réponses aux avis.
- **Objectifs par défaut** (valeurs des maquettes, complétées par des paliers) :
  - premier chantier terminé (+100), 5 chantiers (+150), 15 chantiers (+200) ;
  - « Ponctualité exemplaire » : 3 chantiers notés « À l'heure » (+100) ;
  - « Artisan de confiance » : 40 photos sur un chantier (+150) ;
  - « Travail impeccable » : 3 PV sans réserves (+150) ;
  - « Client conquis » : un avis à 90 % ou plus (+100) ;
  - « Excellence reconnue » : 5 avis à 90 % ou plus (+150) ;
  - les objectifs « Premier avis », « Amateur des avis » et « Expert des avis » dépendent de la notation des clients par l'artisan (F-23, en attente de l'avis juridique) : ils sont présents mais inactifs.
- **Badges par défaut** : cibles de 10 (25 pour « Main d'or », 200 photos pour « Expert de la photo »), sur les mesures ci-dessus.
- **Progression** :
  - `xp_events` : un objectif atteint rapporte ses points une fois ;
  - `artisan_badges` : `seen_at` indique que l'écran « Nouveau badge débloqué » a été montré ;
  - `reward_claims` : une demande par niveau ;
  - écriture par la base seulement (RLS : lecture par l'artisan et l'équipe).
- **Calcul** (`app.refresh_gamification`) :
  - déclenché par la clôture d'un chantier, la signature d'un PV, une photo du suivi, et un avis publié, modéré ou auquel l'artisan répond ;
  - les badges obtenus restent acquis ;
  - l'existant est repris sans notification.
- **Notifications** `badge_debloque` et `niveau_atteint` : push seulement, jamais d'e-mail (`app.email_wanted`), avec un lien vers « Mon grade MENAO » (`/pro/grade`).
- **Fonctions des écrans** :
  - `artisan_grade` : points, niveau, niveaux, objectifs et badges avec leur avancement, récompenses demandées ;
  - `artisan_mark_badges_seen` ;
  - `artisan_claim_reward` : vérifie le niveau, les tailles (S à XXL), l'adresse et le téléphone, puis crée un ticket `recompense` pour l'équipe (tailles et adresse dans le message). L'équipe peut répondre dans le fil d'échange.
- **Code partagé** : `levelProgress`, `nextReward`, `claimableReward` dans `packages/core`, et `rewardClaimSchema` dans `packages/validation`.
- **Tests** : pgTAP `50_gamification`, tests unitaires (core, validation, e-mails), et parcours de bout en bout de l'avis avec le curseur de propreté.

## Conséquences
- **Mise en service** : deux migrations à pousser sur staging, puis la fonction `notify` à redéployer (textes des nouvelles notifications).
- **Suite** : écrans de l'application (« Mon grade MENAO », badge, « Nouveau badge débloqué », récompense), puis ceux du site.
- **Paramétrage** : les valeurs restent modifiables en base ; leur réglage depuis le back-office (F-57) viendra plus tard.
