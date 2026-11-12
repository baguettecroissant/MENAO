# ADR 0292 — DPGF depuis les plans, lot 2 : revêtements et création du DPGF (F-140)

- Statut : accepté
- Date : 12 novembre 2026
- Suite de l'ADR 0291 (lire le plan). Maquettes du lot 35, écrans 3 et 4.

## Contexte
Le lot 1 relève les pièces et les éléments comptés sur les plans. Il reste à en tirer le DPGF :
- des lots par métier, avec leurs postes et leurs quantités ;
- chiffrés, exportés et passés en devis comme un DPGF reçu de l'architecte.

L'utilisateur a choisi tous les métiers, et une case « J'ai vérifié les quantités » obligatoire avant l'export.

## Décision
- **Revêtements par pièce** : sol (carrelage, parquet, sol souple, aucun), murs (peinture, faïence + peinture, aucun) et plafond (peinture, plaque + peinture, aucun), avec la hauteur de faïence.
  - `defaultFinishes` (core) les propose selon le nom de la pièce : faïence de 2,10 m dans les salles d'eau, 1,20 m dans les WC ; parquet dans les chambres ; rien dans une pièce non habitable.
  - L'artisan les corrige. Ils sont gardés quand le relevé change.
- **Calcul** (`packages/core/src/plan-takeoff.ts`, tests à l'appui) : un lot par métier choisi, dans l'ordre des métiers.
  - **Surfaces** : somme des surfaces du relevé.
  - **Plinthes** : périmètre moins une porte de 0,83 m par pièce.
  - **Faïence** : périmètre × hauteur de faïence, moins la porte.
  - **Murs peints** : périmètre × hauteur, moins la faïence, les portes et les fenêtres (1,5 m² chacune).
  - **Appareils, portes, fenêtres, escaliers** : comptés sur le plan.
  - **Électricité** : un point lumineux par pièce, et des prises au minimum de la norme NF C 15-100, marquées « à vérifier ».
  - **Chauffage et climatisation** : un émetteur ou une unité par pièce de vie.
  - **Ce qui ne se mesure pas sur le relevé** (toiture, façades, cloisons, réseaux…) : un poste « à compléter ». C'est le cas de la charpente, de la couverture, des façades, de la serrurerie, du terrassement et des espaces verts.
  - **Une mesure absente dans une pièce concernée** laisse tout le poste à compléter, en nommant la pièce.
  - Les conventions (porte, fenêtre, hauteurs de faïence) sont dans `TAKEOFF_RULES` et rappelées dans le détail de chaque poste.
- **Origine et détail** : `tender_lines.quantity_source` et `quantity_detail`.
  - Les origines sont :
    - `plan` : surface lue ;
    - `calcul` : surface déduite ou issue des cotes ;
    - `photo` : une pièce lue sur une photo ou de façon incertaine ;
    - `manque` : à compléter ;
    - `saisi` : quantité changée ensuite dans l'éditeur.
  - L'éditeur montre l'origine à la place de la « Qté DPGF », et le calcul sous chaque poste.
- **Prix** : repris des anciens devis (`suggestTenderPrice`), comme pour un DPGF importé.
- **Création** : Server Action `createPlanDpgf`.
  - `artisan_save_plan_finishes` enregistre les revêtements.
  - Le calcul est fait dans le core.
  - `artisan_import_plan_lines` remplace les lignes et remet la vérification à zéro.
  - « Recréer le DPGF » prévient que les quantités corrigées et les prix saisis sont perdus.
- **Vérification avant l'export** : `tenders.quantities_checked_at`, réglé par `artisan_check_tender_quantities`. La case enregistre dès qu'elle change.
  - **Excel** : refusé par l'Edge Function `tender-sheet` (409 `not_checked`) et par la route du site, qui renvoie vers l'appel d'offres avec un message.
  - **PDF** : `tender_document` ne rend rien tant que la case n'est pas cochée.
  - Le chiffrage et le passage en devis restent ouverts.
  - L'Excel d'un DPGF créé depuis les plans est le classeur MENAO.
- **Écran** : avant la création, le relevé puis les revêtements. Après la création :
  - un bandeau « à vérifier » ;
  - l'éditeur, avec la case de vérification à côté de l'export ;
  - le relevé et les revêtements repliés sous « Relevé et revêtements ».

## Hors de ce lot
- Évaluation de la lecture sur des plans fictifs et réels, avec la mesure du coût (PR C).
- Portes et fenêtres pièce par pièce : la convention d'une porte par pièce reste à affiner avec les retours des artisans.
- Réglage par l'artisan des conventions (largeur de porte, surface de fenêtre) : plus tard si besoin.
- TODO(legal) : la mention forfaitaire, et le libellé de la case de vérification, à faire relire.
