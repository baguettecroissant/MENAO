# ADR 0263 — Cartes de visite aux couleurs de MENAO (lot 17)

- Statut : accepté
- Date : 9 novembre 2026
- Suite de l'ADR 0161 (cartes de visite) et 0191 (carte et parrainage dans l'application). Lot 17 maquetté et validé le 9 novembre.

## Décision
- Trois modèles : **Nuit** (panneau ou verso bleu nuit de MENAO), **Clair** (fond bleu clair, badge « Artisan vérifié ») et **Sobre** (blanc, MENAO discret).
- **Site, planche A4** (`/pro/cartes-de-visite`) : une seule face par carte (impression maison : un recto-verso s'aligne mal). Choix du modèle par vignettes, gardé dans l'adresse (`?modele=`), Nuit par défaut. Les couleurs sont imprimées telles quelles (`print-color-adjust: exact`).
- Le **logo des documents** (ADR 0038) remplace les initiales de l'entreprise quand il existe.
- Les cartes des commerciaux (ADR 0205) prennent le modèle Nuit, sans badge « Artisan vérifié ».
- **Application** : la carte s'affiche en grand, verso d'abord (le QR code que le client scanne), recto en glissant, bascule Nuit / Clair / Sobre. Rien n'y parle d'impression ni d'achat (règle 10).

## Conséquences
- Les modèles recto-verso servent de base au lot 2 (impression professionnelle revendue par MENAO, imprimeur à choisir ; `TODO(legal)` : conditions de vente, TVA, factures).
