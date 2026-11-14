# ADR 0321 — DPGF comparé à sa maquette (lot 51, partie 3)

- Statut : accepté (14/11/2026)
- Fonctionnalité : F-157 ; audit des écrans du 14/11/2026, lot 51 (remises sans nouvelle maquette)

## Constat (comparaison avec les maquettes du lot 34)

- **Dépôt** (DpgfDepot) : déjà conforme, « Comment ça marche » est dans le formulaire de dépôt.
- **DPGF chiffré** (DpgfTableau) : quantité de l'architecte et quantité retenue côte à côte, écart,
  origine de chaque prix, totaux et TVA : déjà là. Manquait le bandeau de risque des postes
  sous-estimés.
- **Export** (DpgfExport) : Excel au format de l'architecte, PDF et passage en devis MENAO : déjà
  là.
- Les autres éléments des maquettes du lot 34 décrivent des fonctions non construites (lecture du
  CCTP, repérage des lots dans le CCTP, mémoire technique, dossier de candidature, envoi à
  l'architecte, fil des cinq étapes) : ce n'est pas une remise à la maquette mais de nouvelles
  fonctions, à décider à part.

## Décision

- Bandeau « N postes sous-estimés au DPGF de l'architecte » avec le montant HT en plus, au-dessus du
  DPGF chiffré (fichier de l'architecte seulement ; le DPGF tiré des plans n'a pas de quantités
  d'architecte). `tenderGaps` (packages/core) compte aussi ces postes.
