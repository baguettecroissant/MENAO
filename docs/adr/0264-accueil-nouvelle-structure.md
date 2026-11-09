# ADR 0264 — Accueil en 8 sections et pages carrefour (lot 18)

- Statut : accepté
- Date : 9 novembre 2026
- Suite du plan du site vitrine du 9 novembre (doc « Plan du site vitrine MENAO », 9 décisions validées) et du rapport « Site vitrine wahou et SEO » (medias/recherche/reports). Lot 18 maquetté puis validé le 9 novembre avec trois ajouts de texte.

## Décision
- **Accueil, de 10 à 8 sections** :
  1. bandeau et recherche, sans les badges des stores, sans animation sur le titre ni le champ, avec la phrase sur les coordonnées (« Vos coordonnées ne vont qu'aux artisans qui acceptent votre demande, 3 au plus. Jamais revendues. ») ;
  2. preuves : les trois engagements, chacun lié à son explication ;
  3. métiers : une seule fois (4 photos, les autres en pastilles, lien vers /metiers) ;
  4. comment ça marche, puis l'application (bandeau bleu nuit avec les badges des stores) ; la section « Tout votre chantier, au même endroit » est retirée (même parcours) ;
  5. garanties en grille claire, avec les cinq contrôles nommés de la page Garanties ;
  6. « Où intervient MENAO ? » : texte de « À propos », carte SVG statique du 06 (coordonnées des communes pilotes, `lib/site/commune-coords.ts`), communes en pastilles, lien vers /villes ;
  7. FAQ de 6 questions existantes sur les objections ;
  8. encart Espace Pro avec le prix de la formule d'entrée lu dans la table `plans`, puis l'appel final.
- **Pages carrefour** : `/metiers` (tous les métiers) et `/villes` (chaque commune et ses pages métier qui présentent un artisan), ajoutées au plan du site. Le pied de page « Tous les métiers » mène à /metiers.

## Conséquences
- TODO(legal) : faire relire la phrase sur les coordonnées, « Contrôlés avant d'apparaître », « 100 % », « 0 % commission », « 72 h » et l'affichage du prix.
- L'en-tête (lien « Métiers ») et les pages métier × ville (contenu local, seuils d'indexation) viennent dans les lots suivants.
