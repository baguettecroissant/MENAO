# Vraies photos pour le site

Les photos actuelles du site sont générées par IA et montrent des personnes fictives (voir [photos-generees.md](photos-generees.md)). Pour le lancement, de vraies photos d'artisans du pilote, prises avec leur accord, renforceraient la confiance. Ce document décrit les photos attendues, les autorisations et la façon de les mettre en ligne (ADR 0098).

## Emplacements

| Emplacement | Fichier | Format livré | Où elle apparaît |
|---|---|---|---|
| `accueil-bandeau` | `apps/web/public/images/accueil-bandeau.webp` | 1536 × 1024, paysage (3:2) | Bandeau de l'accueil, image de partage par défaut |
| `electricien`, `plombier`, `chauffagiste`, `climaticien`, `macon`, `peintre`, `plaquiste`, `carreleur`, `menuisier`, `charpentier`, `couvreur`, `facadier`, `serrurier`, `terrassier`, `paysagiste` | `apps/web/public/images/metiers/<emplacement>.webp` | 800 × 1200, portrait (2:3) | Cartes des métiers de l'accueil, haut des pages métier et ville, image de partage du métier |

Les images de partage (`apps/web/public/images/og/`) sont refaites à partir de ces photos par l'outil ci-dessous. Elles reprennent le même gabarit : texte à gauche, photo sur les 62 % de droite.

## Photos attendues

- **Sujet** : un artisan du pilote en situation de travail réelle, en tenue de travail, avec les protections que le geste exige (lunettes, gants, casque…). Pas de geste dangereux.
- **Lieu** : un vrai chantier, avec l'accord du client. On ne doit voir ni adresse, ni plaque d'immatriculation, ni document, ni écran lisible, ni client reconnaissable, ni enfant.
- **Marques** : éviter les logos et inscriptions de tiers bien visibles.
- **Cadrage** :
  - métiers : photo verticale, artisan et geste au centre ;
  - bandeau : photo horizontale, sujet plutôt à droite, car la gauche reçoit le texte et un voile sombre sur le site.
- **Technique** : lumière naturelle, image nette, au moins 2 000 px sur le petit côté, en JPEG, HEIC (iPhone) ou PNG.
- **Retouche** : uniquement la lumière et le cadrage, jamais l'apparence des personnes.
- **Plusieurs prises par métier**, pour pouvoir choisir.

## Autorisations

- Chaque personne reconnaissable donne une autorisation écrite d'utiliser son image. Celle-ci précise les usages (site, réseaux sociaux, fiches des stores), la durée et la façon de la retirer.
- Le client du chantier autorise les prises de vue chez lui.
- TODO(legal) : faire rédiger ou valider le modèle d'autorisation (droit à l'image, lieu privé) par un juriste avant les prises de vue.
- Les autorisations signées et les photos originales sont conservées **hors du dépôt**. Le dépôt est public et ne contient aucune donnée personnelle (CLAUDE.md, règle 11). Le registre ci-dessous ne note qu'une référence.
- Une photo d'artisan ne doit pas laisser croire à un avis, une note ou une recommandation qui n'existe pas (F-01).

## Mettre les photos en ligne

1. Nommer chaque photo selon son emplacement, par exemple `plombier.jpg` ou `accueil-bandeau.heic`.
   - Cadrage facultatif : `plombier@50,30.jpg` garde au centre le point situé à 50 % de la largeur et 30 % de la hauteur.
   - Sans indication, le cadrage est centré.
2. Depuis la racine du dépôt : `node apps/web/scripts/photos-reelles.mjs <dossier des photos>`.
   - Chaque photo est recadrée au format de son emplacement, réduite et convertie en WebP. Les métadonnées, dont la position GPS, sont retirées.
   - L'image de partage correspondante est refaite.
   - `--partage` refait seulement les images de partage, d'après les photos déjà en place.
3. Contrôler en local (`pnpm --filter web dev`) : accueil, une page métier, une page ville.
4. Mettre à jour la documentation :
   - le registre ci-dessous ;
   - [photos-generees.md](photos-generees.md), en retirant les lignes des photos remplacées ;
   - le commentaire de `apps/web/src/lib/site/images.ts`, quand plus aucune photo n'est générée.
5. Ouvrir une PR.

## Registre des vraies photos

| Fichier | Date de prise de vue | Référence de l'autorisation | Remplace |
|---|---|---|---|
| *(aucune pour l'instant)* | | | |
