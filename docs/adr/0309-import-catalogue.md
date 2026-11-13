# ADR 0309 — Importer son catalogue dans la bibliothèque (PR 1 : lecture et base)

- Statut : accepté (13/11/2026)
- Fonctionnalité : F-148 (maquette lot 42 validée) ; lot 2 de la bibliothèque (ADR 0293)

## Contexte

Le premier passage de la bibliothèque (ADR 0307) affiche « Importer mon catalogue » en « Bientôt ».
Les artisans ont souvent leurs prix dans un tableur, avec leurs propres titres de colonnes.
Décisions du 13/11/2026 :
- ouvrages (prix de vente) et fournitures (prix d'achat) ;
- un article déjà présent (même désignation et même unité) voit son prix mis à jour par défaut,
  « laisser tels quels » au choix ;
- l'IA ne sert qu'en secours pour reconnaître les colonnes (Haiku, environ 0,002 $ par import).

## Décision

- **Cœur** (`packages/core/src/library-import.ts`, autonome pour Deno) :
  - colonnes reconnues par leurs titres (« Libellé », « PU HT », « Tx TVA »…), puis par leur
    contenu (texte le plus long, colonne de montants, colonne d'unités) ;
  - lecture des prix (« 1 250,00 € », « 1.250,00 », nombres Excel), des unités (alias du DPGF et
    des catalogues) et de la TVA (taux d'un devis seulement) ; lecture des CSV (séparateur deviné,
    guillemets) ;
  - lignes classées : nouvelles, déjà présentes (une ligne répétée compte une fois, la dernière),
    à corriger avec leur raison (désignation vide, prix illisible ou manquant, unité ou TVA
    inconnue).
- **Fichiers** : espace privé `library-imports/<entreprise>/<uuid>.xlsx|csv` (5 Mo, l'entreprise
  seule), fichier supprimé après l'import.
- **Fonction `library-import`**, avec le jeton de l'utilisateur :
  - `read` : colonnes et aperçu ; l'IA est appelée seulement si la désignation ou le prix manquent,
    avec les 20 premières lignes ; journal `read-catalog` sans contenu ;
  - `check` : chiffres de l'étape 3, rien n'est écrit ;
  - `import` : enregistrement d'un bloc. 5 000 lignes au plus, 60 appels par heure.
- **Base** : `artisan_import_library(type, lignes, mettre_à_jour)` :
  - lignes revérifiées ;
  - ouvrages : prix fixé à la main, TVA 10 % par défaut, origine `import`, la composition des
    ouvrages existants ne change pas ;
  - fournitures : prix d'achat daté du jour, référence et fournisseur ;
  - rend le nombre d'articles ajoutés et mis à jour. Tests pgTAP 146.

## Conséquences

- PR 2 : les trois écrans du site (fichier, colonnes, vérification), puis « Importer mon
  catalogue » activé au premier passage. L'application renvoie vers l'ordinateur.
- Les prix importés sont ceux de l'artisan : aucun prix commun, aucune donnée partagée.
