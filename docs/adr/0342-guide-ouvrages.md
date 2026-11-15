# ADR 0342 — Étape « Ce qu'il y a à faire » du parcours guidé (F-159, PR 2)

- Statut : accepté (15/11/2026)
- Fonctionnalité : F-159 ; maquette du lot 56 (« parcours guidé ») validée le 15/11/2026

## Constat

Après la PR 1 (ADR 0341), l'étape « Ce qu'il y a à faire » juxtaposait encore la table des
ouvrages (six colonnes, douze pastilles d'origine), l'écran des symboles avec son propre bouton
« Enregistrer », une carte des lots et deux boutons d'enregistrement.

## Décision

- **L'électricité est un lot comme les autres** : un onglet « Électricité · N symboles » juste
  après la démolition, qui ouvre l'écran des symboles. L'écran reste monté quand un autre onglet
  est ouvert.
- **Les symboles s'enregistrent seuls**, un court instant après la dernière correction, pour la
  page corrigée ; une ligne d'état dit « Enregistrement dans un instant… » puis « Symboles
  enregistrés. ». Le bouton « Enregistrer les symboles » disparaît.
- **Table simplifiée** : ouvrage, pièce, quantité avec son unité, état (Lu sur le plan, Votre
  valeur, Estimé par MENAO, À compléter ; le détail du calcul au survol). Une ligne sans quantité
  propose « Mesurer », qui ouvre le métré sur le plan. L'onglet d'un lot porte le nombre de
  quantités à compléter.
- **« Lots de mon offre »** : les lots proposés d'après les plans en pastilles à cocher.
- **Barre du bas** : retour à « Mes pièces », ce qui reste à mesurer et « Continuer :
  revêtements », qui enregistre les corrections en cours.
- Correction de la PR 1 : « Terminé » ferme l'éditeur d'une pièce après l'envoi du formulaire
  (fermé au clic, le bouton quittait la page avant l'envoi).

## Conséquences

- Plan de terrain et dossier sans plan gardent l'affichage détaillé (origine, page, métier).
- PR 3 : la liste « À vérifier » et la vérification point par point.
