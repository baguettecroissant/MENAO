# ADR 0314 — Nouvelle dépense et modifier une dépense : refonte « Nette »

- Statut : accepté (14/11/2026)
- Fonctionnalité : F-150 (maquette lot 45 validée) ; complète la refonte « Nette » (ADR 0245,
  lot 8 : ADR 0253)

## Contexte

La page « Nouvelle dépense » sur ordinateur (et « Modifier la dépense », même formulaire) avait
échappé à la refonte : au lot 8, seuls la fiche d'une dépense et l'écran de l'application avaient
été maquettés. L'ancien formulaire en une colonne étroite restait en place.

## Décision

- Deux colonnes comme la fiche (`lg:grid-cols-[minmax(0,1fr)_27.5rem]`), une seule sur téléphone.
- **Gauche, la pièce** :
  - au départ, une zone de dépôt (glisser-déposer, « Prendre en photo », « Choisir un fichier ») ;
  - ensuite, l'aperçu (image du navigateur, ou page stylisée pour un PDF), « Changer de fichier »,
    la pastille verte « Facture lue par l'IA » et les avertissements de lecture ;
  - en modification, la pièce déjà enregistrée (URL signée) avec « Ouvrir la pièce » ;
  - en dessous, les lignes lues, retirables, qui servent aussi aux prix d'achat (ADR 0311).
- **Droite, la dépense en cartes** : « La dépense » (titre, fournisseur, numéro, type,
  catégorie, chantier), « Montants » (HT et TVA avec « € » dans le champ, total TTC calculé en
  grand, date et échéance), paiement (interrupteur « Déjà payée », date) avec « Ajouter une note »
  repliée, puis le bouton (« Enregistrer les modifications » en modification) et « Annuler ».
- Aucune règle ni donnée changée : même action `saveExpense`, même lecture `readExpense`.

## Conséquences

- L'audit des écrans oubliés par la refonte (14/11/2026) propose les lots suivants.
