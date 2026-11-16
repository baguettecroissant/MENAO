# ADR 0343 — Liste « À vérifier » et vérification point par point (F-159, PR 3)

- Statut : accepté (16/11/2026)
- Fonctionnalité : F-159 ; maquette du lot 56 (« parcours guidé », écrans GuideOuvrages et
  GuideVerifier) validée le 15/11/2026

## Constat

Après les PR 1 et 2 (ADR 0341, 0342), les points douteux étaient comptés dans la page (règle 4
enfreinte), sans liste ni moyen de les reprendre un par un : l'artisan devait les retrouver dans
« Mes pièces », les onglets des lots et l'écran des symboles.

## Décision

- **Points calculés par `packages/core`** (`planVerifyPoints`) : pièces estimées (photo, tracé,
  lecture incertaine) ou sans surface ; ouvrages d'un lot (démolition ou métier) sans quantité ;
  types de symboles avec un groupe douteux. Ordre du parcours : pièces, démolition, lots dans
  l'ordre de l'appel d'offres, symboles.
- **Clé stable par point** (`piece:<nom>`, `ouvrage:<nom>|<pièce>`, `symbole:<type>`) : les pièces
  et ouvrages sont recréés à chaque enregistrement, leur identifiant change.
- **La base garde la valeur validée** (`tenders.plan_checks`, objet clé → valeur). Un point est
  fait tant que la valeur actuelle est celle validée : une nouvelle lecture qui donne une autre
  surface le rouvre ; un groupe de symboles redevenu douteux aussi. Un point corrigé ailleurs sans
  validation sort de la liste (« Votre valeur »).
- **`artisan_check_plan_point`** enregistre la valeur (pièce : surface et hauteur, « saisi » ;
  ouvrage : quantité, « saisi » ; symbole : doutes levés pour le type), note le point fait et remet
  à faire la vérification des quantités du DPGF. Testée en pgTAP (163).
- **Carte « À vérifier »** à l'étape « Ce qu'il y a à faire » : « N faits sur M », barre de
  progression, cinq premiers points (faits barrés), les autres repliés, « Vérifier point par
  point ». La pastille « N points à vérifier » de l'en-tête et « Vérifier maintenant » dans « Mes
  pièces » y mènent aussi.
- **Écran `?etape=verifier`** : « Point N sur M », le plan à la bonne page avec la pièce surlignée,
  le tracé de l'ouvrage (longueur à l'échelle du tracé de MENAO, sinon saisie) et, pour une
  cloison ou un doublage, longueur × hauteur de la pièce = surface (`wallQuantityMilli`) ; les
  symboles du type en orange (douteux) et bleu. « Valider et suivant » enregistre aussitôt ;
  « Je le ferai plus tard » et « Précédent » ne changent rien.

## Conséquences

- Un point validé sans changement devient tout de même « Votre valeur » : l'artisan l'a vérifié.
- Le tracé de la vérification n'est pas gardé comme métré (seule la quantité l'est) ; le métré à
  la main (ADR 0327) reste l'outil pour garder un tracé.
