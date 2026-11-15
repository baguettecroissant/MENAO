# ADR 0337 — Écran de vérification des symboles comptés (F-159, lot 7, PR B)

- Statut : accepté (15/11/2026)
- Fonctionnalité : F-159, lot 7 ; maquette du lot 55 (« Symboles comptés sur le plan ») validée

## Constat

Les symboles électriques comptés (ADR 0336) remplissent les postes de l'électricien, mais
l'artisan doit pouvoir voir chaque symbole compté et corriger un oubli ou une erreur : c'est un
forfait, il reste responsable de ses quantités.

## Décision

- Étape « Relevé » : une section « Symboles comptés sur le plan » par page de plan comptée. Le plan
  avec chaque symbole posé à sa position ; le type choisi est numéroté, les autres restent en
  points pâles ; une pastille par type donne son compte.
- « Ajouter » pose un symbole du type choisi d'un clic sur le plan (rattaché à la pièce dont le
  contour tracé le contient) ; « Retirer un symbole » l'enlève d'un clic ; un symbole touché
  change de type. Un groupe que deux lectures ne comptent pas pareil est entouré en orange, avec
  « C'est vérifié ».
- Cartes : comptes par type, groupe à vérifier, convention de dessin reconnue ; tableau du compte
  par pièce.
- `artisan_save_plan_symbols` remplace les symboles de la page enregistrée (les autres pages
  restent) et remet à zéro la vérification des quantités du DPGF. Le DPGF reprend les comptes
  corrigés quand il est recréé.

## Conséquences

- L'artisan voit d'où vient chaque nombre du lot de l'électricien et le corrige en quelques clics.
- La convention de dessin reconnue est affichée sans être modifiable pour l'instant.
- Écart avec la maquette : les onglets ne montrent que les pages comptées (le plan d'électricité),
  pas tous les plans du dossier.
