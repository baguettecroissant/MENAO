# ADR 0268 — Pages métier × ville : contenu propre à chaque ville (lot 22)

- Statut : accepté
- Date : 9 novembre 2026
- Suite de l'ADR 0134 (pages SEO) et du rapport « Site vitrine wahou et SEO » (risque « doorway » des pages ville trop semblables). Lot 22 maquetté et validé le 9 novembre ; seuil d'indexation validé à 1 artisan.

## Décision
- **Contenu propre à chaque ville**, tiré de la base sans rien inventer :
  - pastilles du bandeau : nombre réel d'artisans vérifiés, réponse sous 72 h, gratuit ;
  - artisans de la ville, chacun avec « Lui demander un devis » (demande envoyée à lui seul, même adresse que la fiche, ADR 0198) ;
  - travaux du métier (table `work_types`) et les cinq contrôles de la page Garanties ;
  - « {Métier} près de {ville} » : les 6 communes les plus proches (coordonnées des communes pilotes) avec leur vrai nombre d'artisans, et la carte du 06 centrée sur la ville ;
  - une question propre à la ville (nombre réel d'artisans) en plus des questions du métier ;
  - « Autres artisans à {ville} » : seulement les métiers qui ont des artisans dans la commune.
- La section des garanties répétée est remplacée par les contrôles ; « Comment ça marche » reste, en plus court.
- **Indexation** : `CITY_INDEX_MIN_ARTISANS = 1` (lib/site/seo.ts), partagé par la page et le plan du site. En dessous, la page reste utile mais `noindex, follow`, hors plan du site. À relever avec le nombre d'artisans.

## Conséquences
- Chaque page interroge en cache le nombre d'artisans des communes voisines et des autres métiers (requêtes déjà faites par le plan du site).
- Le cas « sans artisan » garde son texte et son bouton actuels.
