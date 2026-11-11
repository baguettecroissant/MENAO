# ADR 0280 — Dalle, chape et terrasse en béton : le maçon, pas le terrassier (F-129)

- Statut : accepté
- Date : 11 novembre 2026
- Complète les ADR 0172 (évaluation de l'analyse), 0179 (compréhension en direct) et 0279 (urgence).

## Contexte
Essai de l'utilisateur le 11/11/2026 : « couler une dalle, il faut terrasser le sol » était compris « Terrassier » pendant la saisie, alors qu'il faut un maçon. Deux causes :
- le maçon n'avait que trois travaux (gros œuvre, extension, ouverture de mur porteur) : rien pour une dalle, une chape ou une terrasse en béton, alors que le terrassier a « Terrassement » ;
- la compréhension en direct ne reçoit que le nom des métiers ; « terrasse » y appelle « terrassier » (une demande « Rénovation terrasses Cannes » est déjà partie chez le terrassier le 24/10).

## Décision
- **Quatre travaux ajoutés au maçon** : « Dalle béton et chape », « Terrasse en béton », « Fondations », « Murets et murs de clôture ». Le classement ne filtre que sur le métier : aucun artisan n'en sort.
- **Même règle dans les deux consignes** (analyse et compréhension en direct) : dalle, chape, terrasse ou allée en béton, fondations, muret → maçon, même si le sol est à décaisser ou à terrasser avant. Terrassier seulement pour un terrassement important (plateforme de maison, piscine, gros déblais, tranchées de réseaux), et en métier complémentaire seulement dans ce cas. « Terrasse » ne désigne jamais le terrassier.
- **Évaluation** : 8 cas ajoutés (48 au total), dont 5 maçon / carreleur / terrassier et 3 d'urgence ; l'urgence attendue est notée sur 26 cas (IA seule, puis avec le repérage par mots de l'ADR 0279). Option `--travaux` pour évaluer avec des travaux pas encore déployés.

## Résultats (11/11/2026, Haiku 5.5 avec Sonnet 5.5 en secours, 2 passes, 0,152 $)
- Métier principal juste : 96 % aux deux passes ; les 5 nouveaux cas justes aux deux passes (dalle, terrasse béton, chape → maçon ; terrasse carrelée → carreleur ; terrassement de maison → terrassier). Le cas « jardin » garde le terrassier en complément.
- Urgence juste : 26/26 aux deux passes, IA seule comme avec le repérage par mots (consigne de l'ADR 0279 comprise).
- Aucun métier proposé en trop ; couverture des chantiers à plusieurs métiers 100 % puis 98 %.
- Écarts : « combles » → maçon (défaut connu, ADR 0172) et « salle de bains complète » → carreleur en principal, plombier proposé en complément. Ce second écart n'apparaissait pas le 23/10 : à surveiller, il peut venir de la nouvelle consigne.
- Instables d'une passe à l'autre : extension, maison de village, véranda (métiers complémentaires).

## Conséquences
- La compréhension en direct n'a pas d'évaluation : la règle y est reprise mot pour mot, à vérifier par un essai réel après déploiement.
- Déploiement : migration `20261111180000_travaux_macon_dalle`, puis fonctions `analyze-need` et `suggest-need`.
