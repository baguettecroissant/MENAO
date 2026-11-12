# ADR 0294 — Bibliothèque d'ouvrages, lot 1, PR 2 : le devis, la marge et les appels d'offres (F-141)

- Statut : accepté
- Date : 12 novembre 2026
- Suite de l'ADR 0293. Maquettes du lot 36, écrans 3 à 5.

## Contexte
La bibliothèque existe (ADR 0293). Il reste à s'en servir là où l'artisan chiffre :
- dans le devis : insérer un ouvrage, voir sa marge et être prévenu avant d'envoyer un devis sous son seuil ;
- dans les appels d'offres : reprendre les prix de la bibliothèque avant ceux des anciens devis.

Le client ne doit jamais voir un coût.

## Décision
- **Coût des lignes de devis** : table `quote_line_costs` (devis, position, coût unitaire, ouvrage d'origine).
  - Les lignes de devis sont réécrites à chaque enregistrement. Les coûts sont donc rangés par position et remplacés juste après le brouillon, par `artisan_save_quote_costs` (brouillon de l'entreprise seulement).
  - RLS : lecture par l'entreprise seule. Ni le client du chantier (qui lit pourtant les lignes) ni l'équipe MENAO n'y ont accès. Le PDF ne lit que les lignes : aucune fuite possible.
- **Insertion d'un ouvrage** : « Rechercher l'article » propose d'abord la bibliothèque, puis les anciens devis.
  - La recherche se fait côté serveur (`searchLibraryWorks`), avec les calculs du core.
  - `workQuoteLines` (core) donne les lignes de l'ouvrage :
    - **sur une ligne** : au prix retenu, avec son coût ;
    - **détaillé** : une ligne de fournitures et une ligne de main d'œuvre, ajoutées d'un coup. Un prix fixé à la main reporte la différence sur la main d'œuvre.
  - Une ligne garde son coût quand l'artisan la modifie : la marge se recalcule si le prix change.
  - Une ligne reprise d'un ancien devis n'a pas de coût.
- **Marge** (patron et chef d'équipe, page déjà réservée au droit « money ») :
  - une pastille par ligne (« Marge 26,4 % », « Coût inconnu », « Vendu à perte ») ;
  - un bloc « Votre marge » sous les totaux, en euros et en taux de marque, calculé sur les lignes dont le coût est connu (« sur 3 lignes sur 5 »).
- **Alerte avant l'envoi** : seulement si l'artisan a fixé un seuil. Elle s'affiche dans le bloc de marge et sur la page d'envoi. L'envoi reste possible.
- **Appels d'offres** :
  - `artisan_works.price_cents` garde le prix courant de chaque ouvrage, calculé par le site (core) et tenu à jour quand un ouvrage, un réglage ou une fourniture change (`artisan_set_work_prices`).
  - `artisan_price_history` rend désormais aussi les ouvrages (`source` = `bibliotheque`, datés du jour) avant les lignes de devis.
  - `suggestTenderPrice` préfère la bibliothèque à ressemblance égale.
  - L'origine `bibliotheque` est gardée sur la ligne du DPGF (étiquette « Bibliothèque »), à l'import d'un DPGF comme à la création depuis les plans.

## Hors de ce lot
- Ajouter un coût à une ligne libre du devis, ou « Garder dans ma bibliothèque » : plus tard.
- Le bloc « Votre marge » est affiché sur ordinateur ; l'application suit en PR 3.
- La dictée qui reprend les ouvrages (lot 3).
