# ADR 0338 — Zones agrandies pour la seconde lecture des symboles (F-159, lot 7, PR A2)

- Statut : accepté (15/11/2026)
- Fonctionnalité : F-159, lot 7 ; suite de l'ADR 0336

## Constat

En une lecture du plan entier, MENAO retrouve tous les points lumineux, spots et prises du plan
d'électricité de l'essai, mais 10 interrupteurs sur 15 : les groupes serrés (trois interrupteurs
côte à côte) et les petits poussoirs échappent. L'essai du 15/11/2026 montre qu'une seconde lecture
sur quatre zones agrandies × 2 en retrouve 13 sur 15, et que la fusion des deux lectures donne 14
sur 15. Les zones agrandies existantes (ADR 0325) ne sont faites que pour les photos de plus de
2 600 px, et jamais pour les pages de PDF.

## Décision

1. **Au dépôt**, le navigateur découpe chaque image de plan en 2 × 2 zones qui se chevauchent de
   10 % (`symbolZoneGrid`), agrandies jusqu'à 2 200 px et 3,6 Mpx, au plus × 3
   (`symbolZoneScale`) : depuis la photo d'origine, ou depuis la page du PDF rendue plus nette
   (le PDF est vectoriel). Six images au plus par appel d'offres. Chaque zone garde son rectangle
   en pixels de l'image du plan (`plan_files[].symbolZones`), vérifié par la base et rendu à la
   suppression.
2. **À la lecture**, la seconde lecture n'est lancée que sur un plan dont la lecture entière a
   trouvé au moins 5 symboles électriques, et s'il reste au moins 45 s à la fonction. Les quatre
   zones sont lues en parallèle ; une zone manquante annule la seconde lecture (la fusion serait
   faussée).
3. **Fusion** (ADR 0336) : type de la lecture entière, nombre le plus fin, groupe « à vérifier »
   quand les deux lectures ont vu le groupe sans s'accorder ; l'écran (ADR 0337) l'entoure en
   orange.

## Conséquences

- Coût : quatre lectures de plus par plan d'électricité, environ 0,25 $ ; rien pour les autres plans.
- Dépôt plus long : quatre images de plus par plan (six plans au plus).
- Durée : la seconde lecture suit la première (environ 30 à 60 s de plus) ; sans le temps
  nécessaire, le plan garde la seule lecture entière.
