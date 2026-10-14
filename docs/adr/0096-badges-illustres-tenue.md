# ADR 0096 — Badges illustrés et dessin de l'ensemble de chantier

- Statut : accepté
- Date : 14 octobre 2026

## Contexte
- **Revue des visuels manquants** (points 5 et 10), demandée par l'utilisateur le 14 octobre 2026.
- **Badges** : les maquettes « Mon grade Menao » montrent des hexagones bleus en relief, avec un liseré argenté et une icône blanche. L'application et le site affichaient un simple hexagone plat.
- **Récompense du niveau 5** : la maquette montre une photo de l'ensemble de chantier (veste et pantalon bleus). Une simple icône de t-shirt la remplaçait. La tenue n'existe pas encore, donc aucune photo n'est possible.

## Décision
- **Dessins décrits une seule fois** dans `packages/ui-tokens` (`gamification-art.ts`), puis rendus en SVG par le site et avec react-native-svg par l'application, comme les illustrations des états vides (ADR 0095).
- **Badges** :
  - hexagone extérieur (liseré) et hexagone intérieur en dégradé, plus un reflet en haut ;
  - teintes :
    - badge obtenu : bleu MENAO avec liseré argenté ;
    - « Main d'or » : liseré et icône dorés ;
    - badge à obtenir : gris ;
  - choix de la teinte par `badgeStyle(code, obtenu)` ;
  - icônes inchangées (une par badge du référentiel, médaille pour un badge ajouté en base), avec un remplissage translucide qui leur donne du volume.
- **Ensemble de chantier** :
  - illustration plate : veste et pantalon bleus, poches, fermeture, logo MENAO brodé en blanc sur la poitrine ;
  - affichée dans la carte de niveau (site et application), dans l'écran « Réclamez votre récompense » de l'application et, nouveau sur le site, dans la carte de commande (« Votre récompense vous attend ! », nom et détail de la récompense) ;
  - mention « Illustration : la tenue définitive peut différer. » là où l'artisan commande, pour ne rien promettre sur l'aspect exact ;
  - texte alternatif qui décrit l'illustration.
- **Tests** : teintes des badges, couleurs valides, formes de la tenue dans leur cadre.

## Conséquences
- **Mise en service** : aucune migration, rien à déployer sur staging.
- **Photo de la tenue** : quand elle existera, il suffira de remplacer `OutfitIllustration` (site et application) par la photo, et de retirer la mention.
- **Autre récompense** : l'illustration représente l'ensemble de chantier. Si le back-office (F-57) change la récompense d'un niveau, il faudra un autre visuel.
- **Graphiste** : un graphiste pourra affiner les badges en modifiant seulement `gamification-art.ts`.
