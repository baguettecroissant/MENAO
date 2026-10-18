# ADR 0126 — Vraie carte dans l'aperçu de la zone d'intervention

- Statut : accepté
- Date : 18 octobre 2026
- Complète l'ADR 0110 (inscription artisan en un seul parcours).

## Contexte
- **À l'étape « Où intervenez-vous ? »** de l'inscription artisan, sur le site et dans l'application, le rayon était montré sur un quadrillage décoratif. Le cercle grandissait avec le rayon, sans lien avec le terrain.
- **Demande de l'utilisateur** (18 octobre 2026) : montrer une vraie carte dans le rayon.

## Décision
- **Fond de carte : le Plan IGN** de la Géoplateforme (WMTS, projection Web Mercator « PM ») :
  - gratuit, sans clé, sous Licence Ouverte Etalab 2.0 ;
  - la source « © IGN » est affichée sous la carte ;
  - même service public que la recherche d'adresses, déjà utilisée à cette étape. Aucun nouveau destinataire de données : seules les coordonnées de l'adresse de départ, déjà envoyées au géocodage, déterminent les tuiles.
- **Pas de bibliothèque de carte.** Quelques tuiles d'image (24 au plus) sont posées autour de l'adresse :
  - `zoneMapView` (`@menao/core`, testé) calcule le zoom, la position des tuiles et le cercle ;
  - `planIgnTileUrl` (`@menao/validation`) construit l'adresse d'une tuile, pour le site et pour l'application.
- **Cercle à l'échelle.** Le cercle occupe toujours 80 % de la hauteur du cadre ; c'est la carte qui s'éloigne quand le rayon grandit (zoom 10 pour 10 km, zoom 7 pour 100 km autour de Toulouse). Le zoom des tuiles est entier : l'écart est rattrapé en agrandissant ou en réduisant les tuiles (entre 0,71 et 1,41 fois).
- **Site** : balises `<img>` simples, sans optimisation d'images Vercel (CLAUDE.md règle 13). La CSP autorise `https://data.geopf.fr` dans `img-src`. Le quadrillage reste en fond tant que les tuiles chargent, ou si elles ne chargent pas.
- **Application** : composant `Image` de React Native, même calcul et même rendu.
- **Tests e2e** : les tuiles sont remplacées par une image vide (`mockGeocoding`), la CI ne dépend pas du service.

## Conséquences
- L'artisan voit les villes réellement couvertes par son rayon avant de créer son compte.
- La carte n'est pas interactive : ni déplacement ni zoom à la main. Le rayon se choisit toujours avec les boutons.
- Les écrans « Zone d'intervention » d'après l'inscription (site et application) ne montrent pas encore de carte : les coordonnées de l'adresse enregistrée ne sont pas lues aujourd'hui. Il faudrait une fonction en base pour les exposer.
