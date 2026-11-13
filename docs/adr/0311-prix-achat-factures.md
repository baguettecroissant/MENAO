# ADR 0311 — Prix d'achat repérés dans les factures

- Statut : accepté (13/11/2026)
- Fonctionnalité : F-149, PR 1 (maquette lot 43 validée) ; lot 2 de la bibliothèque (ADR 0293)

## Contexte

Les prix d'achat des fournitures vieillissent, alors que les factures fournisseurs sont déjà lues
dans « Dépenses » (désignation, référence, unité, prix unitaire HT : ADR 0186). Décision du
13/11/2026 : MENAO **propose**, l'artisan vérifie ; aucune mise à jour silencieuse.

## Décision

- **Cœur** (`packages/core/src/library-invoices.ts`) :
  - factures des 90 derniers jours ; ligne exploitable : désignation et prix unitaire positif ;
  - rapprochement par la référence (sans espaces ni séparateurs, unité compatible), sinon par la
    désignation (sans accents ni ponctuation, « 45mm » = « 45 mm ») et la même unité ;
  - pour chaque fourniture, la ligne la plus récente seulement : proposée si elle n'a pas été
    passée en revue, si elle n'est pas plus ancienne que le prix actuel et si le prix change ;
  - cochée par défaut, sauf écart de plus de 30 % (conditionnement différent ?) ; prix encore à
    renseigner (fourniture MENAO) : proposé et coché ;
  - lignes inconnues (ni la référence ni la désignation) : ajouts possibles, une fois par article,
    décochés ; connues sous une autre unité : ignorées ;
  - nombre d'ouvrages recalculés (prix non fixé à la main, utilisant une fourniture cochée).
- **Base** :
  - table `library_invoice_reviews` (ligne passée en revue, RLS : lecture par l'entreprise,
    écriture par la fonction) ; tests pgTAP 147 ;
  - `artisan_apply_invoice_prices(mises_à_jour, ajouts, vues)` : prix **relus sur la facture**
    (jamais ceux du navigateur), datés de la facture, référence et fournisseur repris s'ils
    manquaient ; ajouts sans doublon ; toutes les lignes affichées passées en revue, même
    laissées, pour ne plus les reproposer.
- **Site** : page `/pro/bibliotheque/prix-factures` (« Mes prix d'achat à jour »), comme la
  maquette ; bandeau « N prix d'achat ont changé dans vos factures. Vérifier » dans la
  bibliothèque ; après la mise à jour, prix des ouvrages recalculés et retour aux fournitures
  avec le bilan. Les devis déjà envoyés ne changent pas.
- Aucun appel à l'IA. Seed : une facture fictive de la plombière disponible ; test de bout en
  bout.

## Conséquences

- Une dépense modifiée réécrit ses lignes : ses lignes sont de nouveau proposées si le prix
  diffère encore.
- PR 2 : « Augmenter mes prix » en un geste, annulable 24 h (deuxième écran du lot 43).
- L'application pourra reprendre l'écran plus tard ; la maquette est pour l'ordinateur.
