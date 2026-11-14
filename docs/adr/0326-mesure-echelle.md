# ADR 0326 — Mesure à l'échelle sur les plans : pièces « Estimé » (F-159, lot 2)

- Statut : accepté (14/11/2026)
- Fonctionnalité : F-159, lot 2 ; maquette du lot 53, validée le 14/11/2026

## Constat

Après le lot 1 (ADR 0325), une pièce sans surface écrite ni cotes exploitables restait vide :
pièces non rectangulaires, cotes rattachées à plusieurs pièces, plans chargés. L'utilisateur a
accepté de revenir sur le principe « rien n'est deviné », à condition que l'estimation soit dite
et contrôlable.

## Décision

- **Tracé** : pour chaque photo de plan (quatre au plus), un second appel au modèle rend le
  contour de chaque pièce en pixels de l'image et désigne jusqu'à six cotes écrites (deux
  extrémités et la valeur). Il tourne en même temps que la lecture ; son échec n'empêche pas le
  relevé.
- **Mesure par `packages/core`** : l'échelle est la médiane des échelles tirées des cotes
  désignées ; si elles se contredisent de plus de 5 %, rien n'est mesuré. Surface et périmètre
  viennent du contour (formule du lacet). Le modèle ne calcule rien.
- **« Estimé »** : une pièce sans surface que le tracé retrouve prend l'origine `estime`. Une pièce
  qui a déjà une surface (lue, calculée avec ses cotes, saisie) n'est jamais remplacée. Une
  quantité du DPGF qui s'appuie sur une pièce estimée est elle-même marquée « Estimé » ; l'export
  reste soumis à « J'ai vérifié les quantités ».
- **Contrôle** : les pièces mesurées par leurs cotes sont aussi tracées ; l'écart entre les deux
  mesures est affiché pièce par pièce et en moyenne, signalé au-delà de 5 %.
- **Affichage** : contours posés sur la photo (ambre pointillé pour les pièces estimées, bleu
  pour les autres, cotes d'ancrage en vert), dans le cadre de l'image pour que les pixels
  coïncident.
- **Images** : le modèle réduit une image de plus de 2 576 px ou d'environ 3,75 Mpx, et ses
  coordonnées ne sont alors plus celles du fichier. Le navigateur plafonne donc chaque image à
  3,6 Mpx, et une image plus grande n'est pas tracée.
- **Base** : `tender_rooms.source` et `tender_lines.quantity_source` acceptent `estime` ;
  `tenders.plan_traces` garde les tracés ; `artisan_import_plan_traces` les enregistre et remplit
  les pièces sans surface (pgTAP 151).

## Mesures (Opus 5.5, 14/11/2026, 0,14 $)

- Plan fictif avec un séjour en L : écart moyen de 0,1 % sur cinq pièces.
- Plan des sols de l'essai de l'utilisateur : pièces tracées à 0 à 3,5 % de leur surface par les
  cotes, contours posés sur les murs (salle d'eau en L, cuisine à décrochement), échelle calée sur
  cinq cotes à moins de 1 % d'écart.
- Plan des cloisons, plus chargé : pièces tracées justes, mais moins nombreuses, et une passe sur
  deux en oublie. Le tracé à la main (lot 3) reste nécessaire pour compléter.
- Durée d'un tracé : 15 à 28 s ; coût d'environ 0,03 $ par photo.

## Limites connues

- Photos seulement : une page de PDF n'est pas tracée (pas d'image côté serveur, visionneuse sans
  calque). Le rendu des pages de PDF en images dans le navigateur est une suite possible.
- Les appels d'offres créés avant ce lot gardent des photos de plus de 3,6 Mpx : elles ne sont pas
  tracées ; il faut redéposer les plans.
- Une pièce tracée mais absente du relevé n'est pas ajoutée ; « Corriger le contour » et le métré
  à la main sont le lot 3.
- TODO(legal) : la mention sur la responsabilité de l'artisan pour une quantité estimée est à
  faire valider par l'avocat.
