# ADR 0160 — Nouveaux artisans : badge « moins de 2 h », alerte d'accompagnement, mois offert, premier chantier sous 60 jours

- Statut : accepté
- Date : 22 octobre 2026
- Lot 5 du plan V1.1, d'après « Mettre en avant les nouveaux artisans » de Mickaël (18 octobre 2026), parties 3 et 4. Les parties 1 et 2 (expérience, avis Google, diplômes, Score MENAO) sont faites par l'ADR 0155.

## Décision
- **Être choisi**, c'est voir un client signer son devis : un chantier vient toujours d'une demande MENAO, donc tout devis signé compte.
- **Badge « Répond en moyenne en moins de 2 h »** (`respondsFast`, `FAST_RESPONSE_MINUTES`) :
  - il remplace les quatre tranches de la fiche (moins d'1 h, moins de 3 h, dans la journée, sous 48 h), sur le site et dans l'application ;
  - il disparaît dès que la moyenne dépasse 2 h. C'est une information, pas une garantie ;
  - le calcul ne change pas : temps de réponse moyen sur 180 jours, publié à partir de 3 réponses (`app.artisan_response_stats`).
- **Alerte « 6 demandes en 30 jours sans être choisi »** (`app.flag_new_artisans_to_support`, chaque jour à 7 h 30 UTC) :
  - elle vise un artisan validé, sans aucun devis signé depuis son inscription, qui a reçu au moins 6 demandes en 30 jours. Les demandes retenues pour vérification (ADR 0157) ne comptent pas ;
  - elle ouvre un ticket « Accompagnement : <artisan> », à échéance de 2 jours. Le ticket contient le bilan (demandes, acceptées, sans réponse, devis envoyés) et le téléphone de l'artisan. L'équipe est alertée comme pour tout nouveau ticket ;
  - le ticket est **interne** : il n'apparaît pas dans « Mes échanges » de l'artisan et n'a pas de fil de réponse. La personne chargée de la fidélisation appelle l'artisan (profil, photos, prix, délai d'envoi des devis) et note l'appel dans les notes internes ;
  - un seul ticket ouvert par artisan, et pas de nouvelle alerte dans les 30 jours qui suivent la précédente ;
  - il apparaît dans la file « À traiter » de la vue d'ensemble (« Nouveaux artisans à accompagner », important, pôle activité).
- **Mois offert de démarrage** (`public.grant_starter_month`) : il est accordé si aucun devis n'a été signé pendant les 2 premiers mois payants (à partir de `first_paid_at`).
  - **Même mécanisme que le parrainage** (ADR 0137) : le crédit va dans `artisan_free_months`, avec `reason = 'demarrage'`, puis `stripe-webhook` le pose avec le coupon existant `menao-parrainage-1-mois`. **Aucun changement de configuration Stripe**.
  - **Calendrier** : le mois est accordé à la facture qui suit les 2 mois (2 jours de marge, au plus tard 4 mois après le premier paiement) et porte sur la facture d'après. L'évaluation a lieu à chaque facture payée, même à 0 €, pour ne pas manquer le cas d'un mois de parrainage en cours.
  - **Une seule fois par artisan** (index unique).
  - **Comptes séparés** : il n'entre pas dans les bilans du parrainage (`my_referral`, `admin_referral_summary`, `admin_artisan_referral`).
  - **Visibilité** : la fiche de l'artisan dans le back-office montre le mois offert, accordé ou posé.
- **Indicateur « premier chantier sous 60 jours »** (`admin_new_artisans`, carte « Nouveaux artisans » des chiffres clés) :
  - il donne la part des artisans validés il y a 60 à 150 jours (première validation du dossier) dont un premier devis a été signé dans les 60 jours ;
  - la cohorte couvre ainsi trois mois de validations dont la période de 60 jours est écoulée. Avant les premières validations de plus de 60 jours, la carte affiche « — » ;
  - la même carte donne le nombre d'artisans à accompagner et de mois de démarrage accordés.
- **Pas dans ce lot** :
  - **notification à l'artisan qui reçoit son mois offert** : elle ne pourrait être que web et e-mail (règle 10), voir « Conséquences » ;
  - **récupération automatique des avis Google** : déjà saisis par l'équipe (ADR 0155).

## Conséquences
- **Migrations** : `type_accompagnement` (valeur d'enum seule) et `nouveaux_artisans`. Tests pgTAP : `83_nouveaux_artisans`.
- **Après la fusion** : pousser les migrations, puis redéployer `stripe-webhook`.
- **[TODO(legal)]** :
  - **mois offert de démarrage** : conditions à écrire dans les CGV artisans (2 premiers mois payants sans devis signé, une fois, sans contrepartie en argent) avant d'en faire un argument commercial ;
  - **badge de réactivité** : information calculée, à présenter comme telle (pas d'engagement de délai).
- **À proposer** : prévenir l'artisan par e-mail et dans son espace web quand son mois est accordé. Ce serait une nouvelle notification réservée au web, jamais en push.
- **Pas de nouvelle dépendance.**
