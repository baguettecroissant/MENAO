# ADR 0181 — Carte du marché dans le back-office

- Statut : accepté
- Date : 24 octobre 2026
- Demande de l'utilisateur du 24 octobre 2026 : « un visual board, une map avec un point pour chaque artisan de MENAO », pour voir le réseau grandir et la taille du marché. Avec l'entonnoir des recherches proposé le même jour : sur les 14 derniers jours, 22 recherches sont allées jusqu'aux résultats, et aucune demande n'a été envoyée.

## Décision
- **Nouvelle page « Marché »** du back-office (`/admin/marche`, rubrique Pilotage), réservée aux administrateurs.
- **Carte interactive** sur le Plan IGN :
  - un point par artisan :
    - bleu plein : validé ;
    - cercle bleu : inscription en cours ;
    - rouge : suspendu ;
    - gris : refusé ;
  - un clic ouvre son dossier ; une infobulle donne son nom, sa commune, ses métiers et sa date d'inscription ;
  - calque « Zones d'intervention » : le rayon de chaque artisan validé ;
  - calque « Demande des particuliers » : un cercle par commune, de surface proportionnelle aux recherches de la période, avec recherches, résultats et demandes en infobulle ;
  - filtre par métier ; glisser pour déplacer, molette ou boutons pour zoomer, bouton « Recentrer » ;
  - **« Voir grandir »** : un curseur et une animation qui rejouent l'arrivée des artisans, de la première inscription à aujourd'hui (en cours puis validés à la date de leur validation).
- **Chiffres** de la période (30 jours, 90 jours ou un an) :
  - artisans validés ;
  - inscriptions en cours ;
  - recherches ;
  - demandes envoyées ;
  - part des recherches qui aboutissent ;
  - communes et métiers à recruter.
- **Entonnoir par commune et par métier** : recherches lancées, menées jusqu'aux résultats, demandes envoyées, et nombre d'artisans validés du métier dont le rayon couvre la commune. « À recruter » quand des particuliers cherchent et qu'aucun ne la couvre.
- **Aucune donnée personnelle des particuliers** : la demande est comptée par commune et par métier.

## Technique
- **`public.admin_market(p_days)`** (`security definer`, `app.require_admin()`) renvoie en une fois :
  - les artisans placés : adresse de base, sinon première commune de leur zone, sinon siège quand la commune est au référentiel ; les comptes radiés sont exclus ;
  - la demande par commune et par métier, placée au centre de la commune (référentiel, sinon position de commune enregistrée avec la recherche) ;
  - le nombre de recherches sans commune.
  - Test pgTAP `98_carte_du_marche`.
- **`packages/core/src/market-map.ts`** :
  - calculs de la carte : projection Web Mercator, tuiles visibles, déplacement, zoom centré sur le curseur, cadrage, rayon en pixels ;
  - données : étape d'un artisan à une date, demande par commune, couverture par distance, entonnoir, totaux.
  - 11 tests.
- **Pas de bibliothèque de cartes**, comme l'aperçu de zone (ADR 0126) : tuiles IGN posées en images, points et cercles en éléments positionnés. Aucune nouvelle dépendance, aucune optimisation d'images Vercel.

## Conséquences
- Migration `carte_du_marche`. Après la fusion : `db push` sur staging.
- La couverture ne tient compte que des artisans en mode « rayon » (tous les artisans actuels). Une zone par communes compte seulement par la position de sa première commune.
- Prochaine étape prévue : montrer aux artisans qui s'inscrivent les recherches de leur métier dans leur zone.
