# ADR 0137 — Parrainage entre artisans : un mois offert à chacun

- Statut : accepté
- Date : 19 octobre 2026
- Suite de l'ADR 0136 (programme Partenaires). Fin du lot 1.

## Contexte
- **Choix de l'utilisateur** : un artisan qui en invite un autre gagne un mois offert, et son filleul aussi, après le premier paiement du filleul.
- **Le business plan** cite le parrainage parmi les leviers d'acquisition des artisans, avec l'effet « foyer » entre métiers.
- **Contraintes** :
  - **pas de traceur** : même circuit que les liens partenaires (ADR 0136) ;
  - **aucun lien d'achat ni mention de l'abonnement dans l'application** (CLAUDE.md règle 10) ;
  - **un mois offert doit réduire la facture**, et non être payé par un crédit sur lequel MENAO devrait quand même la TVA ;
  - **plusieurs mois gagnés** doivent tous être honorés.

## Décision
- **Code** (`artisan_referral_codes`) : 8 caractères sans ambiguïté (ni i, l, o, 0, 1).
  - Créé à la première ouverture de « Mon profil » par un artisan validé (`my_referral`).
  - Il partage l'espace des liens `/p/<code>` avec les codes des partenaires : un partenaire ne peut pas prendre le code d'un parrain, et inversement.
- **Partage** :
  - **site** : le lien `menao.fr/p/<code>/pro` à copier, le code à dicter, et le bilan (confrères inscrits, mois offerts gagnés) ;
  - **application** : le code et « Partager mon code » (texte seul, sans lien ni mention de l'abonnement).
- **Inscription** :
  - le code arrive par le lien (adresse `?p=`), ou se saisit dans « J'ai un code de parrainage », sur le site comme dans l'application ;
  - `app.apply_artisan_signup` cherche d'abord un partenaire actif, sinon le code d'un artisan validé, jamais le sien ;
  - un filleul n'a qu'un parrain (`artisan_referrals`).
- **Récompense** : au premier paiement réel du filleul (`record_subscription_payment`, facture `invoice.paid` payée et de montant positif, donc après l'essai), le parrainage passe à « récompensé ». Un crédit « mois offert » est créé pour chacun (`artisan_free_months`), une seule fois.
- **Pose sur Stripe** (`stripe-webhook`, module `_shared/referral.ts`) : à chaque facture payée, même à 0 €, le plus ancien crédit en attente du titulaire et de son parrain récompensé est posé sur son abonnement en cours.
  - **Moyen** : un coupon à 100 % sur une facture (`menao-parrainage-1-mois`, créé par `pnpm stripe:setup`). La facture suivante est à 0 €, TVA comprise.
  - **Un crédit à la fois par abonnement** : s'il reste un mois offert à consommer, le crédit suivant attend la facture d'après. Aucun cumul n'est perdu.
  - **Pas de double pose** : le crédit en cours est noté dans les métadonnées de l'abonnement (`menao_free_month_grant`). Un nouvel essai du webhook reconnaît sa propre remise ; la mise à jour Stripe porte une clé d'idempotence.
  - **Les autres remises** de l'abonnement sont conservées.
  - **Règle pure, testée** : `freeMonthAction` (`@menao/core`).
- **Droits** : le parrain, le filleul et les admins lisent les parrainages ; chacun ses propres mois offerts. La pose et la liste des mois à poser sont réservées à la clé serveur.

## Conséquences
- **Il faut relancer `pnpm stripe:setup`** en staging, puis en production, pour créer le coupon. Sans lui, la pose échoue et Stripe renvoie l'événement jusqu'à ce que le coupon existe.
- **Back-office** : pas encore d'écran dédié. Les admins lisent les tables ; l'annulation d'un parrainage abusif est à prévoir si le besoin apparaît.
- **[TODO(legal)]** : les conditions du parrainage sont à inscrire dans les CGV artisans.
- **Pas de nouvelle dépendance.**
