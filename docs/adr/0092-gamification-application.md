# ADR 0092 — Gamification : écrans de l'application

- Statut : accepté
- Date : 14 octobre 2026

## Contexte
L'ADR 0091 a posé les règles et le calcul de la gamification (F-24). Ce lot ajoute les écrans de l'application, d'après les maquettes suivantes :
- « Mon grade Menao – Objectifs » et « – Badges » ;
- « Artisan exceptionnel » (progression d'un badge) ;
- « Nouveau badge Menao débloqué » ;
- « Réclamez votre récompense ».

## Décision
- **Données** :
  - `loadGrade` lit `artisan_grade`, réponse validée par `parseGrade` (`packages/validation`, partagé avec le site) ;
  - `markBadgesSeen`, `claimReward` (`artisan_claim_reward`) ;
  - pré-remplissage de la livraison avec l'adresse de l'entreprise et le téléphone du compte.
- **« Mon grade MENAO »** (`/pro-grade`) :
  - carte de niveau : points sur le seuil suivant et pourcentage, barre entre « Niv. N » et « Niv. N+1 », prochaine récompense ;
  - encart « Votre récompense vous attend ! » quand une récompense est à réclamer, sinon « Récompense demandée » ;
  - onglets « Mes objectifs » (en cours avec +XP et barre, puis atteints avec leur date) et « Mes badges MENAO » (à obtenir avec leur barre, puis obtenus) ;
  - un appui sur un badge ouvre sa progression dans une feuille : état, description, « 7/10 », « Plus que 3… », « Continuer mes quêtes ».
- **Badges** : hexagone (bleu une fois obtenu, gris sinon, « Main d'or » en couleur dorée) avec un pictogramme par badge ; un badge ajouté en base prend la médaille.
- **« Nouveau badge MENAO débloqué ! »** :
  - plein écran bleu avec confettis, au retour sur le tableau de bord, pour un badge obtenu mais pas encore montré ;
  - « Continuer sur MENAO » ou « Voir ma collection de badges » ; dans les deux cas, les badges sont marqués comme vus.
- **« Réclamez votre récompense »** (`/pro-recompense`) :
  - « Félicitations, Prénom ! », la tenue du niveau ;
  - tailles de la veste et du pantalon (S à XXL) ;
  - adresse pré-remplie, en résumé avec « Vérifier mon adresse de livraison » pour la modifier ;
  - envoi à l'équipe ;
  - mention « Envoi organisé par l'équipe MENAO ». Le délai de livraison de la maquette (« sous 5 à 7 jours ouvrés ») n'est pas promis : l'envoi est traité à la main en V1.
- **Accès** :
  - carte « Mon grade MENAO » sur le tableau de bord (niveau, points, dernier badge) ;
  - lien dans « Mon compte » ;
  - lien des notifications `/pro/grade` vers l'écran.
- Aucune migration, aucune nouvelle dépendance (`react-native-svg` déjà présent).

## Conséquences
- L'artisan suit son grade, ses objectifs et ses badges dans l'application et y réclame sa récompense.
- **Suite** : la même page sur le site (espace pro).
