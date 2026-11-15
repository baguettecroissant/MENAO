# ADR 0341 — Parcours guidé des appels d'offres créés depuis les plans (F-159, PR 1)

- Statut : accepté (15/11/2026)
- Fonctionnalité : F-159 ; maquette du lot 56 (« parcours guidé ») validée le 15/11/2026

## Constat

Essai « Nvx test » : la lecture est bonne (9 pièces sur 9, 16 postes sur 97 à compléter), mais
l'écran est jugé « fouillis, en désordre » par l'utilisateur. Une page « Relevé » de 6 700 px
empilait plan, résumé de 13 lignes, contrôle de l'estimation, comptes, pièces, ouvrages par lot,
lots, menuiseries et symboles ; trois boutons d'enregistrement ; douze pastilles d'origine ; du
jargon (« Relevé », « DPGF », « sans DPGF », « Origine »).

## Décision (PR 1 sur 3)

- **Cinq étapes en mots d'artisan** : Plans · Mes pièces · Ce qu'il y a à faire · Revêtements ·
  Mon prix. Les ouvrages et les symboles quittent « Mes pièces » pour l'étape « Ce qu'il y a à
  faire » (`?etape=ouvrages`). Un plan de terrain n'a ni « Mes pièces » ni « Revêtements ».
- **Quatre chiffres clés** (pièces et m², ouvrages lus, symboles comptés, points à vérifier) à la
  place du résumé ; le résumé, le contrôle de l'estimation et l'avertissement de responsabilité
  passent dans « Détails de la lecture », replié. Une pastille « N points à vérifier » remplace
  « Formule Entreprise » dans l'en-tête.
- **Trois états** pour une pièce : Lu sur le plan (cotes comprises), Estimé par MENAO (tracé,
  photo, lecture incertaine), À compléter ; « Votre valeur » pour ce que l'artisan a saisi ou
  tracé. Le détail reste au survol.
- **Liste compacte des pièces** : une pièce touchée s'ouvre pour être corrigée et s'enregistre
  avec « Terminé ». Les éléments comptés (portes, appareils) sont repliés sous la liste.
- **Barre du bas** toujours visible : ce qui reste à vérifier et un seul bouton « Continuer », qui
  enregistre ce qui ne l'est pas encore.
- Corrections de l'essai : la carte des lots dit « N symboles comptés » pour l'électricien ; les
  surfaces s'affichent à deux décimales ; un poste compté vide (« Baignoires ») est retiré quand
  le lot a des ouvrages écrits.

## Conséquences

- PR 2 : l'étape « Ce qu'il y a à faire » (lots en onglets, électricité comprise, « Mesurer » sur la
  ligne). PR 3 : la liste « À vérifier » et la vérification point par point.
- Le compte des points à vérifier est provisoire (pièces estimées ou sans surface, ouvrages sans
  quantité, types de symboles avec un groupe douteux) jusqu'à la PR 3.
