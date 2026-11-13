# ADR 0307 — Bibliothèque MENAO, PR 2 : écrans du site et prix retenu

- Statut : accepté (13/11/2026)
- Fonctionnalité : F-147 (maquette lot 41 validée) ; suite de l'ADR 0306

## Contexte

La PR 1 (ADR 0306) a posé le catalogue MENAO et la copie dans la bibliothèque de l'entreprise. Il
reste les écrans du site. Il faut aussi décider quel prix part sur les devis quand un ouvrage n'a
qu'une fourchette, faute de prix d'achat. La maquette du lot 41 propose « Bas / Milieu / Haut / À la
main », milieu par défaut (validé le 13/11/2026).

## Décision

- **Prix retenu** : nouvelle colonne `artisan_works.price_pick` (`bas`, `milieu` par défaut, `haut`).
  `artisan_save_work` l'accepte (`pricePick`, valeur inconnue refusée en 22023). Le cœur
  (`workPricing(…, pick)`, `pickInRange`) l'applique seulement si l'ouvrage n'a ni prix fixé à la
  main ni prix calculé complet. « À la main » reprend le prix fixé à la main existant.
- **Premier passage** (`/pro/bibliotheque` tant que `library_onboarded_at` est vide) :
  - les trois choix de la maquette : la bibliothèque MENAO, avec les métiers de la fiche cochés
    d'avance ; l'import du catalogue, affiché « Bientôt » et désactivé ; les devis ;
  - les deux réglages (prix de vente de l'heure, obligatoire pour MENAO ; coefficient) ;
  - l'action `startLibrary` enregistre les réglages, puis copie (`artisan_adopt_menao_library`) ou
    enregistre l'autre choix (`artisan_dismiss_menao_library`), recalcule les prix et revient à la
    liste avec le bandeau « N ouvrages MENAO ajoutés ».
- **Liste** : filtre par métier (Tous, chaque métier MENAO, « Les miens »), métier sous le nom,
  colonne Pose, prix en fourchette tant qu'il en découle, pastille MENAO, encart « D'où viennent ces
  prix ? », source et date des prix publics en pied de tableau. La colonne Coût laisse sa place à la
  Pose : le coût reste visible sur la fiche, et la marge dans la liste.
- **Fiche d'un ouvrage MENAO** : pastille MENAO, ligne « Temps de pose » (repère MENAO), prix publics
  sous chaque fourniture (source, date), champ « Mon prix d'achat » en ligne pour toute fourniture
  sans prix (enregistré avec l'ouvrage, daté du jour), carte « Votre prix indicatif » avec la
  fourchette, le détail des fournitures et le choix du prix retenu.
- **Pas encore affichés** : le lien « Voir les produits » et la mention « liens affiliés ». Ils
  arrivent avec le branchement des flux d'affiliation : afficher la mention sans lien serait faux.
  Tant qu'aucune source n'est branchée, les fournitures MENAO n'ont pas de fourchette. Le prix vient
  alors des prix d'achat saisis par l'artisan.

## Conséquences

- L'application (PR 3) reprendra le premier passage et la fiche ; d'ici là, elle montre les
  ouvrages MENAO comme des ouvrages composés.
- TODO(legal) : transparence des liens rémunérés (C. conso. L111-7) au moment du branchement des flux.
