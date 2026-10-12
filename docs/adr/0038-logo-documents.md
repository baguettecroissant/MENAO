# ADR 0038 — Logo de l'entreprise sur les devis, factures et procès-verbaux

- Statut : accepté
- Date : 12 octobre 2026
- Complète les ADR 0007 (dépôt de fichiers), 0020 (PDF du devis), 0021 (envoi du devis), 0024 (factures) et 0027 (réception).

## Contexte
- Les artisans veulent retrouver leur identité visuelle sur les documents qu'ils remettent à leurs clients. Jusqu'ici, devis, factures et PV ne portaient que le nom de l'entreprise.
- La spec ne mentionne pas de logo. Aucune mention légale n'en dépend : le logo s'ajoute aux mentions obligatoires, il ne les remplace pas.
- Un document envoyé ne doit plus changer. Les devis envoyés sont figés (`quotes.document`), et leur PDF est conservé tel quel, comme celui des factures. Factures et PV reprennent l'émetteur du devis.

## Décision
- **Dépôt** : un cadre « Logo sur vos documents (facultatif) » dans Mon dossier → Entreprise. Il est modifiable à tout moment, même après la validation du dossier.
  - Le navigateur redimensionne l'image (600 px au plus). Un PNG reste en PNG pour garder sa transparence : réencodé en JPEG, un fond transparent deviendrait noir. Un JPEG reste en JPEG. Le WebP est accepté au dépôt et converti en PNG.
  - Le fichier suit le circuit habituel : `uploads`, puis `process-upload` (type réel PNG ou JPEG, métadonnées retirées), qui le range dans le bucket privé `artisan-logos`, sous `<artisan_id>/<uuid>`. Il renseigne ensuite `artisans.logo_path`.
  - L'artisan n'a aucun droit de modification sur `logo_path` : il ne peut pas désigner le fichier d'un autre. « Retirer le logo » passe par `artisan_remove_logo()`, qui renvoie l'ancien chemin pour que l'application l'efface du stockage.
- **Données** : `app.quote_live_document` ajoute `logo_path` à l'émetteur.
  - Pour un brouillon, c'est le logo actuel.
  - À l'envoi, il est figé avec le reste de l'émetteur. Factures d'acompte et de solde et PV le reprennent du devis.
  - Un document envoyé garde donc son logo, même si l'artisan le remplace ou le retire ensuite.
- **Conservation** : un logo repris dans un devis envoyé n'est jamais effacé (`app.artisan_logo_in_use`). La politique de suppression du bucket l'interdit, et `process-upload` vérifie la même règle avant d'effacer l'ancien logo lors d'un remplacement. Les logos devenus inutiles sont effacés.
- **Lecture** (URL signées d'une heure) : l'artisan pour son propre dossier, l'équipe (`app.is_staff()`), et les particuliers dont un devis envoyé porte ce logo (`app.artisan_logo_shared_with_me`). Aucun dépôt direct n'est possible dans le bucket.
- **Rendu** (`@menao/documents`) :
  - le logo est placé en haut à gauche, dans un cadre de 140 × 56 points, proportions conservées (`fitLogo`), au-dessus du nom et des coordonnées. Le titre et les références restent à droite ;
  - le bloc émetteur est commun aux trois documents (`drawIssuer`) ;
  - le logo est fourni au rendu à part des données (`DocumentAssets`) : `generate-pdf` et `signature-create` le lisent avec la clé serveur, après le contrôle d'accès des fonctions SQL `*_document` ;
  - fichier absent ou illisible : le document sort sans logo plutôt qu'en erreur.
- **Aperçus HTML** : le devis (brouillon de l'artisan, devis reçu par le client) et le PV à signer affichent le même logo.
- **Pas de contrôle préalable par l'équipe** : le logo ne sert que sur les documents de l'artisan, et l'équipe le voit sur la fiche artisan du back-office. Il n'apparaît pas sur la fiche publique.
- **Au passage** : avec une attestation décennale validée et son renouvellement en attente (F-51), la sous-requête de `app.quote_live_document` renvoyait deux lignes et bloquait l'aperçu comme l'envoi du devis. L'attestation validée est désormais retenue.

## Conséquences
- À déployer avec la migration : `process-upload`, `generate-pdf` et `signature-create`.
- Les documents envoyés avant cette version n'ont pas de logo (`logo_path` absent de leur émetteur figé). Ils restent tels qu'ils ont été envoyés.
- Afficher le logo sur la fiche publique demanderait un bucket public ou une copie publique du logo. C'est à décider à part.
