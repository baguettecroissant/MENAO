# ADR 0345 — Calculs de fournitures du chat « Demander à MENAO » (F-160, lot B)

- Statut : accepté (16/11/2026)
- Fonctionnalité : F-160 « Demander à MENAO » ; maquette du lot 59 validée le 16/11/2026

## Contexte

Le chat sur les plans répond à des questions libres (« combien de plaques de placo ? »). Règle
du projet : l'IA comprend et choisit, `packages/core` calcule, l'artisan vérifie. Le modèle ne
doit donc poser aucun chiffre de tête.

## Décision

- **`evaluateExpression`** (`plan-chat-calc.ts`) : pour une question imprévue, l'IA écrit le calcul
  avec les valeurs lues sur le plan, MENAO le fait. Nombres, valeurs nommées, quatre opérations et
  parenthèses seulement ; appel de fonction, puissance ou autre caractère refusés ; 300 caractères
  au plus. Aucune évaluation de code.
- **`materials.ts`**, sans import (lisible par la fonction serveur Deno) :
  - cloison et doublage (`partitionTakeoff`) : plaques, rails, montants (une ossature par cloison,
    longueur vendue la plus courte), vis, bande, enduit, et leurs conditionnements ;
  - plafond sur fourrures (`ceilingTakeoff`) : plaques, fourrures, suspentes, cornières ;
  - peinture (`paintTakeoff`) : murs moins les ouvertures données, plafonds, litres seulement si
    le rendement du produit est connu ;
  - carrelage (`tileTakeoff`) avec le pourcentage de chutes choisi, plinthes (`skirtingTakeoff`) ;
  - chiffrage des fournitures en centimes (`priceSupplies`), prix manquants listés.
  Chaque résultat garde ses étapes (libellé, formule, valeur) pour être montré et vérifié.
- **Ratios par défaut sourcés** (`MATERIAL_RATIOS`, source et lien gardés) : Placo, cloison
  Placostil 72/48 BA13 (1,05 m² de plaque par m² et par face, 22 vis TTPC 25, 2,8 ml de bande,
  0,6 kg d'enduit en poudre par m² de cloison, montants à 0,60 m) ; Placo, fourrure Stil F530
  (fourrures à 0,50 m, 2,2 ml par m², suspentes tous les 1,20 m). Le nombre de vis d'un double
  parement n'est pas sourcé : laissé vide. Rendement de peinture, colle et chutes de carrelage
  dépendent du produit : donnés par l'artisan ou sa bibliothèque, jamais inventés.

## Conséquences

- La fonction serveur du chat (lot C) appelle ces calculs comme des outils ; ses réponses citent
  les étapes et la source des ratios.
- Les ratios propres à l'artisan (bibliothèque) remplaceront ces valeurs par défaut.
