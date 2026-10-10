# ADR 0030 — Avis des clients et score MENAO

- Statut : accepté
- Date : 10 octobre 2026

## Contexte
- **F-28** : le client note la qualité des prestations, le respect des délais et la communication au curseur (« Inacceptable » → « Irréprochable »), choisit le rapport qualité/prix parmi trois réponses et écrit un commentaire de 50 caractères au moins.
  - Avis possible uniquement après un chantier réceptionné sur MENAO (« Avis vérifié »), un par chantier.
  - Écran de remerciement, une relance si l'avis n'est pas laissé sous 3 jours.
  - Réponse publique de l'artisan, une fois ; signalement et modération ; un avis négatif n'est jamais masqué pour cette seule raison.
  - Score MENAO = moyenne pondérée des critères, recalculée par une fonction SQL.
- **F-27** : ordre de fin de chantier PV → solde → avis ; l'avis ne conditionne jamais un paiement.
- **F-09, F-10** : le score MENAO est le premier critère de tri des recherches ; la fiche artisan affiche le score et les derniers avis.

## Décisions
- **Droit de noter** : dès le PV de réception signé (avec ou sans réserves), un avis par chantier (`reviews.chantier_id` unique). L'invitation (carte « Noter … pour son chantier », e-mail de clôture, relance) vient au chantier clôturé, après le solde.
- **Formulaire** (`particulier_submit_review`) :
  - trois curseurs de 0 à 100 % (pas de 5 %), sans note par défaut : « -- % » et « Faites glisser pour noter » tant que le curseur n'est pas touché ;
  - libellé par tranche de 20 % (90 % et plus : « Irréprochable », « À l'heure ») ;
  - rapport qualité/prix en trois choix, commentaire de 50 à 2 000 caractères.
- **Score** :
  - score d'un avis : moyenne des trois critères et du rapport qualité/prix converti (excellent 100, convenable 60, trop cher 20), poids égaux (`app.review_score` et `reviewScore` dans `packages/core`) ;
  - score MENAO : moyennes des avis publiés par critère, et score global calculé sur ces moyennes (`artisan_scores`, recalculé à chaque avis publié, masqué ou republié) ;
  - étoiles affichées : score ÷ 20, arrondi.
- **Lecture publique** (`artisan_public_reviews`, artisans visibles, avis publiés du plus récent au plus ancien) :
  - prénom et initiale du nom, figés à la publication ; date de publication et date de réception du chantier ; « Avis vérifié » ; réponse de l'artisan ;
  - fiche artisan : barres par critère, score global et nombre d'avis (`artisan_public_profile`).
- **Classement** (`match_artisans`) : score MENAO d'abord (artisans sans avis ensuite), puis disponibilité, distance et ordre aléatoire propre au projet. La page des critères de classement est mise à jour.
- **Réponse** (`artisan_reply_review`) : une seule fois, sur un avis publié.
- **Signalement** (`report_review`) : depuis un compte connecté, ticket `avis` pour l'équipe, un seul ouvert par personne et par avis. Les visiteurs sont orientés vers la page Contact.
- **Modération** (`admin_moderate_review`, depuis les tickets du back-office) : masquage avec motif obligatoire, ou republication ; score recalculé, signalements ouverts clos, action journalisée (`audit_logs`).
- **Relance** : `app.remind_reviews` (pg_cron `menao-relance-avis`, quotidienne) relance une fois le client, 3 jours après la clôture, sans avis (clôtures des 30 derniers jours).
- **Notifications** : `avis_recu` (artisan), `avis_relance` (client) ; l'e-mail de clôture du client invite à noter l'artisan.
- **Tests** :
  - `packages/core` (tranches, score, étoiles, droits) et `packages/validation` ;
  - pgTAP 28 : droits de chaque rôle, unicité, score, relance, réponse, signalement, modération, lecture publique ; pgTAP 11 : tri par score ;
  - e-mails ; e2e : avis, fiche artisan, réponse de l'artisan.

## Écarts aux maquettes
- L'avis vient après le PV et le solde (F-27) : étapes « Signature du PV ✓ · Paiement du solde ✓ · Votre avis », bouton « Publier mon avis » au lieu de « Suivant », retour au chantier après le remerciement.
- « Recommandation clients » (fiche artisan) n'est pas affichée : le formulaire d'avis de F-28 ne pose pas cette question.
- Bouton de publication actif d'emblée, avec des messages d'erreur, plutôt que grisé (accessibilité).

## Points à valider
- TODO(legal) : informations sur le contrôle des avis (art. L111-7-2 et D111-16 et suivants du Code de la consommation), notification des contenus illicites ouverte aux visiteurs et motivation des masquages auprès des auteurs (DSA, art. 16 et 17).
- Pondération des critères et conversion du rapport qualité/prix : valeurs par défaut, à ajuster.
- « Recommandation clients » : ajouter la question au formulaire, ou retirer la ligne de la maquette.
- F-23 (notation du client par l'artisan) : [À VALIDER] juridiquement, non développée.
- Réserves jamais levées : le droit de noter est ouvert dès le PV, mais aucune invitation n'est affichée avant la clôture.

## Conséquences
- Déploiement : migrations `types_avis` et `avis`, puis redéploiement de `notify` (nouveaux e-mails).
- **5e** : messagerie (F-40).
