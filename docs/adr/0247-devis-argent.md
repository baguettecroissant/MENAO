# ADR 0247 — Éditeur de devis et rubrique « Argent » repensés (refonte « Nette », lot 2)

- Statut : accepté
- Date : 8 novembre 2026
- Suite des ADR 0245 et 0246. Lot 2 maquetté (ordinateur, téléphone, application) et validé le 8 novembre.

## Décision
- **En-tête des écrans du devis** : retour, grand titre « Devis · titre du chantier », client, ville et date de visite, et les étapes **1 Lignes · 2 Aperçu · 3 Envoi** (l'étape courante en pastille bleu nuit, les étapes déjà ouvertes en lien). Il remplace le bandeau bleu et les onglets « Aperçu / Envoi ».
- **Éditeur** : état d'enregistrement en pastille ; cartes pour **créer vite** (Dictée intelligente, Dicter avec Camille quand la formule le comprend, **Mes articles** qui ouvre l'ajout d'une ligne avec la recherche des articles déjà chiffrés) ; **lignes dans une carte** (type en pastille de couleur, « À vérifier », désignation en demi-gras, « quantité × prix HT », total TTC en Inter Tight, modifier et supprimer) ; **total à droite** en grand écran (TTC en grand, HT, TVA par taux, Générer le devis, Enregistrer) et **collé en bas** sur téléphone — un seul bloc, déplacé en CSS, pour garder un seul total et un seul état d'enregistrement dans la page.
- **Rubrique « Argent »** : grand titre « Argent » et phrase d'introduction au-dessus des onglets ; pages élargies ; **bandeau de chiffres clés** par onglet (devis : en attente de signature, à envoyer, taux de signature sur 6 mois ; factures : facturé ce mois et cette année ; dépenses : dépenses du mois avec leur TVA, reste à payer et retard) ; **lignes avec une icône** colorée à gauche et l'**état en pastille**.
- Calculs des chiffres dans `@menao/core` (`quoteFigures`, `invoiceFigures`, `expenseMonthFigures`, testés), comme le reste (règle 4).
- Pas de bouton « Nouveau devis » dans l'Argent : un devis se crée depuis un chantier. Pas d'aperçu de l'échéancier dans l'éditeur (il se règle à l'étape « Envoi »).

## Conséquences
- `ListRow` accepte une icône et affiche l'état en pastille dans toutes les listes ; `ListHeader` accepte un titre de niveau 2.
- **Application** : même modèle (`components/pro/quote-kit.tsx`, `money-kit.tsx`) — barre « Devis » avec l'état d'enregistrement, carte des étapes, cartes « créer vite », lignes et totaux (acompte par défaut via `paymentSchedule`), barre du bas « Suivant : aperçu » ; quatre onglets de l'Argent avec leurs chiffres clés ; dépenses : « Photo du ticket » ouvre l'appareil photo à l'arrivée sur la saisie. Les filtres existants sont gardés (ceux des maquettes qui n'existent pas encore ne sont pas ajoutés).
- « TVA récupérable » n'est pas écrit : la TVA n'est récupérable que pour un artisan assujetti ; on affiche « dont X de TVA ».
