# ADR 0127 — Carte sur l'écran « Zone d'intervention »

- Statut : accepté
- Date : 18 octobre 2026
- Complète l'ADR 0126 (vraie carte à l'étape « zone » de l'inscription) et l'ADR 0125 (zone dans l'application).

## Contexte
- **L'ADR 0126** a mis le Plan IGN à l'étape « zone » de l'inscription. L'écran « Zone d'intervention » d'après l'inscription (site : `/pro/onboarding/zone`, application : `/pro-zone`) n'en avait pas.
- **Le blocage** : l'adresse de départ est enregistrée en `geography` (`artisans.base_location`). L'API la renvoie dans un format binaire, illisible côté client.
- **Demande de l'utilisateur** (18 octobre 2026) : la carte sur cet écran aussi.

## Décision
- **Nouvelle fonction `public.my_artisan_base_point()`** : renvoie la longitude et la latitude de l'adresse de départ de l'artisan connecté, et seulement la sienne (`app.my_artisan_id()`).
  - Aucune ligne pour une zone en communes, ni pour un compte qui n'est pas artisan.
  - Fermée aux visiteurs (`anon`).
  - Testée en pgTAP (`67_position_depart_artisan`).
- **Même carte qu'à l'inscription** : le composant est rangé avec les composants partagés (`components/zone-map.tsx`, site et application). Le texte « © IGN » est dans `fr.zoneMap`.
- **Sur l'écran « Zone »** :
  - la carte apparaît sous le choix du rayon, en mode « Un rayon » ;
  - elle suit le rayon choisi, avant même l'enregistrement ;
  - elle se centre sur la nouvelle adresse dès qu'elle est choisie, sinon sur l'adresse enregistrée ;
  - le nom du lieu n'est pas répété sous le point, puisque l'adresse est affichée juste au-dessus.
- **Si la fonction n'est pas disponible** (base pas encore migrée, erreur réseau), l'écran reste utilisable, simplement sans carte.

## Conséquences
- L'artisan voit sa zone réelle à tout moment, pas seulement à l'inscription.
- Les coordonnées précises de l'adresse de départ restent privées : seul l'artisan lui-même les relit. Les clients et les pages publiques n'y ont toujours pas accès.
