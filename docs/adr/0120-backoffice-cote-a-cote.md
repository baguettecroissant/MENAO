# ADR 0120 — Back-office : vérification côte à côte, motifs de refus en liste, historique

- Statut : accepté
- Date : 17 octobre 2026
- Complète les ADR 0009 (suivi des documents), 0045 (back-office) et 0103 (CSP).

## Contexte
- **Cahier des charges du CEO** : le back-office doit montrer le document à côté des informations à contrôler, proposer des motifs de refus en liste et garder l'historique.
- **Jusqu'ici** :
  - un lien ouvrait le document dans un autre onglet ;
  - le motif de refus était un texte libre ;
  - les versions remplacées n'apparaissaient plus, sans dire qui avait décidé.
- **Décision de l'utilisateur** (17 octobre 2026) : faire le back-office côte à côte.

## Décision
- **Vue côte à côte**, pour chaque document à vérifier :
  - à gauche, le document : la photo affichée directement, le PDF intégré à la page ;
  - à droite, la date de dépôt, ce que l'artisan a saisi (dates, numéro ou code de sécurité, assureur, couverture, métiers couverts), la fiche de l'entreprise pour comparer (raison sociale, SIRET, signataire de la charte, adresse), et les points à contrôler pour ce type de document ;
  - puis la décision.

  Sur téléphone, les deux colonnes s'empilent.
- **PDF intégrés** : la politique de sécurité (CSP) autorise les cadres venant du stockage Supabase seulement (`frame-src` : Supabase, au lieu de `'none'`, ADR 0103). La règle vaut pour tout le site : lors d'une navigation interne, par exemple de `/connexion` au back-office, la page garde la politique du premier document chargé, si bien qu'une règle propre à `/admin` ne s'appliquerait pas. Aucun autre cadre n'est permis, et le site ne peut toujours pas être intégré ailleurs (`frame-ancestors 'none'`). Les documents restent privés, lus par URL signée de 5 minutes.
- **Motifs de refus en liste** (`DOCUMENT_REFUSAL_CODES`, `documentRefusalSchema`) :
  - motifs : illisible, incomplet, expiré, mauvais document, nom différent, SIRET différent, dates différentes, couverture insuffisante, code de sécurité URSSAF invalide, autre ;
  - la précision est obligatoire pour « autre » ;
  - l'artisan reçoit le libellé du motif suivi de la précision (`refusal_reason`, comme avant) ;
  - le code est gardé en base (`artisan_documents.refusal_code`, liste fermée) et dans le journal ;
  - `admin_review_document` exige le code pour un refus.
- **Historique** :
  - pour chaque type de document, les versions précédentes (remplacées, refus antérieurs), repliées, avec la date de dépôt, la décision, son auteur et le motif ;
  - l'historique des décisions du dossier indique aussi qui a décidé.

## Conséquences
- **Tests** :
  - schéma des motifs ;
  - pgTAP 64 : motif exigé, liste fermée, journal, effacement à la validation, droits ;
  - pgTAP 33 mis à jour ;
  - bout en bout de l'admin : vue côte à côte, motif exigé.
- **Déploiement** : appliquer la migration. Aucune fonction Edge n'est concernée.
- **Pas encore fait** : statistiques des motifs de refus dans le back-office, et contrôle aléatoire de 5 % des dossiers (prochain lot).
