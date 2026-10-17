# ADR 0119 — Badge « Assuré et vérifié »

- Statut : accepté
- Date : 17 octobre 2026
- Complète les ADR 0013 (fiche publique), 0115 (attestation URSSAF), 0116 (décennale « non soumis ») et 0118 (RGE).

## Contexte
- **Cahier des charges du CEO** : un seul badge « Assuré et vérifié », qui réunit décennale, RC Pro, entreprise active et URSSAF, à la place de la seule mention de la décennale.
- **Défaut corrigé au passage** : la fiche annonçait « Assurance décennale vérifiée » même pour un artisan dont les métiers ne sont pas soumis à la décennale.
- **Décision de l'utilisateur** (17 octobre 2026) : faire le badge.

## Décision
- **Règle, en base** (`app.artisan_verified_badge`). L'artisan l'obtient si toutes ces conditions sont réunies :
  - il est validé ;
  - son entreprise est active selon l'INSEE ;
  - sa décennale est validée et à jour, ou ses métiers sont déclarés non soumis et la déclaration est validée avec le dossier ;
  - sa RC Pro et son attestation URSSAF sont validées et à jour, à la date de Paris.

  Le résultat vaut toujours vrai ou faux.
- **Affichage** :
  - **fiche publique**, sur le site et dans l'app : le badge près du nom, et dans « Garanties » le détail de ce qui est vérifié, plus la RC Pro (assureur, date). Pour un artisan non soumis : « Activité non soumise à la décennale » et « RC Pro vérifiée par Menao » ;
  - **cartes des résultats de recherche** (`match_artisans`) **et des pages publiques métier/ville** (`public_artisans_for_commune`), sur le site et dans l'app. Ces deux fonctions ont une nouvelle colonne `verified`, donc elles sont recréées avec les mêmes droits ;
  - **« Ma fiche publique »** de l'artisan : un premier conseil tant que le badge manque, avec un lien vers ses documents (`profileTips`, `assure_verifie`). Pour les artisans validés avant l'attestation URSSAF, c'est en général elle qui manque.
- **Le badge ne change pas le classement** : le score de la charte (ADR 0105) reste la règle de tri.

## Conséquences
- **Tests** :
  - `packages/core` : conseils de la fiche ;
  - pgTAP 63 : règle du badge, fiche publique, colonnes des résultats ;
  - bout en bout : badge sur les résultats de recherche.
- **Déploiement** : appliquer la migration. Aucune fonction Edge n'est concernée.
