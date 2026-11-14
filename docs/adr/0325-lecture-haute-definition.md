# ADR 0325 — Lecture haute définition des photos de plans, chaînes de cotes (F-159, lot 1)

- Statut : accepté (14/11/2026)
- Fonctionnalité : F-159, lot 1 de « la totale » (lecture, puis mesure à l'échelle, puis métré à
  la main)

## Constat

Essai de l'utilisateur le 14/11/2026 avec quatre photos de plans d'exécution : neuf pièces
trouvées, aucune surface, tout « à compléter ». Deux causes : ces plans ne portent pas de surface
par pièce mais des cotes en centimètres, que la lecture ne reprenait que comme deux cotes en
mètres d'un seul tenant ; et un plan entier réduit à 2 400 px a des écritures de quelques pixels.
Le modèle lit une image jusqu'à 2 576 px de côté : au-delà, seul un découpage apporte du détail.

## Décision

- **Zones** : pour une photo de plus de 2 600 px, le navigateur envoie la vue d'ensemble
  (2 400 px) et jusqu'à 6 zones qui se chevauchent de 12 %, chacune à 2 400 px au plus. La grille
  est calculée par `planTileGrid` (`packages/core`) ; 24 zones au plus par lecture. Les zones
  sont des fichiers du dossier de l'entreprise, rattachés au plan (`plan_files[].tiles`), vérifiés
  par la base et supprimés avec l'appel d'offres. Les PDF ne sont pas découpés.
- **Chaînes de cotes** : le modèle recopie les cotes intérieures écrites en centimètres le long
  d'un mur (« 247+156+247 », ou « 359 » seule) ; `chainSum` les additionne et le cœur calcule
  surface et périmètre. Une chaîne vide, mal écrite ou hors bornes n'est pas additionnée.
- **Raisonnement** : effort « medium » pour la lecture des plans (les autres usages gardent le
  leur).
- **Format de réponse** : les chaînes sont du texte. Deux listes de nombres de plus par pièce
  faisaient refuser le schéma (400 « compiled grammar is too large ») ; les tests de bout en bout,
  qui simulent le modèle, ne le voient pas : toute évolution du schéma passe par l'évaluation.

## Mesures (Opus 5.5, 14/11/2026)

- **Non-régression** (16 cas) : statuts, pièces, hauteurs et échelles à 100 %, aucune surface ni
  quantité inventée.
- **Plan d'exécution fictif aux écritures de 3 px** : vue d'ensemble seule, 0 surface sur 7 (et
  rien d'inventé) ; avec les zones, 7 sur 7 puis 6 sur 7. Avec des écritures de 6 px, la vue
  d'ensemble suffisait déjà : les zones ne servent qu'aux plans vraiment denses.
- **Quatre vrais plans de l'essai** (2 000 px, donc sans zones) : de 0 surface à 3 à 5 pièces
  sur 9 selon la passe, toutes marquées à vérifier. Les pièces non rectangulaires (entrée, salle
  d'eau, dégagement) restent vides, et le salon n'est pas toujours lu : c'est l'objet du lot 2.
- **Durée** : 31 à 38 s pour une photo et ses 6 zones ou pour quatre photos, sous les 140 s de la
  fonction. **Coût** : environ 0,11 $ pour quatre photos sans zones, environ 0,17 $ par photo
  découpée en 6 zones.

## Limites connues

- Le calcul d'une pièce (« 359 × 317 ») n'est pas affiché : la pièce est marquée « Calculé
  (cotes) » ou « Photo : à vérifier ».
- Une pièce non rectangulaire n'est pas calculée ; une chaîne mal rattachée donnerait une surface
  fausse, d'où le marquage à vérifier sur photo. La mesure à l'échelle (« Estimé ») vient au
  lot 2, le métré à la main au lot 3.
- Le découpage dans le navigateur n'est pas couvert par un test automatique.
