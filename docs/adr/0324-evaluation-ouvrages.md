# ADR 0324 — Évaluation de la lecture des ouvrages mesurés (F-158, PR 3)

- Statut : accepté (14/11/2026) ; résultats à compléter après les passes payantes
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
