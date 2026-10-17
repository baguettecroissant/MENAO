# ADR 0116 — Décennale : métiers couverts et « non soumis »

- Statut : accepté
- Date : 17 octobre 2026
- Complète les ADR 0009 (suivi des documents), 0111 (« Faire vérifier mon entreprise ») et 0115 (attestation URSSAF).

## Contexte
- **Cahier des charges du CEO** : la décennale doit couvrir les métiers déclarés par l'artisan. Un métier non couvert passe en vérification manuelle. Pour les rares métiers non soumis à la décennale, l'artisan le déclare et l'équipe valide.
- **Décision de l'utilisateur** (17 octobre 2026) : mettre en place la décennale qui couvre les métiers.

## Décision
- **Métiers couverts** (`artisan_documents.covered_trades`) :
  - en déposant sa décennale (site et application), l'artisan voit ses métiers, tous cochés au départ, et décoche ceux que l'attestation ne couvre pas ;
  - la liste est contrôlée (`documentMetadataSchema` : codes de métier, 30 au plus, sans doublon) et enregistrée par `process-upload` ;
  - le back-office affiche, sous l'attestation, les métiers couverts selon l'artisan et, en évidence, les métiers déclarés non couverts. L'équipe tranche à la vérification du dossier : valider, refuser la pièce ou demander un complément.
  - **Pas de blocage automatique** : la lecture de l'attestation reste humaine. L'artisan peut déclarer un métier mal couvert ; c'est l'équipe qui décide.
- **« Non soumis »** (`artisans.decennale_non_soumis`) :
  - l'artisan le déclare, ou l'annule, sur l'écran de la décennale tant que son dossier n'est pas envoyé (`set_decennale_non_soumis`, statut brouillon ou refusé) ;
  - la décennale n'est alors plus exigée, avec les mêmes règles partout :
    - `requiredDocumentTypes` et `dossierItemCount` dans `packages/core` (7 éléments au lieu de 8) ;
    - en base, `app.documents_complete` (envoi du dossier, validation par l'équipe) et `app.artisan_insurances_valid` (RC Pro seule pour rester actif) ;
    - l'e-mail de suspension ne la cite pas ;
  - le dossier affiche « Non soumis » ; le back-office le signale à vérifier avant de valider.
- **Fonctions de la base** réécrites en sous-requêtes scalaires : un dossier sans document compte 0 et reste incomplet, jamais « inconnu ».

## Conséquences
- **Tests** : `packages/core` (documents exigés, nombre d'éléments) ; pgTAP 60 (déclaration, verrou après envoi, dossier complet sans décennale, maintien actif, métiers enregistrés, dossier vide toujours incomplet).
- **Déploiement** : appliquer la migration et redéployer `process-upload` (métiers couverts).
- **TODO(legal)** : la liste des métiers non soumis à l'assurance décennale (article L241-1 du Code des assurances) reste à faire valider. Le texte proposé à l'artisan ne donne que des exemples.
- **Pas encore fait** : lecture automatique des métiers sur l'attestation. Pour l'instant, l'équipe compare avec le document.
