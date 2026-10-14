# ADR 0095 — Visuels de l'application : états vides, couvertures de chantier, photo de l'artisan

- Statut : accepté
- Date : 14 octobre 2026

## Contexte
- **Revue des visuels manquants**, demandée par l'utilisateur le 14 octobre 2026 (points 6, 7 et 8), sur le site et dans l'application :
  - un chantier sans photo affichait la même clé à molette, quel que soit le métier ;
  - un artisan sans photo apparaissait avec ses seules initiales, et rien ne l'invitait à en ajouter une ;
  - les listes vides (chantiers, demandes, messages, documents, devis, notifications, avis) n'affichaient qu'une phrase grise.
- **Contraintes** :
  - pas de photos d'illustration (elles feraient croire à un vrai chantier) ;
  - aucun chiffre avancé pour inciter à ajouter une photo (F-01) ;
  - pas de lien vers le site depuis l'application pour l'artisan (règle 10) ;
  - pas de migration pour un sujet d'affichage.

## Décision
- **Icône du métier sur les couvertures sans photo** :
  - site et application, sur toutes les couvertures (cartes « Mes chantiers », chantiers terminés, demandes, vue d'un chantier côté client et côté artisan) ;
  - les données transmettent déjà le libellé du métier ; le code se retrouve avec `referenceCode` (`packages/core`), qui fabrique les codes du référentiel à partir des libellés ;
  - chaque plateforme garde ses icônes de métier (`TRADE_VISUALS` sur le site, `tradeIcon` dans l'application) ; un métier inconnu prend le marteau ;
  - l'icône est dans un médaillon blanc translucide, centré sur le fond bleu.
- **Photo de l'artisan** :
  - tableau de bord sans photo de profil : carte « Une photo rassure vos futurs clients » ;
  - sur le site, elle mène à « Mon profil » (`/pro/onboarding/profil`) ;
  - dans l'application, elle ouvre l'appareil photo ou la photothèque avec un recadrage carré, réduit la photo à 512 px comme sur le site, et l'envoie à `process-upload` (`purpose: "avatar"`, déjà accepté) ;
  - les en-têtes relisent alors la photo (`forgetProfileSummary` prévient les écrans affichés) et la carte disparaît ;
  - avatar par défaut des grandes photos (cartes de résultats, fiche) : initiales dans un médaillon blanc et toit du logo en filigrane ; les pastilles (messages, menus) gardent les initiales seules ; sur le site, le choix se fait selon la largeur du cadre (container query).
- **Illustrations des états vides** :
  - huit dessins maison (chantiers, demandes, messages, documents, devis, notifications, avis, agenda), au trait bleu MENAO sur un disque bleu clair ;
  - décrits une seule fois sous forme de données dans `packages/ui-tokens` (tracés et tons), puis rendus en SVG par le site et avec react-native-svg par l'application : pas de fichier image, ils suivent les couleurs du thème ;
  - composant `EmptyState` (illustration, titre, texte, action) sur les deux plateformes ;
  - pages équipées :
    - côté client : « Mes chantiers », messages, documents, notifications, échanges avec l'équipe ;
    - côté artisan : demandes, chantiers, devis, factures, messages, avis ;
  - les textes ne changent pas.

## Conséquences
- **Mise en service** : aucune migration, rien à déployer sur staging.
- **Référentiel** : si un métier est renommé dans le back-office, son code ne correspond plus à son libellé, et sa couverture affiche le marteau. Il suffira alors de transmettre le code dans les requêtes.
- **Suite** : les illustrations pourront être remplacées par des dessins de designer sans toucher aux écrans, en modifiant seulement `packages/ui-tokens`.
