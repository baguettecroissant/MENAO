# ADR 0189 — Listes en lignes de l'espace artisan

- Statut : accepté
- Date : 25 octobre 2026
- Suite de l'ADR 0188, simplification de l'espace artisan validée par l'utilisateur le 25 octobre 2026 (« vas-y avec tes propositions »). Lot 2 sur 3 : les listes. Cette PR (lot 2a) reprend les listes de la rubrique Argent ; les chantiers et les demandes suivront (lot 2b).

## Décision
- **Une ligne fine par élément** au lieu d'une carte, dans un seul cadre, façon réglages d'iPhone :
  - à gauche, le titre (deux lignes au plus) et une ligne de détail ;
  - à droite, le montant et l'état en un mot et une couleur (« Payée », « En retard ») ;
  - sur ordinateur, une colonne du milieu pour le chantier ; sur téléphone, il passe dans le détail.
- **Un seul bouton principal** par liste (« + Ajouter » pour les dépenses). Le reste passe dans un menu « … » : exporter, envoi au comptable, factures électroniques (« Bientôt »).
- **Filtres soulignés avec leur nombre ou leur montant** (« À payer · 1 527,60 € »), qui remplacent le bloc « À payer » et les puces de filtre.
- **Recherche compacte**, la loupe dans le champ.
- Les mêmes briques serviront aux chantiers et aux demandes : une seule façon de lire une liste dans tout l'espace artisan.

## Technique
- **Site** :
  - `components/list-kit.tsx` : `ListHeader`, `ListFilters`, `ListPanel`, `ListRow` ;
  - `components/more-menu.tsx` : menu « … » (composant client), avec liens, téléchargements et éléments « Bientôt » ; il se ferme au clic dehors et avec Échap ;
  - listes réécrites : dépenses, factures, devis ;
  - le bouton seul « Factures électroniques » (`einvoice-button.tsx`) disparaît dans le menu.
- **Application** :
  - `components/list-kit.tsx` : `ListHeader` (« … » ouvre une `BottomSheet`), `ListFilters` (défilement horizontal), `ListSearch`, `ListGroup`, `ListRow` (fond grisé au toucher, roue pendant la préparation d'un PDF) ;
  - écrans réécrits : dépenses, factures, devis de l'onglet Argent ;
  - les textes devenus inutiles (sous-titres, bloc « À payer ») sont retirés.
- **Exemples (ADR 0184)** : pastille « Exemple » sur les lignes, actions de l'en-tête visibles mais inactives.
- Aucun changement de données, de base ni d'adresse.
