# ADR 0324 — Évaluation de la lecture des ouvrages mesurés (F-158, PR 3)

- Statut : accepté (14/11/2026)
- Fonctionnalité : F-158 ; suite des ADR 0298 (évaluation des pièces), 0322 et 0323

## Constat

La consigne de lecture a été étendue aux plans de terrain, aux façades et à la toiture sans avoir
lu un seul plan : les tests de bout en bout utilisent un faux modèle. Il faut mesurer, avant de
choisir le modèle, ce que la lecture trouve, ce qu'elle laisse vide et surtout ce qu'elle invente.

## Décision

- **Cinq plans fictifs de plus** (`eval/plans`, fabriqués par `fabriquer-plans.mjs`, vérité dans
  `cas.json`) : un terrain complet (plan de masse, coupe, réseaux, deux volumes à calculer), le
  même plan de masse sans aucune quantité écrite, des façades (une surface à calculer avec deux
  cotes, une écrite, un pignon non rectangulaire qui doit rester vide), une toiture (versants à
  calculer avec la surface au sol et la pente), et un logement suivi d'un plan de masse (pièces et
  ouvrages ensemble). Les neuf cas existants restent tels quels : ils vérifient que l'extension de
  la consigne n'a rien cassé sur les pièces.
- **Notation des ouvrages** (`eval/run.ts`) : ouvrages retrouvés, quantités justes avec la bonne
  origine (écrite, calculée par le cœur, comptée), **quantités inventées** (valeur donnée alors
  que rien n'est écrit ni calculable, ou calcul en trop), lots, types de pages, altitudes. Un
  nombre laissé vide est prudent : il n'est noté ni juste ni faux.
- **Comparaison de modèles** : option `--modele`, même consigne, même schéma, même normalisation.
- **Appels payants** : `--estimation` d'abord (aucun appel), puis accord du responsable.

## Critère de choix du modèle

Zéro quantité inventée d'abord, puis le taux de quantités justes, puis le coût et le délai d'une
lecture. Un modèle plus cher n'est retenu que s'il invente moins ou trouve nettement plus.

## Résultats (14/11/2026, 14 plans fictifs et 4 vrais plans de terrain hors dépôt, 2 passes)

| | Sonnet 5.5 | Opus 5.5 |
|---|---|---|
| Statuts, pièces, surfaces, hauteurs, échelles (9 anciens cas) | 100 % | 100 % |
| Surfaces de pièces inventées | 0 | 0 |
| Éléments comptés laissés vides / faux | 59 / 0 | 7 / 2 |
| Ouvrages retrouvés | 98,7 % | 98,7 % |
| Quantités justes (écrites, calculées, comptées) | 98,2 % | 98,2 % |
| Lots justes | 89,8 % | 96,6 % |
| Types de pages, altitudes | 100 % | 100 % |
| Coût d'une lecture (jetons mesurés) | environ 0,02 $ | environ 0,04 $ |
| Durée d'une lecture | 5 à 13 s | 10 à 27 s |

- **Régression** : aucune sur les pièces ; la consigne étendue lit les anciens cas comme avant.
- **Seul défaut** : sur un plan de masse portant deux altitudes, les deux modèles créaient un
  volume de déblais que le plan ne nomme pas, parfois à la place de la surface de la plateforme.
  Consigne resserrée (un volume seulement si le plan nomme l'ouvrage ou écrit son épaisseur ; un
  volume ne remplace jamais une surface écrite) : relance des cinq cas d'ouvrages, **zéro quantité
  inventée** pour les deux modèles. Une fois, Opus a laissé vide le décapage (prudent, pas faux).
- **Rien n'est mesuré à l'échelle** : sur le plan de masse sans quantités, tout reste « à
  compléter » ; le pignon non rectangulaire reste vide ; façades et versants sont calculés par le
  cœur avec les valeurs lues.
- **Vrais plans** : les surfaces des tableaux (emprises, accès, surface végétale, revêtement) et
  les arbres des légendes sont repris à l'identique ; contrôlé à la main sur un plan (quatre
  surfaces sur quatre). Opus relève aussi les ouvrages sans quantité (clôture, murs, noue, fosse,
  déblais et remblais) que Sonnet omet souvent : le DPGF part alors avec plus de postes à
  compléter et moins d'oublis.
- Dépense réelle : 2,69 $ pour l'ensemble (estimation : 6,46 $).

## Choix du modèle

Les deux modèles n'inventent rien. Opus 5.5 range mieux les lots, remplit les éléments comptés et
relève plus d'ouvrages sur les vrais plans, pour environ 2 centimes de plus par lecture. Le modèle
se règle sans code par `AI_PLAN_MODEL` ; la décision revient au responsable.
