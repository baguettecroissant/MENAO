# ADR 0186 — Dépenses de l'artisan (F-62)

- Statut : accepté
- Date : 25 octobre 2026
- Demande de l'utilisateur du 25 octobre 2026, après l'étude des dépenses d'un concurrent : « on met tout ça en place ». Premier lot du plan « dépenses → envoi au comptable → bibliothèque d'ouvrages et marge » (document « Bibliothèque d'ouvrages et marge »).

## Décision
- **Une rubrique « Dépenses »** dans l'espace pro, après « Factures » : les achats de l'artisan (fournitures, outillage, location, sous-traitance, carburant…) avec leur pièce.
- **La pièce d'abord** : l'artisan photographie la facture ou le ticket, ou choisit un PDF. L'IA la lit (fournisseur, numéro, dates, montants HT et TVA, catégorie, titre, lignes) et pré-remplit le formulaire ; l'artisan vérifie avant d'enregistrer.
  - Aucun montant n'est inventé : un total manquant est déduit des deux autres (TVA = TTC − HT), sinon le champ reste vide avec une alerte.
  - Pièce illisible ou qui n'est ni une facture ni un ticket : rien n'est pré-rempli.
  - On peut aussi saisir une dépense sans pièce.
- **Chaque dépense est rattachée à un chantier, ou « À classer »** (pastille orangée, la seule couleur d'action de la liste).
- **Statut de paiement indiqué par l'artisan** : payée (date du paiement), en retard (échéance passée), sinon à payer. En tête de liste : le reste à payer et la part en retard. MENAO ne paie rien et ne touche pas d'argent (CLAUDE.md règle 12) : c'est un suivi.
- **La pièce est archivée** dans un espace privé (CLAUDE.md règle 8), lue avec des URL signées de 10 minutes. Une nouvelle pièce remplace la précédente ; supprimer la dépense supprime sa pièce.
- **Personne d'autre que l'artisan ne lit ses dépenses** : ni le client du chantier, ni un autre artisan, ni l'équipe MENAO.
- **Export CSV pour le comptable**, au même format que celui des factures.
- **« Factures électroniques »** : bouton déjà en place, qui indique « bientôt disponible ». La réception automatique passera par la plateforme agréée, pas encore choisie (décision D13). La colonne `origin` (`manuelle` | `facture_electronique`) est prête pour ce moment-là.
- **Exemples** (ADR 0184) : cinq dépenses fictives dans `/pro/decouvrir/depenses`, dont deux pour le chantier en cours, une location en retard et deux tickets à classer.
- **Ce qui vient ensuite** :
  - l'envoi automatique au comptable ;
  - les lignes lues sur les pièces, qui mettront à jour les prix d'achat de la future bibliothèque d'ouvrages ;
  - la rentabilité réelle des chantiers (devis signé moins dépenses).

## Technique
- **Cœur métier** :
  - `packages/core/src/expenses.ts` : statut, filtres, recherche sans accents, reste à payer ;
  - `packages/core/src/expense-reading.ts`, autonome car importé par l'Edge Function : schéma de la sortie structurée, normalisation en centimes et millièmes, alertes ;
  - `formatEurosInput` (centimes → « 435,00 »), symétrique de `parseEuros` ;
  - `exampleExpenses`.
- **Validation** : `expenseFormSchema` (montants saisis en texte, échéance ≥ date de la pièce) et `expenseLinesSchema` (100 lignes au plus, unités des devis).
- **Base** :
  - tables `expenses` (TTC calculé par une colonne générée) et `expense_lines`, avec la RLS en lecture pour l'artisan propriétaire ;
  - écritures par les fonctions `artisan_save_expense`, `artisan_set_expense_paid` et `artisan_delete_expense`, réservées à l'espace pro (`app.my_pro_artisan_id` : validé, suspendu ou radié) ;
  - espace de stockage privé `expense-documents/<artisan_id>/<expense_id>/…`, lecture et suppression par l'artisan, dépôt par process-upload seulement ;
  - test pgTAP `102_depenses`.
- **Edge Functions** :
  - `read-expense` (même modèle et mêmes limites que `read-document`, 60 lectures par heure et par artisan, métriques dans `ai_runs` seulement) ;
  - `process-upload`, avec le nouvel usage `expense_document`.
- **Site** :
  - pages `/pro/depenses` (liste, onglets, recherche), `/nouvelle` (`?chantier=` pré-choisit le chantier), `/[id]`, `/[id]/modifier` et `/export` ;
  - composants `ExpenseList`, `ExpenseForm`, `ExpenseDetailView` et `EinvoiceButton`.
- **Application (second lot)** : mêmes fonctions, même cœur métier et mêmes contrôles (`expenseFormSchema`).
  - Écrans `/pro-depenses` (liste, puces de statut, recherche, reste à payer, export CSV partagé), `/pro-depense/nouvelle` (`?chantier=`), `/pro-depense/[id]` (fiche, pièce ouverte dans le navigateur sécurisé) et `/pro-depense/[id]/modifier`.
  - La pièce se prend à l'appareil photo, dans la photothèque ou parmi les fichiers (PDF). Elle est déposée dès qu'elle est choisie, lue, puis rangée à l'enregistrement ; retirée si l'écran est quitté sans enregistrer.
  - Accès par « Mon profil » (rubrique Argent, après Factures) et par le bouton (+) : « Ajouter une dépense ».
  - Mode exemples (ADR 0184) : les dépenses fictives s'ouvrent, l'ajout, l'export et les actions restent inactifs.
