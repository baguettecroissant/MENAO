# ADR 0093 — Gamification : page « Mon grade MENAO » du site

- Statut : accepté
- Date : 14 octobre 2026

## Contexte
L'espace pro existe aussi sur le site (stratégie « web d'abord »). Après les règles (ADR 0091) et les écrans de l'application (ADR 0092), la gamification doit y être disponible avec les mêmes informations.

## Décision
- **Page `/pro/grade`** (« Mon grade MENAO »), dans le menu de l'espace pro (section « Activité », après « Avis ») :
  - à gauche, la carte de niveau (points, « Niv. N » → « Niv. N+1 », prochaine récompense) et, au niveau 5, le formulaire « Félicitations, Prénom ! » : tailles de la veste et du pantalon, adresse de l'entreprise et téléphone pré-remplis, « Recevoir ma récompense » ;
  - à droite, les onglets « Mes objectifs » et « Mes badges MENAO », mêmes contenus que l'application ;
  - un clic sur un badge ouvre sa progression dans une fenêtre native (`<dialog>`) ;
  - « Nouveau badge MENAO débloqué ! » s'ouvre pour un badge obtenu mais pas encore montré ; à sa fermeture, les badges sont marqués comme vus (action serveur `markBadgesSeen`).
- **Actions serveur** :
  - `markBadgesSeen` ;
  - `claimReward`, validée par `rewardClaimSchema` comme dans l'application, qui appelle `artisan_claim_reward` (ticket « recompense » pour l'équipe).
- **Tableau de bord** : carte « Mon grade MENAO » (niveau, points, avancement, dernier badge), avec la pastille « Nouveau badge ! » quand un badge reste à montrer.
- Le lien des notifications (`/pro/grade`) ouvre cette page.
- Badges : même hexagone et mêmes pictogrammes que l'application (`BadgeIcon`).
- Aucune migration, aucune nouvelle dépendance.

## Conséquences
- La gamification est complète sur le site et dans l'application, en dehors de :
  - la notation des clients par l'artisan (F-23, avis juridique) ;
  - le paramétrage des règles depuis le back-office (F-57).
