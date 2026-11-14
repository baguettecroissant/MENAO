# ADR 0317 — Parcours client : fiche d'un artisan et « Démarrer un chantier » (lot 48)

- Statut : accepté (14/11/2026)
- Fonctionnalité : F-153 (maquette lot 48 validée, fiche : maquette FicheParcoursNette du lot 12)

## Contexte

L'audit des écrans du 14/11/2026 a relevé que la fiche d'un artisan dans le parcours de demande ne
suivait pas sa maquette (lot 12), et que « Démarrer un chantier » dans l'espace client gardait
l'ancienne page autour de la saisie refaite.

## Décision

- **Fiche d'un artisan dans le parcours** (`/recherche/[id]/artisans/[artisanId]`) :
  - « ← Artisans trouvés » au lieu du fil d'Ariane, en-tête de la fiche sans bouton ;
  - corps de la fiche publique (lot 23) avec, à droite et fixe, « Votre projet » (métier et
    ville), « Sélectionner cet artisan » et « Jusqu'à 3 artisans par demande » ; « Lui envoyer
    une demande à lui seul » garde la demande directe ; sur téléphone, le bouton en bas d'écran ;
  - « Sélectionner cet artisan » ramène aux artisans trouvés avec cet artisan coché
    (`?choisi=`). La sélection n'étant pas gardée entre deux pages, la maquette « 1 artisan
    sélectionné sur 3 » devient « Jusqu'à 3 artisans par demande ».
- **Démarrer un chantier** (`/mon-espace/nouvelle-demande`) : titre et chapeau à gauche, la
  saisie du lot 12 inchangée ; à droite « Comment ça marche » en trois étapes et les garanties.
- Aucune règle ni donnée changée ; test de bout en bout adapté au lien « Artisans trouvés ».
