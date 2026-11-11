# ADR 0282 — Objectif de demandes par artisan dans le back-office (F-131)

- Statut : accepté
- Date : 11 novembre 2026
- Complète les ADR 0160 (nouveaux artisans à accompagner), 0198 (demandes directes), 0200 (formules et garantie) et 0209 (chiffres de lancement).

## Contexte
L'utilisateur veut qu'aucun artisan ne reste un mois sans un minimum de demandes de devis, et le voir d'un coup d'œil dans le back-office, avec le détail et des alertes. Il n'existait que le total des demandes sur la fiche d'un artisan, et un chiffre global « artisans à 4 demandes ou plus » dans le tableau de lancement. L'alerte de l'ADR 0160 vise l'inverse (beaucoup de demandes, aucun devis signé).

## Décision
- **Objectif par défaut : 4 demandes par mois**, le seuil de la garantie des formules (moins de 4 demandes 2 mois de suite : sortie sans frais). Réglable par un admin (`platform_settings.objectif_demandes_mois`). **Objectif propre** possible pour un artisan (`artisan_lead_targets`, 0 : hors suivi), réglé sur sa fiche.
- **Demandes comptées** comme dans les chiffres de lancement : hors demandes retenues pour vérification et annulées avant transmission. Les **demandes directes** (fiche, carte de visite, « Redemander un devis ») sont montrées à part et n'entrent pas dans l'objectif (ADR 0198).
- **Mois calendaire, heure de Paris.** Un artisan validé dans le mois a un objectif au prorata des jours restants.
- **Situation** (`@menao/core`, `lead-targets.ts`) : en cours de mois, « dans les temps » ou « en retard » face au rythme attendu à date ; « atteint » dès l'objectif rempli ; un mois terminé est « atteint » ou « manqué ».
- **Alertes** : en retard sur le mois en cours à partir du 10 ; deux mois terminés de suite sous l'objectif. Elles alimentent la file « À traiter » de la vue d'ensemble (« N artisans en manque de demandes », important, pôle activité).
- **Cause probable** d'un manque, dans l'ordre : profil en pause, absent (agenda), profil invisible, aucune recherche de son métier dans sa zone (il manque des clients), ou des recherches mais peu de demandes (fiche, prix, classement).
- **Écrans** : page « Objectifs de demandes » (`/admin/objectifs`, menu Outils) avec le choix du mois (6 derniers), 8 chiffres, filtres (en alerte, en retard, manqué, dans les temps, atteint, hors suivi), recherche, tableau trié des plus en difficulté aux autres (avancement avec repère du rythme, situation, cause, 6 derniers mois) et l'objectif par défaut ; section « Objectif de demandes » sur la fiche artisan.
- **Base** : `admin_lead_targets(mois, artisan)` (admin en double authentification, lecture), `admin_set_lead_target(artisan, objectif)` (journalisé `objectif_demandes`). Tests pgTAP `134_objectif_demandes`.

## Non décidé
- **Aucun message à l'artisan** ni ticket automatique : l'alerte reste interne. Un appel ou un ticket « Accompagnement » comme l'ADR 0160 est possible plus tard.
- **Aucun effet sur le classement** : MENAO ne pousse pas un artisan en retard devant les autres (ce serait une mise en avant à signaler, L111-7).
- La garantie elle-même (sortie sans frais) n'est pas automatisée : l'alerte « 2 mois sous l'objectif » aide l'équipe à l'anticiper.
