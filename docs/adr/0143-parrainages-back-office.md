# ADR 0143 — Parrainages dans le back-office

- Statut : accepté, modifié par l'ADR 0154 (parrainage V2)
- Date : 19 octobre 2026
- Suite de l'ADR 0137 (parrainage entre artisans), qui laissait le back-office pour plus tard.

## Contexte
- **Le constat** : les parrainages entre artisans n'apparaissaient nulle part dans le back-office. La rubrique « Partenaires » ne montre que les professionnels rémunérés (ADR 0136). Un admin ne pouvait ni suivre les mois offerts, ni écarter un abus, ni savoir sur la fiche d'un artisan qui l'avait parrainé.
- **Demande de l'utilisateur** : voir où apparaissent les recommandations des artisans et comment leurs liens sont créés.

## Décision
- **Rubrique « Parrainages »** dans le pôle Argent, après « Partenaires » (`/admin/parrainages`) :
  - une courte explication du fonctionnement : code de 8 caractères créé à la première visite de « Mon profil » d'un artisan validé, lien `menao.fr/p/<code>/pro` ;
  - quatre chiffres clés (`admin_referral_summary`) : parrainages en attente, récompensés, annulés, et mois offerts posés (avec ceux qui attendent la prochaine facture) ;
  - filtres par statut (`?statut=`) ;
  - une ligne par parrainage, les 200 plus récents (`admin_referrals`) : date d'inscription du filleul, parrain et filleul (liens vers leur fiche), statut, date de la récompense ou motif de l'annulation, et l'état du mois offert de chacun.
- **Nom affiché** (`app.artisan_label`) : nom commercial, sinon raison sociale, sinon nom du compte, sinon « Artisan » (dossier commencé sans entreprise). La fonction n'est pas exposée.
- **Annulation d'un abus** (`admin_cancel_referral`) :
  - seulement **avant la récompense** : après le premier paiement du filleul, les mois offerts existent déjà et la pose sur Stripe est en cours ou faite ;
  - motif obligatoire, 300 caractères au plus, enregistré sur le parrainage (`cancel_reason`, exigé par une contrainte pour tout parrainage annulé) ;
  - inscrite au journal d'audit (`parrainage.annule`, sur la fiche du filleul).
  - Le filleul garde son compte et son abonnement ; seul le mois offert est perdu.
- **Fiche d'un artisan**, section « Parrainage » (`admin_artisan_referral`) : son code et son lien, son parrain, ses filleuls avec le statut de chacun, et ses mois offerts posés et en attente.
- **Droits** : toutes ces fonctions exigent un admin en session aal2 (`app.require_admin`), comme le reste du back-office.

## Conséquences
- **Les admins suivent le parrainage sans lire les tables.**
- **Plus tard, si le besoin apparaît** : annuler un mois offert pas encore posé, ou exporter les parrainages.
- **Migration `parrainages_admin`** : une colonne, une contrainte et cinq fonctions. Tests pgTAP `73_parrainages_admin`. Pas de nouvelle dépendance.
