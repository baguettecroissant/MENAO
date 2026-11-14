# ADR 0328 — Pages de PDF rendues en images : tracé, contours et métré (F-159, lot 4)

- Statut : accepté (15/11/2026)
- Fonctionnalité : F-159, lot 4 ; suite des ADR 0326 (mesure à l'échelle) et 0327 (métré à la main)

## Constat

La mesure à l'échelle et le métré à la main ne fonctionnaient que sur les photos. Les architectes
envoient surtout des PDF : la fonction de lecture ne peut pas en tirer d'image (pas de rendu de PDF
dans une Edge Function), et la visionneuse les affichait dans un cadre sans calque possible.

## Décision

- **Rendu dans le navigateur, au dépôt** : chaque page du PDF (12 au plus) est rendue en JPEG avec
  pdf.js, à la taille que le modèle lit sans la réduire (3,6 Mpx au plus), et déposée à côté du
  PDF (`plan_files[].pages`). Le PDF lui-même reste lu par le modèle pour son texte.
- **Nouvelle dépendance** : `pdfjs-dist` (Mozilla, Apache 2.0), la bibliothèque de référence pour
  rendre un PDF dans un navigateur. Elle n'est chargée qu'au moment du dépôt (import dynamique) ;
  son fichier de travail est servi par le site (aucun service tiers, CSP inchangée).
- **Tracé après la lecture** : les images des pages que la lecture a reconnues comme plans de
  niveau sont tracées (quatre au plus, photos comprises) ; sans page de niveau désignée, les
  premières images. Le tracé prend le temps que la lecture a laissé à la fonction (140 s en tout) ;
  s'il reste moins de 35 s, le relevé est rendu sans estimation.
- **Tracé rattaché à sa page** (`PlanTrace.page`) : une pièce est rapprochée d'abord du tracé de la
  page où elle a été lue.
- **Écrans** : dans le relevé, une page de PDF rendue s'affiche en image avec ses contours, avec un
  sélecteur de pages et un lien « Ouvrir le PDF ». « Mesurer sur le plan » propose chaque page.
  Une mesure tracée à la main garde sa page.
- **Base** : pages vérifiées à la création (dossier de l'entreprise, JPEG, douze au plus, sans
  doublon) et rendues à la suppression (pgTAP 153).

## Limites connues

- Les PDF déposés avant ce lot n'ont pas d'images de pages : il faut redéposer les plans.
- Au-delà de douze pages, les pages suivantes sont lues mais ni tracées ni mesurables.
- Un PDF illisible par pdf.js (protégé, abîmé) est déposé sans images : il reste lu normalement.
- Le rendu se met en pause si l'onglet passe en arrière-plan pendant le dépôt (comportement du
  navigateur) ; il reprend au retour.
- Les zones agrandies (ADR 0325) ne s'appliquent toujours qu'aux photos : le texte d'un PDF est
  lu directement.
