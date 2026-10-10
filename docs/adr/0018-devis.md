# ADR 0018 — Devis : brouillon par chantier, calculs en centimes, catalogue personnel

- Statut : accepté
- Date : 10 octobre 2026

## Contexte
F-19 (spec §8) et règles de la spec §14 : montants en centimes entiers, calculs dans `packages/core` ou en base. Le devis est créé après le rendez-vous (ADR 0016). Il sera ensuite généré en PDF, numéroté et envoyé (F-20, F-21), puis signé (F-13). Maquettes « Vue d'une génération de devis ».

## Décisions
- **Un brouillon par chantier** (`quotes`, statut `brouillon`), créé au premier enregistrement. Les statuts `envoye`, `signe`, `refuse`, `revision_demandee` et `remplace` serviront aux étapes suivantes. Une demande de modification crée une nouvelle version (`version`).
- **Lignes** (`quote_lines`) : type (matériel, main d'œuvre, autre), désignation, description, quantité, unité, prix unitaire HT, taux de TVA.
  - **Montants** en centimes, et quantités en **millièmes** (2,5 h = 2500) : jamais de nombre à virgule, en base comme en TypeScript.
  - **Bornes** : 200 lignes, 100 000 unités, 1 000 000 € l'unité, 10 000 000 € HT par ligne.
  - Les lignes d'un devis envoyé ne peuvent plus changer.
- **Calculs** :
  - total HT de chaque ligne au centime le plus proche (moitié vers le haut) ;
  - TVA calculée par taux sur la somme hors taxe, ventilée du plus petit au plus grand taux ;
  - TTC = HT + TVA.
  - Mêmes règles dans `packages/core/src/quote.ts` (affichage en direct ; calcul exact en `BigInt`) et en base (`app.quote_line_total`, `app.refresh_quote_totals`). Les mêmes exemples sont testés des deux côtés : lignes de la maquette, 300 € HT donnant 330 € TTC.
  - `TODO(legal)` : règle d'arrondi et conditions des taux réduits à faire valider par l'expert-comptable.
- **Régime de TVA** :
  - un artisan assujetti choisit 5,5 %, 10 % ou 20 % ;
  - en franchise en base, seul 0 % est possible, avec la mention « TVA non applicable, art. 293 B du CGI » ;
  - contrôlé en base à l'enregistrement.
  - Taux proposé : celui de la ligne précédente, sinon 20 %. Une aide rappelle les conditions des taux réduits.
- **Enregistrement explicite** (maquette : Brouillon, Modifications apportées, Enregistré et à jour).
  - L'écran garde les lignes et prévient avant de quitter une page modifiée.
  - « Enregistrer » remplace toutes les lignes du brouillon (`artisan_save_quote_draft`) et la base recalcule les totaux.
- **« Rechercher l'article »** (catalogue personnel, décision D10) : lignes déjà saisies par l'artisan dans ses devis, la plus récente de chaque désignation (`artisan_previous_lines`), sans table supplémentaire. Aucun prix fournisseur.
- **Droits d'accès** : le brouillon reste privé à l'artisan ; le particulier lira le devis une fois envoyé ; l'équipe en lecture. Aucune écriture directe : uniquement par les fonctions.

## Conséquences
- 3d, dictée intelligente : les lignes proposées par `quote-from-voice` rejoindront le même éditeur, modifiables avant enregistrement.
- 3e :
  - « Générer le devis » attribuera le numéro (séquence sans trou ni doublon), figera le devis et produira le PDF avec les mentions de F-20 ;
  - « Envoyer » passera le chantier en `devis_envoye` (F-21).
- Un catalogue personnel distinct (articles favoris, sans devis) pourra s'ajouter si les artisans le demandent.
