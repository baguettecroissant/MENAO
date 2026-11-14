# ADR 0327 — Métré à la main sur le plan (F-159, lot 3)

- Statut : accepté (15/11/2026)
- Fonctionnalité : F-159, lot 3 ; maquette du lot 53 (planche 2), validée le 14/11/2026

## Constat

La mesure à l'échelle (ADR 0326) oublie des pièces sur un plan chargé, ne trace que des pièces et
peut poser un contour de travers. L'artisan devait alors saisir la valeur au clavier, sans moyen de
la mesurer. Une cloison à créer, des plinthes, des prises à compter n'avaient aucun chemin.

## Décision

- **Écran « Mesurer sur le plan »** (`?etape=mesure`), sur les photos de plans : la photo avec
  zoom et cinq outils — caler l'échelle, surface, longueur, compter, corriger un contour.
- **Échelle** : celle du tracé de MENAO quand il existe, sinon deux clics sur une cote et sa valeur
  en centimètres (`scaleFromCalibration`). Sans échelle, seule le comptage est possible.
- **Calcul par `packages/core`** (`measureMark`) : aire et périmètre d'un polygone, longueur d'une
  ligne brisée, nombre de points.
- **Corriger un contour** : un contour tracé par MENAO se charge avec ses points, qui se déplacent ;
  la mesure remplace la surface de la pièce.
- **Enregistrement** (`artisan_add_plan_measures`) : une surface devient une pièce, nouvelle ou
  existante ; une longueur ou un comptage devient un ouvrage dans le lot choisi (un métier hors de
  l'appel d'offres est ignoré). Les points de chaque tracé sont gardés (`tenders.plan_marks`).
- **Origine `trace`** (« Tracé à la main ») sur les pièces, les ouvrages et les quantités du DPGF.
  Une quantité qui s'appuie seulement sur des pièces tracées à la main garde cette origine.

## Limites connues

- Photos seulement, comme la mesure à l'échelle ; les pages de PDF ne se mesurent pas encore.
- Les tracés enregistrés ne sont pas réaffichés sur le plan après l'ajout : ils sont gardés pour
  une suite (les revoir, les modifier).
- Le zoom se fait par boutons et le déplacement par les barres de défilement ; pas de molette ni de
  glisser comme sur la maquette.
- Une nouvelle pièce reprend la hauteur sous plafond de la première pièce du relevé.
