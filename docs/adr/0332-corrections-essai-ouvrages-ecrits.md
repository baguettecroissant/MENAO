# ADR 0332 — Corrections après l'essai réel des ouvrages écrits (F-159, lot 6)

- Statut : accepté (15/11/2026)
- Fonctionnalité : F-159, lot 6 ; suite de l'essai de l'utilisateur sur quatre plans réels

## Constat

L'essai (« Nouveau test », 4 plans) confirme la lecture : 75 ouvrages écrits, 8 menuiseries à
repère avec leurs dimensions, revêtements lus pour 7 pièces sur 9. Le DPGF, lui, mélangeait ce
que le plan écrit et les conventions de MENAO : « Fenêtres et portes-fenêtres : 7 » en plus des
8 menuiseries à repère, « Douches : 1 » en plus du receveur écrit, 7 émetteurs « un par pièce »
alors que le plan écrit 2 radiateurs neufs, des lignes « mur à peindre » à compléter en plus de
la peinture des murs calculée. Deux bugs : les surfaces estimées (trois décimales) passaient pour
« Saisi » dans le tableau des ouvrages, et le faux plafond d'une pièce non écrite disparaissait du
DPGF.

## Décision

1. **Le plan l'emporte sur la convention** : un poste de convention (compté sur les symboles ou
   calculé par pièce) est retiré du lot dès qu'un ouvrage écrit de ce lot décrit la même chose
   (fenêtres, blocs-portes, WC, lavabos, douches, baignoires, éviers, émetteurs, unités de
   climatisation, points lumineux, prises, peinture des portes).
2. **Peinture** : une ligne écrite « mur à peindre » ou « plafond à peindre » d'une pièce déjà
   peinte par la règle (périmètre × hauteur moins les ouvertures, surface du plafond) n'est pas
   reprise une seconde fois.
3. **Faux plafonds** : le total calculé ne retire que les pièces dont le faux plafond est écrit.
4. **Mesure à l'échelle arrondie** au centième de m² et au centimètre ; un texte de quantité non
   modifié garde la valeur enregistrée.
5. **Lecture** : « caison » (faute fréquente) et les plinthes se mesurent en longueur, une ITE ou
   un enduit de façade en surface de façade ; l'indication « À mesurer » dit quoi mesurer
   (longueur, longueur de mur × hauteur, façade, surface) ; une longue note est coupée au dernier
   mot entier.

## Conséquences

- Moins de postes, et plus aucun en double, dans les lots où le plan écrit les ouvrages.
- Les postes de convention restent quand le plan n'écrit rien pour eux ; leur signalement
  (« Convention MENAO ») et les lots que le plan ne mentionne pas sont traités ensuite.
- Les surfaces déjà enregistrées à trois décimales restent telles quelles.
