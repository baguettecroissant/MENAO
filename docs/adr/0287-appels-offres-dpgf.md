# ADR 0287 — Appels d'offres et DPGF, lot 1 (F-136)

- Statut : accepté
- Date : 12 novembre 2026
- Maquettes validées le 12 novembre 2026 (lot 34 du canevas). S'appuie sur les ADR 0231 (droits des formules), 0200 (formules) et 0020 (PDF).

## Contexte
Les entreprises qui travaillent avec des architectes répondent à des appels d'offres. Le dossier contient un DPGF (Décomposition du Prix Global et Forfaitaire) : un tableau de lots et de postes (désignation, unité, quantité) que l'entreprise chiffre. C'est un forfait : l'entreprise reste responsable des quantités.

Aujourd'hui, l'artisan recopie le tableau, cherche ses prix dans ses anciens devis et refait le fichier. L'idée est d'en faire un argument fort de la formule Entreprise.

L'utilisateur a validé un premier lot qui comprend :
- l'import du DPGF ;
- le chiffrage avec les prix de l'artisan ;
- l'export au format de l'architecte et en PDF.

Il a choisi :
- d'importer l'Excel et le PDF ;
- de passer en devis MENAO dès le lot 1, client hors MENAO compris.

On livre en trois PR :
- **A** (celle-ci) : Excel, chiffrage, exports ;
- **B** : lecture des DPGF en PDF par l'IA ;
- **C** : passage en devis pour un client hors MENAO.

## Décision
- **Place** : un onglet « Appels d'offres » dans Demandes (`PillTabs`), sans nouvelle rubrique de menu. Il est ouvert au patron et au chef d'équipe (droit `money`).
- **Formule** : `plans.limites.agents.appels_offres`, vrai pour Entreprise seulement, réglable en base. La lecture passe par `my_ai_agents` (`agents.tenders`).
  - Les écritures sont vérifiées par `app.tender_artisan()`.
  - La lecture et la suppression restent possibles après un changement de formule.
- **Données** :
  - `tenders` : projet, architecte, date de remise, suivi (`en_cours`, `envoye`, `retenu`, `perdu`), fichier de l'architecte, lecture de la feuille, TVA de l'offre.
  - `tender_lines` : titres et postes, avec la quantité de l'architecte, la quantité retenue, le prix unitaire, l'origine du prix (`devis` ou `manuel`) et la ligne de la feuille.
  - RLS : lecture par l'entreprise (`app.my_manager_artisan_id()`) et les admins. Les écritures passent par les fonctions `artisan_create_tender`, `artisan_import_tender_lines`, `artisan_save_tender`, `artisan_update_tender` et `artisan_delete_tender`.
- **Fichier** : bucket privé `tender-files` (xlsx et pdf, 15 Mo), un dossier par entreprise. Le navigateur y dépose le fichier directement : il n'y a pas d'étape de vérification `process-upload`, car c'est l'Edge Function qui valide le classeur en l'ouvrant.
- **Lecture** : `packages/core/src/dpgf.ts`, sans import, pour être lu par Deno.
  - Ligne d'en-tête : une colonne désignation et au moins deux autres colonnes reconnues (n°, unité, quantité, prix unitaire, total).
  - Titres et lots, postes, unités ramenées à celles des devis. Les lignes de totaux et de TVA sont ignorées.
  - La feuille retenue est celle qui a le plus de postes.
- **Prix** : `artisan_price_history()` rend la dernière ligne des devis de l'entreprise, par désignation et par unité. `suggestTenderPrice` compare les mots communs (même unité, ressemblance d'au moins 50 %) et garde la plus récente à égalité. C'est une suggestion, signalée « Vos devis » ; une saisie devient « Saisi ».
- **Edge Function `tender-sheet`** (exceljs 4.4.0, MIT) :
  - `import` : lit le fichier, propose les prix et enregistre les lignes avec le jeton de l'utilisateur.
  - `export` : réécrit le fichier de l'architecte. Les quantités changées et les prix unitaires sont écrits ; le total n'est écrit que s'il n'y a pas de formule. Mise en page et formules sont gardées, avec recalcul à l'ouverture. Une feuille « Écarts MENAO » est ajoutée quand des quantités ont changé.
  - Le travail lourd est dans une Edge Function, pas sur Vercel (règle 13).
- **PDF** : `generate-pdf` reçoit `tenderId`, puis `tender_document` et `packages/documents` (`tender-data.ts`, `tender-pdf.ts`) produisent un tableau par lot avec les totaux. La quantité du DPGF est rappelée sous celle de l'entreprise quand elles diffèrent. Le PDF est produit à la demande et n'est jamais conservé.
- **Écarts** : `tenderGaps` (`dpgf-totals.ts`) compte les quantités changées et le montant HT des quantités en plus, c'est-à-dire le risque du forfait.
- **Mentions** : « vous restez responsable de vos quantités » dans l'écran. TODO(legal) : la mention forfaitaire du PDF est à faire valider.

## Hors de ce lot
- Lecture d'un DPGF en PDF (PR B).
- Passage en devis MENAO pour un client hors MENAO (PR C). Il touche la règle « tout devis vient d'une demande MENAO » (ADR 0209), à cadrer avant le code.
- Métré sur les plans, lecture du CCTP, dossier de candidature, mémoire technique, marge par lot (lots suivants de la maquette).
- Application mobile : le chiffrage d'un DPGF se fait sur ordinateur.
